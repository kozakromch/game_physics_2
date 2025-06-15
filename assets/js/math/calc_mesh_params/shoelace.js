import color_scheme from "/game_physics_2/js/common/color_scheme.min.js";
import point_namespace from "/game_physics_2/js/common/point.min.js";

let shoelace = {};
class Parameters {
  constructor() {
    this.floor = 10;
    this.width = 800;
    this.height = 800;
    this.n_points = 7;
    this.radius = 10;
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
// show the calculation of the area
class System {
  constructor() {
    this.P = new Parameters();
  }
  initialyzeSystem() {
    this.points = [];
    let n_points = this.P.n_points;
    let radius = this.P.radius;
    let point_0 = { x: this.P.width / 2, y: this.P.height / 2 }; 
    point_namespace.pointCircle(this.points, point_0, n_points, radius);
    // add random to points
    for (let i = 0; i < n_points; i++) {
      this.points[i].x += Math.random() * 20 - 10;
      this.points[i].y += Math.random() * 20 - 10;
    }
    this.index = 0;
    this.sum_area = 0;
  }
  nextIndex() {
    const j = (this.index + 1) % this.P.n_points;
    return j;
  }
  iter(p5) {
    this.index++;
    if (this.index >= this.P.n_points) {
      this.index = 0;
      this.sum_area = 0;
    }
    let i = this.index;
    let j = this.nextIndex();
    let points = this.points;
    this.area = points[i].x * points[j].y - points[j].x * points[i].y;
    this.sum_area += this.area / 2;
     
    this.vizualize(p5);
  } 
  vizualize(p5) {
    let i = this.index;
    let j = this.nextIndex();
    p5.fill(0);
    p5.textSize(20);
    p5.text("Area: " + this.sum_area.toFixed(2) , 10, 30);

    p5.stroke(0);
    p5.strokeWeight(2);
    p5.fill(color_scheme.GREEN(p5));
    p5.beginShape();
    for (let i = 0; i < this.points.length; i++) {
      p5.vertex(this.points[i].x, this.points[i].y);
    }
    p5.endShape(p5.CLOSE);

    if (this.area > 0) {
      p5.fill(0, 0, 255, 120);
      } else {
      p5.fill(255, 0, 0, 120);
      }
    p5.beginShape();
    p5.vertex(this.points[i].x, this.points[i].y);
    p5.vertex(this.points[j].x, this.points[j].y);
    p5.vertex(0, 0);
    p5.endShape(p5.CLOSE);

    p5.fill(0);
    p5.ellipse(this.points[i].x, this.points[i].y, 10, 10);
    p5.ellipse(this.points[j].x, this.points[j].y, 10, 10);
  }
}

shoelace.Interface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new System();
  }
  iter(p5) {
    this.system.iter(p5);
  }
  reset() {
    this.system.initialyzeSystem();
  }
  setup(p5) {
    p5.frameRate(1);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 10;
    this.system.P.radius = p5.height / 4;
    this.system.initialyzeSystem();
  }
};

export default shoelace;
