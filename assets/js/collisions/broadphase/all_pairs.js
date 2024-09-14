import point_namespace from '../../../js/common/point.min.js';
import ui_namespace from '../../../js/common/ui.min.js';

let all_pairs_namespace = {};
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
    this.restitution = 0.95;
  }
};

class UniformGrid {
  constructor(cellSize, maxRadius) {
    this.cellSize = cellSize;  // Размер ячейки сетки
    this.maxRadius = maxRadius;  // Максимальный радиус шарика
    this.grid = new Map();  // Храним объекты в сетке как хэш-карту
  }
  // Метод для очистки сетки перед обновлением
  clear() {
    this.grid.clear();
  }
  // Добавляем шарик в сетку
  addBall(ball) {
    const {x, y, radius} = ball;
    // Находим все ячейки, которые может пересекать шарик
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    // Проходим по всем ячейкам, которые пересекает шарик
    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        const key = 1000000 * i + j;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key).push(ball);
      }
    }
  }

  // Метод для получения всех возможных коллизий
  getPotentialCollisions(ball) {
    const potentialCollisions = [];
    const {x, y, radius} = ball;
    // Находим все ячейки, которые пересекает данный шарик
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    // Проходим по всем ячейкам и собираем потенциальные коллизии
    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        const key = 1000000 * i + j;
        if (this.grid.has(key)) {
          potentialCollisions.push(...this.grid.get(key));
        }
      }
    }
    return potentialCollisions;
  }
  // Метод для проверки реальных коллизий
  checkCollisions(ball) {
    const potentialCollisions = this.getPotentialCollisions(ball);
    const collisions = [];
    for (let otherBall of potentialCollisions) {
      if (otherBall !== ball) {
        const dx = otherBall.x - ball.x;
        const dy = otherBall.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ball.radius + otherBall.radius) {
          collisions.push(otherBall);
        }
      }
    }
    return collisions;
  }
}


class Hash {
  constructor(spacing, maxNumObjects) {
    this.spacing = spacing;
    this.tableSize = 2 * maxNumObjects;
    this.cellStart = new Int32Array(this.tableSize + 1);
    this.cellEntries = new Int32Array(maxNumObjects);
    this.queryIds = new Int32Array(maxNumObjects);
    this.querySize = 0;
  }

  hashCoords(xi, yi) {
    let h = (xi * 92837111) ^ (yi * 689287499)
    return Math.abs(h) % this.tableSize;
  }

  intCoord(coord) {
    return Math.floor(coord / this.spacing);
  }
  hashPos(point) {
    return this.hashCoords(
        this.intCoord(point.x), this.intCoord(point.y));
  }
  create(points) {
    let numObjects = points.length;

    // determine cell sizes

    this.cellStart.fill(0);
    this.cellEntries.fill(0);

    for (let i = 0; i < numObjects; i++) {
      let h = this.hashPos(points[i]);
      this.cellStart[h]++;
    }

    // determine cells starts

    let start = 0;
    for (let i = 0; i < this.tableSize; i++) {
      start += this.cellStart[i];
      this.cellStart[i] = start;
    }
    this.cellStart[this.tableSize] = start;  // guard

    // fill in objects ids

    for (let i = 0; i < numObjects; i++) {
      let h = this.hashPos(points[i]);
      this.cellStart[h]--;
      this.cellEntries[this.cellStart[h]] = i;
    }
  }

  query(point, maxDist) {
    let x0 = this.intCoord(point.x - maxDist);
    let y0 = this.intCoord(point.y - maxDist);

    let x1 = this.intCoord(point.x + maxDist);
    let y1 = this.intCoord(point.y + maxDist);

    this.querySize = 0;

    for (let xi = x0; xi <= x1; xi++) {
      for (let yi = y0; yi <= y1; yi++) {
        let h = this.hashCoords(xi, yi);
        let start = this.cellStart[h];
        let end = this.cellStart[h + 1];

        for (let i = start; i < end; i++) {
          this.queryIds[this.querySize] = this.cellEntries[i];
          this.querySize++;
        }
      }
    }
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
    // calculate min and max mass based on the number of points and space
    let space = this.parameters.width * this.parameters.height;
    let space_per_points = space / (0.8 * n_points);
    let radius = Math.sqrt(space_per_points) / 3.14;
    let mass_min = radius * radius;
    let mass_max = 2 * mass_min;

    this.points = [];
    for (let i = 0; i < n_points; i++) {
      this.points.push(new all_pairs_namespace.Ball(
          this.parameters.width, this.parameters.height, mass_min, mass_max));
    }

    let max_radius = 0;
    for (let point of this.points) {
      if (point.radius > max_radius) {
        max_radius = point.radius;
      }
    }
    this.grid = new UniformGrid(max_radius * 2, max_radius);
  }
  calcSystem() {
    this.calcPoints();

    this.grid.clear();
    for (let point of this.points) {
      this.grid.addBall(point);
    }
    this.t += this.parameters.dt;
    this.checkCollisionsHashGrid();
    for (let i = 0; i < 50; i++) {
      this.checkWalls();
      let all_ok = this.fixPossitionsHashGrid();
      if (all_ok) {
        break;
      }
    }
  }
  checkWalls() {
    const r = this.parameters.restitution;
    for (let point of this.points) {
      if (point.x - point.radius < 0) {
        point.vx = r * Math.abs(point.vx);
        point.x = point.radius;
      }
      if (point.x + point.radius > this.parameters.width) {
        point.vx = -r * Math.abs(point.vx);
        point.x = this.parameters.width - point.radius;
      }
      if (point.y - point.radius < 0) {
        point.vy = r * Math.abs(point.vy);
        point.y = point.radius;
      }
      if (point.y + point.radius > this.parameters.height) {
        point.vy = -r * Math.abs(point.vy);
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
  checkCollisionsHashGrid() {
    for (let point of this.points) {
      const collisions = this.grid.checkCollisions(point);
      for (let otherBall of collisions) {
        if (point !== otherBall) {
          this.collide(point, otherBall);
        }
      }
    }
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

    let restitution = this.parameters.restitution;
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

  fixPossitionsHashGrid() {
    let all_ok = true;
    for (let point of this.points) {
      const collisions = this.grid.checkCollisions(point);
      for (let otherBall of collisions) {
        if (point !== otherBall) {
          this.fixPossition(
              point, otherBall, point_namespace.distance(point, otherBall));
          all_ok = false;
        }
      }
    }
    return all_ok;
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
          this.fixPossition(point1, point2, distance);
        }
      }
    }
    return all_ok;
  }
  fixPossition(point1, point2, distance) {
    let overlap = ((point1.radius + point2.radius) - distance) * 1;
    let moveX = overlap * (point2.x - point1.x) / distance / 2;
    let moveY = overlap * (point2.y - point1.y) / distance / 2;
    point1.x -= moveX;
    point1.y -= moveY;
    point2.x += moveX;
    point2.y += moveY;
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
    this.system.parameters.height = p5.height - 10;
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