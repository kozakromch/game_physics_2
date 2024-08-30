import color_scheme from '../../js/common/color_scheme.min.js';
import point_namespace from '../../js/common/point.min.js';
import ui_namespace from '../../js/common/ui.min.js';

var hitman_relax_namespace = {};
hitman_relax_namespace.Parameters = class {
  constructor() {
    this.m = 3.0;
    this.g = -3000.;
    this.num_points = 20;
    this.radius = 60.;
    this.x_0 = 250.;
    this.y_0 = 150.;
    this.vx_0 = 0.;
    this.vy_0 = 0.;
    this.dt = 0.02;
    this.floor = 180;
  }
};
hitman_relax_namespace.System = class {
  constructor(with_floor) {
    this.relax_iter = 100;
    this.simul_iter = 1;
    this.with_floor = with_floor;
    this.parameters = new hitman_relax_namespace.Parameters();
    this.min_index = -1;

  }
  reset() {
    this.initialyzeSystem();
  }
  addSpringConstraint(indent) {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      let point2 = this.points[(i + indent) % this.parameters.num_points];
      let distance = point_namespace.distance(point1, point2);
      this.spring_constraints.push(
          new point_namespace.SpringConstraint(point1, point2, distance));
    }
  }
  initialyzeSystem() {
    this.t = 0.;
    this.point_0 = new point_namespace.VerletPoint(
        this.parameters.x_0, this.parameters.y_0, this.parameters.vx_0,
        this.parameters.vy_0, 0, -this.parameters.g);
    this.points = [];
    point_namespace.pointCircle(
        this.points, this.point_0, this.parameters.num_points,
        this.parameters.radius);
    // create constraints between points
    this.spring_constraints = [];
    this.addSpringConstraint(1);


    const np = this.parameters.num_points;
    if (np >= 2 && np <= 10) {
      this.addSpringConstraint(2);
    }
    if (np >= 3 && np <= 10) {
      this.addSpringConstraint(3);
    }
    if (np >= 6 && np <= 20) {
      this.addSpringConstraint(5);
    }
    if (np >= 10 && np <= 20) {
      this.addSpringConstraint(8);
    }
    if (np >= 20 && np <= 30) {
      this.addSpringConstraint(10);
    }
    if (np >= 30 && np <= 40) {
      this.addSpringConstraint(15);
    }
    if (np >= 40 && np <= 50) {
      this.addSpringConstraint(20);
    }
    if (np >= 50 && np <= 60) {
      this.addSpringConstraint(25);
    }

    this.collisions = [];
    if (!this.with_floor) {
      this.sqeezeCircle();
    }
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
      let distance = point_namespace.distance(point, {x: mouse_x, y: mouse_y});
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
      //also check sides and top
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

  relaxCollisionConstraint(index) {
    let point = this.points[index];
    point.y = this.parameters.floor;
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
  relaxOneConstraint(index) {
    let constraint = this.spring_constraints[index];
    let point1 = constraint.point1;
    let point2 = constraint.point2;
    let distance = point_namespace.distance(point1, point2);
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    let dl = distance - constraint.distance;
    let dl_x = dl * dx / distance;
    let dl_y = dl * dy / distance;
    point1.x -= dl_x / 2;
    point1.y -= dl_y / 2;
    point2.x += dl_x / 2;
    point2.y += dl_y / 2;
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
};

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
          0, system.parameters.floor, p5.width,
          p5.height - system.parameters.floor);
    }

    // draw constraints
    let black = color_scheme.BLACK(p5);
    p5.stroke(black);
    p5.fill(black);
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      p5.line(
          constraint.point1.x, constraint.point1.y, constraint.point2.x,
          constraint.point2.y);
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
  constructor(base_name, with_floor) {
    this.base_name = base_name;
    this.with_floor = with_floor;
    this.system = new hitman_relax_namespace.System(this.with_floor);
    this.visualizator =
        new hitman_relax_namespace.Visualizator(this.with_floor);
    this.index = 0;
    this.completed_iter = -1;
  }
  getFirstViolatedConstraint(start_index) {
    for (let i = start_index; i < this.system.spring_constraints.length; i++) {
      let ind = i;
      if (this.system.isOneConstraintViolated(ind)) {
        return ind;
      }
    }
    return
  }
  relaxConstraint() {
    if (this.index < this.system.collisions.length) {
      this.system.relaxCollisionConstraint(this.system.collisions[this.index]);
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
    this.relaxConstraint();
    this.index = (this.index + 1) %
        (this.system.collisions.length + this.system.spring_constraints.length);
    this.visualizator.draw(p5, this.system, color_scheme);
    // text of completed iterations
    p5.fill(0);
    p5.text('Completed Iterations: ' + this.completed_iter, 10, 20);
  }
  reset() {
    this.system.reset();
  }
  setup(p5) {
    p5.frameRate(50);
    this.system.parameters.x_0 = p5.width / 2;
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
    if (mouse_x < 0 || mouse_x > p5.width || mouse_y < 0 ||
        mouse_y > p5.height) {
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
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(this.base_name, '1', 'Relax Iters');
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 100, 99);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function() {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    {
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(this.base_name, '2', 'N points');
      this.slider2 = ui_namespace.createSlider(div_m_1, 4, 20, 16);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function() {
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