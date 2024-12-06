import color_scheme from "../../js/common/color_scheme.min.js";
import point_namespace from "../../js/common/point.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let pbd_volume = {};
class Parameters {
  constructor() {
    this.m = 1.0;
    this.g = 5000;
    this.dt = 0.0001;
    this.floor = 10;
    this.width = 800;
    this.height = 800;
  }
}

// 1. Function to calculate the area (volume) of a 2D shape
function calculateArea(points) {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; // Wrap around to the first point
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }

  return Math.abs(area / 2); // Return absolute value of the area
}
function relaxPoints(points, targetArea, iterations = 1) {
  const n = points.length;

  // Helper function to compute the area constraint
  function areaConstraint(points) {
    return calculateArea(points) - targetArea;
  }

  // Helper function to compute the gradient of the area constraint
  function gradient(points, idx) {
    const prev = (idx - 1 + n) % n;
    const next = (idx + 1) % n;

    return {
      x: (points[prev].y - points[next].y) / 2,
      y: (points[next].x - points[prev].x) / 2,
    };
  }

  for (let iter = 0; iter < iterations; iter++) {
    const C = areaConstraint(points);
    if (Math.abs(C) < 1e-1) {
      break; // Convergence criterion
    }

    // Compute the denominator for the scaling factor
    let denominator = 0;
    const gradients = [];

    for (let i = 0; i < n; i++) {
      const grad = gradient(points, i);
      gradients.push(grad); // Store gradient for later use
      denominator += grad.x * grad.x + grad.y * grad.y;
    }

    // Compute the scaling factor
    const s = C / denominator;

    // Apply corrections to each point
    for (let i = 0; i < n; i++) {
      points[i].x += s * gradients[i].x;
      points[i].y += s * gradients[i].y;
    }
  }
}

class Object {
  constructor(x_0, y_0, n_points, radius, parameters) {
    this.P = parameters;
    this.n_points = n_points;
    this.radius = radius;
    let point_0 = new point_namespace.VerletPoint(x_0, y_0, 0, 0, 0, 0);
    this.center_of_mass = { x: x_0, y: y_0 };
    this.points = [];
    point_namespace.pointCircle(this.points, point_0, n_points, radius);
    this.spring_constraints = [];
    this.addSpringConstraints(this.spring_constraints, 1);
    // randomize spring constraints
    // this.spring_constraints = this.spring_constraints.sort(
    // () => Math.random() - 0.5
    // );
    this.min_index = -1;
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.old_x = point.x;
      point.old_y = point.y;
    }
    this.initial_area = calculateArea(this.points);
  }
  integrate() {
    //semi-implicit euler integration
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.vy += this.P.g;
      point.x += point.vx * this.P.dt;
      point.y += point.vy * this.P.dt;
    }
  }
  addSpringConstraints(arr, indent) {
    for (let i = 0; i < this.n_points; i++) {
      let point1 = this.points[i];
      let point2 = this.points[(i + indent) % this.n_points];
      let distance = point_namespace.distance(point1, point2);
      arr.push(new point_namespace.SpringConstraint(point1, point2, distance));
    }
  }
  relaxSprings() {
    let alpha_over_relax = 1.0;
    for (let i = 0; i < this.spring_constraints.length; i++) {
      let constraint = this.spring_constraints[i];
      let point1 = constraint.point1;
      let point2 = constraint.point2;
      let distance = point_namespace.distance(point1, point2);
      if (distance < 0.0001) {
        continue;
      }
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
  relaxCollisionsWithBounds() {
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      if (point.y > this.P.floor) {
        point.y = this.P.floor;
      }
      if (point.x < 0) {
        point.x = 0;
      }
      if (point.x > this.P.width) {
        point.x = this.P.width;
      }
      if (point.y < 0) {
        point.y = 0;
      }
    }
  }
  relaxVolume() {
    relaxPoints(this.points, this.initial_area, 1);
  }
  updateVelocity() {
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.vx = (point.x - point.old_x) / this.P.dt;
      point.vy = (point.y - point.old_y) / this.P.dt;
      point.old_x = point.x;
      point.old_y = point.y;
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
    for (let i = 0; i < this.points.length; i++) {
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
    this.object = new Object(
      this.P.width / 2,
      this.P.height / 2,
      50,
      100,
      this.P
    );
  }

  calcSystem(is_mouse, mouse_x, mouse_y, relax_iters) {
    this.t += this.P.dt;
    this.object.integrate();

    for (let iter = 0; iter < relax_iters; iter++) {
      this.object.mouseLogic(is_mouse, mouse_x, mouse_y);

      this.object.relaxCollisionsWithBounds();
      this.object.relaxSprings();
      this.object.relaxVolume();
    }
    this.object.updateVelocity();
  }
}

class Visualizator {
  constructor() {}
  drawObject(p5, system, color_scheme, object, radius = 12) {
    // draw floor
    let lg = color_scheme.GROUND(p5);
    p5.stroke(lg);
    p5.fill(lg);
    p5.rect(0, system.P.floor, p5.width, p5.height - system.P.floor);

    // draw constraints
    let black = color_scheme.BLACK(p5);
    p5.stroke(black);
    p5.fill(black);
    for (let i = 0; i < object.spring_constraints.length; i++) {
      let constraint = object.spring_constraints[i];
      p5.line(
        constraint.point1.x,
        constraint.point1.y,
        constraint.point2.x,
        constraint.point2.y
      );
    }
    let green = color_scheme.GREEN(p5);

    // fill the object
    p5.fill(green);
    p5.noStroke();
    p5.beginShape();
    for (let i = 0; i < object.points.length; i++) {
      let point = object.points[i];
      p5.vertex(point.x, point.y);
    }
    p5.endShape(p5.CLOSE);
    // draw points
    p5.stroke(black);
    p5.fill(green);
    for (let i = 0; i < object.points.length; i++) {
      let point = object.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }
  }
  draw(p5, system, color_scheme, radius = 12) {
    this.drawObject(p5, system, color_scheme, system.object, radius);
  }
}

pbd_volume.Interface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new System(this.with_floor);
    this.visualizator = new Visualizator();
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
    let relax_iters = this.slider1.value
    this.system.calcSystem(is_mouse, mouse_x, mouse_y, relax_iters);
    this.visualizator.draw(p5, this.system, color_scheme);
  }
  reset() {
    this.system.initialyzeSystem();
  }
  setup(p5) {
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Relax Iters"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 500, 499);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);

    p5.frameRate(30);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 10;
    this.system.initialyzeSystem();
  }
};

export default pbd_volume;
