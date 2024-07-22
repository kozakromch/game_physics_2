var soft_ball_namespace = soft_ball_namespace || {};
soft_ball_namespace.Parameters = class {
  constructor() {
    this.m = 20.0;
    this.g = 1.5;
    this.num_points = 30;
    this.radius = 50.;
    this.x_0 = 250.;
    this.y_0 = 200.;
    this.vx_0 = 0.;
    this.vy_0 = 0.;
    this.dt = 0.2;
  }
};
soft_ball_namespace.Point = class {
  constructor(x, y, vx, vy, ax, ay) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
  }
};
soft_ball_namespace.SpringConstraint = class {
  constructor(point1, point2, distance, frequency, damping) {
    this.point1 = point1;
    this.point2 = point2;
    this.distance = distance;
    this.frequency = frequency;
    this.critical_damping = damping;
  }
};
// constraint for volume conservation
soft_ball_namespace.VolumeConstraint = class {
  constructor(points, volume) {
    this.points = points;
    this.volume = volume;
  }
};
soft_ball_namespace.SoftBallSystem = class {
  constructor() {
    this.parameters = new soft_ball_namespace.Parameters();
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
  }
  distance(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
  }

  addSpringConstraint(indent, frequency, damping) {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      let point2 = this.points[(i + indent) % this.parameters.num_points];
      let distance = this.distance(point1, point2);
      this.spring_constraints.push(new soft_ball_namespace.SpringConstraint(
          point1, point2, distance, frequency, damping));
    }
  }
  initialyzeSystem() {
    this.x = this.parameters.x_0;
    this.y = this.parameters.y_0;
    this.vx = this.parameters.vx_0;
    this.vy = this.parameters.vy_0;
    this.t = 0.;
    // create 2d circle points
    this.points = [];
    for (let i = 0; i < this.parameters.num_points; i++) {
      let angle =
          Math.PI / 2 + (2 * Math.PI / (this.parameters.num_points)) * i;
      // position of the point
      let x = this.x + this.parameters.radius * Math.cos(angle);
      let y = this.y + this.parameters.radius * Math.sin(angle);
      // velocity of the point
      let vx = this.vx;
      let vy = this.vy;
      // acceleration of the point
      let ax = 0;
      let ay = -this.parameters.g;
      this.points.push(new soft_ball_namespace.Point(x, y, vx, vy, ax, ay));
    }
    this.point_0_x = this.points[0].x;
    this.point_0_y = this.points[0].y;
    this.point_0_x_target = this.points[0].x;
    this.point_0_y_target = this.points[0].y;

    // create constraints between neibohour points
    this.spring_constraints = [];
    this.addSpringConstraint(1, 20.9, 1.1);
    this.addSpringConstraint(2, 5.8, 0.9);
    this.addSpringConstraint(3, 0.8, 0.1);
    this.addSpringConstraint(4, 0.3, 0.1);
    this.addSpringConstraint(5, 0.3, 0.1);
    this.addSpringConstraint(6, 0.3, 0.1);
    this.addSpringConstraint(7, 0.3, 0.1);
    this.addSpringConstraint(8, 0.3, 0.1);
    this.addSpringConstraint(9, 0.3, 0.1);
    this.addSpringConstraint(10, 0.1, 0.1);
    this.addSpringConstraint(11, 0.1, 0.1);
    this.addSpringConstraint(12, 0.1, 0.1);
    this.addSpringConstraint(13, 0.1, 0.1);
    this.addSpringConstraint(14, 0.1, 0.1);
  }

  // can be called without arguments
  calcSystem(is_mouse = false, mouse_x = 0, mouse_y = 0) {
    this.t += this.parameters.dt;
    this.mouseLogic(is_mouse, mouse_x, mouse_y);
    this.fixFirstPoint();
    this.calcSpringConstraints(this.spring_constraints);
    this.fixFirstPoint();
    this.calcPoints();
    this.fixFirstPoint();
  }
  mouseLogic(is_mouse, mouse_x, mouse_y) {
    if (is_mouse) {
      this.point_0_x_target = mouse_x;
      this.point_0_y_target = mouse_y;
    } else {
      this.point_0_x_target = this.point_0_x;
      this.point_0_y_target = this.point_0_y;
    }
  }

  fixFirstPoint() {
    this.points[0].x = this.point_0_x_target;
    this.points[0].y = this.point_0_y_target;
    this.points[0].vx = 0;
    this.points[0].vy = 0;
    this.points[0].ax = 0;
    this.points[0].ay = 0;
  }
  calcPoints() {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point = this.points[i];
      point.vx += point.ax * this.parameters.dt;
      point.vy += point.ay * this.parameters.dt;
      point.x += point.vx * this.parameters.dt;
      point.y += point.vy * this.parameters.dt;
      point.ax = 0;
      point.ay = -this.parameters.g;
    }
  }
  calcSpringConstraints(constraints) {
    for (let i = 0; i < constraints.length; i++) {
      let constraint = constraints[i];
      let point1 = constraint.point1;
      let point2 = constraint.point2;
      let constraint_distance = constraint.distance;
      let distance = this.distance(point1, point2);
      let dx = point2.x - point1.x;
      let dy = point2.y - point1.y;
      let freq = constraint.frequency;
      let f = freq * (distance - constraint_distance);
      let damping = constraint.critical_damping;
      let dvx = point2.vx - point1.vx;
      let dvy = point2.vy - point1.vy;
      let fx = f * dx / distance + freq * damping * dvx;
      let fy = f * dy / distance + freq * damping * dvy;
      point1.ax += fx / this.parameters.m;
      point1.ay += fy / this.parameters.m;
      point2.ax -= fx / this.parameters.m;
      point2.ay -= fy / this.parameters.m;
    }
  }
};

soft_ball_namespace.SoftBallVis = class {
  constructor() {}
  draw(p5, system, color) {
    let center_x = p5.width / 2;
    let center_y = p5.height / 3;
    p5.stroke(0);
    p5.fill(color);
    for (let i = 0; i < system.parameters.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, p5.height - point.y, 5, 5);
    }
  }
};


soft_ball_namespace.SoftBallInterface = class {
  constructor() {
    this.soft_ball = new soft_ball_namespace.SoftBallSystem();
    this.soft_ball_vis = new soft_ball_namespace.SoftBallVis();
    this.base_name = 'soft_ball_sketch';
  }
  iter(p5) {
    // get from p5 mouse position
    let mouse_x = p5.mouseX;
    let mouse_y = p5.height - p5.mouseY;
    // if left mouse button is pressed
    let is_mouse = true;
    if (mouse_x < 0 || mouse_x > p5.width || mouse_y < 0 ||
        mouse_y > p5.height) {
      is_mouse = false;
    }
    this.soft_ball.calcSystem(is_mouse, mouse_x, mouse_y);
    this.soft_ball_vis.draw(p5, this.soft_ball, color_scheme.RED(p5));
  }
  reset() {
    this.soft_ball.reset();
  }
  setup(p5) {}
  calcSystem() {
    this.soft_ball.calcSystem();
  }
};
