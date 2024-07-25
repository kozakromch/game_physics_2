import Scribble from '/js/libs/p5.scribble.min.js';

import color_scheme from './color_scheme.min.js';

let sc_grid_namespace = {};
// class sc_grid that is used to create a grid of cells using p5 on canvas
sc_grid_namespace.ScGrid = class {
  constructor(n_cells_row, n_cells_col) {
    this.n_cells_row = n_cells_row;
    this.n_cells_col = n_cells_col;
  }
  drawGrid(p5, scribble) {
    let cell_width = p5.width / this.n_cells_col;
    let cell_height = p5.height / this.n_cells_row;
    let c = p5.color(color_scheme.LIGHT_GRAY(p5));
    p5.stroke(c);
    for (let i = 0; i < this.n_cells_col; i++) {
      scribble.scribbleLine(i * cell_width, 0, i * cell_width, p5.height);
    }
    for (let i = 0; i < this.n_cells_row; i++) {
      scribble.scribbleLine(0, i * cell_height, p5.width, i * cell_height);
    }
  }

  draw(p5) {
    let scribble = new Scribble(p5);
    p5.randomSeed(42);
    scribble.maxOffset = 0.5;
    this.drawGrid(p5, scribble);
  }
};

export default sc_grid_namespace;