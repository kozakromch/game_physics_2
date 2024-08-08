let point_namespace = {};
point_namespace.Point = class {
  constructor(x, y, vx, vy, ax, ay) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
  }
};
point_namespace.VerletPoint = class {
  constructor(x, y, vx, vy, ax, ay) {
    this.x = x;
    this.y = y;
    this.prev_x = x;
    this.prev_y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
  }
};

point_namespace.SpringConstraint = class {
  constructor(point1, point2, distance) {
    this.point1 = point1;
    this.point2 = point2;
    this.distance = distance;
  }
};
point_namespace.distance = function(point1, point2) {
  return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
};
point_namespace.pointCircle = function(points, p_0, num_points, radius) {
  // create 2d circle points
  for (let i = 0; i < num_points; i++) {
    let angle = Math.PI / 2 + (2 * Math.PI / (num_points)) * i;
    let x = p_0.x + radius * Math.cos(angle);
    let y = p_0.y + radius * Math.sin(angle);
    let vx = p_0.vx;
    let vy = p_0.vy;
    let ax = p_0.ax;
    let ay = p_0.ay;
    points.push(new point_namespace.VerletPoint(x, y, vx, vy, ax, ay));
  }
};

export default point_namespace;