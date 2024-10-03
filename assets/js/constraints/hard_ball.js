import color_scheme from '../../js/common/color_scheme.min.js';
import point_namespace from '../../js/common/point.min.js';
import sinusoidal_namespace from '../../js/common/sinusoidal_vis.min.js';
import ui_namespace from '../../js/common/ui.min.js';

var hard_ball_namespace = {};
hard_ball_namespace.Parameters = class {
  constructor() {
    this.m = 3.0;
    this.g = 10;
    this.num_points = 6;
    this.radius = 70.;
    this.x_0 = 250.;
    this.y_0 = 150.;
    this.vx_0 = 0.;
    this.vy_0 = 0.;
    this.dt = 0.11;
  }
};
hard_ball_namespace.System = class {
  constructor() {
    this.parameters = new hard_ball_namespace.Parameters();
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
    let p_0 = new point_namespace.Point(
        this.parameters.x_0, this.parameters.y_0, this.parameters.vx_0,
        this.parameters.vy_0, 0, 0);
    this.points = [];
    point_namespace.pointCircle(
        this.points, p_0, this.parameters.num_points, this.parameters.radius);
    this.point_0 = new point_namespace.Point(
        this.points[0].x, this.points[0].y, 0, 0, 0, 0);
    // create constraints between points
    this.spring_constraints = [];
    this.addSpringConstraint(1);
    this.addSpringConstraint(2);
    // this.addSpringConstraint(3);
    // this.addSpringConstraint(4);
    // this.addSpringConstraint(5);
  }


  calcSystem(stiffness, damping) {
    this.t += this.parameters.dt;
    this.calcSpringConstraints(stiffness, damping);
    this.calcSpringPoint0(stiffness, damping);
    this.calcPoints();
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
  // “m1​r¨1​\=−k(d−d0​)d^−c(vrel​⋅d^)d^”

  calcSpring(
      x_1, y_1, vx_1, vy_1, x_2, y_2, vx_2, vy_2, stiffness, damping,
      constraint_distance) {
    let r_1 = math.matrix([x_1, y_1]);
    let r_2 = math.matrix([x_2, y_2]);
    let d = math.subtract(r_1, r_2);
    let d_norm = math.norm(d);
    if (d_norm == 0) {
      return math.matrix([0, 0]);
    }
    let d_hat = math.divide(d, d_norm);
    let v_rel = math.matrix([vx_1 - vx_2, vy_1 - vy_2]);
    let v_rel_dot_d_hat = math.multiply(math.dot(v_rel, d_hat), d_hat);
    let f_k = -stiffness * (d_norm - constraint_distance);
    let m_r_dot_dot_k = math.multiply(f_k, d_hat);
    let m_r_dot_dot_c = math.multiply(-damping, v_rel_dot_d_hat);
    let m_r_dot_dot = math.add(m_r_dot_dot_k, m_r_dot_dot_c);
    return m_r_dot_dot;
  }

  calcSpringConstraints(stiffness, damping) {
    for (let i = 0; i < this.spring_constraints.length; i++) {
      let constraint = this.spring_constraints[i];
      let point1 = constraint.point1;
      let point2 = constraint.point2;
      let m_r_dot_dot = this.calcSpring(
          point1.x, point1.y, point1.vx, point1.vy, point2.x, point2.y,
          point2.vx, point2.vy, stiffness, damping, constraint.distance);
      point1.ax += m_r_dot_dot.get([0]) / this.parameters.m;
      point1.ay += m_r_dot_dot.get([1]) / this.parameters.m;
      point2.ax -= m_r_dot_dot.get([0]) / this.parameters.m;
      point2.ay -= m_r_dot_dot.get([1]) / this.parameters.m;
    }
  }
  // spring between point 0 and start point
  calcSpringPoint0(stiffness, damping) {
    let point = this.points[0];
    let m_r_dot_dot = this.calcSpring(
        point.x, point.y, point.vx, point.vy, this.point_0.x, this.point_0.y, 0,
        0, stiffness, damping, 0);
    point.ax += m_r_dot_dot.get([0]) / this.parameters.m;
    point.ay += m_r_dot_dot.get([1]) / this.parameters.m;
  }
};

hard_ball_namespace.Visualizer = class {
  constructor(system) {
    this.spring_sinusoidals = [];
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      let d = constraint.distance;
      this.spring_sinusoidals.push(
          new sinusoidal_namespace.SpringSinusoidal(100, 5, d * 0.1));
    }
    this.spring_sinusoidal_0 =
        new sinusoidal_namespace.SpringSinusoidal(50, 5, 5);
  }
  draw(p5, system, color) {
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      this.spring_sinusoidals[i].draw(
          p5, constraint.point1.x, p5.height - constraint.point1.y,
          constraint.point2.x, p5.height - constraint.point2.y, color.alpha);
    }
    // draw spring between point 0 and start point
    this.spring_sinusoidal_0.draw(
        p5, system.point_0.x, p5.height - system.point_0.y, system.points[0].x,
        p5.height - system.points[0].y, color.alpha);

    p5.stroke(0);
    p5.fill(color);
    for (let i = 0; i < system.parameters.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, p5.height - point.y, 15, 15);
    }
  }
};

hard_ball_namespace.HardBallInterface = class {
  constructor() {
    this.hard_ball = new hard_ball_namespace.System();
    this.hard_ball_vis = new hard_ball_namespace.Visualizer(this.hard_ball);
    this.base_name = 'hard_ball_sketch';
  }
  iter(p5) {
    this.hard_ball.calcSystem(this.slider1.value, this.slider2.value);
    this.hard_ball_vis.draw(p5, this.hard_ball, color_scheme.RED(p5));
  }
  setup(p5, base_name) {
    this.hard_ball.parameters.x_0 = p5.width / 2;
    this.hard_ball.initialyzeSystem();
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(base_name, '1', "K");
      this.slider1 = ui_namespace.createSlider(div_m_1, 0, 150);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function() {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(base_name, '2', "D");
      this.slider2 = ui_namespace.createSlider(div_m_1, 0, 10);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function() {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
  }
  reset() {
    this.hard_ball.reset();
  }
};

export default hard_ball_namespace;