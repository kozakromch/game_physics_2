import color_scheme from '/game_physics_2/js/common/color_scheme.min.js';
import energy_namespace from '/game_physics_2/js/common/energy.min.js';

let canon_namespace = {};
canon_namespace.Parameters = class {
  constructor() {
    this.m = 100.;
    this.g = 98.1;
    this.x_0 = 0.;
    this.y_0 = 0.;
    this.vx_0 = 100.;
    this.vy_0 = 200.;
    this.dt = 0.1;
  }
};
canon_namespace.CanonSystem = class {
  constructor(method) {
    this.method = method;
    this.parameters = new canon_namespace.Parameters();
    this.energy = new energy_namespace.Energy();
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
    this.energy.reset();
  }
  initialyzeSystem() {
    this.x = this.parameters.x_0;
    this.y = this.parameters.y_0;
    this.vx = this.parameters.vx_0;
    this.vy = this.parameters.vy_0;
    this.history = [];
    this.t = 0.;
    this.calcEnergy();
  }
  calcSystem() {
    this.history.push([this.x, this.y]);
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
    const eye =
        math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
    const G = math.multiply(
        math.matrix([0, 0, 0, -this.parameters.g]), this.parameters.dt);
    let A = new math.matrix(
        [[0., 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0]]);
    let p_v_prev = math.matrix([this.x, this.vx, this.y, this.vy]);
    let Sys = math.add(eye, math.multiply(A, this.parameters.dt));
    let p_v = math.add(math.multiply(Sys, p_v_prev), G);
    this.x = p_v.get([0]);
    this.vx = p_v.get([1]);
    this.y = p_v.get([2]);
    this.vy = p_v.get([3]);
  }
  //   z_{k} = F^{-1}\cdot(z_{k-1} + G\cdot\Delta t)
  backwardEuler() {
    const eye =
        math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
    const G = math.multiply(
        math.matrix([0, 0, 0, -this.parameters.g]), this.parameters.dt);
    let A = new math.matrix(
        [[0., 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0]]);
    let p_v_prev = math.matrix([this.x, this.vx, this.y, this.vy]);
    let Sys = math.subtract(eye, math.multiply(A, this.parameters.dt));
    let p_v = math.multiply(math.inv(Sys), math.add(p_v_prev, G));
    this.x = p_v.get([0]);
    this.vx = p_v.get([1]);
    this.y = p_v.get([2]);
    this.vy = p_v.get([3]);
  }
  symplecticEuler() {
    const g = this.parameters.g;
    const acceleration = -g;
    this.vy += acceleration * this.parameters.dt;
    this.y += this.vy * this.parameters.dt;
    this.x += this.vx * this.parameters.dt;
  }
  verlet() {
    const g = this.parameters.g;
    const acceleration = -g;
    this.y += this.vy * this.parameters.dt +
        0.5 * acceleration * this.parameters.dt ** 2;
    this.x += this.vx * this.parameters.dt;
    let acceleration_new = -g;
    this.vy += 0.5 * (acceleration + acceleration_new) * this.parameters.dt;
  }
  analitical() {
    const g = this.parameters.g;
    const x_0 = this.parameters.x_0;
    const y_0 = this.parameters.y_0;
    const vx_0 = this.parameters.vx_0;
    const vy_0 = this.parameters.vy_0;
    const t = this.t;
    this.x = x_0 + vx_0 * t;
    this.y = y_0 + vy_0 * t - 0.5 * g * t * t;
    this.vx = vx_0;
    this.vy = vy_0 - g * t;
  }
  calcEnergy() {
    const m = this.parameters.m;
    const g = this.parameters.g;
    const x = this.x;
    const y = this.y;
    const vx = this.vx;
    const vy = this.vy;
    this.E = 0.5 * m * (vx ** 2 + vy ** 2) + m * g * y;
    this.energy.storeEnergy(this.E);
  }
};

canon_namespace.CanonVis = class {
  constructor() {}
  draw(p5, canon_system, color) {
    let canon_pos_x = canon_system.x;
    let canon_pos_y = p5.height - canon_system.y;

    // Draw canon
    p5.stroke(0);
    p5.fill(color);
    p5.ellipse(canon_pos_x, canon_pos_y, 20, 20);
    // Draw trajectory
    p5.noFill();
    p5.beginShape();
    p5.stroke(color);
    for (let i = 0; i < canon_system.history.length; i++) {
      p5.vertex(
          canon_system.history[i][0], p5.height - canon_system.history[i][1]);
    }
    p5.endShape();
  }
};


canon_namespace.CanonInterfaceEuler = class {
  constructor(method) {
    this.base_name = method + '_canon';
    this.system_euler = new canon_namespace.CanonSystem(method);
    this.vis_euler = new canon_namespace.CanonVis();
    this.system_an = new canon_namespace.CanonSystem('analitical');
    this.vis_an = new canon_namespace.CanonVis();
  }
  iter(p5) {
    this.system_an.calcSystem();
    this.system_euler.calcSystem();

    energy_namespace.drawEnergyGraph(p5, this.system_euler.energy);
    let c_an = color_scheme.GREEN_ALPHA(p5);
    let c_eu = color_scheme.RED(p5);
    this.vis_an.draw(p5, this.system_an, c_an);
    this.vis_euler.draw(p5, this.system_euler, c_eu);

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
canon_namespace.CanonPhaseSpaceBase = class {
  constructor(method) {
    this.base_name = method + '_phase_canon';
    this.scale = 20;
  }
  getSystems(name) {
    let systems = [];
    for (let i = 0; i < 4; i++) {
      systems.push(new canon_namespace.CanonSystem(name));
    }
    let y_0 = 0;
    let y_1 = 20;
    let vy_0 = 0;
    let vy_1 = 10;
    systems[0].parameters.y_0 = y_0;
    systems[0].parameters.vy_0 = vy_0;
    systems[0].initialyzeSystem();
    systems[1].parameters.y_0 = y_0;
    systems[1].parameters.vy_0 = vy_1;
    systems[1].initialyzeSystem();
    systems[2].parameters.y_0 = y_1;
    systems[2].parameters.vy_0 = vy_1;
    systems[2].initialyzeSystem();
    systems[3].parameters.y_0 = y_1;
    systems[3].parameters.vy_0 = vy_0;
    systems[3].initialyzeSystem();
    return systems;
  }
  getMidPoint(systems) {
    let mid_point = [0., 0.];
    for (let i = 0; i < 4; i++) {
      mid_point[0] += systems[i].y;
      mid_point[1] += systems[i].vy * this.scale;
    }
    mid_point[0] /= 4.;
    mid_point[1] /= 4.;
    return mid_point;
  }

  draw(mid_point, systems, color, p5) {
    let vertexes = [];
    for (let i = 0; i < 4; i++) {
      let s = systems[i];
      let y = s.y;
      let vy = s.vy * this.scale;
      vertexes.push([y, vy]);
    }

    p5.stroke(0);
    p5.fill(color);
    p5.beginShape();
    for (let i = 0; i < 4; i++) {
      let x = vertexes[i][0] - mid_point[0] + p5.width / 2.;
      let y = vertexes[i][1] - mid_point[1] + p5.height / 2.;
      p5.vertex(x, y);
    }
    p5.vertex(
        vertexes[0][0] - mid_point[0] + p5.width / 2.,
        vertexes[0][1] - mid_point[1] + p5.height / 2.);
    p5.endShape();
  }

  drawText(mid_point, systems, p5) {
    const index = 3;
    const s = systems[index];
    const x = s.y - mid_point[0] + p5.width / 2.;
    const y = s.vy * this.scale - mid_point[1] + p5.height / 2.;
    // write text
    p5.fill(0);
    p5.stroke(0);
    p5.text('x: ' + s.x.toFixed(0) + 'v: ' + s.vy.toFixed(0), x, y);
  }
};

canon_namespace.CanonPhaseSpaceEuler =
    class extends canon_namespace.CanonPhaseSpaceBase {
  constructor(method) {
    super(method);
    this.systems_eu = this.getSystems(method);
    this.systems_an = this.getSystems('analitical');
  }
  iter(p5) {
    for (let i = 0; i < 4; i++) {
      this.systems_an[i].calcSystem();
      this.systems_eu[i].calcSystem();
    }
    let mid_point = this.getMidPoint(this.systems_an);
    this.draw(mid_point, this.systems_an, color_scheme.GREEN_ALPHA(p5), p5);
    this.draw(mid_point, this.systems_eu, color_scheme.RED(p5), p5);
    this.drawText(mid_point, this.systems_an, p5);
  };
  setup(p5) {}
  reset() {
    for (let i = 0; i < 4; i++) {
      this.systems_eu[i].reset();
      this.systems_an[i].reset();
    }
  }
};

export default canon_namespace;