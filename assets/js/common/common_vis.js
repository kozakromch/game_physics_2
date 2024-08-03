import Scribble from '../../js/libs/p5.scribble.min.js';

let common_vis_namespace = {};
common_vis_namespace.drawAxis = function(p5, text_x, text_y) {
  let scribble = new Scribble(p5);

  p5.stroke(0);
  p5.strokeWeight(1);
  scribble.maxOffset = 0.5;

  scribble.scribbleLine(p5.width / 2, 0, p5.width / 2, p5.height);
  scribble.scribbleLine(0, p5.height / 2, p5.width, p5.height / 2);
  // Draw small arrows
  let a = 7;
  let b = 20;
  scribble.scribbleLine(p5.width / 2, 0, p5.width / 2 - a, b);
  scribble.scribbleLine(p5.width / 2, 0, p5.width / 2 + a, b);
  scribble.scribbleLine(
      p5.width, p5.height / 2, p5.width - b, p5.height / 2 - a);
  scribble.scribbleLine(
      p5.width, p5.height / 2, p5.width - b, p5.height / 2 + a);
  // draw text nearby the arrows
  let pixel_per_symbol = 10;
  p5.text(
      text_x, p5.width - 20,
      p5.height / 2 - (text_x.length * pixel_per_symbol));

  p5.text(text_y, p5.width / 2 + (text_y.length * pixel_per_symbol), 20);
};

common_vis_namespace.alphaLine = function(
    p5, color_from, color_to, trajectory) {
  const increment_0 =
      (color_to.levels[0] - color_from.levels[0]) / trajectory.length;
  const increment_1 =
      (color_to.levels[1] - color_from.levels[1]) / trajectory.length;
  const increment_2 =
      (color_to.levels[2] - color_from.levels[2]) / trajectory.length;
  const increment_3 =
      (color_to.levels[3] - color_from.levels[3]) / trajectory.length;

  p5.noFill();
  p5.beginShape();
  for (let i = 0; i < trajectory.length - 1; i++) {
    // Set the alpha value for the current segment
    p5.stroke(
        color_from.levels[0] + increment_0 * i,
        color_from.levels[1] + increment_1 * i,
        color_from.levels[2] + increment_2 * i,
        color_from.levels[3] + increment_3 * i);

    // Draw the current segment
    let pointA = trajectory[i];
    let pointB = trajectory[i + 1];
    p5.line(pointA.x, pointA.y, pointB.x, pointB.y);
  }
  p5.endShape();
};

common_vis_namespace.alphaCircle = function(
    p5, color_from, color_to, r_from, r_to, trajectory) {
  const increment_0 =
      (color_to.levels[0] - color_from.levels[0]) / trajectory.length;
  const increment_1 =
      (color_to.levels[1] - color_from.levels[1]) / trajectory.length;
  const increment_2 =
      (color_to.levels[2] - color_from.levels[2]) / trajectory.length;
  const increment_3 =
      (color_to.levels[3] - color_from.levels[3]) / trajectory.length;
  const increment_r = (r_to - r_from) / trajectory.length;

  // draw a circle with a changing color and radius
  for (let i = 0; i < trajectory.length - 1; i++) {
    // Set the alpha value for the current segment
    p5.no_stroke;
    p5.fill(
        color_from.levels[0] + increment_0 * i,
        color_from.levels[1] + increment_1 * i,
        color_from.levels[2] + increment_2 * i,
        color_from.levels[3] + increment_3 * i);

    // Draw the current segment
    let point = trajectory[i];
    p5.ellipse(
        point.x, point.y, r_from + increment_r * i, r_from + increment_r * i);
  }
};

common_vis_namespace.copyColor = function(p5, color) {
  let new_color = p5.color(color.levels);
  return new_color;
};

export default common_vis_namespace;