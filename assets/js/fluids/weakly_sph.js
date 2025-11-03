// Weakly compressible SPH (WCSPH)

class parameters {
  constructor() {
    this.numFluidParticles = 2000; // number of particles
    this.width = 400;
    this.height = 400;
    this.particleRadius = 3.0;
    this.supportRadius = 3.0 * this.particleRadius;
    this.density0 = 1000.0; // rest density
    this.viscosity = 0.01;
    this.diam = 2.0 * this.particleRadius;
    this.mass = this.diam * this.diam * this.density0;
    this.timeStepSize = 0.002;
    this.stiffness = 30000;
    this.exponent = 7;
    this.g = 10; // gravitational acceleration
    this.maxNeighbors = 1000; // maximum number of neighbors per particle
  }
}

class HashVector {
  constructor(spacing, maxNumObjects, maxNeighbors) {
    this.spacing = spacing;
    this.tableSize = maxNumObjects;
    this.cellStart = new Int32Array(this.tableSize + 1);
    this.cellEntries = new Int32Array(maxNumObjects);
    this.maxNeighbors = maxNeighbors;
  }

  hashCoords(xi, yi) {
    var h = (xi * 92837111) ^ (yi * 689287499); // fantasy function
    return Math.abs(h) % this.tableSize;
  }

  intCoord(coord) {
    return Math.floor(coord / this.spacing);
  }
  hashPos(p_x, p_y) {
    return this.hashCoords(this.intCoord(p_x), this.intCoord(p_y));
  }
  init(ps_x, ps_y) {
    let numObjects = ps_x.length;

    // determine cell sizes

    this.cellStart.fill(0);
    this.cellEntries.fill(0);

    for (let i = 0; i < numObjects; i++) {
      let h = this.hashPos(ps_x[i], ps_y[i]);
      this.cellStart[h]++;
    }

    // determine cells starts

    let start = 0;
    for (let i = 0; i < this.tableSize; i++) {
      start += this.cellStart[i];
      this.cellStart[i] = start;
    }
    this.cellStart[this.tableSize] = start; // guard

    // fill in objects ids

    for (let i = 0; i < numObjects; i++) {
      let h = this.hashPos(ps_x[i], ps_y[i]);
      this.cellStart[h]--;
      this.cellEntries[this.cellStart[h]] = i;
    }
  }

  query(ps_x, ps_y, maxDist, neighbors) {
    let x0 = this.intCoord(ps_x - maxDist);
    let y0 = this.intCoord(ps_y - maxDist);

    let x1 = this.intCoord(ps_x + maxDist);
    let y1 = this.intCoord(ps_y + maxDist);

    let querySize = 0;

    for (let xi = x0; xi <= x1; xi++) {
      for (let yi = y0; yi <= y1; yi++) {
        let h = this.hashCoords(xi, yi);
        let start = this.cellStart[h];
        let end = this.cellStart[h + 1];

        for (let i = start; i < end; i++) {
          neighbors.ids[querySize] = this.cellEntries[i];
          querySize++;
        }
        if (querySize >= this.maxNeighbors) {
          neighbors.size = querySize;
          return;
        }
      }
    }
    neighbors.size = querySize;
  }
}

// compute the norm of a vector (x,y)
function norm(x, y) {
  return Math.sqrt(x * x + y * y);
}

// compute the squared norm of a vector (x,y)
function squaredNorm(x, y) {
  return x * x + y * y;
}

class System {
  constructor() {
    this.P = new parameters();
  }

  // Cubic spline kernel 2D
  cubicKernel2D(r) {
    let res = 0.0;
    let q = r / this.P.supportRadius;
    if (q <= 1.0) {
      let q2 = q * q;
      let q3 = q2 * q;
      if (q <= 0.5) res = this.kernel_k * (6.0 * q3 - 6.0 * q2 + 1.0);
      else res = this.kernel_k * (2.0 * Math.pow(1.0 - q, 3));
    }
    return res;
  }

  // Gradient of cubic spline kernel 2D
  cubicKernel2D_Gradient(rx, ry) {
    let res = [0, 0];
    let rl = norm(rx, ry);
    let q = rl / this.P.supportRadius;
    if (q <= 1.0) {
      if (rl > 1.0e-6) {
        let gradq_x = rx * (1.0 / (rl * this.P.supportRadius));
        let gradq_y = ry * (1.0 / (rl * this.P.supportRadius));
        if (q <= 0.5) {
          res[0] = this.kernel_l * q * (3.0 * q - 2.0) * gradq_x;
          res[1] = this.kernel_l * q * (3.0 * q - 2.0) * gradq_y;
        } else {
          let factor = (1.0 - q) * (1.0 - q);
          res[0] = this.kernel_l * -factor * gradq_x;
          res[1] = this.kernel_l * -factor * gradq_y;
        }
      }
    }
    return res;
  }

  // simulation step
  simulationStep() {
    // neighborhood search
    this.neighborhoodSearch();

    for (let iter = 0; iter < 8; iter++) {
      // reset the accelerations of the particles
      this.resetAccelerations();

      // Compute densities
      this.computeDensity();

      // Compute pressure values
      this.computePressure();

      // compute accelerations caused by pressure forces
      this.computePressureAccelerations();

      // compute non-pressure forces
      this.computeViscosity();

      // time integration
      this.symplecticEuler();
    }
  }

  // set all accelerations to (0, gravity)
  resetAccelerations() {
    let i;
    for (i = 0; i < this.P.numFluidParticles; i++) {
      this.accs_x[i] = 0.0;
      this.accs_y[i] = this.P.g;
    }
  }

  // Update neighbors using HashVector on every iteration
  neighborhoodSearch() {
    this.hashVector.init(this.ps_x, this.ps_y);

    for (let i = 0; i < this.P.numFluidParticles; i++) {
      this.hashVector.query(
        this.ps_x[i],
        this.ps_y[i],
        this.P.supportRadius,
        this.neighbors[i]
      );
    }
  }

  // compute the density of all particles using the SPH formulation
  computeDensity() {
    for (let i = 0; i < this.P.numFluidParticles; i++) {
      // consider particle i
      this.densities[i] = this.P.mass * this.kernel_0;

      let nl = this.neighbors[i].size;
      for (let j = 0; j < nl; j++) {
        let nj = this.neighbors[i].ids[j];
        if (i === nj) continue;

        let dx = this.ps_x[i] - this.ps_x[nj];
        let dy = this.ps_y[i] - this.ps_y[nj];
        // compute W (xi-xj)
        let Wij = this.cubicKernel2D(norm(dx, dy));

        // Fluid
        if (nj < this.P.numFluidParticles) {
          this.densities[i] += this.P.mass * Wij;
        } else {
          // Boundary
          this.densities[i] += this.psi[nj] * Wij;
        }
      }
    }
  }

  // compute the pressure values using Tait's equation
  computePressure() {
    for (let i = 0; i < this.P.numFluidParticles; i++) {
      this.densities[i] = Math.max(this.densities[i], this.P.density0);
      this.pressures[i] =
        this.P.stiffness *
        (Math.pow(this.densities[i] / this.P.density0, this.P.exponent) - 1.0);
    }
  }

  // compute accelerations caused by pressure forces
  computePressureAccelerations() {
    for (let i = 0; i < this.P.numFluidParticles; i++) {
      let dpi = this.pressures[i] / (this.densities[i] * this.densities[i]);

      let nl = this.neighbors[i].size;
      for (let j = 0; j < nl; j++) {
        let nj = this.neighbors[i].ids[j];
        if (i === nj) continue;

        let dx = this.ps_x[i] - this.ps_x[nj];
        let dy = this.ps_y[i] - this.ps_y[nj];
        // compute grad W (xi-xj)
        let gradW = this.cubicKernel2D_Gradient(dx, dy);

        // Fluid
        if (nj < this.P.numFluidParticles) {
          let dpj =
            this.pressures[nj] / (this.densities[nj] * this.densities[nj]);
          this.accs_x[i] -= this.P.mass * (dpi + dpj) * gradW[0];
          this.accs_y[i] -= this.P.mass * (dpi + dpj) * gradW[1];
        } else {
          // Boundary
          this.accs_x[i] -= this.psi[nj] * dpi * gradW[0];
          this.accs_y[i] -= this.psi[nj] * dpi * gradW[1];
        }
      }
    }
  }

  // compute the viscosity forces (XSPH) for all particles
  computeViscosity() {
    for (let i = 0; i < this.P.numFluidParticles; i++) {
      let nl = this.neighbors[i].size;
      for (let j = 0; j < nl; j++) {
        let nj = this.neighbors[i].ids[j];
        if (i === nj) continue;

        // Only apply viscosity between fluid particles
        if (nj < this.P.numFluidParticles) {
          let vi_vj_x = this.vs_x[i] - this.vs_x[nj];
          let vi_vj_y = this.vs_y[i] - this.vs_y[nj];
          let dx = this.ps_x[i] - this.ps_x[nj];
          let dy = this.ps_y[i] - this.ps_y[nj];
          // compute W (xi-xj)
          let Wij = this.cubicKernel2D(norm(dx, dy));

          let factor =
            (this.P.mass / this.densities[nj]) *
            (1.0 / this.P.timeStepSize) *
            this.P.viscosity *
            Wij;
          this.accs_x[i] -= factor * vi_vj_x;
          this.accs_y[i] -= factor * vi_vj_y;
        }
      }
    }
  }

  // perform time integration using the symplectic Euler method
  symplecticEuler() {
    let dt = this.P.timeStepSize;
    // symplectic Euler step
    let i;
    for (i = 0; i < this.P.numFluidParticles; i++) {
      // integrate velocity considering gravitational acceleration
      this.vs_x[i] = this.vs_x[i] + dt * this.accs_x[i];
      this.vs_y[i] = this.vs_y[i] + dt * this.accs_y[i];

      // integrate position
      this.ps_x[i] = this.ps_x[i] + dt * this.vs_x[i];
      this.ps_y[i] = this.ps_y[i] + dt * this.vs_y[i];

      // boundary conditions
      if (this.ps_x[i] < this.P.particleRadius) {
        this.ps_x[i] = this.P.particleRadius;
        this.vs_x[i] *= -0.5;
      }
      if (this.ps_x[i] > this.P.width - this.P.particleRadius) {
        this.ps_x[i] = this.P.width - this.P.particleRadius;
        this.vs_x[i] *= -0.5;
      }
      if (this.ps_y[i] < this.P.particleRadius) {
        this.ps_y[i] = this.P.particleRadius;
        this.vs_y[i] *= -0.5;
      }
      if (this.ps_y[i] > this.P.height - this.P.particleRadius) {
        this.ps_y[i] = this.P.height - this.P.particleRadius;
        this.vs_y[i] *= -0.5;
      }
    }
  }
  init() {
    // Calculate total particles (fluid + boundary)
    let d = this.P.particleRadius * 2.0;
    let numBoundaryParticlesPerWidth = Math.ceil(this.P.width / d);
    let numBoundaryParticlesPerHeight = Math.ceil(this.P.height / d);
    let numBoundaryParticles =
      2 * numBoundaryParticlesPerWidth +
      2 * (numBoundaryParticlesPerHeight - 2);
    let totalParticles = this.P.numFluidParticles + numBoundaryParticles;

    this.ps_x = new Float32Array(totalParticles); // positions x
    this.ps_y = new Float32Array(totalParticles); // positions y
    this.vs_x = new Float32Array(totalParticles); // velocities x
    this.vs_y = new Float32Array(totalParticles); // velocities y
    this.accs_x = new Float32Array(totalParticles); // accelerations x
    this.accs_y = new Float32Array(totalParticles); // accelerations y
    this.densities = new Float32Array(totalParticles); // densities
    this.pressures = new Float32Array(totalParticles); // pressures
    this.psi = new Float32Array(totalParticles); // pseudo mass for boundary particles
    this.is_movable = new Array(totalParticles).fill(true);
    this.neighbors = Array.from({ length: totalParticles }, () => ({
      size: 0,
      ids: new Int32Array(this.P.maxNeighbors),
    }));

    this.numBoundaryParticles = numBoundaryParticles;
    this.totalParticles = totalParticles;

    this.kernel_k =
      40.0 / (7.0 * (Math.PI * this.P.supportRadius * this.P.supportRadius));
    this.kernel_l =
      240.0 / (7.0 * (Math.PI * this.P.supportRadius * this.P.supportRadius));
    this.kernel_0 = this.cubicKernel2D(0);
    this.hashVector = new HashVector(
      this.P.supportRadius,
      totalParticles,
      this.P.maxNeighbors
    );

    // Initialize fluid particles first
    let index = 0;
    let n = Math.ceil(Math.sqrt(this.P.numFluidParticles));
    let spacing = d;
    let offsetX = (this.P.width - (n - 1) * spacing) / 2.0;
    let offsetY = (this.P.height - (n - 1) * spacing) / 2.0;

    for (let i = 0; i < this.P.numFluidParticles; i++) {
      let row = Math.floor(i / n);
      let col = i % n;
      this.ps_x[index] = offsetX + col * spacing;
      this.ps_y[index] = offsetY + row * spacing;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
      this.is_movable[index] = true;
      index++;
    }

    // Initialize boundary particles (box around the simulation area)
    // Bottom boundary
    for (let j = 0; j < numBoundaryParticlesPerWidth; j++) {
      this.ps_x[index] = j * d;
      this.ps_y[index] = 0;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
      this.is_movable[index] = false;
      index++;
    }

    // Top boundary
    for (let j = 0; j < numBoundaryParticlesPerWidth; j++) {
      this.ps_x[index] = j * d;
      this.ps_y[index] = (numBoundaryParticlesPerHeight - 1) * d;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
      this.is_movable[index] = false;
      index++;
    }

    // Left boundary (excluding corners)
    for (let j = 1; j < numBoundaryParticlesPerHeight - 1; j++) {
      this.ps_x[index] = 0;
      this.ps_y[index] = j * d;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
      this.is_movable[index] = false;
      index++;
    }

    // Right boundary (excluding corners)
    for (let j = 1; j < numBoundaryParticlesPerHeight - 1; j++) {
      this.ps_x[index] = (numBoundaryParticlesPerWidth - 1) * d;
      this.ps_y[index] = j * d;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
      this.is_movable[index] = false;
      index++;
    }

    // Compute pseudo mass (psi) for boundary particles
    // First, do a neighborhood search on boundary particles only
    this.neighborhoodSearch();

    for (let i = this.P.numFluidParticles; i < totalParticles; i++) {
      let delta = this.kernel_0;

      //   for (let j = 0; j < this.neighbors[i].size; j++) {
      // let nj = this.neighbors[i].ids[j];
      // if (nj >= this.P.numFluidParticles) {
      for (let nj = this.P.numFluidParticles; nj < totalParticles; nj++) {
        if (i === nj) continue;
        // Only consider other boundary particles
        let dx = this.ps_x[i] - this.ps_x[nj];
        let dy = this.ps_y[i] - this.ps_y[nj];
        delta += this.cubicKernel2D(norm(dx, dy));
      }
      //   }

      // Pseudo mass is computed as (rest density) / sum_j W_ij
      this.psi[i] = this.P.density0 / delta;
    }
  }
}

class Visualizer {
  constructor(system) {}
  draw(p5, system) {
    this.drawPoint(p5, system);
    this.fps(p5);
  }
  drawPoint(p5, system) {
    // Draw fluid particles in blue
    p5.fill(0, 100, 255);
    for (let i = 0; i < system.P.numFluidParticles; i++) {
      const x = system.ps_x[i];
      const y = system.ps_y[i];
      p5.circle(x, y, system.P.particleRadius * 1.2);
    }

    // Draw boundary particles in gray
    p5.fill(150);
    for (let i = system.P.numFluidParticles; i < system.totalParticles; i++) {
      const x = system.ps_x[i];
      const y = system.ps_y[i];
      p5.circle(x, y, system.P.particleRadius * 1.2);
    }
  }
  fps(p5) {
    p5.fill(255);
    p5.noStroke();
    p5.rect(0, 0, 70, 30, 10);
    p5.fill(0);
    p5.text("FPS: " + Math.round(p5.frameRate()), 10, 10, 70, 80);
  }
}

class Interface {
  constructor(base_name) {
    this.system = new System();
    this.visualizer = new Visualizer(this.system);
    this.base_name = base_name;
  }

  iter(p5) {
    // let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    // this.system.mouseLogic(is_mouse, mouse_x, mouse_y);
    this.system.simulationStep();
    this.visualizer.draw(p5, this.system);
  }
  setup(p5, base_name) {
    p5.setFrameRate(120);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;

    this.system.init();
  }
  reset() {
    this.system.init();
  }
}

export default Interface;
