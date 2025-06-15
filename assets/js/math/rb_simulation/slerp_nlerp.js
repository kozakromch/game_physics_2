let qStart, qEnd;
let t = 0;
let tDirection = 1;
let useSlerp = true;
let slider;
let nosePointsSlerp = [];
let nosePointsNlerp = [];
let noseLocal;

function setup() {
  createCanvas(800, 400, WEBGL);
  angleMode(RADIANS);

  qStart = quatFromAxisAngle(createVector(0, 1, 0), 0);
  qEnd = quatFromAxisAngle(createVector(0.5, 0.5, 1), PI);
  noseLocal = createVector(100, 0, 0);
  createP("Слева: SLERP, справа: NLERP");

  slider = createSlider(0, 1, 0, 0.001);
  slider.style("width", "780px");
}

function draw() {
  background(30);
  perspective(PI / 5, width / height, 0.1, 10000);
  orbitControl();
  drawGlobalAxes();

  t = slider.value();
  t += 0.005 * tDirection;
  if (t >= 1 || t <= 0) tDirection *= -1;
  slider.value(t);

  // Helper to update and draw airplane + nose trajectory
  function updateAndDraw(
    qFunc,
    points,
    xOffset,
    colorAirplane,
    colorTrajectory
  ) {
    let q = qFunc(qStart, qEnd, t);
    push();
    translate(xOffset, 0, 0);
    applyMatrix(...quatToMatrix(q));
    drawAirplane(colorAirplane);
    pop();

    let noseWorld = applyQuatToVecInverse(q, noseLocal);
    if (tDirection > 0) points.push(noseWorld);
    else if (points.length > 0) points.pop();

    push();
    translate(xOffset, 0, 0);
    drawNoseTrajectorySticks(points, colorTrajectory);
    pop();
  }

  let slerp_color_airplane = color(255, 0, 0);
  let slerp_color_trajectory = color(255, 100, 0);
  let nlerp_color_airplane = color(0, 255, 0);
  let nlerp_color_trajectory = color(0, 100, 255);
  updateAndDraw(
    slerp,
    nosePointsSlerp,
    0,
    slerp_color_airplane,
    slerp_color_trajectory
  );
  updateAndDraw(
    nlerp,
    nosePointsNlerp,
    0,
    nlerp_color_airplane,
    nlerp_color_trajectory
  );
}

function drawGlobalAxes(length = 200) {
  push();
  strokeWeight(3);

  // X - Red
  stroke(255, 0, 0);
  line(0, 0, 0, length, 0, 0);

  // Y - Green
  stroke(0, 255, 0);
  line(0, 0, 0, 0, length, 0);

  // Z - Blue
  stroke(0, 0, 255);
  line(0, 0, 0, 0, 0, length);

  pop();
}

// Отрисовка
function drawAirplane(color) {
  push();

  // fill(200, 100, 100);
  fill(color);
  box(150, 20, 20); // тело

  // fill(100, 200, 100);
  push();
  translate(20, -5, 0);
  box(20, 5, 150); // крыло
  pop();

  // fill(100, 100, 250);
  push();
  translate(-75, -10, 0);
  box(20, 20, 5); // хвост вертикальный
  pop();

  push();
  translate(-75, 0, 0);
  box(10, 5, 70); // хвост горизонтальный
  pop();

  pop();
}

// --- Draw nose trajectory as points ---
function drawNoseTrajectorySticks(points, color) {
  push();
  stroke(color);
  strokeWeight(2);
  for (let pt of points) {
    line(0, 0, 0, pt.x, pt.y, pt.z);
  }
  pop();
}

function applyQuatToVecInverse(q, v) {
  // v' = q⁻¹ * v * q
  let qv = { w: 0, x: v.x, y: v.y, z: v.z };
  let qInv = { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  let qvq = quatMultiply(quatMultiply(qInv, qv), q);
  return createVector(qvq.x, qvq.y, qvq.z);
}

function quatMultiply(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function quatFromAxisAngle(axis, angle) {
  axis = axis.copy().normalize();
  let s = sin(angle / 2);
  return {
    w: cos(angle / 2),
    x: axis.x * s,
    y: axis.y * s,
    z: axis.z * s,
  };
}

function quatDot(q1, q2) {
  return q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
}

function quatNormalize(q) {
  let mag = sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
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

  let theta_0 = acos(dot);
  let theta = theta_0 * t;

  let sin_theta = sin(theta);
  let sin_theta_0 = sin(theta_0);

  let s0 = cos(theta) - (dot * sin_theta) / sin_theta_0;
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
