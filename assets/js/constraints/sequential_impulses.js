import color_scheme from "../../js/common/color_scheme.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let sequential_impulses = {};
class PendulumParameters {
  constructor() {
    this.g = 10000;
    this.dt = 0.0005;
    this.width = 800;
    this.height = 800;
    this.length = 80;
    this.substeps = 10;
  }
}
class Pendulum {
  constructor() {
    this.P = new PendulumParameters();
  }
  init() {
    this.position = { x: this.P.width / 2 + this.P.length, y: 0 };
    this.anchor = { x: this.P.width / 2, y: 0 };
    this.velocity = { x: 0, y: 0 };
  }

  applyGravity() {
    this.velocity.y += this.P.g * this.P.dt;
  }

  satisfyConstraint() {
    let dx = this.position.x - this.anchor.x;
    let dy = this.position.y - this.anchor.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    let diff = (dist - this.length) / dist;

    // Correct velocity
    let velDot = (this.velocity.x * dx + this.velocity.y * dy) / dist;
    this.velocity.x -= (velDot * dx) / dist;
    this.velocity.y -= (velDot * dy) / dist;
    // Baumgarte stabilization
  }
  calcSystem() {
    this.applyGravity();
    this.position.x += this.velocity.x * this.P.dt;
    this.position.y += this.velocity.y * this.P.dt;
    this.satisfyConstraint();
  }
  reset() {
    this.init();
  }
}

class PendulumVisualizer {
  constructor(system) {
    this.system = system;
  }

  draw(p5) {
    p5.stroke(color_scheme.BLACK(p5));
    p5.fill(color_scheme.GREEN(p5));
    p5.ellipseMode(p5.CENTER);
    // Draw the line connecting the mass to the anchor
    p5.line(
      this.system.anchor.x,
      this.system.anchor.y,
      this.system.position.x,
      this.system.position.y
    );

    // Draw the anchor
    p5.ellipse(this.system.anchor.x, this.system.anchor.y, 10, 10);

    // Draw the mass
    p5.ellipse(this.system.position.x, this.system.position.y, 20, 20);
  }
}
sequential_impulses.PendulumInterface = class {
  constructor(base_name) {
    this.system = new Pendulum();
    this.visualizer = new PendulumVisualizer(this.system);
    this.base_name = base_name;
  }
  iter(p5) {
    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);
  }
  setup(p5, base_name) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.length = 100;
    this.system.init();
  }
  reset() {
    this.system.reset();
  }
};

class DoublePendulum {
  constructor() {
    this.P = new PendulumParameters();
  }
  init() {
    this.anchor = {
      pos: { x: this.P.width / 2, y: 10 },
    };
    this.L1 = this.P.length;
    this.L2 = this.P.length;
    this.g = this.P.g;
    this.dt = this.P.dt;
    this.reset();
  }
  reset() {
    this.mass1 = {
      pos: { x: this.anchor.pos.x + this.L1, y: this.anchor.pos.y },
      vel: { x: 0, y: 0 },
    };
    this.mass2 = {
      pos: { x: this.mass1.pos.x + this.L2, y: this.mass1.pos.y },
      vel: { x: 0, y: 0 },
    };
  }

  applyGravity() {
    this.mass1.vel.y += this.g * this.dt;
    this.mass2.vel.y += this.g * this.dt;
  }

  integrate() {
    this.mass1.pos.x += this.mass1.vel.x * this.dt;
    this.mass1.pos.y += this.mass1.vel.y * this.dt;
    this.mass2.pos.x += this.mass2.vel.x * this.dt;
    this.mass2.pos.y += this.mass2.vel.y * this.dt;
  }

  satisfyConstraint(p1, p2, targetDist, beta) {
    let dx = p2.pos.x - p1.pos.x;
    let dy = p2.pos.y - p1.pos.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let diff = dist - targetDist;
    if (dist === 0) {
      // Avoid division by zero
      return;
    }

    let invDist = 1.0 / dist;
    let correction = (beta / this.dt) * diff;

    // velocity difference along the constraint
    let vdx = p2.vel.x;
    let vdy = p2.vel.y;
    if (p1.vel) {
      vdx -= p1.vel.x;
      vdy -= p1.vel.y;
    }

    let velAlong = (vdx * dx + vdy * dy) * invDist;
    let totalCorrection = velAlong + correction;

    let corrX = totalCorrection * dx * invDist;
    let corrY = totalCorrection * dy * invDist;

    if (p1.vel) {
      p1.vel.x += corrX * 0.5;
      p1.vel.y += corrY * 0.5;
      p2.vel.x -= corrX * 0.5;
      p2.vel.y -= corrY * 0.5;
    } else {
      // anchor is fixed
      p2.vel.x -= corrX;
      p2.vel.y -= corrY;
    }
  }

  satisfyConstraints(beta) {
    this.satisfyConstraint(this.anchor, this.mass1, this.L1, beta);
    this.satisfyConstraint(this.mass1, this.mass2, this.L2, beta);
  }

  calcSystem(is_mouse = false, mouse_x = 0, mouse_y = 0, beta = 0) {
    if (is_mouse) {
      this.mass2.pos.x = mouse_x;
      this.mass2.pos.y = mouse_y;
    }
    for (let i = 0; i < this.P.substeps; i++) {
      this.applyGravity();
      this.integrate();
      this.satisfyConstraints(beta);
      if (is_mouse) {
        this.mass2.pos.x = mouse_x;
        this.mass2.pos.y = mouse_y;
      }
    }
  }
}

class DoublePendulumVisualizer {
  constructor(system) {
    this.system = system;
  }

  draw(p5) {
    p5.stroke(color_scheme.BLACK(p5));

    p5.fill(color_scheme.GREEN(p5));
    p5.ellipseMode(p5.CENTER);
    // Draw the lines connecting the masses
    p5.line(
      this.system.anchor.pos.x,
      this.system.anchor.pos.y,
      this.system.mass1.pos.x,
      this.system.mass1.pos.y
    );
    p5.line(
      this.system.mass1.pos.x,
      this.system.mass1.pos.y,
      this.system.mass2.pos.x,
      this.system.mass2.pos.y
    );

    // Draw the anchor
    p5.ellipse(this.system.anchor.pos.x, this.system.anchor.pos.y, 10, 10);

    // Draw the first mass
    p5.ellipse(this.system.mass1.pos.x, this.system.mass1.pos.y, 20, 20);

    // Draw the second mass
    p5.ellipse(this.system.mass2.pos.x, this.system.mass2.pos.y, 20, 20);
  }
}
sequential_impulses.DoublePendulumInterface = class {
  constructor(base_name) {
    this.system = new DoublePendulum();
    this.visualizer = new DoublePendulumVisualizer(this.system);
    this.base_name = base_name;
  }

  iter(p5) {
    // get from p5 mouse position
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    this.system.calcSystem(is_mouse, mouse_x, mouse_y, this.slider1.value);
    this.visualizer.draw(p5, this.system);
  }
  setup(p5, base_name) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.length = 100;
    this.system.init();
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "ß"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 0, 1, 100);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
  }
  reset() {
    this.system.reset();
  }
};

export default sequential_impulses;
