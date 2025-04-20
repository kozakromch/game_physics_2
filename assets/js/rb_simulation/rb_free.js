// import color_scheme from "../../js/common/color_scheme.min.js";

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function multMatVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function transposeMat3(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

// --- Кватернионы ---

class Quaternion {
  constructor(w, x, y, z) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static fromAngularVelocity(omega, dt) {
    let [x, y, z] = omega;
    let half_dt = 0.5 * dt;
    return new Quaternion(0, x * half_dt, y * half_dt, z * half_dt);
  }

  mult(q) {
    let w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
    let x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
    let y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
    let z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;
    return new Quaternion(w, x, y, z);
  }
  add(q) {
    return new Quaternion(
      this.w + q.w,
      this.x + q.x,
      this.y + q.y,
      this.z + q.z
    );
  }
  normalize() {
    let norm = Math.sqrt(this.w ** 2 + this.x ** 2 + this.y ** 2 + this.z ** 2);
    this.w /= norm;
    this.x /= norm;
    this.y /= norm;
    this.z /= norm;
  }

  toMatrix3() {
    let { w, x, y, z } = this;
    return [
      1 - 2 * y * y - 2 * z * z,
      2 * x * y - 2 * z * w,
      2 * x * z + 2 * y * w,
      2 * x * y + 2 * z * w,
      1 - 2 * x * x - 2 * z * z,
      2 * y * z - 2 * x * w,
      2 * x * z - 2 * y * w,
      2 * y * z + 2 * x * w,
      1 - 2 * x * x - 2 * y * y,
    ];
  }

  toMatrix() {
    let m = this.toMatrix3();
    return [
      m[0],
      m[1],
      m[2],
      0,
      m[3],
      m[4],
      m[5],
      0,
      m[6],
      m[7],
      m[8],
      0,
      0,
      0,
      0,
      1,
    ];
  }
}

class Parameters {
  constructor() {
    this.L_world = [0.5, 0.5, 500.0]; // Заданный глобальный момент импульса (константный)
    this.sizes = [600, 10, 200];
    this.mass = 1;
    this.subIters = 300;
    this.dt = 0.01;
    this.width = 800;
    this.height = 800;
  }
}

function boxSizeToInertiaTensor(a, b, c, mass) {
  const m = mass;
  const Ixx = (1 / 12) * m * (b * b + c * c);
  const Iyy = (1 / 12) * m * (a * a + c * c);
  const Izz = (1 / 12) * m * (a * a + b * b);

  return [Ixx, Iyy, Izz];
}

class System {
  constructor() {
    this.P = new Parameters();
  }
  init() {
    this.q = new Quaternion(1, 0, 0, 0);
    this.I = boxSizeToInertiaTensor(
      this.P.sizes[0],
      this.P.sizes[1],
      this.P.sizes[2],
      this.P.mass
    );
    // this.I = [3341, 33333, 30008];
    console.log(this.I);
    // Начальный момент импульса в локальных координатах
    let R = this.q.toMatrix3();
    let L_body = multMatVec(transposeMat3(R), this.P.L_world);
    // Начальная угловая скорость: ω = I⁻¹ * L
    let I = this.I;
    this.omega = [L_body[0] / I[0], L_body[1] / I[1], L_body[2] / I[2]];
  }
  reset() {
    this.init();
  }
  calcSystem() {
    for (let i = 0; i < this.P.subIters; i++) {
      this.forwardEuler();
      let dq = Quaternion.fromAngularVelocity(this.omega, this.P.dt);
      this.q = this.q.add(this.q.mult(dq));
      this.q.normalize();
    }
    this.L_world = this.computeAngularMomentumWorld();
  }

  computeAngularMomentumWorld() {
    // В локальных координатах: L_body = I * omega
    let o = this.omega;
    let I = this.I;
    let L_body = [I[0] * o[0], I[1] * o[1], I[2] * o[2]];

    // Преобразуем в мировой базис: L_world = R * L_body
    let R = this.q.toMatrix3();
    return multMatVec(R, L_body);
  }

  forwardEuler() {
    let dt = this.P.dt;
    let I = this.I;
    // Уравнение Эйлера: dω/dt = -I⁻¹ (ω × (Iω))
    let Iomega = [
      I[0] * this.omega[0],
      I[1] * this.omega[1],
      I[2] * this.omega[2],
    ];
    let omega_cross_Iomega = cross(this.omega, Iomega);
    let domega = [
      -omega_cross_Iomega[0] / I[0],
      -omega_cross_Iomega[1] / I[1],
      -omega_cross_Iomega[2] / I[2],
    ];

    // Явное интегрирование угловой скорости
    this.omega[0] += dt * domega[0];
    this.omega[1] += dt * domega[1];
    this.omega[2] += dt * domega[2];
  }
}

class Visualizator {
  drawRigidBody(p5, system, colorVal = [100, 180, 255]) {
    p5.push();
    let m = system.q.toMatrix();
    p5.applyMatrix(...m);

    p5.fill(...colorVal);
    p5.stroke(0);
    p5.strokeWeight(1);
    p5.box(...system.P.sizes); // куб в качестве твердого тела
    p5.pop();
  }
  drawFloor(p5) {
    p5.push();
    p5.rotateX(p5.HALF_PI); // Повернуть, чтобы лежал в XY-плоскости
    p5.translate(0, 0, -70); // Опустить чуть ниже центра сцены
    p5.noStroke();
    p5.fill(180); // Серый цвет
    p5.plane(800, 800); // Ширина и длина пола
    p5.pop();
  }

  drawVector(p5, v, scale = 10) {
    let x = v[0] * scale;
    let y = v[1] * scale;
    let z = v[2] * scale;
    p5.strokeWeight(3);
    p5.line(0, 0, 0, x, y, z);
  }

  draw(p5, system) {
    p5.background(250);

    p5.orbitControl();
    p5.stroke(255, 0, 0);
    this.drawFloor(p5);
    // this.drawVector(p5, system); // масштабируем для видимости
    this.drawRigidBody(p5, system);
  }
}
let rb_free = {};
rb_free.Interface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new System(true);
    this.visualizator = new Visualizator(true);
  }
  iter(p5) {
    this.system.calcSystem();

    this.visualizator.draw(p5, this.system);
  }
  setup(p5) {
    p5.frameRate(30);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.init();
  }

  reset() {
    this.system.reset();
  }
};

export default rb_free;
