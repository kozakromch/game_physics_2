var hard_ball_namespace = hard_ball_namespace || {};
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
hard_ball_namespace.Point = class {
  constructor(x, y, vx, vy, ax, ay) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
  }
};
hard_ball_namespace.SpringConstraint = class {
  constructor(point1, point2, distance) {
    this.point1 = point1;
    this.point2 = point2;
    this.distance = distance;
  }
};

hard_ball_namespace.HardBallSystem = class {
  constructor() {
    this.parameters = new hard_ball_namespace.Parameters();
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
  }
  distance(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
  }

  addSpringConstraint(indent) {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      let point2 = this.points[(i + indent) % this.parameters.num_points];
      let distance = this.distance(point1, point2);
      this.spring_constraints.push(
          new hard_ball_namespace.SpringConstraint(point1, point2, distance));
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
      let x = this.x + this.parameters.radius * Math.cos(angle);
      let y = this.y + this.parameters.radius * Math.sin(angle);
      let vx = this.vx;
      let vy = this.vy;
      let ax = 0;
      let ay = -this.parameters.g;
      this.points.push(new hard_ball_namespace.Point(x, y, vx, vy, ax, ay));
    }

    // create constraints between neibohour points
    this.spring_constraints = [];
    this.addSpringConstraint(1);
    this.addSpringConstraint(2);
    this.addSpringConstraint(3);
    this.addSpringConstraint(4);
    this.addSpringConstraint(5);
    this.point_0_x = this.points[0].x;
    this.point_0_y = this.points[0].y;
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
        point.x, point.y, point.vx, point.vy, this.point_0_x, this.point_0_y, 0,
        0, stiffness, damping, 0);
    point.ax += m_r_dot_dot.get([0]) / this.parameters.m;
    point.ay += m_r_dot_dot.get([1]) / this.parameters.m;
  }
};

hard_ball_namespace.HardBallVis = class {
  constructor() {}
  draw(p5, system, color) {
    let center_x = p5.width / 2;
    let center_y = p5.height / 3;
    p5.stroke(0);
    p5.fill(color);
    for (let i = 0; i < system.parameters.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, p5.height - point.y, 10, 10);
    }
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      p5.line(
          constraint.point1.x, p5.height - constraint.point1.y,
          constraint.point2.x, p5.height - constraint.point2.y);
    }
    // draw spring between point 0 and start point
    p5.line(
        system.points[0].x, p5.height - system.points[0].y, system.point_0_x,
        p5.height - system.point_0_y);
  }
};
function createDiv(parent_id, name, class_attr) {
  let div = document.createElement('div');
  div.setAttribute('class', class_attr);
  let div_name = name;
  div.id = div_name;
  document.getElementById(parent_id).appendChild(div);
  return div;
}

function createSlider(div, min, max) {
  let slider = document.createElement('input');
  slider.setAttribute('type', 'range');
  slider.setAttribute('min', min);
  slider.setAttribute('max', max);
  slider.setAttribute('class', 'form-range align-middle');
  slider.value = (max - min) / 2;
  slider.step = (max - min) / 100;
  slider.id = div.id + 'slider';
  document.getElementById(div.id).appendChild(slider);
  return slider;
}
function createOutput(div) {
  let output = document.createElement('output');
  output.setAttribute('class', 'align-middle');
  output.id = div.id + 'output';
  output.innerHTML = '0';
  document.getElementById(div.id).appendChild(output);
  return output;
}
hard_ball_namespace.HardBallInterface = class {
  constructor() {
    this.hard_ball = new hard_ball_namespace.HardBallSystem();
    this.hard_ball_vis = new hard_ball_namespace.HardBallVis();
    this.base_name = 'hard_ball_sketch';
  }
  iter(p5) {
    this.hard_ball.calcSystem(this.slider1.value, this.slider2.value);
    this.hard_ball_vis.draw(p5, this.hard_ball, color_scheme.RED(p5));
  }
  setup(p5, base_name) {
    {
      let parent_name = base_name + '_add_space';
      let div_c_1 =
          createDiv(parent_name, parent_name + '1', 'col-sm border-end');
      let div_r_1 = createDiv(div_c_1.id, div_c_1.id + '1', 'row');
      let div_m_0 =
          createDiv(div_r_1.id, div_r_1.id + '0', 'col-1 align-middle');
      div_m_0.innerHTML = 'K';
      let div_m_1 = createDiv(div_r_1.id, div_r_1.id + '1', 'col-8');
      let div_m_2 = createDiv(div_r_1.id, div_r_1.id + '2', 'col align-middle');
      this.slider1 = createSlider(div_m_1, 0, 50);
      this.output1 = createOutput(div_m_2);
    }
    this.slider1.oninput = function() {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    {
      let parent_name = base_name + '_add_space';
      let div_c_1 =
          createDiv(parent_name, parent_name + '2', 'col-sm border-start');
      let div_r_1 = createDiv(div_c_1.id, div_c_1.id + '1', 'row');
      let div_m_0 =
          createDiv(div_r_1.id, div_r_1.id + '0', 'col-1 align-middle');
      let div_m_1 = createDiv(div_r_1.id, div_r_1.id + '1', 'col-8');
      let div_m_2 = createDiv(div_r_1.id, div_r_1.id + '2', 'col align-middle');
      this.slider2 = createSlider(div_m_1, 0, 5);
      this.output2 = createOutput(div_m_2);
      div_m_0.innerHTML = 'D';
    }
    this.slider2.oninput = function() {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
  }
  reset() {
    this.hard_ball.reset();
  }
  calcSystem() {
    this.hard_ball.calcSystem();
  }
};