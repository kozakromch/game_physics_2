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
    this.dt = 0.001;
    this.height = 500;
    this.width = 500;
    this.restitution = 0.95;
    this.sub_steps = 5;
  }
};

class UniformGridVector {
  constructor(canvasWidth, canvasHeight, cellSize, maxRadius) {
    this.cellSize = cellSize;  // Размер одной ячейки
    this.gridWidth =
        Math.ceil(canvasWidth / cellSize) + 1;  // Количество ячеек по ширине
    this.gridHeight =
        Math.ceil(canvasHeight / cellSize) + 1;  // Количество ячеек по высоте
    this.maxRadius = maxRadius;  // Максимальный радиус шарика
    this.cells = Array(this.gridWidth * this.gridHeight)
                     .fill(null)
                     .map(() => []);  // Вектор ячеек
  }

  // Очистка сетки перед обновлением
  clear() {
    this.cells.forEach(cell => cell.length = 0);
  }

  // Перевод 2D координат ячейки в одномерный индекс
  getCellIndex(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return cellY * this.gridWidth + cellX;
  }

  // Добавляем шарик в соответствующие ячейки
  addBall(ball) {
    const {x, y, radius} = ball;

    // Определяем ячейки, которые пересекает шарик
    const X = Math.floor(x / this.cellSize);
    const Y = Math.floor(y / this.cellSize);

    const index = Y * this.gridWidth + X;
    if (this.cells[index]) {
      this.cells[index].push(ball);
    }
  }
  init(points) {
    this.clear();
    for (let point of points) {
      this.addBall(point);
    }
  }
  // Получаем потенциальные коллизии для заданного шарика
  getPotentialCollisions(ball) {
    const {x, y, radius} = ball;
    const potentialCollisions = [];

    const X = Math.floor(x / this.cellSize);
    const Y = Math.floor(y / this.cellSize);

    // проходимся по трем слева направо и сверху вниз

    for (let i = X - 1; i <= X + 1; i++) {
      for (let j = Y - 1; j <= Y + 1; j++) {
        const index = j * this.gridWidth + i;
        if (this.cells[index]) {
          potentialCollisions.push(...this.cells[index]);
        }
      }
    }

    return potentialCollisions;
  }
  areBallsColliding(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < ball1.radius + ball2.radius;
  }
  // Проверка реальных коллизий для шарика
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
  checkCellCollisions(cellX, cellY, checkedCells) {
    const collisions = [];
    const currentCellIndex = cellY * this.gridWidth + cellX;
    // check bounds
    if (cellX < 0 || cellX >= this.gridWidth || cellY < 0 ||
        cellY >= this.gridHeight) {
      return collisions;
    }
    if (checkedCells[currentCellIndex]) {
      return collisions;  // Ячейка уже проверена
    }
    checkedCells[currentCellIndex] = true;  // Отмечаем ячейку как проверенную

    const currentCellBalls = this.cells[currentCellIndex];

    // Проверяем шарики внутри текущей ячейки
    for (let i = 0; i < currentCellBalls.length; i++) {
      for (let j = i + 1; j < currentCellBalls.length; j++) {
        if (this.areBallsColliding(currentCellBalls[i], currentCellBalls[j])) {
          collisions.push([currentCellBalls[i], currentCellBalls[j]]);
        }
      }
    }

    // Проверяем шарики с соседними ячейками
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;  // Пропускаем текущую ячейку

        const neighborX = cellX + i;
        const neighborY = cellY + j;

        if (neighborX >= 0 && neighborX < this.gridWidth && neighborY >= 0 &&
            neighborY < this.gridHeight) {
          const neighborCellIndex = neighborY * this.gridWidth + neighborX;
          if (!checkedCells[neighborCellIndex]) {
            const neighborCellBalls = this.cells[neighborCellIndex];

            // Проверяем шарики из текущей ячейки с шариками из соседних
            for (const ball of currentCellBalls) {
              for (const otherBall of neighborCellBalls) {
                if (this.areBallsColliding(ball, otherBall)) {
                  collisions.push([ball, otherBall]);
                }
              }
            }
          }
        }
      }
    }

    return collisions;
  }
  areBallsColliding(ball1, ball2) {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < ball1.radius + ball2.radius;
  }
  checkCollisionsParallel() {
    const halfWidth_up = Math.ceil(this.gridWidth / 4);
    const halfWidth_down = Math.floor(this.gridWidth / 4);
    const collisions = [];
    const checkedCells = Array(this.gridWidth * this.gridHeight)
                             .fill(false);  // Инициализируем массив проверок

    // Функция для обработки ячеек в параллельном потоке
    const processColumns = (startCol, endCol) => {
      const localCollisions = [];
      for (let i = 0; i < this.gridHeight; i++) {
        for (let j = startCol; j <= endCol; j++) {
          localCollisions.push(...this.checkCellCollisions(j, i, checkedCells));
        }
      }
      return localCollisions;
    };

    // Создаем Parallel.js поток
    const parallel = new Parallel([
      {start: 0, end: halfWidth_up},
      {start: 2 * halfWidth_down, end: 3 * halfWidth_up},
      {start: halfWidth_down, end: 2 * halfWidth_up},
      {start: 3 * halfWidth_down, end: this.gridWidth}
    ]);

    // Запускаем параллельные вычисления
    return parallel.map(({start, end}) => processColumns(start, end))
        .then(results => {
          results.forEach(result => collisions.push(...result));
          return collisions;
        });
  }
}
class UniformGridMap {
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
  init(points) {
    this.clear();
    for (let point of points) {
      this.addBall(point);
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
class HashVector {
  constructor(spacing, maxNumObjects) {
    this.spacing = spacing;
    this.tableSize = maxNumObjects;
    this.cellStart = new Int32Array(this.tableSize + 1);
    this.cellEntries = new Int32Array(maxNumObjects);
    this.queryIds = new Int32Array(maxNumObjects);
    this.querySize = 0;
  }

  hashCoords(xi, yi) {
    var h = (xi * 92837111) ^ (yi * 689287499);  // fantasy function
    return Math.abs(h) % this.tableSize;
  }

  intCoord(coord) {
    return Math.floor(coord / this.spacing);
  }
  hashPos(point) {
    return this.hashCoords(this.intCoord(point.x), this.intCoord(point.y));
  }
  init(points) {
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
  constructor(hash_type) {
    this.hash_type = hash_type;
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
    let space_per_points = space / (4 * n_points);
    let radius = Math.sqrt(space_per_points) / 3.14;
    let mass_min = radius * radius;
    // let mass_max = mass_min;
    let mass_max = 10 * mass_min;

    this.points = [];
    for (let i = 0; i < n_points; i++) {
      this.points.push(new all_pairs_namespace.Ball(
          this.parameters.width, this.parameters.height, mass_min, mass_max));
    }

    this.max_radius = 0;
    for (let point of this.points) {
      if (point.radius > this.max_radius) {
        this.max_radius = point.radius;
      }
    }
    if (this.hash_type == 'uniform_grid_vector') {
      this.grid_vector = new UniformGridVector(
          this.parameters.width, this.parameters.height, 4.0 * this.max_radius,
          n_points);
    }
    if (this.hash_type == 'uniform_grid_map') {
      this.grid_map = new UniformGridMap(this.max_radius * 2, this.max_radius);
    }
    if (this.hash_type == 'hash_vector') {
      this.hash = new HashVector(4.0 * this.max_radius, n_points);
    }
  }
  async calcSystem(is_mouse, mouse_x, mouse_y) {
    for (let step = 0; step < this.parameters.sub_steps; step++) {
      this.t += this.parameters.dt;
      this.calcPoints(is_mouse, mouse_x, mouse_y);
      if (this.hash_type == 'uniform_grid_vector') {
        this.grid_vector.init(this.points);
      }
      if (this.hash_type == 'uniform_grid_map') {
        this.grid_map.init(this.points);
      }
      if (this.hash_type == 'hash_vector') {
        this.hash.init(this.points);
      }

      for (let i = 0; i < 2; i++) {
        this.fixWallAllPoints();
        let all_ok = false;
        if (this.hash_type == 'brute_force') {
           all_ok = this.relaxAllPoints();
        }
        if (this.hash_type == 'uniform_grid_vector') {
          all_ok = this.relaxAllPointsUniformGridVector(true);
        }
        if (this.hash_type == 'uniform_grid_map') {
          all_ok = this.relaxAllPointsUniformGridMap(true);
        }
        if (this.hash_type == 'hash_vector') {
          all_ok = this.relaxAllPointsHashVector(true);
        }
      }
    }
  }
  mouseLogic(point, is_mouse, mouse_x, mouse_y) {
    if (is_mouse) {
      let force = 10000000;
      let dx = point.x - mouse_x;
      let dy = point.y - mouse_y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < this.max_radius) {
        let f = force / (distance + 1);
        point.ax += f * dx / distance;
        point.ay += f * dy / distance;
        point.vx += f * dx / distance * this.parameters.dt;
        point.vy += f * dy / distance * this.parameters.dt;
      }
    }
  }
  calcPoints(is_mouse, mouse_x, mouse_y) {
    // add radial force to points in max_radius
    for (let point of this.points) {
      point.vx += point.ax * this.parameters.dt;
      point.vy += point.ay * this.parameters.dt;
      point.x += point.vx * this.parameters.dt;
      point.y += point.vy * this.parameters.dt;
      point.ax = 0;
      point.ay = -this.parameters.g;
      this.mouseLogic(point, is_mouse, mouse_x, mouse_y);
    }
  }
  fixWallAllPoints() {
    for (let point of this.points) {
      this.fixWall(point);
    }
  }
  fixWall(point) {
    let r = this.parameters.restitution;
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
  fixPossition(point1, point2, distance) {
    let overlap = ((point1.radius + point2.radius) - distance) * 1.1;
    let moveX = overlap * (point2.x - point1.x) / distance / 2;
    let moveY = overlap * (point2.y - point1.y) / distance / 2;
    point1.x -= moveX;
    point1.y -= moveY;
    point2.x += moveX;
    point2.y += moveY;
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

    this.fixPossition(ball1, ball2, distance);
  }
  relax(point1, point2, with_collisions) {
    let all_ok = true;
    let distance = point_namespace.distance(point1, point2);
    if (distance < point1.radius + point2.radius) {
      all_ok = false;
      if (with_collisions) {
        this.collide(point1, point2);
      } else {
        this.fixPossition(point1, point2, distance);
      }
    }
    return all_ok;
  }
  relaxAllPoints(with_collisions = true) {
    let all_ok = true;
    for (let i = 0; i < this.parameters.num_points; i++) {
      let point1 = this.points[i];
      for (let j = i + 1; j < this.parameters.num_points; j++) {
        let point2 = this.points[j];
        all_ok = this.relax(point1, point2, with_collisions);
      }
    }
    return all_ok;
  }
  relaxAllPointsUniformGridVector(with_collisions = true) {
    let all_ok = true;
    for (let point1 of this.points) {
      const collisions = this.grid_vector.checkCollisions(point1);
      for (let point2 of collisions) {
        if (point1 !== point2) {
          all_ok = this.relax(point1, point2, with_collisions);
        }
      }
    }
    return all_ok;
  }
  relaxAllPointsUniformGridVectorParallel(with_collisions = true) {
    this.grid_vector.checkCollisionsParallel().then(collisions => {
      for (let [point1, point2] of collisions) {
        if (point1 !== point2) {
          this.relax(point1, point2, with_collisions);
        }
      }
    });
  }

  relaxAllPointsUniformGridMap(with_collisions) {
    let all_ok = true;
    for (let point1 of this.points) {
      for (let i = 0; i < 1; i++) {
        const collisions = this.grid_map.checkCollisions(point1);
        for (let point2 of collisions) {
          if (point1 !== point2) {
            all_ok = this.relax(point1, point2, with_collisions);
          }
        }
      }
    }
    return all_ok;
  }
  relaxAllPointsHashVector(with_collisions = true) {
    let all_ok = true;
    for (let point1 of this.points) {
      this.hash.query(point1, 2.0 * this.max_radius);
      for (let i = 0; i < this.hash.querySize; i++) {
        let point2 = this.points[this.hash.queryIds[i]];
        if (point1 !== point2) {
          all_ok = this.relax(point1, point2, with_collisions);
        }
      }
    }
    return all_ok;
  }
};

all_pairs_namespace.Visializer = class {
  constructor(method) {
    this.method = method;
  }
  draw(p5, system) {
    p5.stroke(0);
    p5.colorMode(p5.HSB);

    for (let point of system.points) {
      // random color with low saturation
      let color = p5.color(p5.random(0, 360), 50, 100);
      p5.fill(color);
      p5.circle(point.x, point.y, 2 * point.radius);
    }
    p5.colorMode(p5.RGB);
    if (this.method == 'uniform_grid_vector') {
      this.drawGridVector(p5, system);
    }
    if (this.method == 'uniform_grid_map') {
      this.drawGridMap(p5, system);
    }
    if (this.method == 'hash_vector') {
      this.drawHashVector(p5, system);
    }
    // bellow text white background
    p5.fill(255);
    p5.noStroke();
    p5.rect(0, 0, 70, 30, 10);
    // fps text
    p5.fill(0);
    p5.text('FPS: ' + Math.round(p5.frameRate()), 10, 10, 70, 80);
  }
  drawGridVector(p5, system) {
    const grid_vector = system.grid_vector;
    p5.stroke(100);
    p5.strokeWeight(1);
    p5.noFill();
    for (let i = 0; i < grid_vector.gridWidth; i++) {
      for (let j = 0; j < grid_vector.gridHeight; j++) {
        let x = i * grid_vector.cellSize;
        let y = j * grid_vector.cellSize;
        p5.rect(x, y, grid_vector.cellSize, grid_vector.cellSize);
      }
    }
  }
  drawGridMap(p5, system) { 
    const grid_map = system.grid_map;
    p5.stroke(40);
    p5.strokeWeight(1);
    p5.noFill();
    // draw rectangle from grid map
    for (let [key, balls] of grid_map.grid) {
      let x = (key / 1000000) * grid_map.cellSize;
      let y = (key % 1000000) * grid_map.cellSize;
      p5.rect(x, y, grid_map.cellSize, grid_map.cellSize);
      }
      
  }
  drawHashVector(p5, system) {
    // const hash = system.hash;
    // p5.stroke(0);
    // p5.strokeWeight(1);
    // p5.noFill();
    // for (let i = 0; i < hash.tableSize; i++) {
    //   for (let j = 0; j < hash.tableSize; j++) {
    //     let x = i * hash.spacing;
    //     let y = j * hash.spacing;
    //     p5.rect(x, y, hash.spacing, hash.spacing);
    //   }
    // }
  }
};

all_pairs_namespace.AllPairsInterface = class {
  constructor(base_name, method) {
    this.method = method;
    // this.system = new all_pairs_namespace.System("brute_force");
    // this.system = new all_pairs_namespace.System("uniform_grid_vector");
    this.system = new all_pairs_namespace.System(method);
    // this.system = new all_pairs_namespace.System("hash_vector");
    this.visualizer = new all_pairs_namespace.Visializer(method);
    this.base_name = base_name;
  }
  mouseLogic(p5) {
    // get from p5 mouse position
    let mouse_x = p5.mouseX;
    let mouse_y = p5.mouseY;
    // if left mouse button is pressed
    let is_mouse = true;
    if (mouse_x < 0 || mouse_x > p5.width || mouse_y < 0 ||
        mouse_y > p5.height) {
      is_mouse = false;
    }
    if (p5.mouseIsPressed == false) {
      is_mouse = false;
    }
    return [is_mouse, mouse_x, mouse_y];
  }
  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = this.mouseLogic(p5);
    this.newSimulation();
    this.system.calcSystem(is_mouse, mouse_x, mouse_y);
    this.visualizer.draw(p5, this.system);

  }
  setup(p5, base_name) {
    p5.setFrameRate(60);
    this.system.parameters.width = p5.width;
    this.system.parameters.height = p5.height - 10;
    {
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(base_name, '1', 'balls');
      this.slider1 = ui_namespace.createSlider(div_m_1, 10, 5000, 4990, 400);
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