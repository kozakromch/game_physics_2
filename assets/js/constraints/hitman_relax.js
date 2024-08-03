import color_scheme from '../../js/common/color_scheme.min.js';
import point_namespace from '../../js/common/point.min.js';

var hitman_relax_namespace = {};
hitman_relax_namespace.Parameters = class {
  constructor() {
    this.m = 3.0;
    this.g = 0;
    this.num_points = 20;
    this.radius = 60.;
    this.x_0 = 250.;
    this.y_0 = 150.;
    this.vx_0 = 0.;
    this.vy_0 = 0.;
    this.dt = 0.1;
    this.floor = 180;
  }
};
hitman_relax_namespace.System = class {
  constructor(with_floor) {
    this.with_floor = with_floor;
    this.parameters = new hitman_relax_namespace.Parameters();
    this.initialyzeSystem();
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
    this.point_0 = new point_namespace.Point(
        this.parameters.x_0, this.parameters.y_0, this.parameters.vx_0,
        this.parameters.vy_0, 0, -this.parameters.g);
    this.points = [];
    point_namespace.pointCircle(
        this.points, this.point_0, this.parameters.num_points,
        this.parameters.radius);
    // create constraints between points
    this.spring_constraints = [];
    this.addSpringConstraint(1);
    this.addSpringConstraint(2);
    // this.addSpringConstraint(3);
    this.addSpringConstraint(4);
    // this.addSpringConstraint(5);
    this.addSpringConstraint(6);
    // this.addSpringConstraint(7);
    // this.addSpringConstraint(8);
    // this.addSpringConstraint(9);
    this.addSpringConstraint(10);
    // this.addSpringConstraint(11);
    // this.addSpringConstraint(12);
    // this.addSpringConstraint(8);
    // this.addSpringConstraint(12);
    // this.addSpringConstraint(15);
    this.collisions = [];
    if (!this.with_floor) {
      this.sqeezeCircle();
    }
  }
  calcSystem() {
    this.t += this.parameters.dt;
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
  draw(p5, system, color_scheme) {
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
      p5.ellipse(point.x, point.y, 12, 12);
    }
  }
};

hitman_relax_namespace.Interface = class {
  constructor(base_name, with_floor) {
    this.base_name = base_name;
    this.with_floor = with_floor;
    this.system = new hitman_relax_namespace.System(this.with_floor);
    this.visualizator = new hitman_relax_namespace.Visualizator(this.with_floor);
    this.index = 0;
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
    }
    this.relaxConstraint();
    this.index = (this.index + 1) %
        (this.system.collisions.length + this.system.spring_constraints.length);
    this.visualizator.draw(p5, this.system, color_scheme);
  }
  reset() {
    this.system.reset();
  }
  setup(p5) {
    p5.frameRate(50);
    this.system.parameters.x_0 = p5.width / 2;
  }
};

export default hitman_relax_namespace;