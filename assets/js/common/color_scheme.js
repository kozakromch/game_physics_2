let color_scheme = {};

color_scheme.BACKGROUND = function(p5) {
  return p5.color(244, 244, 248, 255)
};
color_scheme.GREEN = function(p5) {
  return p5.color(83, 230, 90, 255)
};
color_scheme.GREEN_ALPHA = function(p5) {
  return p5.color(83, 230, 90, 50)
};
color_scheme.RED = function(p5) {
  return p5.color(200, 25, 50, 255)
};
color_scheme.BLUE = function(p5) {
  return p5.color(15, 76, 200, 255)
};
color_scheme.BLACK = function(p5) {
  return p5.color(0, 0, 0, 255)
};
color_scheme.LIGHT_GRAY = function(p5) {
  return p5.color(230, 230, 230, 70)
};
color_scheme.ENERGY = function(p5) {
  return color_scheme.BLUE(p5)
};
color_scheme.GRID = function(p5) {
  return color_scheme.LIGHT_GRAY(p5)
};
color_scheme.GROUND = function(p5) {
  return p5.color(120, 120, 120, 255)
};
color_scheme.INACTIVE = function(p5) {
  return p5.color(125, 125, 125, 10)
};

export default color_scheme;