
let velocity_field = {};
velocity_field.parameters = class {
  constructor() {
    this.n_y = 15;
    this.n_x = 15;
  }
};

velocity_field.System = class {
  constructor() {
    this.P = new velocity_field.parameters();
    this.P.n_x = 15;
    this.P.n_y = 15;
    this.init();
  }
  init() {
    this.n_elem = (this.P.n_x + 2) * (this.P.n_y + 2);
    this.u = new Float32Array(this.n_elem);
    this.v = new Float32Array(this.n_elem);
  }
  at(x, y) {
    return x + (this.P.n_x + 2) * y;
  }
  setupVelocityField(iter) {
    const n_x = this.P.n_x;
    const n_y = this.P.n_y;
    for (let i = 0; i < this.P.n_x + 2; i++) {
      for (let j = 0; j < this.P.n_y + 2; j++) {
        let x = ((i - n_x / 2) / n_x) * 5;
        let y = ((j - n_y / 2) / n_y) * 5;
        let phase = iter * 0.01;
        let c = Math.cos(phase);
        let s = Math.sin(phase);
        let u_0 = (x * x - y * y - 2) * s;
        let v_0 = 2 * x * y * c;
        let scale = 1;
        this.u[this.at(i, j)] = u_0 * scale;
        this.v[this.at(i, j)] = v_0 * scale;
      }
    }
  }
};
velocity_field.Visualizer = class {
  constructor() {}
  drawVelocity(p5, system, skip_every = 1) {
    p5.stroke(0);
    p5.strokeWeight(1);
    const scale_x = p5.width / (system.P.n_x + 2);
    const scale_y = p5.height / (system.P.n_y + 2);
    for (let i = 1; i <= system.P.n_x; i += skip_every) {
      for (let j = 1; j <= system.P.n_y; j += skip_every) {
        let x = (i + 0.5) * scale_x;
        let y = (j + 0.5) * scale_y;
        let idx = system.at(i, j);
        p5.circle(x, y, 2);
        let end_x = x + system.u[idx] * 10;
        let end_y = y + system.v[idx] * 10;
        p5.line(x, y, end_x, end_y);
        // arrow head
        let angle = Math.atan2(system.v[idx], system.u[idx]);
        let length = Math.sqrt(x - end_x) ** 2 + (y - end_y) ** 2;
        let arrow_size = 1.5;
        arrow_size = arrow_size > length ? length : arrow_size;
        p5.push();
        p5.translate(end_x, end_y);
        p5.rotate(angle);
        p5.line(0, 0, -arrow_size*3, -arrow_size);
        p5.line(0, 0, -arrow_size*3, arrow_size);
        p5.pop();

      }
    }
  }
  // draw the rectangles for the cells
  drawCells(p5, system) {
    p5.stroke(0);
    p5.strokeWeight(1);
    for (let i = 1; i <= system.P.n_x; i++) {
      for (let j = 1; j <= system.P.n_y; j++) {
        let x = (i * p5.width) / (system.P.n_x + 2);
        let y = (j * p5.height) / (system.P.n_y + 2);
        p5.noFill();
        p5.rect(
          x,
          y,
          p5.width / (system.P.n_x + 2),
          p5.height / (system.P.n_y + 2)
        );
      }
    }
  }
};
velocity_field.Interface = class {
  constructor(base_name) {
    
    this.system = new velocity_field.System();
    this.visualizer = new velocity_field.Visualizer(this.system);
    this.base_name = base_name;
    this.n_iter = 0;
  }
  iter(p5) {
    console.log(this.n_iter);
    this.n_iter++;
    this.system.setupVelocityField(this.n_iter);
    p5.background(255);
    this.visualizer.drawVelocity(p5, this.system);
    this.visualizer.drawCells(p5, this.system);
  }
  setup(p5, base_name) {
    p5.setFrameRate(30);
    this.system.init();
  }
  reset() {
    this.system.init();
  }
};

export default velocity_field;