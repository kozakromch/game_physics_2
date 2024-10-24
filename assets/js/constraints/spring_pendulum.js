//double pendulum with spring
import color_scheme from "../../js/common/color_scheme.min.js";
import point_namespace from "../../js/common/point.min.js";
import sinusoidal_namespace from "../../js/common/sinusoidal_vis.min.js";
import ui_namespace from "../../js/common/ui.min.js";
import common_vis_namespace from "../../js/common/common_vis.min.js";

let double_pendulum = {};
double_pendulum.Parameters = class {
  constructor() {
    this.inv_m0 = 0;
    this.inv_m1 = 3.0;
    this.inv_m2 = 1.0;
    this.g = 500;
    this.l1 = 70;
    this.l2 = 70;
    this.k1 = 1000;
    this.k2 = 1000;
    this.d1 = 5;
    this.d2 = 5;
    this.mouse_k = 100;
    this.mouse_d = 5;
    this.x_0 = 250;
    this.y_0 = 20;
    this.sub_steps = 30;
    this.max_history = 2000;
    this.dt = 0.0015;
  }
};
double_pendulum.Point = class {
  constructor(x, y, inv_m) {
    this.x = x;
    this.y = y;
    this.inv_m = inv_m;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
  }
};
double_pendulum.System = class {
  constructor() {
    this.P = new double_pendulum.Parameters();
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
  }
  initialyzeSystem() {
    this.histories = [[], []];
    this.t = 0;
    this.points = [];

    //фиктивная точка для пружины
    this.points.push(
      new double_pendulum.Point(this.P.x_0, this.P.y_0, this.P.inv_m0)
    );
    // точки маятника
    this.points.push(
      new double_pendulum.Point(
        this.P.x_0 + this.P.l1,
        this.P.y_0,
        this.P.inv_m1
      )
    );
    this.points.push(
      new double_pendulum.Point(
        this.P.x_0 + this.P.l1 + this.P.l2,
        this.P.y_0,
        this.P.inv_m2
      )
    );
    // create constraints between points
    this.springs = [];
    this.springs.push(
      new point_namespace.Spring(
        this.points[0],
        this.points[1],
        this.P.l1,
        this.P.k1,
        this.P.d1
      )
    );
    this.springs.push(
      new point_namespace.Spring(
        this.points[1],
        this.points[2],
        this.P.l2,
        this.P.k2,
        this.P.d2
      )
    );
    this.spring_added = false;
  }
  calcSystem(is_mouse, mouse_x, mouse_y) {
    this.mouseLogic(is_mouse, mouse_x, mouse_y);
    for (let i = 0; i < this.P.sub_steps; i++) {
      this.t += this.P.dt;
      this.calcAccelerations();
      this.calcPoints();
      this.collectHistory(0);
      this.collectHistory(1);
    }
  }
  mouseLogic(is_mouse, mouse_x, mouse_y) {
    if (is_mouse && !this.spring_added) {
      this.points.push(new double_pendulum.Point(mouse_x, mouse_y, 0));
      this.springs.push(
        new point_namespace.Spring(
          this.points[2],
          this.points[this.points.length - 1],
          0,
          this.P.mouse_k,
          this.P.mouse_d
        )
      );
      this.spring_added = true;
    }
    if (!is_mouse && this.spring_added) {
      this.points.pop();
      this.springs.pop();
      this.spring_added = false;
    }
    if (is_mouse) {
      this.points[this.points.length - 1].x = mouse_x;
      this.points[this.points.length - 1].y = mouse_y;
    }
  }
  // if is_mouse add point at mouse position and create spring
  collectHistory(i) {
    let history = this.histories[i];
    history.push([this.points[i + 1].x, this.points[i + 1].y]);
    if (history.length > this.P.max_history) {
      history.shift();
    }
  }
  calcPoints() {
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.vx += point.ax * this.P.dt;
      point.vy += point.ay * this.P.dt;
      point.x += point.vx * this.P.dt;
      point.y += point.vy * this.P.dt;
      point.ax = 0;
      point.ay = 0;
    }
  }

  // “m1​r¨1​\=−k(d−d0​)d^−c(vrel​⋅d^)d^”
  calcSpring(point_a, point_b, spring) {
    let x_1 = point_a.x;
    let y_1 = point_a.y;
    let vx_1 = point_a.vx;
    let vy_1 = point_a.vy;
    let x_2 = point_b.x;
    let y_2 = point_b.y;
    let vx_2 = point_b.vx;
    let vy_2 = point_b.vy;
    let k = spring.stiffness;
    let d = spring.damping;
    let dist = spring.distance;
    let r_1 = math.matrix([x_1, y_1]);
    let r_2 = math.matrix([x_2, y_2]);
    let r = math.subtract(r_2, r_1);
    let r_norm = math.norm(r);
    if (r_norm == 0) {
      return math.matrix([0, 0]);
    }
    let r_hat = math.divide(r, r_norm);
    let v_1 = math.matrix([vx_1, vy_1]);
    let v_2 = math.matrix([vx_2, vy_2]);
    let v_rel = math.subtract(v_2, v_1);
    let v_rel_dot_r_hat = math.multiply(math.dot(v_rel, r_hat), r_hat);
    let f_k = -k * (dist - r_norm);
    let m_r_dd_k = math.multiply(f_k, r_hat);
    let m_r_dd_d = math.multiply(d, v_rel_dot_r_hat);
    let m_r_dd = math.add(m_r_dd_k, m_r_dd_d);

    return m_r_dd;
  }

  calcSpringAcceleration(spring) {
    let point_a = spring.point1;
    let point_b = spring.point2;
    let m_r_dd = this.calcSpring(point_a, point_b, spring);
    point_a.ax += m_r_dd.get([0]) * point_a.inv_m;
    point_a.ay += m_r_dd.get([1]) * point_a.inv_m;
    point_b.ax -= m_r_dd.get([0]) * point_b.inv_m;
    point_b.ay -= m_r_dd.get([1]) * point_b.inv_m;
  }
  calcAccelerations() {
    for (let i = 0; i < this.springs.length; i++) {
      let spring = this.springs[i];
      this.calcSpringAcceleration(spring);
    }
    //gravity
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      if (point.inv_m == 0) continue;
      point.ay += this.P.g;
    }
  }
};

double_pendulum.Visualizer = class {
  constructor(system) {}
  drawHistory(p5, history, color, radius) {
    let trajectory = [];
    for (let i = 0; i < history.length; i++) {
      trajectory.push({
        x: history[i][0],
        y: history[i][1],
      });
    }
    let color_to = common_vis_namespace.copyColor(p5, color);
    color_to.setAlpha(200);
    let color_from = common_vis_namespace.copyColor(p5, color);
    color_from.setAlpha(0);
    common_vis_namespace.alphaCircle(
      p5,
      color_from,
      color_to,
      0,
      radius / 2,
      trajectory
    );
  }
  draw(p5, system, color) {
    this.drawHistory(p5, system.histories[0], color, 10);
    this.drawHistory(p5, system.histories[1], color, 10);
    for (let i = 0; i < system.springs.length; i++) {
      let spring = system.springs[i];
      let d = spring.distance;
      if (d == 0) d = 100;
      let sin = new sinusoidal_namespace.SpringSinusoidal(100, 5, d * 0.1);
      sin.draw(
        p5,
        spring.point1.x,
        spring.point1.y,
        spring.point2.x,
        spring.point2.y,
        color.alpha
      );
    }
    p5.stroke(0);
    p5.fill(color);
    for (let i = 0; i < system.points.length; i++) {
      let point = system.points[i];
      let d = 50 / (Math.sqrt(point.inv_m) + 1);
      if (point.inv_m == 0) d = 15;
      p5.circle(point.x, point.y, d);
    }
  }
};

double_pendulum.Interface = class {
  constructor(base_name) {
    this.system = new double_pendulum.System();
    this.visualizer = new double_pendulum.Visualizer(this.system);
    this.base_name = base_name;
  }
  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    this.system.calcSystem(is_mouse, mouse_x, mouse_y);
    this.visualizer.draw(p5, this.system, color_scheme.RED(p5));
  }
  setup(p5, base_name) {
    this.system.P.x_0 = p5.width / 2;
    this.system.P.l1 = p5.width * (0.21);
    this.system.P.l2 = p5.width * (0.21);
  }
  reset() {
    this.system.reset();
  }
};

export default double_pendulum;
