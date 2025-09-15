// static/js/jacobi.js
function createSketch(baseName, root) {
  // вставляем HTML внутрь root
  root.insertAdjacentHTML(
    "beforeend",
    `
    <style> 
    .matrix-input { font-size: 0.75rem; padding: 0.25rem; width: 3.125rem; height: 1.875rem; } 
    .vector-input { font-size: 0.75rem; padding: 0.25rem; width: 3.125rem; height: 1.875rem; } 
    </style>
    <div class="d-flex justify-content-around">
      <div>
        <h5 style="text-align: center;">A</h5>
          <div id="${baseName}_matrixA" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
            <input class="matrix-input hx-rounded" value="10">
            <input class="matrix-input hx-rounded" value="-1">
            <input class="matrix-input hx-rounded" value="2">
            <input class="matrix-input hx-rounded" value="-1">
            <input class="matrix-input hx-rounded" value="11">
            <input class="matrix-input hx-rounded" value="-1">
            <input class="matrix-input hx-rounded" value="2">
            <input class="matrix-input hx-rounded" value="-1">
            <input class="matrix-input hx-rounded" value="10">
          </div>
      </div>
      <div>
        <h5 style="text-align: center;">x</h5>
          <div id="${baseName}_vectorX" style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 0.25rem;">
            <input class="vector-input hx-rounded" value="0">
            <input class="vector-input hx-rounded" value="0">
            <input class="vector-input hx-rounded" value="0">
          </div>
      </div>
      <div>
        <h5 style="text-align: center;">b</h5>
          <div id="${baseName}_vectorB" style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 0.25rem;">
            <input class="vector-input hx-rounded" value="6">
            <input class="vector-input hx-rounded" value="25">
            <input class="vector-input hx-rounded" value="-11">
          </div>
      </div>
    </div>
    <canvas id="${baseName}_canvas" width="600" height="120" class="border rounded bg-white mb-3"></canvas>
    <div>Норма невязки ||Ax-b||: <span id="${baseName}_resView">0</span></div>
    <div>Итерация: <span id="${baseName}_iter">0</span></div>
  `
  );

  // тут можно подключить реализацию метода Якоби
  initJacobiSolver(baseName);
}

// Простая реализация решателя методом Якоби
function initJacobiSolver(baseName) {
  const root = document.getElementById(baseName + "_base_id");
  const btnStart = root.querySelector("#" + baseName + "_stop_button_id");
  const btnReset = root.querySelector("#" + baseName + "_reset_button_id");
  const dom = {
    A: root.querySelector("#" + baseName + "_matrixA"),
    X: root.querySelector("#" + baseName + "_vectorX"),
    B: root.querySelector("#" + baseName + "_vectorB"),
    canvas: root.querySelector("#" + baseName + "_canvas"),
    res: root.querySelector("#" + baseName + "_resView"),
    iter: root.querySelector("#" + baseName + "_iter"),
  };

  let x = [0, 0, 0],
    iter = 0,
    running = false,
    iv = null,
    history = [];

  function parseMatrix(el) {
    const vals = [...el.querySelectorAll("input")].map((i) => +i.value);
    return [
      [vals[0], vals[1], vals[2]],
      [vals[3], vals[4], vals[5]],
      [vals[6], vals[7], vals[8]],
    ];
  }
  function parseVector(el) {
    return [...el.querySelectorAll("input")].map((i) => +i.value);
  }
  function writeVector(el, vec) {
    const inputs = el.querySelectorAll("input");
    vec.forEach((v, i) => (inputs[i].value = v.toFixed(6)));
  }
  function mulMatVec(A, x) {
    return A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0));
  }
  function sub(a, b) {
    return a.map((v, i) => v - b[i]);
  }
  function norm(v) {
    return Math.sqrt(v.reduce((s, v) => s + v * v, 0));
  }

  function step() {
    const A = parseMatrix(dom.A);
    const b = parseVector(dom.B);
    const x_old = x.slice();
    const x_new = [];
    for (let i = 0; i < 3; i++) {
      let s = 0;
      for (let j = 0; j < 3; j++) if (i !== j) s += A[i][j] * x_old[j];
      x_new[i] = (b[i] - s) / A[i][i];
    }
    x = x_new;
    iter++;
    const res = norm(sub(mulMatVec(A, x), b));
    history.push(res);
    dom.res.textContent = res.toExponential(3);
    dom.iter.textContent = iter;
    writeVector(dom.X, x);
    drawHistory();
  }

  function drawHistory() {
    const ctx = dom.canvas.getContext("2d");
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    if (!history.length) return;
    const max = Math.max(...history);
    ctx.beginPath();
    history.forEach((v, i) => {
      const xp = (i / history.length) * dom.canvas.width;
      const yp = dom.canvas.height - (v / max) * dom.canvas.height;
      i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
    });
    ctx.strokeStyle = "green";
    ctx.stroke();
  }

  function start() {
    if (running) return;
    running = true;
    iv = setInterval(step, 500);
    btnStart.textContent = "Stop";
  }
  function stop() {
    running = false;
    clearInterval(iv);
    btnStart.textContent = "Start";
  }
  function reset() {
    stop();
    x = [0, 0, 0];
    iter = 0;
    history = [];
    writeVector(dom.X, x);
    dom.res.textContent = "0";
    dom.iter.textContent = "0";
    dom.canvas
      .getContext("2d")
      .clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  }

  btnStart.addEventListener("click", () => (running ? stop() : start()));
  btnReset.addEventListener("click", reset);
}

// Автоматически инициализируем все base_id контейнеры на странице
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[id$='jacobi_main']").forEach((root) => {
    const baseName = "jacobi"
    createSketch(baseName, root);
  });
});
