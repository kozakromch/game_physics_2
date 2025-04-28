import ui_namespace from "../../js/common/ui.min.js";

class Parameters {
  constructor() {
    this.gravity = math.matrix([0, 9.8]); // гравитация
    this.dt = 1 / 60; // фиксированное время шага
    this.friction = 0.3; // коэффициент трения
    this.restitution = 0.99; // коэффициент упругости
    this.floor = 300;
    this.width = 800; // ширина окна
    this.height = 600; // высота окна
    this.simple = false; // флаг для упрощенной версии
  }
}

// Вспомогательные функции
function getX(v) {
  return v.get([0]);
}
function getY(v) {
  return v.get([1]);
}
function cross2D(a, b) {
  return getX(a) * getY(b) - getY(a) * getX(b);
}
function dot2D(a, b) {
  return getX(a) * getX(b) + getY(a) * getY(b);
}

class RigidBody {
  constructor(position, angle, velocity, angularVelocity, P, size) {
    this.P = P;
    this.position = position.clone();
    this.angle = angle;
    this.velocity = velocity.clone();
    this.angularVelocity = angularVelocity; // начальная угловая скорость

    this.size = size; // { width: число, height: число }
    this.mass = 1;
    // Момент инерции прямоугольника:
    this.inertia =
      (1 / 12) * this.mass * (this.size.width ** 2 + this.size.height ** 2);
  }

  integratePositions(dt) {
    this.position = math.add(this.position, math.multiply(this.velocity, dt));
    this.angle += this.angularVelocity * dt;
  }

  checkCollision() {
    let verts = this.getVertices();
    for (let v of verts) {
      if (getY(v) > this.P.floor) {
        let n = math.matrix([0, -1]);
        this.resolveCollision(v, n);
      }
      if (getX(v) < 0) {
        let n = math.matrix([1, 0]);
        this.resolveCollision(v, n);
      }
      if (getX(v) > this.P.width) {
        let n = math.matrix([-1, 0]);
        this.resolveCollision(v, n);
      }
      if (getY(v) < 0) {
        let n = math.matrix([0, 1]);
        this.resolveCollision(v, n);
      }
    }
  }

  resolveCollision(contactPoint, normal) {
    let r = math.subtract(contactPoint, this.position);

    let tangentVelocity = math.matrix([
      -this.angularVelocity * getY(r),
      this.angularVelocity * getX(r),
    ]);

    let vContact = math.add(this.velocity, tangentVelocity);
    let vRel = dot2D(vContact, normal);

    if (vRel > 0) return; // расходятся — ничего делать не нужно

    let raCrossN = cross2D(r, normal);
    let denom = 1 / this.mass + (raCrossN * raCrossN) / this.inertia;

    let j = (-(1 + this.P.restitution) * vRel) / denom;
    let impulse = math.multiply(normal, j);

    this.velocity = math.add(
      this.velocity,
      math.multiply(impulse, 1 / this.mass)
    );
    this.angularVelocity += cross2D(r, impulse) / this.inertia;
  }

  getVertices() {
    let halfWidth = this.size.width / 2;
    let halfHeight = this.size.height / 2;
    let verts = [
      math.matrix([-halfWidth, -halfHeight]),
      math.matrix([halfWidth, -halfHeight]),
      math.matrix([halfWidth, halfHeight]),
      math.matrix([-halfWidth, halfHeight]),
    ];

    let cosA = Math.cos(this.angle);
    let sinA = Math.sin(this.angle);

    let result = [];
    for (let v of verts) {
      let rotated = math.matrix([
        cosA * getX(v) - sinA * getY(v),
        sinA * getX(v) + cosA * getY(v),
      ]);
      result.push(math.add(this.position, rotated));
    }
    return result;
  }
}

class System {
  constructor() {
    this.P = new Parameters();
  }

  init() {
    let angle = 0.1;
    let ang_vel = 1.5;
    let velocity = math.matrix([100, 300]);
    if (this.P.simple) {
      angle = 0;
      ang_vel = 0;
      velocity = math.matrix([0, 200]);
    }
    this.body = new RigidBody(
      math.matrix([this.P.width / 2, 100]), // начальная позиция
      angle,
      velocity,
      ang_vel,
      this.P,
      { width: 80, height: 40 } // разные ширина и высота
    );
  }

  calcSystem() {
    this.body.checkCollision();
    this.body.integratePositions(this.P.dt);
  }
}

class Visualizer {
  draw(p5, system) {
    p5.fill(100, 150, 250);
    p5.stroke(0);
    p5.beginShape();
    for (let v of system.body.getVertices()) {
      p5.vertex(getX(v), getY(v));
    }
    p5.endShape(p5.CLOSE);
  }
}

let impulses_cube = {};

impulses_cube.Interface = class {
  constructor(base_name, simple = false) {
    this.system = new System();
    this.visualizer = new Visualizer();
    this.base_name = base_name;
    this.simple = simple;
  }

  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);
  }

  setup(p5, base_name) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 5;
    this.system.init();
    this.system.P.simple = this.simple;
  }

  reset() {
    this.system.init();
  }
};

export default impulses_cube;
