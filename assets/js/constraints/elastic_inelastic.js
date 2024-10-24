//Simple two balls. One elastic, one inelastic
import color_scheme from "../../js/common/color_scheme.min.js";
import common_vis_namespace from "../../js/common/common_vis.min.js";

let in_elastic = {};
class Parameters {
  constructor() {
    this.x_el = 0;
    this.y_el = 0;
    this.x_in = 0;
    this.y_in = 0;
    this.g = 10;
    this.floor = 10;
    this.width = 300;
    this.sub_steps = 10;
    this.max_history = 3000;
    this.dt = 0.02;
  }
}
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 15;
    this.vx = 30;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.history = [];
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
    //фиктивная точка для пружины
    this.point_el = new Point(this.P.x_el, this.P.y_el);

    // точки маятника
    this.point_in = new Point(this.P.x_in, this.P.y_in);
  }
  calcSystem() {
    for (let i = 0; i < this.P.sub_steps; i++) {
      this.elasticInelacticBounds(this.point_el, true);
      this.elasticInelacticBounds(this.point_in, false);
      this.calcPoint(this.point_el);
      this.calcPoint(this.point_in);
      this.collectHistory(this.point_el);
      this.collectHistory(this.point_in);
    }
  }
  collectHistory(point) {
    let h = point.history;
    h.push([point.x, point.y]);
    if (h.length > this.P.max_history) {
      h.shift();
    }
  }
  calcPoint(point) {
    point.vx += point.ax * this.P.dt;
    point.vy += point.ay * this.P.dt;
    point.x += point.vx * this.P.dt;
    point.y += point.vy * this.P.dt;
    point.ax = 0;
    point.ay = this.P.g;
  }
  elasticInelacticBounds(point, is_elastic) {
    let multi = is_elastic ? 0.8 : 0;
    // check floor and walls
    if (point.y + point.r > this.P.floor) {
      point.y = this.P.floor - point.r;
      point.vy = -point.vy * multi;
    }
    if (point.x + point.r > this.P.width) {
      point.x = this.P.width - point.r;
      point.vx = -point.vx * multi;
    }
    if (point.x - point.r < 0) {
      point.x = point.r;
      point.vx = -point.vx * multi * multi;
    }
  }
}

class Visualizer {
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
    color_to.setAlpha(7);
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
  drawPoint(p5, point, color) {
    this.drawHistory(p5, point.history, color, 30);
    p5.stroke(0);
    p5.fill(color);
    p5.circle(point.x, point.y, 2 * point.r);

  }
  draw(p5, system) {
    //draw floor
    p5.fill(color_scheme.GROUND(p5));
    p5.rect(0, system.P.floor, system.P.width, system.P.floor);

    this.drawPoint(p5, system.point_in, color_scheme.RED(p5));
    this.drawPoint(p5, system.point_el, color_scheme.GREEN(p5));
  }
}

in_elastic.Interface = class {
  constructor(base_name) {
    this.system = new System();
    this.visualizer = new Visualizer(this.system);
    this.base_name = base_name;
  }
  iter(p5) {
    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);
  }
  setup(p5, base_name) {
    this.system.P.x_in = 30;
    this.system.P.y_in = 50;
    this.system.P.x_el = 50;
    this.system.P.y_el = 50;
    this.system.P.floor = p5.height - 50;
    this.system.P.width = p5.width;
  }
  reset() {
    this.system.reset();
  }
};

export default in_elastic;
