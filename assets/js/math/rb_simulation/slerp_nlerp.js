import ui_namespace from "/game_physics_2/js/common/ui.min.js";

let slerpNlerp = {};

class Parameters {
  constructor() {
    this.width = 800;
    this.height = 400;
    this.noseLength = 100;
    this.qStartAxis = [0, 1, 0];
    this.qStartAngle = 0.001;
    this.qEndAxis = [0.5, 0.5, 1];
    this.qEndAngle = null; // set in setup(p5)
    this.tStep = 0.005;
  }
}

class System {
  constructor() {
    this.P = new Parameters();
  }
  initialyzeSystem(p5) {
    this.qStart = quatFromAxisAngle(
      p5.createVector(...this.P.qStartAxis),
      this.P.qStartAngle,
      p5
    );
    this.qEnd = quatFromAxisAngle(
      p5.createVector(...this.P.qEndAxis),
      this.P.qEndAngle ?? p5.PI,
      p5
    );
    this.t = 0;
    this.tDirection = 1;
    this.noseLocal = p5.createVector(this.P.noseLength, 0, 0);
    this.nosePointsSlerp = [];
    this.nosePointsNlerp = [];
    this.slider = null;
  }
  setup(p5) {
    this.P.qEndAngle = p5.PI;
    p5.angleMode(p5.RADIANS);
    // Set initial camera angle/orientation
    if (p5._renderer && p5._renderer._curCamera) {
      // Example: set camera to look from (0, 0, 800) to (0, 0, 0)
      p5._renderer._curCamera.setPosition(400, -100, 400);
      p5._renderer._curCamera.lookAt(0, 0, 0);
    }
    this.initialyzeSystem(p5);
  }
  iter(p5) {
    p5.background(240);
    p5.perspective(p5.PI / 5, this.P.width / this.P.height, 0.1, 10000);
    p5.orbitControl();
    drawGlobalAxes(p5);

    this.t = this.slider;

    const updateAndDraw = (
      qFunc,
      points,
      xOffset,
      colorAirplane,
      colorTrajectory
    ) => {
      let q = qFunc(this.qStart, this.qEnd, this.t, p5);
      p5.push();
      p5.translate(xOffset, 0, 0);
      p5.applyMatrix(...quatToMatrix(q));
      drawAirplane(colorAirplane, p5);
      p5.pop();

      let noseWorld = applyQuatToVecInverse(q, this.noseLocal, p5);
      if (this.tDirection > 0) points.push(noseWorld);
      else if (points.length > 0) points.pop();

      p5.push();
      p5.translate(xOffset, 0, 0);
      drawNoseTrajectorySticks(points, colorTrajectory, p5);
      drawNoseTrajectorySlerp(this.qStart, this.qEnd, this.t, colorTrajectory, p5);
      p5.pop();
    };

    let slerp_color_airplane = p5.color(200, 30, 30);
    let slerp_color_trajectory = p5.color(200, 30, 0);
    let nlerp_color_airplane = p5.color(0, 255, 0);
    let nlerp_color_trajectory = p5.color(0, 100, 255);
    updateAndDraw(
      slerp,
      this.nosePointsSlerp,
      0,
      slerp_color_airplane,
      slerp_color_trajectory
    );
    // updateAndDraw(
    //   nlerp,
    //   this.nosePointsNlerp,
    //   0,
    //   nlerp_color_airplane,
    //   nlerp_color_trajectory
    // );
  }
}

slerpNlerp.Interface = class {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new System();
  }
  setup(p5) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Rotate"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 0, 100, 100, 0);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);

    this.system.setup(p5);
  }
  iter(p5) {
    this.system.slider = this.slider1.value / 100;
    this.system.iter(p5);
  }
  reset() {
    this.system.nosePointsSlerp = [];
    this.system.nosePointsNlerp = [];
  }
};

export default slerpNlerp;

// --- p5 utility functions, now all require p5 instance ---
function drawGlobalAxes(p5, length = 200) {
  p5.push();
  p5.strokeWeight(3);
  p5.stroke(255, 0, 0);
  p5.line(0, 0, 0, length, 0, 0);
  p5.stroke(0, 255, 0);
  p5.line(0, 0, 0, 0, -length, 0);
  p5.stroke(0, 0, 255);
  p5.line(0, 0, 0, 0, 0, -length);
  p5.pop();
}

function drawAirplane(color, p5) {
  p5.push();
  p5.fill(color);
  p5.box(150, 20, 20);
  p5.push();
  p5.translate(20, -5, 0);
  p5.box(20, 5, 150);
  p5.pop();
  p5.push();
  p5.translate(-75, -10, 0);
  p5.box(20, 20, 5);
  p5.pop();
  p5.push();
  p5.translate(-75, 0, 0);
  p5.box(10, 5, 70);
  p5.pop();
  p5.pop();
}

function drawNoseTrajectorySticks(points, color, p5) {
  p5.push();
  p5.stroke(color);
  p5.strokeWeight(2);
  // draw last line
  if (points.length > 0) {
    let pt = points[points.length - 1];
    p5.line(0, 0, 0, pt.x, pt.y, pt.z);
  }
  p5.pop();
}
function drawNoseTrajectorySlerp(qStart, qEnd, t, color, p5) {
  // create equaly slerped trajector from beginning to last point
  // and draw small points along the trajectory
  p5.push();
  p5.stroke(color);
  p5.strokeWeight(4);
  // t goes from 0 to 1 equ
  let steps = t * 6.0 / 0.5;

  for (let i = 0; i <= steps; i++) {
    let tStep = (i / steps) * t;
    // slerp from qStart to qEnd  
    let q = slerp(qStart, qEnd, tStep);
    let noseWorld = applyQuatToVecInverse(q, p5.createVector(100, 0, 0), p5);
    p5.point(noseWorld.x, noseWorld.y, noseWorld.z);
  }
  p5.pop();

}

function applyQuatToVecInverse(q, v, p5) {
  let qv = { w: 0, x: v.x, y: v.y, z: v.z };
  let qInv = { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  let qvq = quatMultiply(quatMultiply(qInv, qv), q);
  return p5.createVector(qvq.x, qvq.y, qvq.z);
}

function quatFromAxisAngle(axis, angle, p5) {
  axis = axis.copy().normalize();
  let s = p5.sin(angle / 2);
  return {
    w: p5.cos(angle / 2),
    x: axis.x * s,
    y: axis.y * s,
    z: axis.z * s,
  };
}

function quatMultiply(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function quatDot(q1, q2) {
  return q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
}

function quatNormalize(q) {
  let mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  return {
    w: q.w / mag,
    x: q.x / mag,
    y: q.y / mag,
    z: q.z / mag,
  };
}

function slerp(q1, q2, t) {
  let dot = quatDot(q1, q2);

  if (dot < 0) {
    q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
    dot = -dot;
  }

  if (dot > 0.9995) {
    return quatNormalize(nlerp(q1, q2, t));
  }

  let theta_0 = Math.acos(dot);
  let theta = theta_0 * t;

  let sin_theta = Math.sin(theta);
  let sin_theta_0 = Math.sin(theta_0);

  let s0 = Math.cos(theta) - (dot * sin_theta) / sin_theta_0;
  let s1 = sin_theta / sin_theta_0;

  return {
    w: s0 * q1.w + s1 * q2.w,
    x: s0 * q1.x + s1 * q2.x,
    y: s0 * q1.y + s1 * q2.y,
    z: s0 * q1.z + s1 * q2.z,
  };
}

function nlerp(q1, q2, t) {
  let dot = quatDot(q1, q2);
  if (dot < 0) {
    q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
  }

  let w = q1.w * (1 - t) + q2.w * t;
  let x = q1.x * (1 - t) + q2.x * t;
  let y = q1.y * (1 - t) + q2.y * t;
  let z = q1.z * (1 - t) + q2.z * t;
  return quatNormalize({ w, x, y, z });
}
function quatToMatrix(q) {
  let { w, x, y, z } = q;
  return [
    1 - 2 * y * y - 2 * z * z,
    2 * x * y - 2 * z * w,
    2 * x * z + 2 * y * w,
    0,
    2 * x * y + 2 * z * w,
    1 - 2 * x * x - 2 * z * z,
    2 * y * z - 2 * x * w,
    0,
    2 * x * z - 2 * y * w,
    2 * y * z + 2 * x * w,
    1 - 2 * x * x - 2 * y * y,
    0,
    0,
    0,
    0,
    1,
  ];
}
