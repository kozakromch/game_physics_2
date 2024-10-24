import color_scheme from '../../js/common/color_scheme.min.js';
import point_namespace from '../../js/common/point.min.js';
import ui_namespace from '../../js/common/ui.min.js';

let hitman_relax_namespace = {};
hitman_relax_namespace.Parameters = class {
  constructor() {
    this.m = 3.0;
    this.g = 1500.;
    this.num_points = 50;
    this.width = 500;
    this.height = 300;
    this.dt = 0.02;
    this.floor = 300;
  }
};
hitman_relax_namespace.Sphere = class {
  constructor(x, y, r, ax = 0, ay = 0) {
    this.x = x;
    this.y = y;
    this.prev_x = x;
    this.prev_y = y;
    this.r = r;
    this.ax = ax;
    this.ay = ay;
  }
}
hitman_relax_namespace.System = class {
  constructor(with_floor) {
    this.relax_iter = 10;
    this.simul_iter = 1;
    this.with_floor = with_floor;
    this.parameters = new hitman_relax_namespace.Parameters();
    this.min_index = -1;
  }
  reset() {
    this.initialyzeSystem();
  }
  initialyzeSystem() {
    this.t = 0.;
    this.sphere =
        new hitman_relax_namespace.Sphere(250, 150, 50, 0, this.parameters.g);
    this.points = [];
    this.spring_constraints = [];
    // генерируем точки. В каждой строчке и столбце по n_points точек
    // начинаем от 1/5 и до 4/5 ширины
    // и от 0 до 4/5 высоты
    // и добавляем пружины между соседними точками
    // new point_namespace.SpringConstraint(point1, point2, distance));
    let collumn_start = this.parameters.width / this.parameters.num_points;
    let collumn_end = this.parameters.width;
    let row_start = 0;
    let row_end = 3 * this.parameters.height / this.parameters.num_points;
    let np = this.parameters.num_points;
    let dx = (collumn_end - collumn_start) / np;
    let dy = (row_end - row_start) / np;
    for (let i = 0; i < np; i++) {
      // заполняем ряд
      for (let j = 0; j < np; j++) {
        let x = collumn_start + j * dx;
        let y = row_start + i * dy;
        this.points.push(
            new point_namespace.VerletPoint(x, y, 0, 0, 0, this.parameters.g));
        // добавляем пружинки в ряду
        if (j > 0) {
          let point1 = this.points[this.points.length - 1];
          let point2 = this.points[this.points.length - 2];
          let distance = point_namespace.distance(point1, point2);
          this.spring_constraints.push(
              new point_namespace.SpringConstraint(point1, point2, distance));
        }
      }
      if (i > 0) {
        // добавляем пружинки в колонке
        for (let j = 0; j < np; j++) {
          let point1 = this.points[this.points.length - 1 - j];
          let point2 = this.points[this.points.length - 1 - j - np];
          let distance = point_namespace.distance(point1, point2);
          this.spring_constraints.push(
              new point_namespace.SpringConstraint(point1, point2, distance));
        }
      }
    }
  }
  simulate(relax_iter, is_mouse, mouse_x, mouse_y, width, alpha_relax) {
    this.mouseLogic(is_mouse, mouse_x, mouse_y);
    this.relax_iter = relax_iter;

    this.simulateSphere(width);
    this.relaxAllCollisions(width);
    this.relaxAllSpringConstraints(alpha_relax, false);
    this.relaxAllSpringConstraints(alpha_relax, false);

    this.verlet();
    for (let i = 0; i < this.relax_iter; i++) {
      this.relaxFixedPoints();
      this.relaxAllSpringConstraints(alpha_relax);
      this.relaxFixedPoints();
    }
  }
  mouseLogic(is_mouse, mouse_x, mouse_y) {
    // find the closest point to the mouse
    if (is_mouse) {
      if (this.min_index == -2) {
        this.findClosestToMouse(mouse_x, mouse_y);
      }
      if (this.min_index == -1) {
        // move sphere
        // slowly moove sphere to mouse
        let dx = mouse_x - this.sphere.x;
        let dy = mouse_y - this.sphere.y;
        this.sphere.x += dx / 5;
        this.sphere.y += dy / 5;
      } else {
        let point = this.points[this.min_index];
        point.x = mouse_x;
        point.y = mouse_y;
      }
    } else {
      this.min_index = -2;
    }
  }

  findClosestToMouse(mouse_x, mouse_y) {
    let min_distance = 100000;
    let min_index = -2;
    // check sphere
    let distance =
        point_namespace.distance(this.sphere, {x: mouse_x, y: mouse_y});
    if (distance < this.sphere.r) {
      this.min_index = -1;
      return;
    }
    for (let i = 0; i < this.points.length; i++) {
      let point = this.points[i];
      let distance = point_namespace.distance(point, {x: mouse_x, y: mouse_y});
      if (distance < min_distance) {
        min_distance = distance;
        min_index = i;
      }
    }
    this.min_index = min_index;
  }
  simulateSphere(width) {
    // симулируем по Верле шар
    let sp = this.sphere;
    if (this.min != -1) {
      let dt = this.parameters.dt;
      let new_x = 2 * sp.x - sp.prev_x + sp.ax * dt * dt;
      let new_y = 2 * sp.y - sp.prev_y + sp.ay * dt * dt;
      this.sphere.prev_x = sp.x;
      this.sphere.prev_y = sp.y;
      this.sphere.x = new_x;
      this.sphere.y = new_y;
    }
    // проверяем столкновение со стенками
    if (sp.x < sp.r) {
      sp.x = sp.r;
      sp.prev_x = sp.r;
    }
    if (sp.x > width - sp.r) {
      sp.x = width - sp.r;
      sp.prev_x = width - sp.r;
    }
    if (sp.y < sp.r) {
      sp.y = sp.r;
      sp.prev_y = sp.r;
    }
    if (sp.y > this.parameters.floor - sp.r) {
      sp.y = this.parameters.floor - sp.r;
      sp.prev_y = this.parameters.floor - sp.r;
    }
  }

  relaxAllCollisions(width) {
    for (let point of this.points) {
      if (point.y > this.parameters.floor) {
        point.y = this.parameters.floor;
        point.prev_y = this.parameters.floor;
      }
      // also check sides and top
      if (point.x < 0) {
        point.x = 0;
        point.prev_x = 0;
      }
      if (point.x > width) {
        point.x = width;
        point.prev_x = width;
      }
      if (point.y < 0) {
        point.y = 0;
        point.prev_y = 0;
      }
      // collision with sphere
      let sp = this.sphere;
      let dx = point.x - sp.x;
      let dy = point.y - sp.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < sp.r) {
        let dl = sp.r - distance;
        let dl_x = dl * dx / distance;
        let dl_y = dl * dy / distance;
        point.x += dl_x;
        point.y += dl_y;
      }
    }
  }
  relaxFixedPoints() {
    // фиксируем первую строчку
    let collumn_start = this.parameters.width / this.parameters.num_points;
    let collumn_end = this.parameters.width;
    let dx = (collumn_end - collumn_start) / this.parameters.num_points;
    let np = this.parameters.num_points;
    for (let i = 0; i < np; i++) {
      let point = this.points[i];
      point.x = collumn_start + i * dx;
      point.y = 0;
      point.prev_x = point.x;
      point.prev_y = point.y;
      point.vx = 0;
      point.vy = 0;
      point.ax = 0;
      point.ay = 0;
    }
  }

  relaxAllSpringConstraints(alpha_relax, is_remove = true) {
    if (is_remove) this.removeStretchedConstraints();
    for (let i = this.spring_constraints.length - 1; i >= 0; i--) {
      this.relaxOneConstraint(i, alpha_relax);
    }
  }
  removeStretchedConstraints() {
    // if too stretched - remove
    for (let i = this.spring_constraints.length - 1; i >= 0; i--) {
      let constraint = this.spring_constraints[i];
      let point1 = constraint.point1;
      let point2 = constraint.point2;
      let distance = point_namespace.distance(point1, point2);
      if (distance > 3 * this.parameters.num_points * constraint.distance) {
        this.spring_constraints.splice(i, 1);
      }
    }
  }
  relaxOneConstraint(index, alpha_relax) {
    let constraint = this.spring_constraints[index];
    let point1 = constraint.point1;
    let point2 = constraint.point2;
    let distance = point_namespace.distance(point1, point2);
    if (distance < 0.0001) {
      return;
    }
    let dx = point1.x - point2.x;
    let dy = point1.y - point2.y;
    let dl = distance - constraint.distance;
    let dl_x = dl * dx / distance;
    let dl_y = dl * dy / distance;
    point1.x -= alpha_relax * dl_x / 2;
    point1.y -= alpha_relax * dl_y / 2;
    point2.x += alpha_relax * dl_x / 2;
    point2.y += alpha_relax * dl_y / 2;
  }

  verlet() {
    for (let point of this.points) {
      let x = point.x;
      let y = point.y;
      let p_x = point.prev_x;
      let p_y = point.prev_y;
      let ax = point.ax;
      let ay = point.ay;
      let dt = this.parameters.dt;
      let new_x = 2 * x - p_x + ax * dt * dt;
      let new_y = 2 * y - p_y + ay * dt * dt;
      point.prev_x = x;
      point.prev_y = y;
      point.x = new_x;
      point.y = new_y;
    }
  }
};

hitman_relax_namespace.Visualizator = class {
  constructor(with_floor) {
    this.with_floor = with_floor;
  }
  draw(p5, system, color_scheme, radius = 8) {
    // draw floor
    if (this.with_floor) {
      let lg = color_scheme.GROUND(p5);
      p5.stroke(lg);
      p5.fill(lg);
      p5.rect(
          0, system.parameters.floor, p5.width,
          p5.height - system.parameters.floor);
    }

    // draw constraints
    let black = color_scheme.BLACK(p5);
    p5.stroke(black);
    p5.fill(black);
    for (let i = 0; i < system.spring_constraints.length; i++) {
      let constraint = system.spring_constraints[i];
      p5.line(
          constraint.point1.x, constraint.point1.y, constraint.point2.x,
          constraint.point2.y);
    }
    let green = color_scheme.GREEN(p5);
    let red = color_scheme.RED(p5);
    // draw points
    p5.stroke(black);
    p5.fill(red);
    // первые num_points точек - красные
    for (let i = 0; i < system.parameters.num_points; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }
    p5.fill(green);
    // остальные - зеленые
    for (let i = system.parameters.num_points; i < system.points.length; i++) {
      let point = system.points[i];
      p5.ellipse(point.x, point.y, radius, radius);
    }

    // draw sphere
    let blue = color_scheme.BLUE(p5);
    p5.stroke(blue);
    p5.fill(blue);
    p5.ellipse(system.sphere.x, system.sphere.y, 2 * system.sphere.r);
  }
};

hitman_relax_namespace.SimulationInterface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new hitman_relax_namespace.System(true);
    this.visualizator = new hitman_relax_namespace.Visualizator(true);
    this.iter_new_simul = -1;
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
    let relax_iter = this.slider1.value;
    let alpha = this.slider2.value / 100;
    this.system.simulate(
        relax_iter, is_mouse, mouse_x, mouse_y, p5.width, alpha);
    this.visualizator.draw(p5, this.system, color_scheme, 6);
  }
  setup(p5) {
    {
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(this.base_name, '1', 'Relax Iters');
      this.slider1 = ui_namespace.createSlider(div_m_1, 1, 5, 4);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function() {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    {
      let [div_m_1, div_m_2] =
          ui_namespace.createDivsForSlider(this.base_name, '2', 'Alpha %');
      this.slider2 = ui_namespace.createSlider(div_m_1, 0, 100, 100);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function() {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);
    this.alpha = this.slider2.value;

    p5.frameRate(30);

    this.system.parameters.width = p5.width;
    this.system.parameters.height = p5.height;
    this.system.parameters.floor = p5.height - 5;
    this.system.initialyzeSystem();
  }

  reset() {
    this.system.reset();
  }
};

export default hitman_relax_namespace;