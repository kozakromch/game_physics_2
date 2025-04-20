import base_canvas_namespace from "./base_vis.min.js";
import color_scheme from "./color_scheme.min.js";
import sc_grid_namespace from "./sc_grid.min.js";

let main_visualizator_namespace = {};
main_visualizator_namespace.getMainVisualizator = function (
  custom_interface,
  is_interactive = false,
  with_background = true,
  with_ground = true,
  web_gl = false
) {
  var context = custom_interface;
  let sc_grid = new sc_grid_namespace.ScGrid(12, 21);
  let canvas;
  let MainVisualizator = function (p5) {
    let base_vis = new base_canvas_namespace.BaseCanvasController(
      context.base_name
    );

    let draw_iter = function (p5) {
      number_of_pause_frames = 0;
      if (with_background) {
        p5.background(color_scheme.BACKGROUND(p5));
        sc_grid.draw(p5);
      }
      context.iter(p5);
      if (with_ground) {
        p5.stroke(color_scheme.GROUND(p5));
        p5.fill(color_scheme.GROUND(p5));
        p5.rect(0, p5.height - 10, p5.width, 10);
      }
    };
    let number_of_pause_frames = 0;
    let draw_pause = function () {
      if (number_of_pause_frames < 30) {
        number_of_pause_frames++;
        if (!web_gl) {
        p5.background(5, 5);
        } else {
          
        }


      }
    };
    let draw_interactive = function () {
      let text_size = 0.03 * p5.width;
      p5.textSize(text_size);
      let text = "Sketch is interactive";
      let text_width = p5.textWidth(text);
      let text_height = p5.textAscent() + p5.textDescent();
      let text_x = p5.width / 2 - text_width / 2;
      let text_y = p5.height / 2;
      let extra = text_height / 2;
      p5.fill(255, 255, 255, 10);
      p5.rect(
        text_x - extra,
        text_y - text_height,
        text_width + 2 * extra,
        text_height + extra,
        20
      );
      p5.fill(0);
      p5.text(text, text_x, text_y);
      p5.textSize(15);
    };
    p5.setup = function () {
      p5.disableFriendlyErrors = true;
      p5.frameRate(30);
      canvas = p5.createCanvas(
        base_vis.width,
        base_vis.height,
        web_gl ? p5.WEBGL : p5.P2D,
        base_vis.canvas
      );
      context.setup(p5, base_vis.base_name);
      draw_iter(p5);
    };
    p5.draw = function () {
      if (base_vis.is_paused) {
        draw_pause();
        if (is_interactive) {
          draw_interactive();
        }
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
