import color_scheme from '../../js/common/color_scheme.min.js';
import common_vis_namespace from '../../js/common/common_vis.min.js';

// 3 bodies problem solved by symplectic Euler
let three_body_namespace = {};

three_body_namespace.Parameters = class {
  constructor() {
    // this.custom();
    this.dragonFly();
    // this.brukeR4();
    // this.catFace();
  };
  rnd() {
    return Math.random() * this.random_scale
  }
  custom() {
    this.random_scale = 0.1;
    this.m1 = 1. + this.rnd();
    this.m2 = 1. + this.rnd();
    this.m3 = 1.0 + this.rnd();
    this.x1_0 = 1. + this.rnd();
    this.y1_0 = 0. + this.rnd();
    this.x2_0 = 0. + this.rnd();
    this.y2_0 = 0. + this.rnd();
    this.x3_0 = -1. + this.rnd();
    this.y3_0 = 0. + this.rnd();
    this.vx1_0 = 0. + this.rnd();
    this.vy1_0 = 0.4 + this.rnd();
    this.vx2_0 = 0.04 + this.rnd();
    this.vy2_0 = 0. + this.rnd();
    this.vx3_0 = 0. + this.rnd();
    this.vy3_0 = -0.44 + this.rnd();
    this.dt = 0.0003;
    this.sub_iters = 10;
  };
  brukeR4() {
    this.m1 = 1.0;
    this.m2 = 1.0;
    this.m3 = 1.0;
    this.x1_0 = 0.8733047091;
    this.y1_0 = 0.;
    this.x2_0 = -0.6254030288;
    this.y2_0 = 0.;
    this.x3_0 = -0.2479016803;
    this.y3_0 = 0.;
    this.vx1_0 = 0.;
    this.vy1_0 = 1.010776444;
    this.vx2_0 = 0.;
    this.vy2_0 = -1.683353346;
    this.vx3_0 = 0.;
    this.vy3_0 = 0.6725769022;
    this.dt = 0.001;
    this.sub_iters = 10;
  };
  dragonFly() {
    this.m1 = 1.0;
    this.m2 = 1.0;
    this.m3 = 1.0;
    this.x1_0 = -1;
    this.y1_0 = 0;
    this.x2_0 = 1;
    this.y2_0 = 0;
    this.x3_0 = 0;
    this.y3_0 = 0;
    this.vx1_0 = 0.08058;
    this.vy1_0 = 0.58884;
    this.vx2_0 = 0.08058;
    this.vy2_0 = 0.58884;
    this.vx3_0 = -0.16116;
    this.vy3_0 = -1.17768;
    this.dt = 0.00005;
    this.sub_iters = 150;
  }
  catFace() {
    this.m1 = 1.0;
    this.m2 = 1.0;
    this.m3 = 1.0;
    this.x1_0 = 0.5363870734;
    this.y1_0 = 0.05408860501;
    this.x2_0 = -0.2520991265;
    this.y2_0 = 0.6945273277;
    this.x3_0 = -0.2757066017;
    this.y3_0 = -0.3359335893;
    this.vx1_0 = -0.5693795856;
    this.vy1_0 = 1.255291103;
    this.vx2_0 = 0.07964461525;
    this.vy2_0 = -0.4586259973;
    this.vx3_0 = 0.4897349703;
    this.vy3_0 = -0.7966651052;
    this.dt = 0.00005;
    this.sub_iters = 200;
  }
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
    this.parameters = new three_body_namespace.Parameters();
    this.sub_iters = this.parameters.sub_iters;
    this.x1 = this.parameters.x1_0;
    this.y1 = this.parameters.y1_0;
    this.m1 = this.parameters.m1;
    this.vx1 = this.parameters.vx1_0;
    this.vy1 = this.parameters.vy1_0;
    this.x2 = this.parameters.x2_0;
    this.y2 = this.parameters.y2_0;
    this.m2 = this.parameters.m2;
    this.vx2 = this.parameters.vx2_0;
    this.vy2 = this.parameters.vy2_0;
    this.x3 = this.parameters.x3_0;
    this.y3 = this.parameters.y3_0;
    this.m3 = this.parameters.m3;
    this.vx3 = this.parameters.vx3_0;
    this.vy3 = this.parameters.vy3_0;
    this.history1 = [];
    this.history2 = [];
    this.history3 = [];
    this.max_history = 1000;
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
    for (let i = 0; i < this.sub_iters; i++) {
      this.t += this.parameters.dt;
      this.symplecticEuler();
      if (this.keep_cm) {
        this.keepCenterOfMass();
      }
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
    this.scale = 100;
  }
  drawHistory(p5, history, color, radius) {
    let trajectory = [];
    for (let i = 0; i < history.length; i++) {
      trajectory.push({
        x: history[i][0] * this.scale + p5.width / 2,
        y: history[i][1] * this.scale + p5.height / 2
      });
    }
    let color_to = common_vis_namespace.copyColor(p5, color);
    color_to.setAlpha(200);
    let color_from = common_vis_namespace.copyColor(p5, color);
    color_from.setAlpha(0);
    common_vis_namespace.alphaCircle(
        p5, color_from, color_to, 0, radius / 2, trajectory);
  }
  drawCircle(p5, x, y, color, radius) {
    p5.stroke(0);
    p5.fill(color);
    p5.ellipse(
        x * this.scale + p5.width / 2, y * this.scale + p5.height / 2, radius,
        radius);
  }
  getRadius(m) {
    let scale = 10.;
    return Math.sqrt(m) * scale;
  }
  draw(p5) {
    const c_1 = p5.color(color_scheme.RED(p5));
    const c_2 = p5.color(color_scheme.GREEN(p5));
    const c_3 = p5.color(color_scheme.BLUE(p5));
    this.drawHistory(p5, this.three_body.history1, c_1, this.r_1);
    this.drawHistory(p5, this.three_body.history2, c_2, this.r_2);
    this.drawHistory(p5, this.three_body.history3, c_3, this.r_3);
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
    p5.setFrameRate(90);
  }
};


three_body_namespace.ThreeBodyInterfaceController =
    class extends three_body_namespace.ThreeBodyInterface {
  constructor() {
    super();
  }
  setup(p5) {
    super.setup(p5);
  }
}

export default three_body_namespace;