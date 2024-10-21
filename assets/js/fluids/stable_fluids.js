import ui_namespace from '../../../js/common/ui.min.js';

//stable fluids by Jos Stam
let stable_fluids_namespaces = {};

stable_fluids_namespaces.parameters = class {
  constructor() {
    this.n_y = 200;
    this.n_x = 200;
    this.dt = 0.01;
    this.diff = 0.00001;
    this.visc = 0.00001;
    this.gs_iters = 6;
  }
};

stable_fluids_namespaces.System = class {
  constructor() {
    this.P = new stable_fluids_namespaces.parameters();
  }
  at(x, y) {
    return x + (this.P.n_x + 2) * y;
  }
  init() {
    this.n_elem = (this.P.n_x + 2) * (this.P.n_y + 2);
    this.dens = new Float32Array(this.n_elem);
    this.dens_prev = new Float32Array(this.n_elem);
    this.u = new Float32Array(this.n_elem);
    this.u_prev = new Float32Array(this.n_elem);
    this.v = new Float32Array(this.n_elem);
    this.v_prev = new Float32Array(this.n_elem);
    // random fill
    for (let i = 0; i < this.n_elem; i++) {
      this.dens[i] = 0;
      this.dens_prev[i] = 0;
      this.u[i] = 0;
      this.u_prev[i] = 0;
      this.v[i] = 0;
      this.v_prev[i] = 0;
    }
  }

  addSource(x, s, dt) {
    return;
  }
  setBnd(b, x) {
    for (let i = 1; i <= this.P.n_x; i++) {
      x[this.at(0, i)] = b == 1 ? -x[this.at(1, i)] : x[this.at(1, i)];
      x[this.at(this.P.n_x + 1, i)] =
        b == 1 ? -x[this.at(this.P.n_x, i)] : x[this.at(this.P.n_x, i)];
      x[this.at(i, 0)] = b == 2 ? -x[this.at(i, 1)] : x[this.at(i, 1)];
      x[this.at(i, this.P.n_y + 1)] =
        b == 2 ? -x[this.at(i, this.P.n_y)] : x[this.at(i, this.P.n_y)];
    }
    x[this.at(0, 0)] = 0.5 * (x[this.at(1, 0)] + x[this.at(0, 1)]);
    x[this.at(0, this.P.n_y + 1)] =
      0.5 * (x[this.at(1, this.P.n_y + 1)] + x[this.at(0, this.P.n_y)]);
    x[this.at(this.P.n_x + 1, 0)] =
      0.5 * (x[this.at(this.P.n_x, 0)] + x[this.at(this.P.n_x + 1, 1)]);
    x[this.at(this.P.n_x + 1, this.P.n_y + 1)] =
      0.5 *
      (x[this.at(this.P.n_x, this.P.n_y + 1)] +
        x[this.at(this.P.n_x + 1, this.P.n_y)]);
  }
  diffusion(b, x, x0, diff, dt) {
    let a = dt * diff * this.P.n_x * this.P.n_y;
    let invFactor = 1 / (1 + 4 * a);

    for (let k = 0; k < this.P.gs_iters; k++) {
      for (let i = 1; i <= this.P.n_x; i++) {
        for (let j = 1; j <= this.P.n_y; j += 2) {
          let idx1 = this.at(i, j);
          let idx2 = this.at(i, j + 1);

          x[idx1] =
            (x0[idx1] +
              a *
                (x[this.at(i - 1, j)] +
                  x[this.at(i + 1, j)] +
                  x[this.at(i, j - 1)] +
                  x[this.at(i, j + 1)])) *
            invFactor;

          if (j + 1 <= this.P.n_y) {
            x[idx2] =
              (x0[idx2] +
                a *
                  (x[this.at(i - 1, j + 1)] +
                    x[this.at(i + 1, j + 1)] +
                    x[this.at(i, j)] +
                    x[this.at(i, j + 2)])) *
              invFactor;
          }
        }
      }
      this.setBnd(b, x);
    }
  }

  advection(b, d, d0, u, v, dt) {
    let dt0 = dt * this.P.n_x;
    for (let i = 1; i <= this.P.n_x; i++) {
      for (let j = 1; j <= this.P.n_y; j++) {
        let x = i - dt0 * u[this.at(i, j)];
        let y = j - dt0 * v[this.at(i, j)];
        if (x < 0.5) x = 0.5;
        if (x > this.P.n_x + 0.5) x = this.P.n_x + 0.5;
        let i0 = Math.floor(x);
        let i1 = i0 + 1;
        if (y < 0.5) y = 0.5;
        if (y > this.P.n_y + 0.5) y = this.P.n_y + 0.5;
        let j0 = Math.floor(y);
        let j1 = j0 + 1;
        let s1 = x - i0;
        let s0 = 1 - s1;
        let t1 = y - j0;
        let t0 = 1 - t1;
        d[this.at(i, j)] =
          s0 * (t0 * d0[this.at(i0, j0)] + t1 * d0[this.at(i0, j1)]) +
          s1 * (t0 * d0[this.at(i1, j0)] + t1 * d0[this.at(i1, j1)]);
      }
    }
    this.setBnd(b, d);
  }
  project(u, v, p, div) {
    const h = 1.0 / this.P.n_x;
    const h_half = h * 0.5;
    const h_half_inv = 0.5 / h;
    const n_x = this.P.n_x;
    const n_y = this.P.n_y;
    for (let i = 1; i <= n_x; i++) {
      for (let j = 1; j <= n_y; j++) {
        let idx = this.at(i, j);
        div[idx] =
          -h_half *
          (u[this.at(i + 1, j)] -
            u[this.at(i - 1, j)] +
            v[this.at(i, j + 1)] -
            v[this.at(i, j - 1)]);
        p[idx] = 0;
      }
    }
    this.setBnd(0, div);
    this.setBnd(0, p);

    for (let k = 0; k < this.P.gs_iters; k++) {
      for (let i = 1; i <= n_x; i++) {
        for (let j = 1; j <= n_y; j++) {
          let idx = this.at(i, j);
          p[idx] =
            (div[idx] +
              p[this.at(i - 1, j)] +
              p[this.at(i + 1, j)] +
              p[this.at(i, j - 1)] +
              p[this.at(i, j + 1)]) /
            4;
        }
      }
      this.setBnd(0, p);
    }

    for (let i = 1; i <= n_x; i++) {
      for (let j = 1; j <= n_y; j++) {
        let idx = this.at(i, j);
        u[idx] -= h_half_inv * (p[this.at(i + 1, j)] - p[this.at(i - 1, j)]);
        v[idx] -= h_half_inv * (p[this.at(i, j + 1)] - p[this.at(i, j - 1)]);
      }
    }

    this.setBnd(1, u);
    this.setBnd(2, v);
  }
  fadeDens() {
    for (let i = 0; i < this.n_elem; i++) {
      this.dens[i] *= 0.98;
    }
  }
  densStep(x, x0, u, v, diff, dt) {
    this.addSource(x, x0, dt);
    this.swap(x0, x);
    this.diffusion(0, x, x0, diff, dt);
    this.swap(x0, x);
    this.advection(0, x, x0, u, v, dt);
    this.fadeDens();
  }
  velStep(u, v, u0, v0, visc, dt) {
    // this.addSource(u, u0, dt);
    // this.addSource(v, v0, dt);
    this.swap(u0, u);
    this.diffusion(1, u, u0, visc, dt);
    this.swap(v0, v);
    this.diffusion(2, v, v0, visc, dt);
    this.project(u, v, u0, v0);
    this.swap(u0, u);
    this.swap(v0, v);
    this.advection(1, u, u0, u0, v0, dt);
    this.advection(2, v, v0, u0, v0, dt);
    this.project(u, v, u0, v0);
  }

  swap(a, b) {
    let temp = new Float32Array(a);
    a.set(b);
    b.set(temp);
  }
  clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
  }

  calcSystem(is_mouse, mouse_x, mouse_y, v_mouse_x, v_mouse_y, width, height) {
    if (is_mouse) {
      const multiplier = 3;
      const size = 3;
      let grid_x = Math.floor((mouse_x / width) * this.P.n_x);
      let grid_y = Math.floor((mouse_y / height) * this.P.n_y);
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          let x = this.clamp(grid_x + i, 1, this.P.n_x);
          let y = this.clamp(grid_y + j, 1, this.P.n_y);
          this.dens[this.at(x, y)] += 6;
          this.u[this.at(x, y)] += v_mouse_x * multiplier;
          this.v[this.at(x, y)] += v_mouse_y * multiplier;
        }
      }
    }
    this.velStep(
      this.u,
      this.v,
      this.u_prev,
      this.v_prev,
      this.P.visc,
      this.P.dt
    );
    this.densStep(
      this.dens,
      this.dens_prev,
      this.u,
      this.v,
      this.P.diff,
      this.P.dt
    );
  }
  measurePressure() {
    let p = new Float32Array(this.n_elem);
    let div = new Float32Array(this.n_elem);
    this.project(this.u, this.v, p, div);
    return p;
  }
};
stable_fluids_namespaces.Visualizer = class {
  constructor(system) {
    this.buffer = null;
  }

  initBuffer(p5, width, height) {
    if (!this.buffer) {
      this.buffer = p5.createGraphics(width, height);
    }
  }

  draw(p5, system) {
    this.drawDensity(p5, system);
    // this.drawPressure(p5, system);
    this.fps(p5);
  }
  // draw Pressure using scientific color map
  scientificColorMap(pressure) {
      // scientific color map
      let r = 0;
      let g = 0;
      let b = 0;
      if (pressure < 64) {
        r = 0;
        g = 0;
        b = pressure * 4;
      } else if (pressure < 128) {
        r = 0;
        g = (pressure - 64) * 4;
        b = 255;
      } else if (pressure < 192) {
        r = 0;
        g = 255;
        b = 255 - (pressure - 128) * 4;
      } else {
        r = (pressure - 192) * 4;
        g = 0;
        b = 0;
      }
      return [r, g, b];
  }
  drawPressure(p5, system) {
    this.initBuffer(p5, p5.width, p5.height);
    const pressures = system.measurePressure();
    const d = this.buffer.pixelDensity();
    const scaled_width = p5.width * d;
    const scaled_height = p5.height * d;
    const n_x_plus_2 = system.P.n_x + 2;
    const n_y_plus_2 = system.P.n_y + 2;
    const scale_x = scaled_width / n_x_plus_2;
    const scale_y = scaled_height / n_y_plus_2;
    const scale_x_int = Math.floor(scale_x);
    const scale_y_int = Math.floor(scale_y);
    const scale_x_frac = scale_x - scale_x_int;
    const scale_y_frac = scale_y - scale_y_int;

    const scale_y_step = scale_y_int + scale_y_frac;
    const scale_x_step = scale_x_int + scale_x_frac;

    this.buffer.loadPixels();

    for (let i = 0; i < n_x_plus_2; i++) {
      const x_start = Math.floor(i * scale_x_step);
      const x_end = x_start + scale_x_int + (i < system.P.n_x ? 1 : 0);

      for (let j = 0; j < n_y_plus_2; j++) {
        const idx = system.at(i, j);
        const p = pressures[idx];
        const pressure = Math.floor((p*80 + 1) * 125);
        const [r, g, b] = this.scientificColorMap(pressure);

        const y_start = Math.floor(j * scale_y_step);
        const y_end = y_start + scale_y_int + (j < system.P.n_y ? 1 : 0);

        const y_base = 4 * scaled_width;

        for (let y = y_start; y < y_end; y++) {
          const y_mul = y * y_base;

          for (let x = x_start; x < x_end; x++) {
            const index = 4 * x + y_mul;
            this.buffer.pixels[index] = r;
            this.buffer.pixels[index + 1] = g;
            this.buffer.pixels[index + 2] = b;
            this.buffer.pixels[index + 3] = 255;
          }
        }
      }
    }

    this.buffer.updatePixels();
    p5.image(this.buffer, 0, 0);

  }

  drawDensity(p5, system) {
    this.initBuffer(p5, p5.width, p5.height);
    const d = this.buffer.pixelDensity();
    const scaled_width = p5.width * d;
    const scaled_height = p5.height * d;
    const n_x_plus_2 = system.P.n_x + 2;
    const n_y_plus_2 = system.P.n_y + 2;
    const scale_x = scaled_width / n_x_plus_2;
    const scale_y = scaled_height / n_y_plus_2;
    const scale_x_int = Math.floor(scale_x);
    const scale_y_int = Math.floor(scale_y);
    const scale_x_frac = scale_x - scale_x_int;
    const scale_y_frac = scale_y - scale_y_int;

    const scale_y_step = scale_y_int + scale_y_frac;
    const scale_x_step = scale_x_int + scale_x_frac;

    this.buffer.loadPixels();

    for (let i = 0; i < n_x_plus_2; i++) {
      const x_start = Math.floor(i * scale_x_step);
      const x_end = x_start + scale_x_int + (i < system.P.n_x ? 1 : 0);

      for (let j = 0; j < n_y_plus_2; j++) {
        const idx = system.at(i, j);
        const dens = Math.floor(system.dens[idx] * 255);

        if (this.dens_prev && this.dens_prev[idx] === dens) {
          continue;
        }

        if (this.dens_prev) {
          this.dens_prev[idx] = dens;
        }

        const y_start = Math.floor(j * scale_y_step);
        const y_end = y_start + scale_y_int + (j < system.P.n_y ? 1 : 0);

        const y_base = 4 * scaled_width;

        for (let y = y_start; y < y_end; y++) {
          const y_mul = y * y_base;

          for (let x = x_start; x < x_end; x++) {
            const index = 4 * x + y_mul;
            this.buffer.pixels[index] = dens * 0.3;
            this.buffer.pixels[index + 1] = dens * 0.6;
            this.buffer.pixels[index + 2] = dens * 0.8;
            this.buffer.pixels[index + 3] = 255;
          }
        }
      }
    }

    this.buffer.updatePixels();
    p5.image(this.buffer, 0, 0);

    if (!this.dens_prev) {
      this.dens_prev = new Float32Array(system.dens);
    }
  }

  fps(p5) {
    p5.fill(255);
    p5.noStroke();
    p5.rect(0, 0, 70, 30, 10);
    p5.fill(0);
    p5.text("FPS: " + Math.round(p5.frameRate()), 10, 10, 70, 80);
  }
};

stable_fluids_namespaces.Interface = class {
  constructor(base_name) {
    this.system = new stable_fluids_namespaces.System();
    this.visualizer = new stable_fluids_namespaces.Visualizer(this.system);
    this.base_name = base_name;
  }

  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    let v_mouse_x = p5.mouseX - p5.pmouseX;
    let v_mouse_y = p5.mouseY - p5.pmouseY;
    this.system.calcSystem(
      is_mouse,
      mouse_x,
      mouse_y,
      v_mouse_x,
      v_mouse_y,
      p5.width,
      p5.height
    );
    this.visualizer.draw(p5, this.system);
  }
  setup(p5, base_name) {
    p5.setFrameRate(30);
    this.system.init();
  }
  reset() {
    this.system.init();
  }
};

export default stable_fluids_namespaces;
