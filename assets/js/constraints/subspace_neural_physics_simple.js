class Parameters {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.scale = 40;
    this.nodeRadius = 0.1;
    this.clothWidth = 10;
    this.clothHeight = 6;
    this.bgColor = [30, 30, 30];
    this.springColor = [180, 180, 180];
    this.nodeColor = [50, 200, 255];
    this.pcaParamFile = "/info/subspace_neural_physics/cloth_parameters.csv";
    this.pcaDataFile =
      "/info/subspace_neural_physics/cloth_simulation_data_pca.csv";
  }
}

function worldToScreen(pos, P) {
  const x = P.width / 4 + pos[0] * P.scale;
  const y =  - pos[1] * P.scale; // Invert y-axis for screen coordinates
  return [x, y];
}

function getNodesFromFrame(frame_data, P) {
  let nodes = [];
  let idx = 0;
  for (let y = 0; y < P.clothHeight; y++) {
    let row = [];
    for (let x = 0; x < P.clothWidth; x++) {
      row.push([frame_data[idx], frame_data[idx + 1]]);
      idx += 2;
    }
    nodes.push(row);
  }
  return nodes;
}

function vecMatMul(v, M) {
  let out = new Array(M[0].length).fill(0);
  for (let j = 0; j < M[0].length; j++) {
    for (let i = 0; i < M.length; i++) {
      out[j] += v[i] * M[i][j];
    }
  }
  return out;
}

function vecMatMulTranspose(v, M) {
  let out = new Array(M.length).fill(0);
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      out[i] += v[j] * M[i][j];
    }
  }
  return out;
}
function vecAdd(a, b) {
  return a.map((v, i) => v + b[i]);
}

class NeuralPhysicsSystem {
  constructor() {
    this.P = new Parameters();
    this.ready = false;
    this.alpha = null;
    this.beta = null;
    this.x_mean = null;
    this.x_transform = null;
    this.z_1 = null;
    this.z_2 = null;
    this.nodes = null;
  }

  async preload() {
    // Load parameters and PCA data
    const [paramText, pcaText] = await Promise.all([
      fetch(this.P.pcaParamFile).then((r) => r.text()),
      fetch(this.P.pcaDataFile).then((r) => r.text()),
    ]);
    const paramRows = paramText
      .trim()
      .split("\n")
      .map((r) => r.split(","));
    console.log("Loaded parameters:", paramRows);
    this.alpha = paramRows[0].slice(1).map(Number);
    this.beta = paramRows[1].slice(1).map(Number);
    this.x_mean = paramRows[2].slice(1).map(Number);
    const num_pca = this.alpha.length;
    const dof = this.x_mean.length;
    const x_transform_flat = paramRows[3].slice(1).map(Number);
    this.x_transform = [];
    for (let i = 0; i < dof; i++) {
      this.x_transform.push(
        x_transform_flat.slice(i * num_pca, (i + 1) * num_pca)
      );
    }
    this.z_pca = pcaText
      .trim()
      .split("\n")
      .map((r) => r.split(",").map(Number));
    this.z_2 = this.z_pca[0].slice();
    this.z_1 = this.z_pca[1].slice();
    this.ready = true;
    console.log("Neural Physics System ready with parameters:", {
      alpha: this.alpha,
      beta: this.beta,
      x_mean: this.x_mean,
      x_transform: this.x_transform,
    });
  }

  calcSystem() {
    // z_sim = alpha * z_1 + beta * (z_1 - z_2)
    let z_sim = this.z_1.map(
      (v, i) =>
        this.alpha[i] * this.z_1[i] + this.beta[i] * (this.z_1[i] - this.z_2[i])
    );
    this.z_2 = this.z_1.slice();
    this.z_1 = z_sim.slice();
    // x_recovery = z_sim * x_transform^T + x_mean
    let x_recovery = vecAdd(vecMatMulTranspose(z_sim, this.x_transform), this.x_mean);
    this.nodes = getNodesFromFrame(x_recovery, this.P);
  }
}

class NeuralPhysicsVisualizer {
  draw(p5, system) {
    if (!system.ready || !system.nodes) return;
    // Draw springs
    p5.stroke(...system.P.springColor);
    p5.strokeWeight(2);
    for (let y = 0; y < system.P.clothHeight; y++) {
      for (let x = 0; x < system.P.clothWidth; x++) {
        let pos = worldToScreen(system.nodes[y][x], system.P);
        // Right neighbor
        if (x < system.P.clothWidth - 1) {
          let npos = worldToScreen(system.nodes[y][x + 1], system.P);
          p5.line(pos[0], pos[1], npos[0], npos[1]);
        }
        // Bottom neighbor
        if (y < system.P.clothHeight - 1) {
          let npos = worldToScreen(system.nodes[y + 1][x], system.P);
          p5.line(pos[0], pos[1], npos[0], npos[1]);
        }
      }
    }
    // Draw nodes
    p5.noStroke();
    p5.fill(...system.P.nodeColor);
    for (let row of system.nodes) {
      for (let node of row) {
        let [sx, sy] = worldToScreen(node, system.P);
        p5.circle(sx, sy, system.P.nodeRadius * system.P.scale * 2);
      }
    }
  }
}

let subspace_neural_physics = {};

subspace_neural_physics.Interface = class {
  constructor(base_name, simple = false) {
    this.system = new NeuralPhysicsSystem();
    this.visualizer = new NeuralPhysicsVisualizer();
    this.base_name = base_name;
    this.simple = simple;
    this._preloaded = false;
  }

  async preload() {
    if (!this._preloaded) {
      await this.system.preload();
      this._preloaded = true;
    }
  }

  iter(p5) {
    if (!this.system.ready) return;
    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);
  }

  setup(p5, base_name) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.scale = p5.width/9;
    this.system.P.bgColor = [30, 30, 30];
    this.system.P.springColor = [180, 180, 180];
    this.system.P.nodeColor = [50, 200, 255];
    this.system.P.nodeRadius = 0.1;
    this.system.P.clothWidth = 10;
    this.system.P.clothHeight = 6;
    this.system.ready = false;
    this._preloaded = false;
  }

  reset() {
    if (!this._preloaded) {
      console.warn("System not preloaded, cannot reset.");
      return;
    }
    this.system.z_1 = this.system.z_pca[1].slice();
    this.system.z_2 = this.system.z_pca[0].slice();
    this.system.nodes = null;
  }
};

export default subspace_neural_physics;
