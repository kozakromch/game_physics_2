import color_scheme from "../../js/common/color_scheme.min.js";
import point_namespace from "../../js/common/point.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let pbd = {};
class Parameters {
  constructor() {
    this.m = 1.0;
    this.g = 10000;
    this.dt = 0.0001;
    this.floor = 10;
    this.width = 800;
    this.height = 800;
  }
}

function isPointInside(point, shape) {
  const x = point.x;
  const y = point.y;
  let inside = false;

  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const xi = shape[i].x,
      yi = shape[i].y;
    const xj = shape[j].x,
      yj = shape[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestEdge(point, shape) {
  let minDist = Infinity;
  let closestSegment = null;

  for (let i = 0; i < shape.length; i++) {
    const start = shape[i];
    const end = shape[(i + 1) % shape.length];

    const dist = pointToSegmentDistance(point, start, end);

    if (dist < minDist) {
      minDist = dist;
      closestSegment = { start, end };
    }
  }
  return closestSegment;
}

function pointToSegmentDistance(point, start, end) {
  const px = point.x;
  const py = point.y;
  const sx = start.x;
  const sy = start.y;
  const ex = end.x;
  const ey = end.y;

  const dx = ex - sx;
  const dy = ey - sy;
  const lenSq = dx * dx + dy * dy;

  let t = ((px - sx) * dx + (py - sy) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearestX = sx + t * dx;
  const nearestY = sy + t * dy;

  const dist = Math.hypot(px - nearestX, py - nearestY);
  return dist;
}

function checkPointInShapeAndGetClosestEdge(point, shape) {
  if (isPointInside(point, shape)) {
    return closestEdge(point, shape);
  }
  return null;
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
    this.addSpringConstraint(this.spring_constraints, 1);
    this.addSpringConstraint(this.spring_constraints, 2);
    this.addSpringConstraint(this.spring_constraints, 3);
    this.min_index = -1;
    this.collisions = [];
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.old_x = point.x;
      point.old_y = point.y;
    }
  }
  integrate() {
    //semi-implicit euler integration
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      point.vy += this.P.g;
      point.x = point.old_x + point.vx * this.P.dt;
      point.y = point.old_y + point.vy * this.P.dt;
    }
  }
  addSpringConstraint(arr, indent) {
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
  // return the normal to the line
  lineNormal(line, center_of_mass) {
    let dx = line.start.x - line.end.x;
    let dy = line.start.y - line.end.y;
    let length = Math.sqrt(dx * dx + dy * dy);
    // find the normal that points to the center of mass
    let normal = { x: -dy / length, y: dx / length };
    let dx_com = center_of_mass.x - line.start.x;
    let dy_com = center_of_mass.y - line.start.y;
    let dot = normal.x * dx_com + normal.y * dy_com;
    if (dot < 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }
    return normal;
  }
  // find all points that are inside the other object
  findCollisionsWithOther(other) {
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      let closest_edge = checkPointInShapeAndGetClosestEdge(
        point,
        other.points
      );
      if (closest_edge != null) {
        this.collisions.push({ point: point, closest_edge: closest_edge });
      }
    }
  }
  relaxCollisionsWithOther() {
    for (let i = 0; i < this.collisions.length; i++) {
      let collision = this.collisions[i];
      let point = collision.point;
      let closest_edge = collision.closest_edge;
      let cl_point_s = closest_edge.start;
      let cl_point_e = closest_edge.end;
      let normal = this.lineNormal(closest_edge, this.center_of_mass);
      let dx = point.x - closest_edge.start.x;
      let dy = point.y - closest_edge.start.y;
      let dot = dx * normal.x + dy * normal.y;
      point.x -= (normal.x * dot) / 3;
      point.y -= (normal.y * dot) / 3;
      cl_point_s.x += (normal.x * dot) / 3;
      cl_point_s.y += (normal.y * dot) / 3;
      cl_point_e.x += (normal.x * dot) / 3;
      cl_point_e.y += (normal.y * dot) / 3;
    }
  }
  mouseLogic(mouse_x, mouse_y) {
    if (this.min_index == -1) {
      return;
    }
    let point = this.points[this.min_index];
    point.x = mouse_x;
    point.y = mouse_y;
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
    return min_distance;
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
  resetCollisions() {
    this.collisions = [];
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
    this.Objects = [];
    this.Objects.push(new Object(200, 300, 6, 30, this.P));
    this.Objects.push(new Object(300, 300, 7, 50, this.P));
    this.Objects.push(new Object(100, 300, 4, 50, this.P));
    this.Objects.push(new Object(50, 300, 10, 50, this.P));

  }

  calcSystem(is_mouse, mouse_x, mouse_y) {
    this.t += this.P.dt;
    for (let i = 0; i < this.Objects.length; i++) {
      let object = this.Objects[i];
      object.integrate();
    }

    if (is_mouse) {
      if (this.mouse_object_index == -1) {
        let min_distance = 100000;
        for (let i = 0; i < this.Objects.length; i++) {
          let object = this.Objects[i];
          let distance = object.findClosestToMouse(mouse_x, mouse_y);
          if (distance < min_distance) {
            min_distance = distance;
            this.mouse_object_index = i;
          }
        }
      }
    } else {
      this.mouse_object_index = -1;
    }

    for (let i = 0; i < this.Objects.length; i++) {
      let first = this.Objects[i];
      for (let j = i + 1; j < this.Objects.length; j++) {
        let second = this.Objects[j];
        first.findCollisionsWithOther(second);
        second.findCollisionsWithOther(first);
      }
    }


    for (let iter = 0; iter < 20; iter++) {
      for (let i = 0; i < this.Objects.length; i++) {
      let object = this.Objects[i];
      if (this.mouse_object_index == i) {
        object.mouseLogic(mouse_x, mouse_y);
      }
      object.relaxCollisionsWithBounds();
      object.relaxCollisionsWithOther();
      object.relaxSprings();
    }
  }
    for (let i = 0; i < this.Objects.length; i++) {
      let object = this.Objects[i];
      object.updateVelocity();
      object.resetCollisions();
    }
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
    // draw points
    p5.stroke(black);
    p5.fill(green);
    for (let i = 0; i < object.points.length; i++) {
      let point = object.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }
  }
  draw(p5, system, color_scheme, radius = 12) {
    for (let i = 0; i < system.Objects.length; i++) {
      this.drawObject(p5, system, color_scheme, system.Objects[i], radius);
    }
  }
}

pbd.Interface = class {
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
    this.system.calcSystem(is_mouse, mouse_x, mouse_y);
    this.visualizator.draw(p5, this.system, color_scheme);
  }
  reset() {
    this.system.initialyzeSystem();
  }
  setup(p5) {
    p5.frameRate(30);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 10;
    this.system.initialyzeSystem();
  }
};

export default pbd;
