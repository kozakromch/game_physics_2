import base_canvas_namespace from './base_vis.min.js';
import color_scheme from './color_scheme.min.js';
import sc_grid_namespace from './sc_grid.min.js';

let main_visualizator_namespace = {};
main_visualizator_namespace.getMainVisualizator = function(
    custom_interface, with_axis = false) {
  var context = custom_interface;
  let sc_grid = new sc_grid_namespace.ScGrid(12, 21);
  let canvas;
  let MainVisualizator = function(p5) {
    let base_vis =
        new base_canvas_namespace.BaseCanvasController(context.base_name);

    let draw_iter = function(p5) {
      number_of_pause_frames = 0;
      p5.background(color_scheme.BACKGROUND(p5));
      sc_grid.draw(p5);
      context.iter(p5);
      p5.stroke(color_scheme.GROUND(p5));
      p5.fill(color_scheme.GROUND(p5));
      p5.rect(0, p5.height - 10, p5.width, 10);
    };
    let number_of_pause_frames = 0;
    let draw_pause = function() {
      if (number_of_pause_frames < 50) {
        number_of_pause_frames++;
        p5.background(5, 5);
      }
    };
    p5.setup = function() {
      p5.disableFriendlyErrors = true;
      p5.frameRate(30);
      canvas = p5.createCanvas(
          base_vis.width, base_vis.height, p5.P2D, base_vis.canvas);
      context.setup(p5, base_vis.base_name);
      draw_iter(p5);
    };
    p5.draw = function() {
      if (base_vis.is_paused) {
        draw_pause();
      } else {
        draw_iter(p5);
      }
      if (base_vis.is_reset) {
        context.reset();
        base_vis.is_reset = false;
        draw_iter(p5);
      }
    };
  };
  return MainVisualizator;
};
export default main_visualizator_namespace;