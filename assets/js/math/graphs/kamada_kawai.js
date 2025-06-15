import ui_namespace from "/game_physics_2/js/common/ui.min.js";

class KamadaKawaiParameters {
  constructor() {
    this.margin = 20;
    this.totalVertices = 20;
    this.springLength = 50;
    this.epsilon = 1e-2;
    this.repelStrength = 2.0;
    this.repelForce = 100;
    this.soften = 100;
    this.maxStep = 100;
    this.maxAlpha = 0.3;
    this.minAlpha = 0.1;
    this.scale = 0.5;
    this.vertexRadius = 25;
    this.width = 800;
    this.height = 800;
    this.graphConnectivity = 0.1; // Probability of edge creation
  }
}

class KamadaKawaiSystem {
  constructor() {
    this.P = new KamadaKawaiParameters();
    // this.reset();
  }

  reset() {
    this.graph = {};
    this.positions = [];
    this.displayPositions = [];
    this.normalizedDisplayed = [];
    this.L = [];
    this.K = [];
    this.D = [];
    this.isLayoutDone = false;
    this.generateGraph();
    this.circularLayout(this.P.height / 2 - this.P.margin);
    this.displayPositions = this.positions.map((pos) => ({ ...pos }));
    this.normalizedDisplayed = this.displayPositions.map((pos) => ({ ...pos }));
    this.initializeMatrices();
    this.isLayoutDone = false;
  }

  generateGraph() {
    const n = this.P.totalVertices;
    this.graph = {};
    this.positions = [];
    for (let i = 0; i < n; i++) {
      this.graph[i] = [];
      this.positions[i] = {
        x: Math.random() * this.P.width,
        y: Math.random() * this.P.height,
      };
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.random() < this.P.graphConnectivity) {
          this.graph[i].push(j);
          this.graph[j].push(i);
        }
      }
    }
  }
  circularLayout(radius = 250) {
    const centerX = this.P.width / 2;
    const centerY = this.P.height / 2;
    const n_vertices = this.positions.length;
    const TWO_PI = Math.PI * 2;
    for (let i = 0; i < n_vertices; i++) {
      let angle = (TWO_PI * i) / n_vertices;
      this.positions[i] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    }
  }
  initializeMatrices() {
    const n = this.positions.length;
    this.D = Array(n)
      .fill()
      .map(() => Array(n).fill(Infinity));
    this.L = Array(n)
      .fill()
      .map(() => Array(n).fill(0));
    this.K = Array(n)
      .fill()
      .map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) this.D[i][i] = 0;
    for (let i in this.graph) {
      for (let j of this.graph[i]) {
        this.D[i][j] = 1;
        this.D[j][i] = 1;
      }
    }
    // Floyd-Warshall
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (this.D[i][j] > this.D[i][k] + this.D[k][j]) {
            this.D[i][j] = this.D[i][k] + this.D[k][j];
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && this.D[i][j] < Infinity) {
          this.L[i][j] = this.P.springLength * this.D[i][j];
          this.K[i][j] = 1 / (this.D[i][j] * this.D[i][j]);
        }
      }
    }
  }

  kamadaKawaiStep() {
    const n = this.positions.length;
    let maxGrad = 0;
    let idx = -1;
    for (let i = 0; i < n; i++) {
      let grad = this.computeGradient(i);
      let delta = grad[0] * grad[0] + grad[1] * grad[1];
      if (delta > maxGrad) {
        maxGrad = delta;
        idx = i;
      }
    }
    if (Math.sqrt(maxGrad) < this.P.epsilon) {
      this.isLayoutDone = true;
      return;
    }
    this.minimizeVertex(idx);
    // Smoothly update displayPositions toward positions
    const lerp = (a, b, t) => a + (b - a) * t;
    for (let i = 0; i < n; i++) {
      this.displayPositions[i].x = lerp(
        this.displayPositions[i].x,
        this.positions[i].x,
        0.2
      );
      this.displayPositions[i].y = lerp(
        this.displayPositions[i].y,
        this.positions[i].y,
        0.2
      );
    }
    this.normalizeLayout();
  }

  computeGradient(i) {
    let dx = 0;
    let dy = 0;
    let xi = this.positions[i].x;
    let yi = this.positions[i].y;
    let n_vertices = this.positions.length;
    for (let j = 0; j < n_vertices; j++) {
      if (i === j || this.D[i][j] === Infinity) continue;
      let xj = this.positions[j].x;
      let yj = this.positions[j].y;
      let dxij = xi - xj;
      let dyij = yi - yj;
      let dist = Math.sqrt(dxij * dxij + dyij * dyij);
      if (dist === 0) dist = 0.01;
      let coeff = this.K[i][j] * (1 - this.L[i][j] / dist);
      dx += coeff * dxij;
      dy += coeff * dyij;
    }
    // Repel from edges (improved: linear spring force within margin)
    // if (xi < this.P.margin)
    //   dx += (this.P.repelStrength * (this.P.margin - xi)) / this.P.margin;
    // if (xi > this.P.width - this.P.margin)
    //   dx -=
    //     (this.P.repelStrength * (xi - (this.P.width - this.P.margin))) /
    //     this.P.margin;
    // if (yi < this.P.margin)
    //   dy += (this.P.repelStrength * (this.P.margin - yi)) / this.P.margin;
    // if (yi > this.P.height - this.P.margin)
    //   dy -=
    //     (this.P.repelStrength * (yi - (this.P.height - this.P.margin))) /
    //     this.P.margin;

    for (let j = 0; j < n_vertices; j++) {
      if (i === j) continue;
      // Only repel if not directly connected
      if (this.graph[i].includes(j)) continue;
      let dxij = xi - this.positions[j].x;
      let dyij = yi - this.positions[j].y;
      let minDist = this.P.vertexRadius; // Minimum allowed distance (vertex radius)
      let dist2 = dxij * dxij + dyij * dyij + 10; // soften=10 for stability
      let dist = Math.sqrt(dist2);
      // Only apply repulsion if closer than 2*vertexRadius
      if (dist < 2 * minDist) {
        let repel = (this.P.repelForce * (2 * minDist - dist)) / dist2;
        dx -= repel * dxij;
        dy -= repel * dyij;
      }
    }
    return [dx, dy];
  }

  minimizeVertex(i) {
    let [dx, dy] = this.computeGradient(i);
    let len = Math.sqrt(dx * dx + dy * dy);
    if (len > this.P.maxStep) {
      dx *= this.P.maxStep / len;
      dy *= this.P.maxStep / len;
    }
    let alpha = this.P.maxAlpha / (1 + this.P.scale * len);
    alpha = Math.max(this.P.minAlpha, Math.min(alpha, 0.5));
    this.positions[i].x -= alpha * dx;
    this.positions[i].y -= alpha * dy;
    // Clamp inside canvas
    this.positions[i].x = Math.max(
      this.P.margin,
      Math.min(this.positions[i].x, this.P.width - this.P.margin)
    );
    this.positions[i].y = Math.max(
      this.P.margin,
      Math.min(this.positions[i].y, this.P.height - this.P.margin)
    );
  }

  normalizeLayout() {
    // 1. Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (let p of this.displayPositions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    let boxWidth = maxX - minX;
    let boxHeight = maxY - minY;
    let margin = this.P.margin;
    let width = this.P.width;
    let height = this.P.height;
    let targetWidth = width - 2 * margin;
    let targetHeight = height - 2 * margin;
    let targetScaleX = targetWidth / boxWidth;
    let targetScaleY = targetHeight / boxHeight;
    let targetScale = Math.min(targetScaleX, targetScaleY);
    let targetCenterX = width / 2;
    let targetCenterY = height / 2;
    let actualCenterX = (minX + maxX) / 2;
    let actualCenterY = (minY + maxY) / 2;

    // Initialize smooth center/scale if not present
    if (this._smoothCenter === undefined) {
      this._smoothCenter = { x: actualCenterX, y: actualCenterY };
    }
    if (this._smoothScale === undefined) {
      this._smoothScale = targetScale;
    }
    // Smoothly interpolate center and scale
    const lerp = (a, b, t) => a + (b - a) * t;
    this._smoothCenter.x = lerp(this._smoothCenter.x, actualCenterX, 0.08);
    this._smoothCenter.y = lerp(this._smoothCenter.y, actualCenterY, 0.08);
    this._smoothScale = lerp(this._smoothScale, targetScale, 0.08);

    // Compute target normalized positions using smooth center/scale
    if (!this.normalizedDisplayed) {
      this.normalizedDisplayed = this.displayPositions.map(pos => ({...pos}));
    }
    for (let i = 0; i < this.displayPositions.length; i++) {
      this.normalizedDisplayed[i].x = lerp(
        this.normalizedDisplayed[i].x,
        (this.displayPositions[i].x - this._smoothCenter.x) * this._smoothScale + targetCenterX,
        0.1
      );
      this.normalizedDisplayed[i].y = lerp(
        this.normalizedDisplayed[i].y,
        (this.displayPositions[i].y - this._smoothCenter.y) * this._smoothScale + targetCenterY,
        0.1
      );
    }
  }
}

class KamadaKawaiVisualizer {
  constructor() {}
  vizualize(p5, system) {
    this.drawEdges(p5, system);
    this.drawVertices(p5, system);
  }
  drawEdges(p5, system) {
    p5.stroke(50);
    p5.strokeWeight(1);
    for (let i in system.graph) {
      for (let j of system.graph[i]) {
        if (parseInt(i) < j) {
          p5.line(
            system.normalizedDisplayed[i].x,
            system.normalizedDisplayed[i].y,
            system.normalizedDisplayed[j].x,
            system.normalizedDisplayed[j].y
          );
        }
      }
    }
  }
  drawVertices(p5, system) {
    p5.textAlign(p5.CENTER, p5.CENTER);
    for (let i = 0; i < system.normalizedDisplayed.length; i++) {
      p5.stroke(0);
      p5.strokeWeight(1);
      p5.fill(100, 180, 255);
      p5.ellipse(
        system.normalizedDisplayed[i].x,
        system.normalizedDisplayed[i].y,
        system.P.vertexRadius,
        system.P.vertexRadius
      );
      p5.fill(0);
      p5.noStroke();
      p5.text(i, system.normalizedDisplayed[i].x, system.normalizedDisplayed[i].y);
    }
  }
}

class Interface {
  constructor(base_name) {
    this.base_name = base_name;
    this.system = new KamadaKawaiSystem();
    this.visualizer = new KamadaKawaiVisualizer(base_name);
    this.iter_new_simul = 0;
  }
  iter(p5) {
    let vertices_new = this.slider1.value;
    let connectivity_new = this.slider2.value;
    if (this.vertices != vertices_new) {
      this.iter_new_simul = 8;
      this.vertices = vertices_new;
    }
    if (this.connectivity != connectivity_new) {
      this.iter_new_simul = 8;
      this.connectivity = connectivity_new;
    }

    if (this.iter_new_simul >= 0) {
      this.iter_new_simul--;
    }
    if (this.iter_new_simul == 0) {
      this.system.P.totalVertices = this.vertices;
      this.system.P.graphConnectivity = this.connectivity;
      this.vertices = vertices_new;
      this.connectivity = connectivity_new;
      // Reset normalized display state for new graph
      this.system._normalizedTarget = undefined;
      this.system.normalizedDisplayed = undefined;
      this.system.reset();
    }

    if (!this.system.isLayoutDone) {
      this.system.kamadaKawaiStep();
    }
    this.visualizer.vizualize(p5, this.system);
  }

  
  reset() {
    this.system.reset();
  }
  setup(p5) {
    p5.frameRate(30);

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Vertices"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 2, 25, 23);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
    }.bind(this);
    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "2",
        "Connectivity"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 0, 1, 100, 0.3);
      console.log(this.slider2.value);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
    }.bind(this);

    this.vertices = this.slider1.value;
    this.connectivity = this.slider2.value;

    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.totalVertices = this.vertices;
    this.system.P.graphConnectivity = this.connectivity;

    this.system.reset();
  }
}

// Export Interface as part of the default export
export default {
  Interface: Interface,
};
