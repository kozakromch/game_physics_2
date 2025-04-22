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

function solveOmegaImplicit(omega1, I, h) {
  let omega = [...omega1];

  // f = h * (omega x (I * omega))
  const Iomega = [I[0] * omega[0], I[1] * omega[1], I[2] * omega[2]];
  const f = scaleVec(crossProduct(omega, Iomega), h);

  // J = I + h * [skew(omega) * I - skew(Iomega)]
  const skewOmega = skew(omega);
  const skewIomega = skew(Iomega);

  // skew(omega) * I (I is diagonal): just scale each row of skew(omega)
  const skewOmegaI = [
    [skewOmega[0][0] * I[0], skewOmega[0][1] * I[1], skewOmega[0][2] * I[2]],
    [skewOmega[1][0] * I[0], skewOmega[1][1] * I[1], skewOmega[1][2] * I[2]],
    [skewOmega[2][0] * I[0], skewOmega[2][1] * I[1], skewOmega[2][2] * I[2]],
  ];

  const J = [
    [
      I[0] + h * (skewOmegaI[0][0] - skewIomega[0][0]),
      h * (skewOmegaI[0][1] - skewIomega[0][1]),
      h * (skewOmegaI[0][2] - skewIomega[0][2]),
    ],
    [
      h * (skewOmegaI[1][0] - skewIomega[1][0]),
      I[1] + h * (skewOmegaI[1][1] - skewIomega[1][1]),
      h * (skewOmegaI[1][2] - skewIomega[1][2]),
    ],
    [
      h * (skewOmegaI[2][0] - skewIomega[2][0]),
      h * (skewOmegaI[2][1] - skewIomega[2][1]),
      I[2] + h * (skewOmegaI[2][2] - skewIomega[2][2]),
    ],
  ];

  // dx = solve J * dx = f
  const dx = solve33(J, f);

  omega = [omega[0] - dx[0], omega[1] - dx[1], omega[2] - dx[2]];

  return omega;
}
function crossProduct(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function skew(v) {
  const [x, y, z] = v;
  return [
    [0, -z, y],
    [z, 0, -x],
    [-y, x, 0],
  ];
}

function scaleVec(v, s) {
  return v.map((e) => e * s);
}

function solve33(A, b) {
  const inv = invert3x3(A);
  return multiplyMatVec(inv, b);
}

function invert3x3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;

  const A = e * i - f * h;
  const B = c * h - b * i;
  const C = b * f - c * e;
  const D = f * g - d * i;
  const E = a * i - c * g;
  const F = c * d - a * f;
  const G = d * h - e * g;
  const H = b * g - a * h;
  const I = a * e - b * d;

  const det = a * A + b * D + c * G;
  if (Math.abs(det) < 1e-10) throw new Error("Singular matrix");

  const invDet = 1 / det;

  return [
    [A * invDet, B * invDet, C * invDet],
    [D * invDet, E * invDet, F * invDet],
    [G * invDet, H * invDet, I * invDet],
  ];
}

class Parameters {
  constructor() {
    this.L_world = [0.5, 0.5, 700.0]; // Заданный глобальный момент импульса (константный)
    this.sizes = [100, 30, 50];
    this.mass = 1;
    this.subIters = 1;
    this.dt = 5;
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
  constructor(is_implicit) {
    this.is_implicit = is_implicit;
    this.P = new Parameters();
  }
  init() {
    this.q = new Quaternion(1, 0, 0, 0);
    // this.I = boxSizeToInertiaTensor(
    //   this.P.sizes[0],
    //   this.P.sizes[1],
    //   this.P.sizes[2],
    //   this.P.mass
    // );
    this.I = [3341, 33333, 30008];
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
    let dt = this.P.dt / this.P.subIters;
    for (let i = 0; i < this.P.subIters; i++) {
      if (this.is_implicit) {
        this.implicitEuler(dt);
      } else {
        this.forwardEuler(dt);
      }
      let dq = Quaternion.fromAngularVelocity(this.omega, dt);
      this.q = this.q.add(this.q.mult(dq));
      this.q.normalize();
    }
    this.L_world = this.computeAngularMomentumWorld();
    this.E = this.computeEnergy();
    this.w_world = this.computeAngularVelocityWorld();
  }
  computeEnergy() {
    // Энергия вращения: E = 1/2 * ω^T * I * ω
    let I = this.I;
    let omega = this.omega;
    return (
      0.5 *
      (I[0] * omega[0] * omega[0] +
        I[1] * omega[1] * omega[1] +
        I[2] * omega[2] * omega[2])
    );
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
  computeAngularVelocityWorld() {
    // переводим угловую скорость в мировой базис: ω_world = R * ω_body
    let R = this.q.toMatrix3();
    let omega = this.omega;
    return multMatVec(R, omega);
  }

  forwardEuler(dt) {
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

  implicitEuler(dt) {
    // Неявное интегрирование угловой скорости
    this.omega = solveOmegaImplicit(this.omega, this.I, dt);
  }
}

class Visualizator {
  constructor() {}
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

  drawVector(p5, system, scale = 0.1) {
    let v = system.L_world;
    let x = v[0] * scale;
    let y = v[1] * scale;
    let z = v[2] * scale;
    p5.strokeWeight(3);
    p5.line(0, 0, 0, x, y, z);
  }
  drawVectorArrow(p5, v, scale = 0.1) {
    let x = v[0] * scale;
    let y = v[1] * scale;
    let z = v[2] * scale;
    p5.strokeWeight(3);
    p5.line(0, 0, 0, x, y, z);
    p5.push();
    p5.translate(x, y, z);
    p5.rotateX(Math.PI / 2);

    p5.cone(4, 10);
    p5.pop();
  }
  drawLWorld(p5, system) {
    p5.stroke(255, 0, 0);
    p5.fill(255, 0, 0);
    p5.strokeWeight(3);
    this.drawVectorArrow(p5, system.L_world, 0.1);
  }
  drawWworld(p5, system) {
    p5.stroke(0, 255, 0);
    p5.fill(0, 255, 0);
    p5.strokeWeight(3);
    this.drawVectorArrow(p5, system.w_world, 100);
  }
  printEnergy(p5, system) {
    p5.fill(0);
    p5.textSize(20);
    p5.textAlign(p5.LEFT, p5.TOP);
    p5.text("Energy: " + system.E.toFixed(2) + " J", 10, 10);
  }
  draw(p5, system) {
    p5.background(250);

    p5.orbitControl();
    this.drawFloor(p5);
    this.drawLWorld(p5, system);
    this.drawWworld(p5, system);
    this.drawRigidBody(p5, system);
    this.printEnergy(p5, system);
  }
}
let rb_free = {};
rb_free.Interface = class {
  constructor(base_name, implicit) {
    this.base_name = base_name;
    this.system = new System(implicit);
    this.visualizator = new Visualizator();
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
    p5.camera(
      -500,
      -200,
      500, // eyeX, eyeY, eyeZ — откуда смотрим
      0,
      0,
      0, // centerX, centerY, centerZ — куда смотрим
      0,
      1,
      0
    ); // upX, upY, upZ — направление "вверх"
    p5.textFont(myFont);
  }

  reset() {
    this.system.reset();
  }
};

export default rb_free;
