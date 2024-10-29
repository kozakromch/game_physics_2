import color_scheme from "../../js/common/color_scheme.min.js";
import point_namespace from "../../js/common/point.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let pbd_collision = {};
class Parameters {
  constructor() {
    this.m = 3.0;
    this.g = -30;
    this.dt = 0.02;
    this.floor = 10;
  }
}

class Object {
  constructor(x_0, y_0, n_points, radius) {
    this.n_points = n_points;
    this.radius = radius;
    let point_0 = new point_namespace.VerletPoint(x_0, y_0, 0, 0, 0, 0);
    this.points = [];
    point_namespace.pointCircle(this.points, point_0, n_points, radius);
    this.border = [];
    this.spring_constraints = [];
    this.addSpringConstraint(this.border, 1);
    this.addSpringConstraint(this.spring_constraints, 1);
    this.addSpringConstraint(this.spring_constraints, 2);
    this.addSpringConstraint(this.spring_constraints, 3);
  }
  addSpringConstraint(arr, indent) {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      let point2 = this.points[(i + indent) % this.parameters.num_points];
      let distance = point_namespace.distance(point1, point2);
      arr.push(new point_namespace.SpringConstraint(point1, point2, distance));
    }
  }
  relaxSprings() {
    for (let i = 0; i < this.spring_constraints.length; i++) {
      let constraint = this.spring_constraints[i];
      let point1 = constraint.point1;
      let point2 = constraint.point2;
      let distance = point_namespace.distance(point1, point2);
      let dx = point1.x - point2.x;
      let dy = point1.y - point2.y;
      let dl = distance - constraint.distance;
      let dl_x = (dl * dx) / distance;
      let dl_y = (dl * dy) / distance;
      point1.x -= (alpha_over_relax * dl_x) / 2;
      point1.y -= (alpha_over_relax * dl_y) / 2;
      point2.x += (alpha_over_relax * dl_x) / 2;
      point2.y += (alpha_over_relax * dl_y) / 2;
    }
  }
}

class System {
  constructor() {
    this.P = new Parameters();
this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
  }

  initialyzeSystem() {
    this.t = 0;
    this.O1 = new Object(200, 200, 10, 50);
    this.O2 = new Object(400, 200, 10, 50);
    this.t = 0;
  }
  calcSystem() {
    this.t += this.parameters.dt;
  }
  simulate(relax_iter, is_mouse, mouse_x, mouse_y, width) {
    this.mouseLogic(is_mouse, mouse_x, mouse_y);
    this.relax_iter = relax_iter;
    this.relaxAllCollisions(width);
    this.verlet();
    // this.updatePrevP();
    for (let i = 0; i < this.relax_iter; i++) {
      this.relaxAllSpringConstraints();
      this.relaxAllCollisions();
    }
  }
  mouseLogic(is_mouse, mouse_x, mouse_y) {
    // find the closest point to the mouse
    if (is_mouse) {
      if (this.min_index == -1) {
        this.findClosestToMouse(mouse_x, mouse_y);
      }
      let point = this.points[this.min_index];
      point.x = mouse_x;
      point.y = mouse_y;
    } else {
      this.min_index = -1;
    }
  }

  findClosestToMouse(mouse_x, mouse_y) {
    let min_distance = 100000;
    let min_index = 0;
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      let distance = point_namespace.distance(point, {
        x: mouse_x,
        y: mouse_y,
      });
      if (distance < min_distance) {
        min_distance = distance;
        min_index = i;
      }
    }
    this.min_index = min_index;
  }

  relaxAllCollisions(width) {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      if (point.y > this.parameters.floor) {
        point.y = this.parameters.floor;
        point.prev_y = this.parameters.floor;
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
    }
  }
  relaxAllSpringConstraints() {
    for (let i = 0; i < this.spring_constraints.length; i++) {
      this.relaxOneConstraint(i);
    }
  }

  verlet() {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      let x = point.x;
      let y = point.y;
      let p_x = point.prev_x;
      let p_y = point.prev_y;
      let ax = point.ax;
      let ay = point.ay;
      let dt = this.parameters.dt;
      let new_x = 2 * x - p_x + ax * dt * dt;
      let new_y = 2 * y - p_y + ay * dt * dt;
      point.prev_x = x;
      point.prev_y = y;
      point.x = new_x;
      point.y = new_y;
    }
  }
  updatePrevP() {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      point.prev_x = point.x;
      point.prev_y = point.y;
    }
  }
  calcCollisions() {
    this.collisions = [];
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      if (point1.y > this.parameters.floor) {
        this.collisions.push(i);
      }
    }
  }

  relaxCollisionConstraint(index, alpha_over_relax = 1.0) {
    let point = this.points[index];
    let delta = this.parameters.floor - point.y;
    point.y = delta * alpha_over_relax + point.y;
  }
  isOneConstraintViolated(index) {
    let constraint = this.spring_constraints[index];
    let point1 = constraint.point1;
    let point2 = constraint.point2;
    let distance = point_namespace.distance(point1, point2);
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    let dl = distance - constraint.distance;
    return dl * dl > 0.1;
  }
  relaxOneConstraint(index, alpha_over_relax = 1.0) {
    let constraint = this.spring_constraints[index];
    let point1 = constraint.point1;
    let point2 = constraint.point2;
    let distance = point_namespace.distance(point1, point2);
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    let dl = distance - constraint.distance;
    let dl_x = (dl * dx) / distance;
    let dl_y = (dl * dy) / distance;
    point1.x -= (alpha_over_relax * dl_x) / 2;
    point1.y -= (alpha_over_relax * dl_y) / 2;
    point2.x += (alpha_over_relax * dl_x) / 2;
    point2.y += (alpha_over_relax * dl_y) / 2;
  }
  // sqeeze points from circle to ellipse
  sqeezeCircle() {
    let a = 0.2;
    let b = 1.9;
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      let x = point.x - this.point_0.x;
      let y = point.y - this.point_0.y;
      let x_new = x * a;
      let y_new = y * b;
      point.x = x_new + this.point_0.x;
      point.y = y_new + this.point_0.y;
    }
  }
}

hitman_relax_namespace.Visualizator = class {
  constructor(with_floor) {
    this.with_floor = with_floor;
  }
  draw(p5, system, color_scheme, radius = 12) {
    // draw floor
    if (this.with_floor) {
      let lg = color_scheme.GROUND(p5);
      p5.stroke(lg);
      p5.fill(lg);
      p5.rect(
        0,
        system.parameters.floor,
        p5.width,
        p5.height - system.parameters.floor
      );
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
    // draw points
    p5.stroke(black);
    p5.fill(green);
    for (let i = 0; i < system.parameters.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }
  }
};

hitman_relax_namespace.RelaxInterface = class {
  constructor(base_name, with_floor, with_overrelax = false) {
    this.base_name = base_name;
    this.with_floor = with_floor;
    this.system = new hitman_relax_namespace.System(this.with_floor);
    this.visualizator = new hitman_relax_namespace.Visualizator(
      this.with_floor
    );
    this.index = 0;
    this.completed_iter = -1;
    this.iter_new_simul = -1;
    this.with_overrelax = with_overrelax;
  }
  getFirstViolatedConstraint(start_index) {
    for (let i = start_index; i < this.system.spring_constraints.length; i++) {
      let ind = i;
      if (this.system.isOneConstraintViolated(ind)) {
        return ind;
      }
    }
    return;
  }
  relaxConstraint(alpha_over_relax = 1.0) {
    if (this.index < this.system.collisions.length) {
      this.system.relaxCollisionConstraint(
        this.system.collisions[this.index],
        alpha_over_relax
      );
    } else {
      let ind = this.index - this.system.collisions.length;

      ind = this.getFirstViolatedConstraint(ind);
      if (ind != undefined) {
        this.system.relaxOneConstraint(ind);
        this.index = ind + this.system.collisions.length;
      } else {
        this.index = -1;
      }
    }
  }
  iter(p5) {
    if (this.index == 0) {
      if (this.with_floor) {
        this.system.calcCollisions();
      }
      this.completed_iter++;
    }
    if (this.with_overrelax) {
      this.iterOverrelax();
    } else {
      this.relaxConstraint();
    }
    this.index =
      (this.index + 1) %
      (this.system.collisions.length + this.system.spring_constraints.length);
    this.visualizator.draw(p5, this.system, color_scheme);

    p5.fill(0);
    p5.text("Completed Iterations: " + this.completed_iter, 10, 20);
  }
  iterOverrelax() {
    this.newSimulation();
    let alpha_over_relax = this.slider2.value;
    if (this.completed_iter > this.overrelax_iter) {
      alpha_over_relax = 1.0;
    }
    this.relaxConstraint(alpha_over_relax);
  }
  newSimulation() {
    let overrelax_iter_new = this.slider1.value;
    if (this.overrelax_iter != overrelax_iter_new) {
      this.iter_new_simul = 8;
      this.overrelax_iter = overrelax_iter_new;
    }
    if (this.iter_new_simul >= 0) {
      this.iter_new_simul--;
    }
    if (this.iter_new_simul == 0) {
      this.system.initialyzeSystem();
    }
  }
  reset() {
    this.system.initialyzeSystem();
    this.completed_iter = -1;
    this.index = 0;
  }
  setup(p5) {
    p5.frameRate(50);
    this.system.parameters.x_0 = p5.width / 2;
    this.system.initialyzeSystem();
    if (this.with_overrelax) {
      this.setupOverrelax(p5);
    }
  }
  setupOverrelax(p5) {
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "OverRelax Iters"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 10, 9);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    this.overrelax_iter = this.slider1.value;

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "2",
        "Alpha over"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 1, 2, 20);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
    this.system.initialyzeSystem();
  }
};

hitman_relax_namespace.SimulationInterface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new hitman_relax_namespace.System(true);
    this.visualizator = new hitman_relax_namespace.Visualizator(true);
    this.iter_new_simul = -1;
  }
  iter(p5) {
    let n_points_new = this.slider2.value;
    if (this.n_points != n_points_new) {
      this.iter_new_simul = 8;
      this.n_points = n_points_new;
    }
    if (this.iter_new_simul >= 0) {
      this.iter_new_simul--;
    }
    if (this.iter_new_simul == 0) {
      this.system.parameters.num_points = n_points_new;
      this.system.initialyzeSystem();
    }
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

    let relax_iter = this.slider1.value;
    this.system.simulate(relax_iter, is_mouse, mouse_x, mouse_y, p5.width);
    this.visualizator.draw(p5, this.system, color_scheme, 8);
  }
  setup(p5) {
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Relax Iters"
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
        "N points"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 4, 20, 16);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
    this.n_points = this.slider2.value;

    p5.frameRate(30);

    this.system.parameters.x_0 = p5.width / 2;
    this.system.parameters.num_points = this.n_points;
    this.system.parameters.radius = 50;
    this.system.parameters.floor = 250;
    this.system.parameters.y_0 = 50;
    this.system.initialyzeSystem();
  }

  reset() {
    this.system.reset();
  }
};

export default hitman_relax_namespace;
