class AlgoVisualizer {
  constructor(height, width) {
    this.height = height;
    this.width = width;
    this.max_balls = 5;
    this.n_balls = 0;
    this.radius = 45;
    this.hash_size = 6;
    this.text_size = 25;
    this.dark_coef = 0.9;
    // индекс -- шарик хранит данные о номере ячейки и кеше
    this.ball_cell_hash = [];
    // prettier-ignore
    this.Script = [
      {start: 0, dur: 60, func: this.mainGridAppear.bind(this)},
      {start: 15, dur: 1e5, func: this.mainGridDraw.bind(this), z: 1},

      {start: 20, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 22, dur: 70, func: this.ballsParticles.bind(this), z: 1},
      {start: 30, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 32, dur: 70, func: this.ballsParticles.bind(this), z: 1},
      {start: 40, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 42, dur: 70, func: this.ballsParticles.bind(this), z: 1},
      {start: 50, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 52, dur: 70, func: this.ballsParticles.bind(this), z: 1},
      {start: 60, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 62, dur: 70, func: this.ballsParticles.bind(this), z: 1},
      {start: 70, dur: 80, func: this.ballAppear.bind(this), z: 2},
      {start: 72, dur: 70, func: this.ballsParticles.bind(this), z: 1},

      {start: 90, dur: 1e5, func: this.ballsDraw.bind(this), z: 2},

      // Создаем массив balls
      {start: 25, dur: 60, func: this.ballsArrayAppear.bind(this)},
      {start: 35, dur: 1e5, func: this.ballsArrayDraw.bind(this)},
      // Показываем текст Balls
      {start: 30, dur: 20, func: this.ballsArrayTextAppear.bind(this)},
      {start: 40, dur: 1e5, func: this.ballsArrayTextDraw.bind(this)},
      // Создаем массив hash table
      {start: 30, dur: 60, func: this.hashArrayAppear.bind(this)},
      {start: 30, dur: 1e5, func: this.hashArrayDraw.bind(this)},
      // Показываем текст Hash
      {start: 35, dur: 20, func: this.hashArrayTextAppear.bind(this)},
      {start: 40, dur: 1e5, func: this.hashArrayTextDraw.bind(this)},

      {start: 55, dur: 1e5, func: this.hashArrayValue.bind(this)},
      // Показываем нулевой шар, остальным шарам ставим маленькую прозрачность
      {start: 120, dur: 1e5, func: this.arrowsAppear.bind(this), z:-1},    
    ];

    // Заполняем массив hash нулями
    for (let i = 0; i < this.hash_size; i++) {
      let start = 60 + i * 10;
      this.Script.push({
        start: start,
        dur: 30,
        func: this.addHashArrayValue.bind(this),
        c: 1,
        args: { index: i, value: 0 },
      });
    }
    let start_global = 0;
    for (let i = 0; i < this.max_balls; i++) {
      let dm = 1;
      let start = 130 + i * 100 * dm;
      // prettier-ignore
      let add =  [
      // Показываем клетку в которую попадает шар
        {start: start, dur: 40 * dm, func: this.ballOpacity.bind(this), c: 1, 
          args:{ball_number: i, opacity: 1.2, other_opacity: 0.3, 
            radius: this.radius * 1.2, other_radius: this.radius * 0.8}},
        {start: start + 40 * dm, dur: 20 * dm, func: this.markGridCell.bind(this), c: 1,
          args: {ball_number: i}},
        // Показываем стрелку которая идет от клетки в массив hash table
        {start: start + 60 * dm, dur: 60 * dm, func: this.addArrow.bind(this), c: 1,
          args: {ball_number: i}},
        {start: start + 65 * dm, dur: 30 * dm, func: this.addHashArrayValue.bind(this), c: 1,
          args: {ball_number: i, value: 1}},
        {start: start + 65 * dm, dur: 30 * dm, func: this.markHashCell.bind(this), c: 1,
          args: {ball_number: i}},
        // {start: start + 150, dur: 50 * dm, func: this.ballOpacity.bind(this), c: 1, 
          // args:{ball_number: i, opacity: 1., other_opacity: 1.}},
      ];
      this.Script = this.Script.concat(add);
      start_global = start + 120 * dm;
    }
    this.Script.push({
      start: start_global + 10,
      dur: 60,
      func: this.removeArrows.bind(this),
      c: 1,
    });
    // this.Script.push({
    //   start: start_global + 10,
    //   dur: 1e5,
    //   func: this.unMarkGridCell.bind(this),
    //   c: 1,
    //   args: { ball_number: 0 },
    // });
    for (let i = 0; i < this.hash_size; i++) {
      let start = start_global + i * 10;
      this.Script.push({
        start: start,
        dur: 30,
        func: this.addHashArrayValue.bind(this),
        c: 1,
        args: { partial_sum: true, index: i },
      });
    }
    start_global += this.hash_size * 10;
    for (let i = 0; i < this.max_balls; i++) {
      let dm = 1;
      let start = start_global + i * 180;
      // prettier-ignore
      let add =  [
      // Показываем клетку в которую попадает шар
        {start: start, dur: 40 * dm, func: this.ballOpacity.bind(this), c: 1, 
          args:{ball_number: i, opacity: 1.2, other_opacity: 0.3, 
            radius: this.radius * 1.2, other_radius: this.radius * 0.8}},
        {start: start + 40 * dm, dur: 20 * dm, func: this.markGridCell.bind(this), c: 1,
          args: {ball_number: i}},
        // Показываем стрелку которая идет от клетки в массив hash table
        {start: start + 60 * dm, dur: 60 * dm, func: this.addArrow.bind(this), c: 1,
          args: {ball_number: i}},
        {start: start + 90 * dm, dur: 30 * dm, func: this.addHashArrayValue.bind(this), c: 1,
          args: {ball_number: i, value: -1}},
        {start: start + 90 * dm, dur: 30 * dm, func: this.markHashCell.bind(this), c: 1,
          args: {ball_number: i}},
        // {start: start + 150, dur: 50 * dm, func: this.ballOpacity.bind(this), c: 1, 
          // args:{ball_number: i, opacity: 1., other_opacity: 1.}},
      ];
      this.Script = this.Script.concat(add);
      start_global = start + 180;
    }
  }
  iter(p5, n_frame) {
    let index_to_eval = [];
    for (let i = 0; i < this.Script.length; i++) {
      let script = this.Script[i];
      if (n_frame >= script.start && n_frame < script.start + script.dur) {
        if (script.c != undefined) {
          if (script.c <= 0) continue;
          script.c -= 1;
        }
        index_to_eval.push(i);
      }
    }
    //sort index_to_eval by z value
    // value with bigger z in the end
    index_to_eval.sort((a, b) => {
      let z_a = this.Script[a].z;
      let z_b = this.Script[b].z;
      if (z_a == undefined) z_a = 0;
      if (z_b == undefined) z_b = 0;
      return z_a - z_b;
    });

    for (let index of index_to_eval) {
      let script = this.Script[index];
      script.func(p5, n_frame, script.start, script.dur, script.args);
    }

    // this.arrow.appear(p5);
  }
  createGrid(dur) {
    let l = 15;
    this.borders = {
      x: l,
      y: l,
      w: this.width / 2 - l,
      h: this.height - 3 * l,
    };
    // based on radius
    let d = this.radius * 1.6;
    let nx = Math.floor(this.borders.w / d);
    let ny = Math.floor(this.borders.h / d);
    this.main_grid = new Grid(
      this.borders.x,
      this.borders.y,
      this.borders.w,
      this.borders.h,
      nx,
      ny,
      dur
    );
  }
  mainGridAppear(p5, n_frame, start, dur) {
    if (this.main_grid == undefined) {
      this.createGrid(dur);
    }
    this.main_grid.appear(p5, 20);
  }
  mainGridDraw(p5, n_frame) {
    this.main_grid.drawCell(p5);
    this.main_grid.draw(p5);
  }
  ballGood(ball, balls) {
    for (let other_ball of balls) {
      let dx = ball.target_coord.x - other_ball.target_coord.x;
      let dy = ball.target_coord.y - other_ball.target_coord.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < (ball.target_radius + other_ball.target_radius) * 0.6) {
        return false;
      }
    }
    return true;
  }
  createBall(dur) {
    if (this.n_balls >= this.max_balls) {
      return;
    }
    if (this.balls == undefined) {
      this.balls = [];
    }

    let w = this.borders.w - this.radius * 2;
    let h = this.borders.h - this.radius * 2;

    let index = 0;
    let attempts = 0;
    while (true) {
      attempts += 1;
      if (attempts > 1000) break;
      let coord = {
        x: Math.random() * w + this.borders.x + this.radius,
        y: Math.random() * h + this.borders.y + this.radius,
      };
      let color = [Math.random() * 360, 50, 100];
      let ball = new Ball(coord, this.radius, color, this.n_balls, dur);
      if (this.ballGood(ball, this.balls)) {
        this.balls.push(ball);
        index += 1;
        break;
      }
    }
    this.n_balls = this.balls.length;
  }
  ballAppear(p5, n_frame, start, dur) {
    this.createBall(dur);

    for (let ball of this.balls) {
      ball.appear(p5, 1);
    }
  }
  createParticleForLastBall() {
    if (this.particle_effects == undefined) {
      this.particle_effects = [];
    }
    if (this.balls.length == this.particle_effects.length) {
      return;
    }
    let ball = this.balls[this.balls.length - 1];
    this.particle_effects.push(
      new ParticleEffect(
        ball.target_coord,
        ball.target_radius,
        ball.color,
        40,
        60
      )
    );
  }
  ballsParticles(p5, n_frame) {
    this.createParticleForLastBall();

    for (let particle_effect of this.particle_effects) {
      particle_effect.draw(p5);
    }
  }
  ballsDraw(p5, n_frame) {
    for (let ball of this.balls) {
      ball.appear(p5);
    }
  }
  createBallsArray(dur) {
    this.balls_array_borders = {
      x: this.borders.x + this.borders.w + 30,
      y: this.borders.y + 50,
      w: this.borders.w / 5,
      h: this.borders.h - 50,
    };
    let bb = this.balls_array_borders;
    let n_y = this.n_balls;
    this.ball_array = new Array(bb.x, bb.y, bb.w, bb.h, n_y, dur);
  }
  ballsArrayAppear(p5, n_frame, start, dur) {
    if (this.ball_array == undefined) {
      this.createBallsArray(dur);
    }
    this.ball_array.appear(p5);
  }
  ballsArrayTextAppear(p5, n_frame, start, dur) {
    if (this.balls_text == undefined) {
      this.balls_text = new Text(
        {
          x: this.balls_array_borders.x + this.balls_array_borders.w / 2,
          y: this.balls_array_borders.y - 25,
        },
        "Balls",
        this.text_size,
        dur
      );
    }
    this.balls_text.appear(p5);
  }
  ballsArrayTextDraw(p5, n_frame) {
    this.balls_text.draw(p5);
  }
  ballsArrayDraw(p5, n_frame) {
    this.ball_array.drawCell(p5);
    this.ball_array.draw(p5);
  }
  createHashArray(dur) {
    // vertical one cell grid
    this.hash_borders = {
      x: this.borders.x + this.borders.w + 150,
      y: this.borders.y + 50,
      w: this.borders.w / 5,
      h: this.borders.h - 50,
    };
    let hb = this.hash_borders;
    this.hash_array = new Array(hb.x, hb.y, hb.w, hb.h, this.hash_size, dur);
  }
  hashArrayAppear(p5, n_frame, start, dur) {
    if (this.hash_array == undefined) {
      this.createHashArray(dur);
    }
    this.hash_array.appear(p5);
  }
  hashArrayTextAppear(p5, n_frame, start, dur) {
    if (this.hash_text == undefined) {
      this.hash_text = new Text(
        {
          x: this.hash_borders.x + this.hash_borders.w / 2,
          y: this.hash_borders.y - 25,
        },
        "Hash",
        this.text_size,
        dur
      );
    }
    this.hash_text.appear(p5);
  }
  hashArrayTextDraw(p5, n_frame) {
    this.hash_text.draw(p5);
  }
  hashArrayDraw(p5, n_frame) {
    this.hash_array.drawCell(p5);
    this.hash_array.draw(p5);
  }
  addHashArrayValue(p5, n_frame, start, dur, args) {
    if (this.hash_values == undefined) {
      this.hash_values = [];
    }
    let hash_index = 0;
    let value = 0;
    if (args.ball_number != undefined) {
      let ball_number = args.ball_number;
      hash_index = this.ball_cell_hash[ball_number][1];
      let hash_value = this.hash_values[hash_index].value;
      console.log(args.value);
      value = hash_value + args.value;
    } else if (args.partial_sum) {
      hash_index = args.index;
      // sum of current and previous values
      let hash_value = this.hash_values[hash_index].value;
      let prev_hash_value = 0;
      if (hash_index > 0) {
        prev_hash_value = this.hash_values[hash_index - 1].value;
      }
      value = hash_value + prev_hash_value;
    } else {
      hash_index = args.index;
      value = args.value;
    }

    const cells = this.hash_array.cells;
    let cell = cells[hash_index];
    let text = new Text(
      { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 },
      value,
      this.text_size,
      dur
    );

    // check that length of hash_values is not bigger than hash_index
    let length = this.hash_values.length;

    if (length - 1 < hash_index) {
      this.hash_values.push({ value: value, text: text });
    } else {
      this.hash_values[hash_index].value = value;
      this.hash_values[hash_index].text = text;
    }
  }
  hashArrayValue(p5, n_frame, start, dur) {
    if (this.hash_values == undefined) {
      return;
    }
    // appearing text for hash values
    for (let hash_value of this.hash_values) {
      hash_value.text.appear(p5);
    }
  }
  ballOpacity(p5, n_frame, start, dur, args) {
    let ball_number = args.ball_number;
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].dur = dur;
      this.balls[i].time = 0;
      // this.balls[i].linear_radius = true;
      this.balls[i].alpha = 0;
      this.balls[i].start_radius = this.balls[i].current_radius;
      if (i == ball_number) {
        this.balls[i].target_radius = args.radius;
        this.balls[i].target_opacity = args.opacity;
      } else {
        this.balls[i].target_radius = args.other_radius;
        this.balls[i].target_opacity = args.other_opacity;
      }
    }
  }
  markGridCell(p5, n_frame, start, dur, args) {
    let ball_number = args.ball_number;
    let ball = this.balls[ball_number];
    // вычисляем координаты клетки в которую попадает шар
    let x_i = Math.floor(
      (ball.target_coord.x - this.borders.x) / this.main_grid.cell_size_w
    );
    let y_i = Math.floor(
      (ball.target_coord.y - this.borders.y) / this.main_grid.cell_size_h
    );
    let i = y_i + x_i * this.main_grid.n_y;
    let cell = this.main_grid.cells[i];
    this.ball_cell_hash[ball_number] = [i, i % this.hash_size];
    if (cell.show) {
      let copy_cell = new Rect(cell.x, cell.y, cell.w, cell.h);
      copy_cell.color = structuredClone(ball.color);
      copy_cell.color[1] *= this.dark_coef;
      copy_cell.start_opacity = 0;
      copy_cell.target_opacity = 1;
      copy_cell.time = 0;
      copy_cell.duration = dur;
      copy_cell.show = true;
      this.main_grid.cells.push(copy_cell);
    } else {
      // copy
      cell.color = structuredClone(ball.color);
      cell.color[1] *= this.dark_coef;
      cell.start_opacity = 0;
      cell.target_opacity = 1;
      cell.time = 0;
      cell.duration = dur;
      cell.show = true;
    }
  }
  unMarkBallCell(p5, n_frame, start, dur, args) {
    let ball_number = args.ball_number;
    let ball = this.balls[ball_number];
    let cell_index = this.ball_cell_hash[ball_number][0];
    let cell = this.main_grid.cells[cell_index];
    cell.show = false;
  }
  createCurveToBall(dur, args) {
    if (this.arrows == undefined) {
      this.arrows = [];
    }
    let ball_number = args.ball_number;
    let ball = this.balls[ball_number];
    let cell_index = this.ball_cell_hash[ball_number][0];
    let cell = this.main_grid.cells[cell_index];
    let hash_cell_index = this.ball_cell_hash[ball_number][1];
    let hash_cell = this.hash_array.cells[hash_cell_index];
    let arrow = new CurveLine(
      { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 },
      { x: hash_cell.x + hash_cell.w / 2, y: hash_cell.y + hash_cell.h / 2 },
      dur
    );
    this.arrows.push(arrow);
  }
  addArrow(p5, n_frame, start, dur, args) {
    this.createCurveToBall(dur, args);
  }
  removeArrows(p5, n_frame, start, dur) {
    if (this.arrows == undefined) {
      return;
    }
    // set end to start
    for (let arrow of this.arrows) {
      arrow.time = 0;
      arrow.duration = dur;
      arrow.alpha = 0;
      arrow.target_coord2.x = arrow.target_coord1.x;
      arrow.target_coord2.y = arrow.target_coord1.y;
      arrow.start_coord2.x = arrow.current_coord2.x;
      arrow.start_coord2.y = arrow.current_coord2.y;
    }
  }

  arrowsAppear(p5, n_frame, start, dur, args) {
    if (this.arrows == undefined) {
      return;
    }
    for (let arrow of this.arrows) {
      arrow.appear(p5);
    }
  }
  markHashCell(p5, n_frame, start, dur, args) {
    let ball_number = args.ball_number;
    let ball = this.balls[ball_number];
    let cell_index = this.ball_cell_hash[ball_number][0];
    let hash_cell_index = this.ball_cell_hash[ball_number][1];
    let cell = this.hash_array.cells[hash_cell_index];
    if (cell.show) {
      let copy_cell = new Rect(cell.x, cell.y, cell.w, cell.h);
      copy_cell.color = structuredClone(ball.color);
      copy_cell.color[1] *= this.dark_coef;
      copy_cell.start_opacity = 0;
      copy_cell.target_opacity = 1;
      copy_cell.time = 0;
      copy_cell.duration = dur;
      copy_cell.show = true;
      this.hash_array.cells.push(copy_cell);
    } else {
      cell.color = structuredClone(ball.color);
      cell.color[1] *= this.dark_coef;
      cell.start_opacity = 0;
      cell.target_opacity = 1;
      cell.time = 0;
      cell.duration = dur;
      cell.show = true;
    }
  }
}

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
        speed_y: Math.random() * this.speed - this.speed / 2,
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
      particle.speed_y += this.gravity;
      p5.ellipse(
        this.coord.x + particle.x,
        this.coord.y + particle.y,
        (this.particle_radius * this.ttl) / this.ttl_max
      );
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
}

class Ball {
  constructor(coord, radius, color, index, dur) {
    this.target_coord = coord;
    this.current_coord = coord;
    this.target_radius = radius;
    this.current_radius = 0;
    this.start_radius = 0;
    this.color = color;
    this.time = 0;
    this.dur = dur;
    this.alpha = 0;
    this.speed_alpha = 0;
    this.index = index;
    this.text = false;
    this.opacity = 1.0;
    this.target_opacity = 1.0;
    this.start_opacity = 1.0;
    this.linear_radius = false;
  }
  appear(p5) {
    this.time += 1;
    // alpha shoold be like pd controller to 1
    let alpha = 0;
    if (!this.linear_radius) {
      let delta = 1 - this.alpha;
      this.speed_alpha += delta * 0.07;
      this.speed_alpha *= 0.91;
      this.alpha += this.speed_alpha;
      alpha = this.alpha;
    } else {
      alpha = this.time / this.dur;
    }
    if (this.alpha > 1) {
      this.text = true;
    }
    this.current_radius = lerp(this.start_radius, this.target_radius, alpha);
    this.draw(p5);
  }
  changeOpacity(p5) {
    this.time += 1;
    let alpha = this.time / this.dur;
    this.opacity = lerp(this.start_opacity, this.target_opacity, alpha);
    if (alpha >= 0.999) {
      this.start_opacity = this.target_opacity;
    }
  }

  draw(p5) {
    this.changeOpacity(p5);
    p5.stroke(0);
    p5.colorMode(p5.HSB);
    let c = this.color;
    let color = p5.color(c[0], c[1] * this.opacity, c[2]);
    p5.fill(color);
    p5.ellipse(this.current_coord.x, this.current_coord.y, this.current_radius);
    p5.colorMode(p5.RGB);
    if (this.text) {
      p5.fill(0);
      p5.textSize(15);
      p5.text(this.index, this.current_coord.x, this.current_coord.y);
    }
  }
}
let hash_vector_namespace = {};

class Line {
  constructor(coord1, coord2, dur) {
    this.target_coord1 = structuredClone(coord1);
    this.target_coord2 = structuredClone(coord2);
    // middle point
    this.start_coord = {
      x: (coord1.x + coord2.x) / 2,
      y: (coord1.y + coord2.y) / 2,
    };
    this.current_coord1 = structuredClone(this.start_coord);
    this.current_coord2 = structuredClone(this.start_coord);
    this.time = 0;
    this.dur = dur;
    this.weight = 2;
    this.alpha = 0;
    this.speed_alpha = 0;
  }
  draw(p5) {
    p5.stroke(0);
    p5.strokeWeight(this.weight);
    p5.line(
      this.current_coord1.x,
      this.current_coord1.y,
      this.current_coord2.x,
      this.current_coord2.y
    );
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
      this.text = true;
    }
    let alpha = this.alpha;
    this.current_coord1.x = lerp(
      this.start_coord.x,
      this.target_coord1.x,
      alpha
    );
    this.current_coord1.y = lerp(
      this.start_coord.y,
      this.target_coord1.y,
      alpha
    );
    this.current_coord2.x = lerp(
      this.start_coord.x,
      this.target_coord2.x,
      alpha
    );
    this.current_coord2.y = lerp(
      this.start_coord.y,
      this.target_coord2.y,
      alpha
    );
    this.draw(p5);
  }
}

class Grid {
  constructor(x, y, w, h, n_x, n_y, dur) {
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
      this.lines.push(
        new Line(
          { x: x, y: this.y - offset },
          { x: x, y: this.y + this.h + offset },
          dur
        )
      );
    }
    for (let i = 0; i <= n_y; i++) {
      let y = this.y + (i * this.h) / this.n_y;
      this.lines.push(
        new Line(
          { x: this.x - offset, y: y },
          { x: this.x + this.w + offset, y: y },
          dur
        )
      );
    }
    // calculate coords, width and height of cells
    this.cells = [];
    for (let i = 0; i < n_x; i++) {
      for (let j = 0; j < n_y; j++) {
        let x = this.x + (i * this.w) / this.n_x;
        let y = this.y + (j * this.h) / this.n_y;
        let w = this.w / this.n_x;
        let h = this.h / this.n_y;
        this.cells.push(new Rect(x, y, w, h));
      }
    }
    this.cell_size_w = this.cells[0].w;
    this.cell_size_h = this.cells[0].h;
  }
  draw(p5) {
    for (let line of this.lines) {
      line.draw(p5);
    }
  }
  drawCell(p5) {
    for (let cell of this.cells) {
      cell.appear(p5);
    }
  }
  appear(p5, speed) {
    for (let line of this.lines) {
      line.appear(p5, speed);
    }
  }
}
class Array {
  constructor(x, y, w, h, n_y, dur) {
    // two vertical lines and n_y + 1 horizontal lines
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.n_y = n_y;
    this.lines = [];
    let offset = 5;
    {
      // two vertical lines
      let x = this.x + 0 * this.w + offset;
      this.lines.push(
        new Line(
          { x: x, y: this.y - offset },
          { x: x, y: this.y + this.h + offset },
          dur
        )
      );
      x = this.x + 1 * this.w - offset;
      this.lines.push(
        new Line(
          { x: x, y: this.y - offset },
          { x: x, y: this.y + this.h + offset },
          dur
        )
      );
    }
    // n_y  horizontal lines
    for (let i = 0; i <= n_y; i++) {
      let y = this.y + (i * this.h) / this.n_y;
      this.lines.push(
        new Line({ x: this.x, y: y }, { x: this.x + this.w, y: y }, dur)
      );
    }
    this.cells = [];
    for (let i = 0; i < n_y; i++) {
      let y = this.y + (i * this.h) / this.n_y;
      let h = this.h / this.n_y;
      this.cells.push(new Rect(x + offset, y, w - 2 * offset, h));
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
      cell.appear(p5);
    }
  }
}

class Text {
  constructor(coord, text, size, dur) {
    this.coord = coord;
    this.text = text;
    this.target_size = size;
    this.current_size = 0;
    this.time = 0;
    this.dur = dur;
  }
  appear(p5) {
    this.time += 1;
    let alpha = this.time / this.dur;
    this.current_size = lerp(this.current_size, this.target_size, alpha);
    this.draw(p5);
  }
  draw(p5) {
    p5.fill(0);
    // scale and translate
    p5.push();
    p5.translate(this.coord.x, this.coord.y);
    p5.scale(this.current_size / this.target_size);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(this.target_size);
    p5.text(this.text, 0, 0);
    p5.pop();
  }
}
class Rect {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.current_w = 0;
    this.current_h = 0;
    this.opacity = 1;
    this.target_opacity = 1;
    this.start_opacity = 1;
    this.color = [0, 0, 0];
    this.duration = 1;
    this.show = false;
  }
  changeOpacity() {
    let alpha = this.time / this.duration;
    this.opacity = lerp(this.start_opacity, this.target_opacity, alpha);
  }
  draw(p5) {
    if (!this.show) {
      return;
    }
    this.time += 1;
    this.changeOpacity();
    p5.stroke(0);
    p5.colorMode(p5.HSB);
    let c = this.color;
    let color = p5.color(c[0], c[1] * this.opacity, c[2]);
    color.setAlpha(255 * this.opacity);
    p5.fill(color);
    // centralize
    let x = this.x + this.w / 2 - this.current_w / 2;
    let y = this.y + this.h / 2 - this.current_h / 2;
    p5.rect(x, y, this.current_w, this.current_h);
    p5.colorMode(p5.RGB);
  }
  appear(p5) {
    if (!this.show) {
      return;
    }
    this.time += 1;
    let alpha = this.time / this.duration;
    if (alpha > 1) {
      alpha = 1;
    }
    this.current_w = lerp(0, this.w, alpha);
    this.current_h = lerp(0, this.h, alpha);
    this.draw(p5);
  }
}

// bezier curve
class CurveLine {
  constructor(coord1, coord2, dur) {
    this.target_coord1 = structuredClone(coord1);
    this.target_coord2 = structuredClone(coord2);
    this.start_coord1 = structuredClone(coord1);
    this.start_coord2 = structuredClone(coord1);
    // just vector from start_coord down
    this.control_coord1 = {
      x: this.start_coord1.x - 30,
      y: this.start_coord1.y + 30,
    };
    this.current_coord1 = structuredClone(this.start_coord1);
    this.current_coord2 = structuredClone(this.start_coord1);
    this.time = 0;
    this.dur = dur;
    this.weight = 2;
    this.alpha = 0;
    this.speed_alpha = 0;
  }
  draw(p5) {
    p5.stroke(0);
    p5.noFill();
    p5.strokeWeight(this.weight);
    p5.bezier(
      this.current_coord1.x,
      this.current_coord1.y,
      this.control_coord1.x,
      this.control_coord1.y,
      this.current_coord2.x,
      this.current_coord2.y,
      this.current_coord2.x,
      this.current_coord2.y
    );
    p5.strokeWeight(1);
  }
  appear(p5) {
    // lerp
    this.time += 1;

    let delta = 1 - this.alpha;
    this.speed_alpha += delta * 0.03;
    this.speed_alpha *= 0.8;
    this.alpha += this.speed_alpha;
    if (this.alpha > 1) {
      this.text = true;
    }
    let alpha = this.alpha;
    this.current_coord1.x = lerp(
      this.start_coord1.x,
      this.target_coord1.x,
      alpha
    );
    this.current_coord1.y = lerp(
      this.start_coord1.y,
      this.target_coord1.y,
      alpha
    );
    this.current_coord2.x = lerp(
      this.start_coord2.x,
      this.target_coord2.x,
      alpha
    );
    this.current_coord2.y = lerp(
      this.start_coord2.y,
      this.target_coord2.y,
      alpha
    );
    this.draw(p5);
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
    // p5.setFrameRate(100);
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
