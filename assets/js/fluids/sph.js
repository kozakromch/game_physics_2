import ui_namespace from "../../js/common/ui.min.js";

class parameters {
  constructor() {
    this.N = 100; // number of particles
    this.n_x = 150; //number of grid points in x
    this.n_y = 80; //number of grid points in y
    this.width = 400;
    this.height = 400;
    this.h = 50; //smoothing radius
  }
}

function kernel(r, h) {
  const q = r / h;
  let W = 0;
  if (q <= 0.5) {
    W = 6 * (q ** 3 - q ** 2) + 1;
  } else if (q <= 1) {
    W = 2 * (1 - q) ** 3;
  }
  const sigma_d = 40 / (7 * Math.PI * h * h); // for 2D
  return W * sigma_d;
}

class System {
  constructor() {
    this.P = new parameters();
    this.min_index = -1;
  }

  mouseLogic(is_mouse, mouse_x, mouse_y) {
    // find the closest point to the mouse
    if (is_mouse) {
      if (this.min_index == -1) {
        this.findClosestToMouse(mouse_x, mouse_y);
      }
      this.ps[2 * this.min_index] = mouse_x;
      this.ps[2 * this.min_index + 1] = mouse_y;
    } else {
      this.min_index = -1;
    }
  }

  findClosestToMouse(mouse_x, mouse_y) {
    let min_distance = 10000000;
    let min_index = 0;
    for (let i = 0; i < this.P.N; i++) {
      let p_x = this.ps[2 * i];
      let p_y = this.ps[2 * i + 1];

      let distance = Math.sqrt(
        (p_x - mouse_x) * (p_x - mouse_x) + (p_y - mouse_y) * (p_y - mouse_y)
      );
      if (distance < min_distance) {
        min_distance = distance;
        min_index = i;
      }
    }
    this.min_index = min_index;
  }

  calcPressure(i, j) {
    const h = this.P.h;
    const ps = this.ps;
    let density = 0;
    for (let p = 0; p < this.P.N; p++) {
      const dx = ps[2 * p] - i;
      const dy = ps[2 * p + 1] - j;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > h) continue;
      density += kernel(r, h);
    }
    return density;
  }

  init() {
    this.ps = new Float32Array(this.P.N * 2);

    for (let i = 0; i < this.P.N; i++) {
      this.ps[2 * i] = Math.random() * this.P.width;
      this.ps[2 * i + 1] = Math.random() * this.P.height;
    }

    this.pressures = new Float32Array(this.P.width * this.P.height);
  }
}

class Visualizer {
  constructor(system) {
    this.buffer = null;
  }

  initBuffer(p5, width, height) {
    if (!this.buffer) {
      this.buffer = p5.createGraphics(width, height);
    }
  }

  draw(p5, system) {
    this.drawPressure(p5, system);
    this.drawPoints(p5, system);
  }

  drawPressure(p5, system) {
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
        let dens = system.calcPressure(
          (i * p5.width) / n_x_plus_2,
          (j * p5.height) / n_y_plus_2
        );
        dens = dens * 500000;
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

  //draw points
  drawPoints(p5, system) {
    p5.fill(150);
    for (let i = 0; i < system.P.N; i++) {
      const x = system.ps[2 * i];
      const y = system.ps[2 * i + 1];
      p5.circle(x, y, 5);
    }
  }
}

let SPH = {};

SPH.Interface = class {
  constructor(base_name) {
    this.system = new System();
    this.visualizer = new Visualizer(this.system);
    this.base_name = base_name;

  }

  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);


    this.system.mouseLogic(is_mouse, mouse_x, mouse_y);
    this.system.P.h = this.slider1.value;
    if (this.n_points != this.slider2.value) {
      this.n_points = this.slider2.value;
      this.system.P.N = this.n_points;
      this.system.init();
    }
    this.visualizer.draw(p5, this.system);

  }
  setup(p5, base_name) {
    p5.setFrameRate(15);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.n_x = Math.floor(p5.width * 0.4);
    this.system.P.n_y = Math.floor(p5.height * 0.3);

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Radius"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 100, 99);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "2",
        "N"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 1, 100, 99);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
    this.n_points = this.system.P.N;
    this.system.init();
  }
  reset() {
    this.system.init();
  }
};

export default SPH;
