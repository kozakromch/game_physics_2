import ui_namespace from "../../js/common/ui.min.js";
import color_scheme from "../../js/common/color_scheme.min.js";

class parameters {
  constructor() {
    this.numFluidParticles = 3000; // number of particles
    this.width = 400;
    this.height = 400;
    this.particleRadius = 3;
    this.supportRadius = 3.0 * this.particleRadius;
    this.density0 = 1000.0; // rest density
    this.viscosity = 1.0;
    this.diam = 2.0 * this.particleRadius;
    this.mass = this.diam * this.diam * this.density0;
    this.timeStepSize = 0.01;
    this.stiffness = 30000;
    this.exponent = 7;
    this.g = 10.0;
    this.maxNeighbors = 200; // maximum number of neighbors per particle
    this.mouseRadius = 40.0; // radius of mouse interaction circle
    this.mouseForce = 1000.0; // strength of mouse interaction force
    this.floor = 10.0; // floor position
    this.surfaceTension = 0.8;
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

  query(ps_x, ps_y, i, maxDist, neighbors, all_ps_x, all_ps_y) {
    let x0 = this.intCoord(ps_x - maxDist);
    let y0 = this.intCoord(ps_y - maxDist);

    let x1 = this.intCoord(ps_x + maxDist);
    let y1 = this.intCoord(ps_y + maxDist);

    let querySize = 0;
    const maxDist2 = maxDist * maxDist;

    for (let xi = x0; xi <= x1; xi++) {
      for (let yi = y0; yi <= y1; yi++) {
        let h = this.hashCoords(xi, yi);
        let start = this.cellStart[h];
        let end = this.cellStart[h + 1];

        for (let k = start; k < end; k++) {
          const j = this.cellEntries[k];
          if (i === j) continue;

          const dx = ps_x - all_ps_x[j];
          const dy = ps_y - all_ps_y[j];
          const dist2 = dx * dx + dy * dy;

          if (dist2 < maxDist2) {
            if (querySize < this.maxNeighbors) {
              neighbors.ids[querySize] = j;
              neighbors.dist[querySize] = Math.sqrt(dist2);
              neighbors.dx[querySize] = dx;
              neighbors.dy[querySize] = dy;
              querySize++;
            } else {
              neighbors.size = querySize;
              return;
            }
          }
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
  cubicKernel2D_Gradient(dx, dy, r) {
    if (r <= 1.0e-6) {
      return [0, 0];
    }

    const q = r / this.P.supportRadius;
    if (q > 1.0) {
      return [0, 0];
    }

    const invRL = 1.0 / (r * this.P.supportRadius);
    const gradq_x = dx * invRL;
    const gradq_y = dy * invRL;

    let factor;
    if (q <= 0.5) {
      factor = this.kernel_l * q * (3.0 * q - 2.0);
    } else {
      factor = -this.kernel_l * (1.0 - q) * (1.0 - q);
    }
    return [factor * gradq_x, factor * gradq_y];
  }

  // simulation step
  simulationStep(is_mouse, mouse_x, mouse_y, v_mouse_x, v_mouse_y) {
    for (let i = 0; i < 5; i++) {
      // neighborhood search
      this.neighborhoodSearch();

      // reset the accelerations of the particles
      this.resetAccelerations();

      // Compute densities
      this.computeDensity();

      // Compute pressure values
      this.computePressure();

      // compute all force accelerations (pressure, viscosity, surface tension)
      this.computeForceAccelerations();
      if (is_mouse) {
        this.applyMouseForce(mouse_x, mouse_y, v_mouse_x, v_mouse_y);
      }
      // time integration
      this.symplecticEuler();
    }
    // apply mouse interaction
    if (is_mouse) {
      this.applyMouseVelocity(mouse_x, mouse_y, v_mouse_x, v_mouse_y);
    }
  }

  // set all accelerations to (0, gravity)
  resetAccelerations() {
    const numFluid = this.P.numFluidParticles;
    const g = this.P.g;
    const accs_x = this.accs_x;
    const accs_y = this.accs_y;

    for (let i = 0; i < numFluid; i++) {
      accs_x[i] = 0.0;
      accs_y[i] = g;
    }
  }

  // Update neighbors using HashVector on every iteration
  neighborhoodSearch() {
    this.hashVector.init(this.ps_x, this.ps_y);

    for (let i = 0; i < this.totalParticles; i++) {
      this.hashVector.query(
        this.ps_x[i],
        this.ps_y[i],
        i,
        this.P.supportRadius,
        this.neighbors[i],
        this.ps_x,
        this.ps_y
      );
    }
  }

  // compute the density of all particles using the SPH formulation
  computeDensity() {
    const numFluid = this.P.numFluidParticles;
    const mass = this.P.mass;
    const kernel_0 = this.kernel_0;
    const densities = this.densities;
    const psi = this.psi;

    for (let i = 0; i < numFluid; i++) {
      // consider particle i
      densities[i] = mass * kernel_0;

      const neighborList = this.neighbors[i];
      const nl = neighborList.size;
      const ids = neighborList.ids;
      const dists = neighborList.dist;

      for (let j = 0; j < nl; j++) {
        const nj = ids[j];
        // compute W (xi-xj)
        const Wij = this.cubicKernel2D(dists[j]);

        // Fluid
        if (nj < numFluid) {
          densities[i] += mass * Wij;
        } else {
          // Boundary
          densities[i] += psi[nj] * Wij;
        }
      }
    }
  }

  // compute the pressure values using Tait's equation
  computePressure() {
    const numFluid = this.P.numFluidParticles;
    const density0 = this.P.density0;
    const stiffness = this.P.stiffness;
    const exponent = this.P.exponent;
    const densities = this.densities;
    const pressures = this.pressures;

    for (let i = 0; i < numFluid; i++) {
      densities[i] = Math.max(densities[i], density0);
      pressures[i] =
        stiffness * (Math.pow(densities[i] / density0, exponent) - 1.0);
    }
  }

  // compute all force accelerations: pressure, viscosity, and surface tension
  computeForceAccelerations() {
    const numFluid = this.P.numFluidParticles;
    const mass = this.P.mass;
    const pressures = this.pressures;
    const densities = this.densities;
    const accs_x = this.accs_x;
    const accs_y = this.accs_y;
    const psi = this.psi;
    const timeStepSize = this.P.timeStepSize;
    const viscosity = this.P.viscosity;
    const surfaceTension = this.P.surfaceTension;
    const particleRadius = this.P.particleRadius;
    const vs_x = this.vs_x;
    const vs_y = this.vs_y;
    const invTimeStep = 1.0 / timeStepSize;

    for (let i = 0; i < numFluid; i++) {
      const density_i = densities[i];
      const dpi = pressures[i] / (density_i * density_i);
      const vi_x = vs_x[i];
      const vi_y = vs_y[i];
      const neighborList = this.neighbors[i];
      const nl = neighborList.size;
      const ids = neighborList.ids;
      const dists = neighborList.dist;
      const dxs = neighborList.dx;
      const dys = neighborList.dy;

      for (let j = 0; j < nl; j++) {
        const nj = ids[j];
        const dx = dxs[j];
        const dy = dys[j];
        const r = dists[j];

        // Compute kernel and gradient
        const Wij = this.cubicKernel2D(r);
        const gradW = this.cubicKernel2D_Gradient(dx, dy, r);

        // Pressure forces (fluid-fluid and fluid-boundary)
        if (nj < numFluid) {
          // Fluid neighbor
          const density_j = densities[nj];
          const dpj = pressures[nj] / (density_j * density_j);
          const pressureFactor = mass * (dpi + dpj);
          accs_x[i] -= pressureFactor * gradW[0];
          accs_y[i] -= pressureFactor * gradW[1];

          // Viscosity forces
          const vi_vj_x = vi_x - vs_x[nj];
          const vi_vj_y = vi_y - vs_y[nj];
          const pi_pj_x = dx;
          const pi_pj_y = dy;
          const v_dot_dp = vi_vj_x * pi_pj_x + vi_vj_y * pi_pj_y;
          // v * dp < 0
          if (v_dot_dp < 0) {
            const lambda =
              -(mass * 2 * viscosity * particleRadius * 88.5) /
              (density_i + density_j);
            const viscosityFactor =
              (lambda * v_dot_dp) /
              (squaredNorm(dx, dy) +
                0.01 * this.P.supportRadius * this.P.supportRadius);
            accs_x[i] -= viscosityFactor * gradW[0];
            accs_y[i] -= viscosityFactor * gradW[1];
          }
          // Surface tension - only between fluid particles
          const tensionFactor = surfaceTension * Wij * r;
          accs_x[i] -= tensionFactor;
          accs_y[i] -= tensionFactor;
        } else {
          // Boundary neighbor - only pressure forces
          const pressureFactor = psi[nj] * dpi;
          accs_x[i] -= pressureFactor * gradW[0];
          accs_y[i] -= pressureFactor * gradW[1];
        }
      }
    }
  }

  // apply mouse force to particles within mouse radius
  applyMouseForce(mouse_x, mouse_y, v_mouse_x, v_mouse_y) {
    const numFluid = this.P.numFluidParticles;
    const mouseRadius = this.P.mouseRadius;
    const mouseForce = this.P.mouseForce;
    const mouseRadius2 = mouseRadius * mouseRadius;
    const ps_x = this.ps_x;
    const ps_y = this.ps_y;
    const vs_x = this.vs_x;
    const vs_y = this.vs_y;

    for (let i = 0; i < numFluid; i++) {
      const dx = ps_x[i] - mouse_x;
      const dy = ps_y[i] - mouse_y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < mouseRadius2) {
        const dist = Math.sqrt(dist2);
        if (dist > 1e-6) {
          // Apply repulsive force away from mouse
          const force = mouseForce * (1.0 - dist / mouseRadius);
          const fx = -(dx / dist) * force;
          const fy = -(dy / dist) * force;
          // Add velocity impulse
          vs_x[i] += fx * this.P.timeStepSize;
          vs_y[i] += fy * this.P.timeStepSize;
        }
      }
    }
  }

  applyMouseVelocity(mouse_x, mouse_y, v_mouse_x, v_mouse_y) {
    const numFluid = this.P.numFluidParticles;
    const mouseRadius = this.P.mouseRadius;
    const mouseRadius2 = mouseRadius * mouseRadius;
    const ps_x = this.ps_x;
    const ps_y = this.ps_y;

    for (let i = 0; i < numFluid; i++) {
      const dx = ps_x[i] - mouse_x;
      const dy = ps_y[i] - mouse_y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 < mouseRadius2) {
        ps_x[i] += v_mouse_x;
        ps_y[i] += v_mouse_y;
        this.vs_x[i] += v_mouse_x;
        this.vs_y[i] += v_mouse_y;
      }
    }
  }

  // perform time integration using the symplectic Euler method
  symplecticEuler() {
    const dt = this.P.timeStepSize;
    const numFluid = this.P.numFluidParticles;
    const particleRadius = this.P.particleRadius;
    const width = this.P.width;
    const height = this.P.height;
    const maxX = width - particleRadius;
    const maxY = height - particleRadius;
    const ps_x = this.ps_x;
    const ps_y = this.ps_y;
    const vs_x = this.vs_x;
    const vs_y = this.vs_y;
    const accs_x = this.accs_x;
    const accs_y = this.accs_y;
    let max_vel = 100.0;
    // symplectic Euler step
    for (let i = 0; i < numFluid; i++) {
      // integrate velocity considering gravitational acceleration
      let vx = vs_x[i] + dt * accs_x[i];
      let vy = vs_y[i] + dt * accs_y[i];
      //clamp vx and vy to max_vel
      vx = Math.max(Math.min(vx, max_vel), -max_vel);
      vy = Math.max(Math.min(vy, max_vel), -max_vel);

      // integrate position
      let px = ps_x[i] + dt * vx;
      let py = ps_y[i] + dt * vy;

      // boundary conditions
      if (px < particleRadius) {
        px = particleRadius;
        vx *= -0.5;
      } else if (px > maxX) {
        px = maxX;
        vx *= -0.5;
      }

      if (py < particleRadius) {
        py = particleRadius;
        vy *= -0.5;
      } else if (py > maxY - this.P.floor) {
        py = maxY - this.P.floor;
        vy *= -0.5;
      }

      ps_x[i] = px;
      ps_y[i] = py;
      vs_x[i] = vx;
      vs_y[i] = vy;
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
    this.neighbors = Array.from({ length: totalParticles }, () => ({
      size: 0,
      ids: new Int32Array(this.P.maxNeighbors),
      dist: new Float32Array(this.P.maxNeighbors),
      dx: new Float32Array(this.P.maxNeighbors),
      dy: new Float32Array(this.P.maxNeighbors),
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
    let d_2 = this.P.particleRadius * 1.6;

    const startY = this.P.height * 0.05;
    const endY = this.P.height * 0.95 - this.P.floor;
    const n_in_column = Math.floor((endY - startY) / d_2);
    const n_columns = Math.ceil(this.P.numFluidParticles / n_in_column);
    const startX = this.P.width * 0.01;
    const endX = startX + n_columns * d_2;
    index = 0;

    for (let j = 0; j < n_in_column; j++) {
      for (let i = 0; i < n_columns; i++) {
        if (index >= this.P.numFluidParticles) break;
        this.ps_x[index] = startX + i * d_2;
        this.ps_y[index] = startY + j * d_2;
        this.vs_x[index] = 0.0;
        this.vs_y[index] = 0.0;
        this.accs_x[index] = 0.0;
        this.accs_y[index] = 0.0;
        index++;
      }
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
      index++;
    }

    // Top boundary
    for (let j = 0; j < numBoundaryParticlesPerWidth; j++) {
      this.ps_x[index] = j * d;
      this.ps_y[index] = (numBoundaryParticlesPerHeight - 1) * d - this.P.floor;
      this.vs_x[index] = 0.0;
      this.vs_y[index] = 0.0;
      this.accs_x[index] = 0.0;
      this.accs_y[index] = 0.0;
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
      index++;
    }

    // Compute pseudo mass (psi) for boundary particles
    this.neighborhoodSearch();

    for (let i = this.P.numFluidParticles; i < totalParticles; i++) {
      let delta = this.kernel_0;

      const neighborList = this.neighbors[i];
      for (let j = 0; j < neighborList.size; j++) {
        let nj = neighborList.ids[j];
        if (nj >= this.P.numFluidParticles) {
          delta += this.cubicKernel2D(neighborList.dist[j]);
        }
      }

      // Pseudo mass is computed as (rest density) / sum_j W_ij
      this.psi[i] = this.P.density0 / delta;
    }
  }
}

class Visualizer {
  constructor(system) {}
  draw(p5, system, is_mouse, mouse_x, mouse_y) {
    this.drawFloor(p5, system);
    this.drawPoint(p5, system);
    this.drawMouseCircle(p5, system, is_mouse, mouse_x, mouse_y);
    this.fps(p5);
  }
  drawFloor(p5, system) {
    let lg = color_scheme.GROUND(p5);
    p5.stroke(lg);
    p5.fill(lg);
    p5.rect(0, p5.height - system.P.floor, p5.width, system.P.floor);
  }
  drawPoint(p5, system) {
    p5.stroke(0);
    p5.strokeWeight(0.5);
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
  drawMouseCircle(p5, system, is_mouse, mouse_x, mouse_y) {
    if (is_mouse) {
      p5.noFill();
      p5.stroke(0, 0, 0, 100);
      p5.strokeWeight(2);
      p5.circle(mouse_x, mouse_y, system.P.mouseRadius * 2);
      p5.noStroke();
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
    this.iter_new_simul = -1;
  }

  iter(p5) {
    let n_points_new = parseInt(this.slider3.value);
    if (this.n_points != n_points_new) {
      this.iter_new_simul = 8;
      this.n_points = n_points_new;
    }
    if (this.iter_new_simul >= 0) {
      this.iter_new_simul--;
    }
    if (this.iter_new_simul == 0) {
      this.system.P.numFluidParticles = this.n_points;
      this.system.init();
    }

    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);
    let v_mouse_x = p5.mouseX - p5.pmouseX;
    let v_mouse_y = p5.mouseY - p5.pmouseY;
    this.system.simulationStep(
      is_mouse,
      mouse_x,
      mouse_y,
      v_mouse_x,
      v_mouse_y
    );
    this.visualizer.draw(p5, this.system, is_mouse, mouse_x, mouse_y);
  }
  setup(p5, base_name) {
    p5.setFrameRate(30);
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "1",
        "Viscosity"
      );
      this.slider1 = ui_namespace.createSlider(div_m_1, 0, 10, 100);
      this.output1 = ui_namespace.createOutput(div_m_2);
      this.output1.innerHTML = this.slider1.value;
    }
    this.slider1.oninput = function () {
      this.output1.innerHTML = this.slider1.value;
      this.system.P.viscosity = parseFloat(this.slider1.value);
    }.bind(this);

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "2",
        "Tension"
      );
      this.slider2 = ui_namespace.createSlider(div_m_1, 0, 10, 100);
      this.output2 = ui_namespace.createOutput(div_m_2);
      this.output2.innerHTML = this.slider2.value;
    }
    this.slider2.oninput = function () {
      this.output2.innerHTML = this.slider2.value;
      this.system.P.surfaceTension = parseFloat(this.slider2.value);
    }.bind(this);

    {
      let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
        this.base_name,
        "3",
        "Points"
      );
      this.slider3 = ui_namespace.createSlider(div_m_1, 0, 4000, 4000);
      this.output3 = ui_namespace.createOutput(div_m_2);
      this.output3.innerHTML = this.slider3.value;
    }
    this.slider3.oninput = function () {
      this.output3.innerHTML = this.slider3.value;
    }.bind(this);

    this.n_points = this.slider3.value;
    this.system.P.numFluidParticles = parseInt(this.n_points);
    this.system.init();
  }
  reset() {
    this.system.init();
  }
}

export default Interface;
