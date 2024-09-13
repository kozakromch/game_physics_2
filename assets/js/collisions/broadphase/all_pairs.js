import point_namespace from '../../../js/common/point.min.js';
import ui_namespace from '../../../js/common/ui.min.js';

var all_pairs_namespace = {};
all_pairs_namespace.Ball = class {
  constructor(width, height, mass_min, mass_max) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    let multi = 100;
    this.vx = (Math.random() * 2 - 1) * multi;
    this.vy = (Math.random() * 2 - 1) * multi;
    this.mass = Math.random() * (mass_max - mass_min) + mass_min;
    this.radius = Math.sqrt(this.mass);
    this.ax = 0;
    this.ay = 0;
  }
}
all_pairs_namespace.Parameters = class {
  constructor() {
    this.g = -200.2;
    this.num_points = 100;
    this.dt = 0.01;
    this.height = 500;
    this.width = 500;
  }
};
all_pairs_namespace.System = class {
  constructor() {
    this.parameters = new all_pairs_namespace.Parameters();
    this.initialyzeSystem();
  }
  reset() {
    this.initialyzeSystem();
  }
  initialyzeSystem() {
    this.t = 0.;
    const n_points = this.parameters.num_points;
    // calculate min and max mass based on the number of points
    let mass_min = 500 / Math.sqrt(n_points);
    let mass_max = 1000 / Math.sqrt(n_points);

    this.points = [];
    for (let i = 0; i < n_points; i++) {
      this.points.push(new all_pairs_namespace.Ball(
          this.parameters.width, this.parameters.height, mass_min, mass_max));
    }
  }
  calcSystem() {
    this.t += this.parameters.dt;
    this.checkCollisions();
    for (let i = 0; i < 20; i++) {
      let all_ok = this.fixPossitions();
      if (all_ok) {
        break;
      }
    }
    this.checkWalls();
    this.calcPoints();
  }
  checkWalls() {
    for (let point of this.points) {
      if (point.x - point.radius < 0) {
        point.vx = Math.abs(point.vx);
        point.x = point.radius;
      }
      if (point.x + point.radius > this.parameters.width) {
        point.vx = -Math.abs(point.vx);
        point.x = this.parameters.width - point.radius;
      }
      if (point.y - point.radius < 0) {
        point.vy = Math.abs(point.vy);
        point.y = point.radius;
      }
      if (point.y + point.radius > this.parameters.height) {
        point.vy = -Math.abs(point.vy);
        point.y = this.parameters.height - point.radius;
      }
    }
  }
  checkCollisions() {
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      for (let j = i + 1; j < this.parameters.num_points; j++) {
        let point2 = this.points[j];
        let distance = point_namespace.distance(point1, point2);
        if (distance < point1.radius + point2.radius) {
          this.collide(point1, point2);
        }
      }
    }
  }
  fixPossitions() {
    let all_ok = true;
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      for (let j = i + 1; j < this.parameters.num_points; j++) {
        let point2 = this.points[j];
        let distance = point_namespace.distance(point1, point2);
        if (distance < point1.radius + point2.radius) {
          all_ok = false;
          let overlap = (point1.radius + point2.radius) - distance;
          let moveX = overlap * (point2.x - point1.x) / distance / 2;
          let moveY = overlap * (point2.y - point1.y) / distance / 2;
          point1.x -= moveX;
          point1.y -= moveY;
          point2.x += moveX;
          point2.y += moveY;
        }
      }
    }
    return all_ok;
  }

  PromisesCheckCollisions() {
    let promises = [];
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      for (let j = i + 1; j < this.parameters.num_points; j++) {
        let point2 = this.points[j];
        let distance = point_namespace.distance(point1, point2);
        if (distance < point1.radius + point2.radius) {
          promises.push(this.collide(point1, point2));
        }
      }
    }
    return Promise.all(promises);
  }


  collide(ball1, ball2) {
    // Calculate the vector between the centers of the balls
    let dx = ball2.x - ball1.x;
    let dy = ball2.y - ball1.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate the normal vector
    let nx = dx / distance;
    let ny = dy / distance;

    // Calculate relative velocity in the normal direction
    let dvx = ball2.vx - ball1.vx;
    let dvy = ball2.vy - ball1.vy;
    let dotProduct = dvx * nx + dvy * ny;

    let restitution = 0.95;
    // Calculate the scalar for updating velocities
    let scalar = restitution * (2 * dotProduct) / (ball1.mass + ball2.mass);

    // Update velocities based on the mass and normal vector
    ball1.vx += scalar * ball2.mass * nx;
    ball1.vy += scalar * ball2.mass * ny;
    ball2.vx -= scalar * ball1.mass * nx;
    ball2.vy -= scalar * ball1.mass * ny;

    // Separate the balls to ensure they are not overlapping
    let overlap = (ball1.radius + ball2.radius) - distance;
    let moveX = overlap * nx / 2;
    let moveY = overlap * ny / 2;
    ball1.x -= moveX;
    ball1.y -= moveY;
    ball2.x += moveX;
    ball2.y += moveY;
  }

  calcPoints() {
    for (let point of this.points) {
      point.vx += point.ax * this.parameters.dt;
      point.vy += point.ay * this.parameters.dt;
      point.x += point.vx * this.parameters.dt;
      point.y += point.vy * this.parameters.dt;
      point.ax = 0;
      point.ay = -this.parameters.g;
    }
  }
};

all_pairs_namespace.Visializer = class {
  constructor() {}
  draw(p5, system) {
    p5.stroke(0);
    for (let point of system.points) {
      // random color with low saturation
      p5.colorMode(p5.HSB);
      let color = p5.color(p5.random(0, 360), 50, 100);
      p5.fill(color);
      p5.circle(point.x, point.y, 2 * point.radius);
    }
    p5.colorMode(p5.RGB);
    // bellow text white background
    p5.fill(255);
    p5.noStroke();
    p5.rect(0, 0, 70, 30, 10);
    // fps text
    p5.fill(0);
    p5.text('FPS: ' + Math.round(p5.frameRate()), 10, 10, 70, 80);
  }
};

all_pairs_namespace.AllPairsInterface = class {
  constructor(base_name) {
    this.system = new all_pairs_namespace.System();
    this.visualizer = new all_pairs_namespace.Visializer(this.hard_ball);
    this.base_name = base_name;
  }
  iter(p5) {
    this.newSimulation();
    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);
    console.log(p5.frameRate());
  }
  setup(p5, base_name) {
    p5.setFrameRate(60);
    this.system.parameters.width = p5.width;
    this.system.parameters.height = p5.height;
    {
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(base_name, '1', 'balls');
      this.slider1 = ui_namespace.createSlider(div_m_1, 10, 2000, 1990);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function() {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    this.n_balls = this.slider1.value;
    this.system.parameters.num_points = this.slider1.value;
    this.system.initialyzeSystem();
  }
  newSimulation() {
    let n_balls = this.slider1.value;
    if (this.n_balls != n_balls) {
      this.iter_new_simul = 4;
      this.n_balls = n_balls;
    }
    if (this.iter_new_simul >= 0) {
      this.iter_new_simul--;
    }
    if (this.iter_new_simul == 0) {
      this.system.parameters.num_points = this.n_balls;
      this.system.initialyzeSystem();
    }
  }
  reset() {
    this.system.parameters.num_points = this.slider1.value;
    this.system.reset();
  }
};

export default all_pairs_namespace;