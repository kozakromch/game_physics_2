
class AlgoVisualizer {
  constructor(height, width) {
    this.height = height;
    this.width = width;
    this.max_balls = 6;
    this.radius = 45;
    this.hash_size = 4;
    this.text_size = 25;
    this.Script = [
      {start: 0, duration: 60, func: this.mainGridAppear.bind(this)},
      {start: 15, duration: 1e5, func: this.mainGridDraw.bind(this)},

      {start: 20, duration: 80, func: this.ballsAppear.bind(this)},
      {start: 50, duration: 1e5, func: this.ballsDraw.bind(this)},
      {start: 20, duration: 70, func: this.ballsParticles.bind(this)},

      {start: 25, duration: 60, func: this.ballsArrayAppear.bind(this)},
      {start: 35, duration: 1e5, func: this.ballsArrayDraw.bind(this)},

      {start: 30, duration: 20, func: this.ballsArrayTextAppear.bind(this)},
      {start: 40, duration: 1e5, func: this.ballsArrayTextDraw.bind(this)},

      {start: 30, duration: 60, func: this.hashArrayAppear.bind(this)},
      {start: 30, duration: 1e5, func: this.hashArrayDraw.bind(this)},

      {start: 35, duration: 20, func: this.hashArrayTextAppear.bind(this)},
      {start: 40, duration: 1e5, func: this.hashArrayTextDraw.bind(this)},
      // Заполняем массив hash нулями

      // Показываем нулевой шар, остальным шарам ставим маленькую прозрачность

      // Показываем клетку в которую попадает шар

      // Показываем стрелку которая идет от клетки в массив hash table

    ];
  }
  iter(p5, n_frame) {
    for (let i = 0; i < this.Script.length; i++) {
      let script = this.Script[i];
      if (n_frame >= script.start && n_frame < script.start + script.duration) {
        script.func(p5, n_frame - script.start, script.start, script.duration);
      }
    }
  }
  createGrid(duration) {
    let l = 15;
    this.borders = {x: l, y: l, w: this.width / 2 - l, h: this.height - 3 * l};
    // based on radius
    let d = this.radius * 1.6;
    let nx = Math.floor(this.borders.w / d);
    let ny = Math.floor(this.borders.h / d);
    this.main_grid = new Grid(
        this.borders.x, this.borders.y, this.borders.w, this.borders.h, nx, ny,
        duration);
  }
  mainGridAppear(p5, n_frame, start, duration) {
    if (this.main_grid == undefined) {
      this.createGrid(duration);
    }
    this.main_grid.appear(p5, 20);
  }
  mainGridDraw(p5, n_frame) {
    this.main_grid.draw(p5);
    this.main_grid.drawCell(p5);
  }
  ballGood(ball, balls) {
    for (let other_ball of balls) {
      let dx = ball.target_coord.x - other_ball.target_coord.x;
      let dy = ball.target_coord.y - other_ball.target_coord.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < (ball.target_radius + other_ball.target_radius) * 0.4) {
        return false;
      }
    }
    return true;
  }
  createBalls(duration) {
    // in this.borders
    let w = this.borders.w - this.radius * 2;
    let h = this.borders.h - this.radius * 2;
    this.balls = [];
    let index = 0;
    let attempts = 0;
    while (index < this.max_balls) {
      attempts += 1;
      if (attempts > 1000) break;
      let coord = {
        x: Math.random() * w + this.borders.x + this.radius,
        y: Math.random() * h + this.borders.y + this.radius
      };
      let color = [Math.random() * 360, 50, 100];
      let ball = new Ball(coord, this.radius, color, index, duration);
      if (this.ballGood(ball, this.balls)) {
        this.balls.push(ball);
        index += 1;
      }
    }
    this.n_balls = this.balls.length;
  }
  ballsAppear(p5, n_frame, start, duration) {
    if (this.balls == undefined) {
      this.createBalls(duration);
    }
    for (let ball of this.balls) {
      ball.appear(p5, 1);
    }
  }
  createParticles() {
    this.particle_effects = [];
    for (let ball of this.balls) {
      this.particle_effects.push(new ParticleEffect(
          ball.target_coord, ball.target_radius, ball.color, 40, 60));
    }
  }
  ballsParticles(p5, n_frame) {
    if (this.particle_effects == undefined) {
      this.createParticles();
    }
    for (let particle_effect of this.particle_effects) {
      particle_effect.draw(p5);
    }
  }
  ballsDraw(p5, n_frame) {
    for (let ball of this.balls) {
      ball.draw(p5);
    }
  }
  createBallsArray(duration) {
    this.balls_array_borders = {
      x: this.borders.x + this.borders.w + 30,
      y: this.borders.y + 50,
      w: this.borders.w / 5,
      h: this.borders.h - 50
    };
    let bb = this.balls_array_borders;
    let n_y = this.n_balls;
    this.ball_array = new Array(bb.x, bb.y, bb.w, bb.h, n_y, duration);
  }

  ballsArrayAppear(p5, n_frame, start, duration) {
    if (this.ball_array == undefined) {
      this.createBallsArray(duration);
    }
    this.ball_array.appear(p5);
  }
  ballsArrayTextAppear(p5, n_frame, start, duration) {
    if (this.balls_text == undefined) {
      this.balls_text = new Text(
          {x: this.balls_array_borders.x, y: this.balls_array_borders.y - 20},
          'Balls', this.text_size, duration);
    }
    this.balls_text.appear(p5);
  }
  ballsArrayTextDraw(p5, n_frame) {
    this.balls_text.draw(p5);
  }
  ballsArrayDraw(p5, n_frame) {
    this.ball_array.draw(p5);
  }
  createHashArray(duration) {
    // vertical one cell grid
    this.hash_borders = {
      x: this.borders.x + this.borders.w + 150,
      y: this.borders.y + 50,
      w: this.borders.w / 5,
      h: this.borders.h - 50
    };
    let hb = this.hash_borders;
    this.hash_array =
        new Array(hb.x, hb.y, hb.w, hb.h, this.hash_size, duration);
  }

  hashArrayAppear(p5, n_frame, start, duration) {
    if (this.hash_array == undefined) {
      this.createHashArray(duration);
    }
    this.hash_array.appear(p5);
  }
  hashArrayTextAppear(p5, n_frame, start, duration) {
    if (this.hash_text == undefined) {
      this.hash_text = new Text(
          {x: this.hash_borders.x, y: this.hash_borders.y - 20}, 'Hash',
          this.text_size, duration);
    }
    this.hash_text.appear(p5);
  }
  hashArrayTextDraw(p5, n_frame) {
    this.hash_text.draw(p5);
  }

  hashArrayDraw(p5, n_frame) {
    this.hash_array.draw(p5);
  }
};

// small particles that appear like a salut
class ParticleEffect {
  constructor(coord, radius, color, number, ttl) {
    this.coord = coord;
    this.radius = radius;
    this.color = color;
    this.number = number;
    this.gravity = 0.01;
    this.speed = 4;
    this.particle_radius = 8;
    this.ttl = ttl;
    this.ttl_max = ttl;
    this.particles = [];
    for (let i = 0; i < number; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        speed_x: Math.random() * this.speed - this.speed / 2,
        speed_y: Math.random() * this.speed - this.speed / 2
      });
    }
  }
  draw(p5) {
    this.ttl -= 1;
    if (this.ttl < 0) {
      return;
    }
    p5.noStroke();
    p5.colorMode(p5.HSB);
    p5.fill(this.color);
    for (let particle of this.particles) {
      particle.x += particle.speed_x;
      particle.y += particle.speed_y;
      particle.speed_y += this.gravity
      p5.ellipse(
          this.coord.x + particle.x, this.coord.y + particle.y,
          this.particle_radius * this.ttl / this.ttl_max);
    }
    p5.colorMode(p5.RGB);
    p5.stroke(0);
  }
}
function lerp(a, b, t) {
  if (t < 0) {
    t = 0;
  }
  return a + (b - a) * t;
};

class Ball {
  constructor(coord, radius, color, index, duration) {
    this.target_coord = coord;
    this.current_coord = coord;
    this.target_radius = radius;
    this.current_radius = 0;
    this.start_radius = 0;
    this.color = color;
    this.time = 0;
    this.duration = duration;
    this.alpha = 0;
    this.speed_alpha = 0;
    this.index = index;
    this.text = false;
  }
  appear(p5) {
    this.time += 1;
    // alpha shoold be like pd controller to 1
    let delta = 1 - this.alpha;
    this.speed_alpha += delta * 0.07;
    this.speed_alpha *= 0.91;
    this.alpha += this.speed_alpha;
    if (this.alpha > 1) {
      this.text = true
    }
    this.current_radius =
        lerp(this.start_radius, this.target_radius, this.alpha);
    this.draw(p5);
  }
  draw(p5) {
    p5.stroke(0);
    p5.colorMode(p5.HSB);
    p5.fill(this.color);
    p5.ellipse(this.current_coord.x, this.current_coord.y, this.current_radius);
    p5.colorMode(p5.RGB);
    if (this.text) {
      p5.fill(0);
      p5.textSize(15);
      p5.text(this.index, this.current_coord.x, this.current_coord.y);
    }
  }
};
let hash_vector_namespace = {};

class Line {
  constructor(coord1, coord2, duration) {
    this.target_coord1 = structuredClone(coord1);
    this.target_coord2 = structuredClone(coord2);
    // middle point
    this.start_coord = {
      x: (coord1.x + coord2.x) / 2,
      y: (coord1.y + coord2.y) / 2
    };
    this.current_coord1 = structuredClone(this.start_coord);
    this.current_coord2 = structuredClone(this.start_coord);
    this.time = 0;
    this.duration = duration;
    this.weight = 2;
    this.alpha = 0;
    this.speed_alpha = 0;
  }
  draw(p5) {
    p5.stroke(0);
    p5.strokeWeight(this.weight);
    p5.line(
        this.current_coord1.x, this.current_coord1.y, this.current_coord2.x,
        this.current_coord2.y);
    p5.strokeWeight(1);
  }
  appear(p5, speed) {
    // lerp
    this.time += 1;

    let delta = 1 - this.alpha;
    this.speed_alpha += delta * 0.09;
    this.speed_alpha *= 0.8;
    this.alpha += this.speed_alpha;
    if (this.alpha > 1) {
      this.text = true
    }
    let alpha = this.alpha;
    this.current_coord1.x =
        lerp(this.start_coord.x, this.target_coord1.x, alpha);
    this.current_coord1.y =
        lerp(this.start_coord.y, this.target_coord1.y, alpha);
    this.current_coord2.x =
        lerp(this.start_coord.x, this.target_coord2.x, alpha);
    this.current_coord2.y =
        lerp(this.start_coord.y, this.target_coord2.y, alpha);
    this.draw(p5);
  }
};

class Grid {
  constructor(x, y, w, h, n_x, n_y, duration) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.n_x = n_x;
    this.n_y = n_y;
    this.lines = [];
    let offset = 5;
    for (let i = 0; i <= n_x; i++) {
      let x = this.x + i * (this.w / this.n_x);
      this.lines.push(new Line(
          {x: x, y: this.y - offset}, {x: x, y: this.y + this.h + offset},
          duration));
    }
    for (let i = 0; i <= n_y; i++) {
      let y = this.y + i * this.h / this.n_y;
      this.lines.push(new Line(
          {x: this.x - offset, y: y}, {x: this.x + this.w + offset, y: y},
          duration));
    }
    // calculate coords, width and height of cells
    this.cells = [];
    for (let i = 0; i < n_x; i++) {
      for (let j = 0; j < n_y; j++) {
        let x = this.x + i * this.w / this.n_x;
        let y = this.y + j * this.h / this.n_y;
        let w = this.w / this.n_x;
        let h = this.h / this.n_y;
        this.cells.push(new Rect(x, y, w, h));
      }
    }
  }
  draw(p5) {
    for (let line of this.lines) {
      line.draw(p5);
    }
  }
  drawCell(p5) {
    // for (let cell of this.cells) {
    //   p5.stroke(0);
    //   //  p5.fill(Math.random() * 360, 50, 100);
    //   p5.rect(cell.x, cell.y, cell.w, cell.h);
    // }
  }
  appear(p5, speed) {
    for (let line of this.lines) {
      line.appear(p5, speed);
    }
  }
};
class Array {
  constructor(x, y, w, h, n_y, duration) {
    // two vertical lines and n_y + 1 horizontal lines
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.n_y = n_y;
    this.lines = [];
    {  // two vertical lines
      let x = this.x + 0 * this.w + 5;
      this.lines.push(new Line(
          {x: x, y: this.y - 5}, {x: x, y: this.y + this.h + 5}, duration));
      x = this.x + 1 * this.w - 5;
      this.lines.push(new Line(
          {x: x, y: this.y - 5}, {x: x, y: this.y + this.h + 5}, duration));
    }
    // n_y  horizontal lines
    for (let i = 0; i <= n_y; i++) {
      let y = this.y + i * this.h / this.n_y;
      this.lines.push(
          new Line({x: this.x, y: y}, {x: this.x + this.w, y: y}, duration));
    }
    this.cells = [];
    for (let i = 0; i < n_y; i++) {
      let y = this.y + i * this.h / this.n_y;
      let h = this.h / this.n_y;
      this.cells.push(new Rect(x, y, w, h));
    }
  }
  draw(p5) {
    for (let line of this.lines) {
      line.draw(p5);
    }
  }
  appear(p5, speed) {
    for (let line of this.lines) {
      line.appear(p5, speed);
    }
  }
  drawCell(p5) {
    for (let cell of this.cells) {
      p5.stroke(0);
      p5.fill(Math.random() * 360, 50, 100);
      p5.rect(cell.x, cell.y, cell.w, cell.h);
    }
  }
}

class Text {
  constructor(coord, text, size, duration) {
    this.coord = coord;
    this.text = text;
    this.target_size = size;
    this.current_size = 0;
    this.time = 0;
    this.duration = duration;
  }
  appear(p5) {
    this.time += 1;
    let alpha = this.time / this.duration;
    this.current_size = lerp(this.current_size, this.target_size, alpha);
    this.draw(p5);
  }
  draw(p5) {
    p5.fill(0);
    p5.textSize(this.current_size);
    p5.text(this.text, this.coord.x, this.coord.y);
  }
};

class Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.current_w = 0;
    this.current_h = 0;
  }
  draw(p5) {
    p5.stroke(0);
    p5.fill(255);
    p5.rect(this.x, this.y, this.w, this.h);
  }
  appear(p5, speed) {
    this.current_w += speed;
    this.current_h += speed;
    if (this.current_w > this.w) {
      this.current_w = this.w;
    }
    if (this.current_h > this.h) {
      this.current_h = this.h;
    }
    p5.stroke(0);
    p5.fill(255);
    p5.rect(this.x, this.y, this.current_w, this.current_h);
  }
}

hash_vector_namespace.AllPairsInterface = class {
  constructor(base_name) {
    this.base_name = base_name;
  }
  iter(p5) {
    this.n_frame += 1;
    this.algo_visualizer.iter(p5, this.n_frame);
  }
  setup(p5, base_name) {
    p5.setFrameRate(30);
    this.height = p5.height;
    this.width = p5.width;
    this.init();
  }
  reset() {
    this.init();
  }
  init() {
    this.algo_visualizer = new AlgoVisualizer(this.height, this.width);
    this.n_frame = 0;
  }
};

export default hash_vector_namespace;