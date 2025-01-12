import color_scheme from "../../js/common/color_scheme.min.js";
import point_namespace from "../../js/common/point.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let pbd_cloth = {};
class Parameters {
  constructor() {
    this.m = 3.0;
    this.g = 1500;
    this.num_points = 50;
    this.width = 500;
    this.height = 300;
    this.dt = 0.02;
    this.floor = 300;
  }
}

class Sphere {
  constructor(x, y, r, ax = 0, ay = 0) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.ax = ax;
    this.ay = ay;
    this.inv_mass = 1 / (Math.PI * r * r);
  }
}

class VerletPoint {
  constructor(x, y, ax = 0, ay = 0) {
    this.x = x;
    this.y = y;
    this.prev_x = x;
    this.prev_y = y;
    this.ax = ax;
    this.ay = ay;
    this.inv_mass = 1.0; // Assume uniform mass for simplicity
  }

  updatePosition(dt) {
    let new_x = this.x + (this.x - this.prev_x) + this.ax * dt * dt;
    let new_y = this.y + (this.y - this.prev_y) + this.ay * dt * dt;
    this.prev_x = this.x;
    this.prev_y = this.y;
    this.x = new_x;
    this.y = new_y;
  }
}

class SpringConstraint {
  constructor(point1, point2, distance, compliance = 0.0) {
    this.point1 = point1;
    this.point2 = point2;
    this.rest_length = distance;
    this.compliance = compliance;
    this.lambda = 0.0; // Lagrange multiplier for XPBD
  }

  solvePBD() {
    let dx = this.point2.x - this.point1.x;
    let dy = this.point2.y - this.point1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let correction = (distance - this.rest_length) / distance;

    let correction_x = (correction * dx) / 2;
    let correction_y = (correction * dy) / 2;

    this.point1.x += correction_x * this.point1.inv_mass;
    this.point1.y += correction_y * this.point1.inv_mass;
    this.point2.x -= correction_x * this.point2.inv_mass;
    this.point2.y -= correction_y * this.point2.inv_mass;
  }
  solveXPBD(dt) {
    let dx = this.point2.x - this.point1.x;
    let dy = this.point2.y - this.point1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    let w1 = this.point1.inv_mass;
    let w2 = this.point2.inv_mass;
    let total_mass = w1 + w2;

    let constraint = distance - this.rest_length;
    let alpha = this.compliance / (dt * dt);

    let delta_lambda =
      -(constraint + alpha * this.lambda) / (total_mass + alpha);
    this.lambda += delta_lambda;

    let correction = delta_lambda / distance;

    let correction_x = correction * dx;
    let correction_y = correction * dy;

    let factor1 = w1 / total_mass;
    let factor2 = w2 / total_mass;

    this.point1.x += correction_x * factor1;
    this.point1.y += correction_y * factor1;
    this.point2.x -= correction_x * factor2;
    this.point2.y -= correction_y * factor2;
  }
}

class System {
  constructor(with_floor) {
    this.relax_iter = 10;
    this.simul_iter = 1;
    this.with_floor = with_floor;
    this.P = new Parameters();
  }
  reset() {
    this.initializeSystem();
  }
  initializeSystem() {
    this.sphere = new Sphere(250, 150, 50, 0, this.P.g);
    this.points = [];
    this.spring_constraints = [];

    let np = this.P.num_points;
    let dx = this.P.width / np;
    let dy = (3 * this.P.height) / 4 / np;

    for (let i = 0; i < np; i++) {
      for (let j = 0; j < np; j++) {
        let x = j * dx;
        let y = i * dy;
        let point = new VerletPoint(x, y, 0, this.P.g);
        this.points.push(point);

        if (j > 0) {
          let point1 = this.points[this.points.length - 1];
          let point2 = this.points[this.points.length - 2];
          let distance = point_namespace.distance(point1, point2);
          this.spring_constraints.push(
            new SpringConstraint(point1, point2, distance)
          );
        }

        if (i > 0) {
          let point1 = this.points[this.points.length - 1];
          let point2 = this.points[this.points.length - 1 - np];
          let distance = point_namespace.distance(point1, point2);
          this.spring_constraints.push(
            new SpringConstraint(point1, point2, distance)
          );
        }
      }
    }
  }

  simulatePBD() {
    for (let i = 0; i < this.relax_iter; i++) {
      this.relaxFixedPoints();
      this.relaxSpringConstraintsPBD();
      this.relaxAllCollisions(this.P.width);
    }

    for (let point of this.points) {
      point.updatePosition(this.P.dt);
    }
  }
  simulateXPBD() {
    //zero lambda
    for (let constraint of this.spring_constraints) {
        constraint.lambda = 0.0;
    }
    // for (let i = 0; i < this.relax_iter; i++) {
      this.relaxFixedPoints();
      this.relaxSpringConstraintsXPBD();
    //   this.relaxAllCollisions(this.P.width);
    // }

    for (let point of this.points) {
      point.updatePosition(this.P.dt);
    }
  }

  relaxSpringConstraintsPBD() {
    for (let constraint of this.spring_constraints) {
      constraint.solvePBD();
    }
  }
  relaxSpringConstraintsXPBD() {
    for (let constraint of this.spring_constraints) {
      constraint.solveXPBD(this.P.dt);
    }
  }

  relaxAllCollisions(width) {
    for (let point of this.points) {
      if (point.y > this.P.floor) {
        point.y = this.P.floor;
        point.prev_y = this.P.floor;
      }
      // also check sides and top
      if (point.x < 0) {
        point.x = 0;
        point.prev_x = 0;
      }
      if (point.x > width) {
        point.x = width;
        point.prev_x = width;
      }
      if (point.y < 0) {
        point.y = 0;
        point.prev_y = 0;
      }
      // collision with sphere
      let sp = this.sphere;
      let dx = point.x - sp.x;
      let dy = point.y - sp.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < sp.r) {
        let dl = sp.r - distance;
        let dl_x = (dl * dx) / distance;
        let dl_y = (dl * dy) / distance;
        point.x += dl_x;
        point.y += dl_y;
      }
    }
  }
  relaxFixedPoints() {
    // фиксируем первую строчку
    let collumn_start = this.P.width / this.P.num_points;
    let collumn_end = this.P.width;
    let dx = (collumn_end - collumn_start) / this.P.num_points;
    let np = this.P.num_points;
    for (let i = 0; i < np; i++) {
      let point = this.points[i];
      point.x = collumn_start + i * dx;
      point.y = 0;
      point.prev_x = point.x;
      point.prev_y = point.y;
      point.vx = 0;
      point.vy = 0;
      point.ax = 0;
      point.ay = 0;
    }
  }
}

class Visualizator {
  constructor(with_floor) {
    this.with_floor = with_floor;
  }
  draw(p5, system, color_scheme, radius = 8) {
    // draw floor
    if (this.with_floor) {
      let lg = color_scheme.GROUND(p5);
      p5.stroke(lg);
      p5.fill(lg);
      p5.rect(0, system.P.floor, p5.width, p5.height - system.P.floor);
    }

    // draw constraints
    let black = color_scheme.BLACK(p5);
    p5.stroke(black);
    p5.fill(black);
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      p5.line(
        constraint.point1.x,
        constraint.point1.y,
        constraint.point2.x,
        constraint.point2.y
      );
    }
    let green = color_scheme.GREEN(p5);
    let red = color_scheme.RED(p5);
    // draw points
    p5.stroke(black);
    p5.fill(red);
    // первые num_points точек - красные
    for (let i = 0; i < system.P.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }
    p5.fill(green);
    // остальные - зеленые
    for (let i = system.P.num_points; i < system.points.length; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }

    // draw sphere
    let blue = color_scheme.BLUE(p5);
    p5.stroke(blue);
    p5.fill(blue);
    p5.ellipse(system.sphere.x, system.sphere.y, 2 * system.sphere.r);
  }
}

pbd_cloth.SimulationInterface = class {
  constructor(base_name, pbd) {
    this.base_name = base_name;
    this.system = new System(true);
    this.visualizator = new Visualizator(true);
    this.iter_new_simul = -1;
    this.pbd = pbd;
  }
  mouseLogic(p5) {
    // get from p5 mouse position
    let mouse_x = p5.mouseX;
    let mouse_y = p5.mouseY;
    // if left mouse button is pressed
    let is_mouse = true;
    if (
      mouse_x < 0 ||
      mouse_x > p5.width ||
      mouse_y < 0 ||
      mouse_y > p5.height
    ) {
      is_mouse = false;
    }
    if (p5.mouseIsPressed == false) {
      is_mouse = false;
    }
    return [is_mouse, mouse_x, mouse_y];
  }
  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = this.mouseLogic(p5);
    let relax_iter = this.slider1.value;
    let alpha = this.slider2.value / 100;
    if (this.pbd) {
      this.system.simulatePBD(
        relax_iter,
        is_mouse,
        mouse_x,
        mouse_y,
        p5.width,
        alpha
      );
    } else {
      this.system.simulateXPBD(
        relax_iter,
        is_mouse,
        mouse_x,
        mouse_y,
        p5.width,
        alpha
      );
    }

    this.visualizator.draw(p5, this.system, color_scheme, 6);
  }
  setup(p5) {
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Relax Iters"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 5, 4);
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
        "Alpha %"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 0, 100, 100);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
    this.alpha = this.slider2.value;

    p5.frameRate(30);

    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 5;
    this.system.initializeSystem();
  }

  reset() {
    this.system.reset();
  }
};

export default pbd_cloth;
