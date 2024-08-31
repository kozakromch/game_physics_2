import color_scheme from '../../js/common/color_scheme.min.js';
import common_vis_namespace from '../../js/common/common_vis.min.js';
import energy_namespace from '../../js/common/energy.min.js';
import sinusoidal_namespace from '../../js/common/sinusoidal_vis.min.js';

let spring_namespace = {};
spring_namespace.Parameters = class {
  constructor() {
    this.m = 1.;
    this.k = 1.;
    this.x_0 = 0.;
    this.v_0 = 100.;
    this.dt = 0.1;
  }
};
spring_namespace.SpringSystem = class {
  constructor(method) {
    this.method = method;
    this.parameters = new spring_namespace.Parameters();
    this.energy = new energy_namespace.Energy();
    this.max_history = 80;
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
    this.energy.reset();
  }
  initialyzeSystem() {
    this.history = [];
    this.x = this.parameters.x_0;
    this.v = this.parameters.v_0;
    this.t = 0.;
    this.calcEnergy();
  }
  calcSystem() {
    this.history.push([this.x, this.v]);
    if (this.history.length > this.max_history) {
      this.history.shift();
    }

    this.t += this.parameters.dt;
    if (this.method == 'forward_euler') {
      this.forwardEuler();
    } else if (this.method == 'backward_euler') {
      this.backwardEuler();
    } else if (this.method == 'symplectic_euler') {
      this.symplecticEuler();
    } else if (this.method == 'verlet') {
      this.verlet();
    } else if (this.method == 'analitical') {
      this.analitical();
    }
    this.calcEnergy();
  }
  forwardEuler() {
    const eye = math.matrix([[1, 0], [0, 1]]);
    const k = this.parameters.k;
    const m = this.parameters.m;
    let A = new math.matrix([[0., 1], [-k / m, 0]]);
    let p_v_prev = math.matrix([this.x, this.v]);
    let Sys = (math.add(eye, math.multiply(A, this.parameters.dt)));
    let p_v = math.multiply(Sys, p_v_prev);
    this.x = p_v.get([0]);
    this.v = p_v.get([1]);
  }
  backwardEuler() {
    const eye = math.matrix([[1, 0], [0, 1]]);
    const k = this.parameters.k;
    const m = this.parameters.m;
    let A = new math.matrix([[0., 1], [-k / m, 0]]);
    let p_v_prev = math.matrix([this.x, this.v]);
    let Sys =
        math.inv(math.subtract(eye, math.multiply(A, this.parameters.dt)));
    let p_v = math.multiply(Sys, p_v_prev);
    this.x = p_v.get([0]);
    this.v = p_v.get([1]);
  }
  symplecticEuler() {
    const k = this.parameters.k;
    const m = this.parameters.m;
    let acceleration = -k / m * this.x;
    this.v += acceleration * this.parameters.dt;
    this.x += this.v * this.parameters.dt;
  }
  verlet() {
    const k = this.parameters.k;
    const m = this.parameters.m;
    let acceleration = -k / m * this.x;
    this.x += this.v * this.parameters.dt +
        0.5 * acceleration * this.parameters.dt ** 2;
    let acceleration_new = -k / m * this.x;
    this.v += 0.5 * (acceleration + acceleration_new) * this.parameters.dt;
  }
  analitical() {
    const k = this.parameters.k;
    const m = this.parameters.m;
    const x_0 = this.parameters.x_0;
    const v_0 = this.parameters.v_0;
    const omega = math.sqrt(k / m);
    const t = this.t;
    this.x = (x_0 * math.cos(omega * t) + v_0 / omega * math.sin(omega * t));
    this.v = (-x_0 * omega * math.sin(omega * t) + v_0 * math.cos(omega * t));
  }
  calcEnergy() {
    const k = this.parameters.k;
    const m = this.parameters.m;
    const x = this.x;
    const v = this.v;
    this.E = 0.5 * m * v ** 2 + 0.5 * k * x ** 2;
    this.energy.storeEnergy(this.E);
  }
};


spring_namespace.SpringVis = class {
  constructor() {
    this.spring_sinusoidal = new sinusoidal_namespace.SpringSinusoidal(100, 5, 8);
  }
  draw(p5, spring_system, color, alpha) {
    let spring_pos_x = p5.width / 2;
    let start_point = p5.height / 2;
    let spring_pos_y = start_point + spring_system.x;
    // Draw spring
    this.spring_sinusoidal.draw(
        p5, spring_pos_x, start_point, spring_pos_x, spring_pos_y, alpha);
    // Draw mass
    p5.stroke(0, color.alpha);
    p5.fill(color);
    p5.ellipse(spring_pos_x, spring_pos_y, 20, 20);
  }
};
spring_namespace.SpringInterfaceEuler = class {
  constructor(method) {
    this.base_name = method + '_spring';
    this.system_euler = new spring_namespace.SpringSystem(method);
    this.vis_euler = new spring_namespace.SpringVis();
    this.system_an = new spring_namespace.SpringSystem('analitical');
    this.vis_an = new spring_namespace.SpringVis();
  }
  iter(p5) {
    this.system_an.calcSystem();
    this.system_euler.calcSystem();

    energy_namespace.drawEnergyGraph(p5, this.system_euler.energy);

    this.vis_an.draw(p5, this.system_an, color_scheme.GREEN_ALPHA(p5), 50);
    this.vis_euler.draw(p5, this.system_euler, color_scheme.RED(p5), 255);

    // Draw info
    p5.fill(0);
    p5.stroke(0);
    p5.text('Energy: ' + this.system_euler.E.toFixed(2), 10, 20);
  }
  setup(p5) {}
  reset() {
    this.system_euler.reset();
    this.system_an.reset();
  }
};


spring_namespace.SpringPhaseSpaceBase = class {
  constructor(method) {
    this.base_name = method + '_phase_spring';
    this.scale = 20;
  }
  getSystems(name) {
    let systems = [];
    for (let i = 0; i < 4; i++) {
      systems.push(new spring_namespace.SpringSystem(name));
    }
    let x_0 = 35;
    let x_1 = 75;
    let v_0 = 35;
    let v_1 = 75;
    let dt = 0.08;
    systems[0].parameters.x_0 = x_0;
    systems[0].parameters.v_0 = v_0;
    systems[0].parameters.dt = dt;
    systems[0].initialyzeSystem();
    systems[1].parameters.x_0 = x_0;
    systems[1].parameters.v_0 = v_1;
    systems[1].parameters.dt = dt;
    systems[1].initialyzeSystem();
    systems[2].parameters.x_0 = x_1;
    systems[2].parameters.v_0 = v_1;
    systems[2].parameters.dt = dt;
    systems[2].initialyzeSystem();
    systems[3].parameters.x_0 = x_1;
    systems[3].parameters.v_0 = v_0;
    systems[3].parameters.dt = dt;
    systems[3].initialyzeSystem();
    return systems;
  }
  drawBases(systems, color, p5) {
    let vertexes = [];
    for (let i = 0; i < 4; i++) {
      let s = systems[i];
      let x = s.x;
      let v = s.v;
      vertexes.push([x, v]);
    }
    p5.fill(color);
    p5.beginShape();
    p5.stroke(0);
    for (let i = 0; i < 4; i++) {
      let x = vertexes[i][0] + p5.width / 2.;
      let y = vertexes[i][1] + p5.height / 2.;
      p5.vertex(x, y);
    }
    p5.vertex(vertexes[0][0] + p5.width / 2., vertexes[0][1] + p5.height / 2.);
    p5.endShape();
  }
  drawHistories(systems, color, p5) {
    for (let i = 0; i < systems.length; i++) {
      let trajectory = [];
      let s = systems[i];
      for (let j = 0; j < s.history.length; j++) {
        trajectory.push({
          x: s.history[j][0] + p5.width / 2,
          y: s.history[j][1] + p5.height / 2
        });
      }
      let color_from = common_vis_namespace.copyColor(p5, color);
      color_from.setAlpha(0);
      common_vis_namespace.alphaLine(p5, color_from, color, trajectory);
    }
  }
  draw(systems, color, p5) {
    common_vis_namespace.drawAxis(p5, 'x', 'v');
    this.drawHistories(systems, color, p5);
    this.drawBases(systems, color, p5);
  }
};

spring_namespace.SpringPhaseSpaceEuler =
    class extends spring_namespace.SpringPhaseSpaceBase {
  constructor(method) {
    super(method);
    this.systems_an = super.getSystems('analitical');
    this.systems_eu = super.getSystems(method);
  }
  iter(p5) {
    for (let i = 0; i < 4; i++) {
      this.systems_an[i].calcSystem();
      this.systems_eu[i].calcSystem();
    }
    super.draw(this.systems_an, color_scheme.GREEN_ALPHA(p5), p5);
    super.draw(this.systems_eu, color_scheme.RED(p5), p5);
  }
  setup(p5) {}
  reset() {
    for (let i = 0; i < 4; i++) {
      this.systems_eu[i].reset();
      this.systems_an[i].reset();
    }
  }
};

spring_namespace.SpringPhaseSpaceAnalitical =
    class extends spring_namespace.SpringPhaseSpaceBase {
  constructor() {
    super('analitical');
    this.systems_an = super.getSystems('analitical');
  }
  iter(p5) {
    for (let i = 0; i < 4; i++) {
      this.systems_an[i].calcSystem();
    }
    super.draw(this.systems_an, color_scheme.GREEN(p5), p5);
  }
  setup(p5) {}
  reset() {
    for (let i = 0; i < 4; i++) {
      this.systems_an[i].reset();
    }
  }
};

export default spring_namespace;