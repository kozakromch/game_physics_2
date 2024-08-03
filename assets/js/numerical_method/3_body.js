import color_scheme from '../../js/common/color_scheme.min.js';
import common_vis_namespace from '../../js/common/common_vis.min.js';

// 3 bodies problem solved by symplectic Euler
let three_body_namespace = {};

three_body_namespace.Parameters = class {
  constructor() {
    this.m1 = 10.;
    this.m2 = 30.;
    this.m3 = 10.0;
    this.x1_0 = 1.;
    this.y1_0 = 0.;
    this.x2_0 = 0.;
    this.y2_0 = 0.;
    this.x3_0 = -1.;
    this.y3_0 = 0.;
    this.vx1_0 = 0.;
    this.vy1_0 = 5.5;
    this.vx2_0 = 0.;
    this.vy2_0 = 0.;
    this.vx3_0 = 0.;
    this.vy3_0 = -5.5;
    this.dt = 0.005;
  };
};

three_body_namespace.ThreeBody = class {
  constructor() {
    this.parameters = new three_body_namespace.Parameters();
    this.scale = 1;
    this.keep_cm = true;
    this.initializeSystem();
  }
  reset() {
    this.initializeSystem();
  }
  initializeSystem() {
    this.x1 = this.parameters.x1_0;
    this.y1 = this.parameters.y1_0;
    this.m1 = this.parameters.m1 + Math.random() * this.scale;
    this.vx1 = this.parameters.vx1_0;
    this.vy1 = this.parameters.vy1_0 + Math.random() * this.scale;
    this.x2 = this.parameters.x2_0;
    this.y2 = this.parameters.y2_0;
    this.m2 = this.parameters.m2 + Math.random() * this.scale;
    this.vx2 = this.parameters.vx2_0;
    this.vy2 = this.parameters.vy2_0 + Math.random() * this.scale;
    this.x3 = this.parameters.x3_0;
    this.y3 = this.parameters.y3_0;
    this.m3 = this.parameters.m3 + Math.random() * this.scale;
    this.vx3 = this.parameters.vx3_0;
    this.vy3 = this.parameters.vy3_0 + Math.random() * this.scale;
    this.history1 = [];
    this.history2 = [];
    this.history3 = [];
    this.max_history = 150;
    this.t = 0.;
  }
  calcSystem() {
    this.history1.push([this.x1, this.y1]);
    this.history2.push([this.x2, this.y2]);
    this.history3.push([this.x3, this.y3]);
    if (this.history1.length > this.max_history) {
      this.history1.shift();
      this.history2.shift();
      this.history3.shift();
    }
    this.t += this.parameters.dt;
    this.symplecticEuler();
    if (this.keep_cm) {
      this.keepCenterOfMass();
    }
  }

  symplecticEuler() {
    let G = 1;
    let r12 = Math.sqrt((this.x1 - this.x2) ** 2 + (this.y1 - this.y2) ** 2);
    let r13 = Math.sqrt((this.x1 - this.x3) ** 2 + (this.y1 - this.y3) ** 2);
    let r23 = Math.sqrt((this.x2 - this.x3) ** 2 + (this.y2 - this.y3) ** 2);
    let ax1 = -G * this.m2 * (this.x1 - this.x2) / r12 ** 3 -
        G * this.m3 * (this.x1 - this.x3) / r13 ** 3;
    let ay1 = -G * this.m2 * (this.y1 - this.y2) / r12 ** 3 -
        G * this.m3 * (this.y1 - this.y3) / r13 ** 3;
    let ax2 = -G * this.m1 * (this.x2 - this.x1) / r12 ** 3 -
        G * this.m3 * (this.x2 - this.x3) / r23 ** 3;
    let ay2 = -G * this.m1 * (this.y2 - this.y1) / r12 ** 3 -
        G * this.m3 * (this.y2 - this.y3) / r23 ** 3;
    let ax3 = -G * this.m1 * (this.x3 - this.x1) / r13 ** 3 -
        G * this.m2 * (this.x3 - this.x2) / r23 ** 3;
    let ay3 = -G * this.m1 * (this.y3 - this.y1) / r13 ** 3 -
        G * this.m2 * (this.y3 - this.y2) / r23 ** 3;

    this.vx1 += ax1 * this.parameters.dt;
    this.vy1 += ay1 * this.parameters.dt;
    this.vx2 += ax2 * this.parameters.dt;
    this.vy2 += ay2 * this.parameters.dt;
    this.vx3 += ax3 * this.parameters.dt;
    this.vy3 += ay3 * this.parameters.dt;
    this.x1 += this.vx1 * this.parameters.dt;
    this.y1 += this.vy1 * this.parameters.dt;
    this.x2 += this.vx2 * this.parameters.dt;
    this.y2 += this.vy2 * this.parameters.dt;
    this.x3 += this.vx3 * this.parameters.dt;
    this.y3 += this.vy3 * this.parameters.dt;
  }
  keepCenterOfMass() {
    let m = this.m1 + this.m2 + this.m3;
    let x = (this.m1 * this.x1 + this.m2 * this.x2 + this.m3 * this.x3) / m;
    let y = (this.m1 * this.y1 + this.m2 * this.y2 + this.m3 * this.y3) / m;
    this.x1 -= x;
    this.x2 -= x;
    this.x3 -= x;
    this.y1 -= y;
    this.y2 -= y;
    this.y3 -= y;
  }
};

three_body_namespace.ThreeBodyInterface = class {
  constructor() {
    this.three_body = new three_body_namespace.ThreeBody();
    this.method = 'symplectic';
    this.base_name = 'three_body_sketch';
    this.r_1 = this.getRadius(this.three_body.m1);
    this.r_2 = this.getRadius(this.three_body.m2);
    this.r_3 = this.getRadius(this.three_body.m3);
  }
  draw_history(p5, history, color, radius) {
    let trajectory = [];
    for (let i = 0; i < history.length; i++) {
      trajectory.push({
        x: history[i][0] * 50 + p5.width / 2,
        y: -history[i][1] * 50 + p5.height / 2
      });
    }
    let color_to = common_vis_namespace.copyColor(p5, color);
    color_to.setAlpha(50);
    let color_from = common_vis_namespace.copyColor(p5, color);
    color_from.setAlpha(0);
    common_vis_namespace.alphaCircle(p5, color_from, color_to, 0, radius/1.5, trajectory);
  }
  drawCircle(p5, x, y, color, radius) {
    p5.stroke(0);
    p5.fill(color);
    p5.ellipse(x * 50 + p5.width / 2, -y * 50 + p5.height / 2, radius, radius);
  }
  getRadius(m) {
    let scale = 3.;
    return Math.sqrt(m) * scale;
  }
  draw(p5) {
    const c_1 = p5.color(color_scheme.RED(p5));
    const c_2 = p5.color(color_scheme.GREEN(p5));
    const c_3 = p5.color(color_scheme.BLUE(p5));
    this.draw_history(p5, this.three_body.history1, c_1, this.r_1);
    this.draw_history(p5, this.three_body.history2, c_2, this.r_2);
    this.draw_history(p5, this.three_body.history3, c_3, this.r_3);
    // draw circle for each body

    this.drawCircle(p5, this.three_body.x1, this.three_body.y1, c_1, this.r_1);
    this.drawCircle(p5, this.three_body.x2, this.three_body.y2, c_2, this.r_2);
    this.drawCircle(p5, this.three_body.x3, this.three_body.y3, c_3, this.r_3);
  }

  iter(p5) {
    this.three_body.calcSystem();
    this.draw(p5);
  }
  reset() {
    this.three_body.reset();
  }
  setup(p5) {
    p5.setFrameRate(60);
  }
};
export default three_body_namespace;