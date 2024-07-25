import color_scheme from './color_scheme.min.js';

let energy_namespace = {};
energy_namespace.Energy = class {
  constructor() {
    this.min_energy = undefined;
    this.max_energy = undefined;
    this.energy_history = [];
    this.max_history_length = 400;
  }
  reset() {
    this.min_energy = undefined;
    this.max_energy = undefined;
    this.energy_history = [];
  }
  storeEnergy(energy) {
    this.energy_history.push(energy);
    if (this.energy_history.length > this.max_history_length) {
      this.energy_history.shift();  // Remove oldest energy point
    }
    // Update min and max energy values
    let en = 0.1 * Math.abs(energy);
    if (energy < this.min_energy + en || this.min_energy === undefined) {
      this.min_energy = energy - en;
    }
    if (energy > this.max_energy - en || this.max_energy === undefined) {
      this.max_energy = energy + en;
    }
  }
}

energy_namespace.drawEnergyGraph =
    function(p5, energy) {
  p5.noFill();
  p5.stroke(color_scheme.ENERGY(p5));
  p5.beginShape();
  let min_energy = energy.min_energy;
  let max_energy = energy.max_energy;
  let energy_history = energy.energy_history;
  for (let i = 0; i < energy_history.length; i++) {
    let x = p5.map(i, 0, energy_history.length - 1, 0, p5.width);
    let y = p5.map(energy_history[i], min_energy, max_energy, p5.height, 0);
    p5.vertex(x, y);
  }
  p5.endShape();
}

export default energy_namespace;