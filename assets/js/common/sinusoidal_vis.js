let sinusoidal_namespace = {};
sinusoidal_namespace.SpringSinusoidal = class {
  constructor(numPoints, amplitude, frequency) {
    this.numPoints = numPoints;
    this.amplitude = amplitude;
    this.frequency = frequency;
  }

  draw(p5, startX, startY, endX, endY, opacity = 255) {
    // Calculate the length of the spring
    let length = p5.dist(startX, startY, endX, endY);

    // Calculate the angle between the start and end points
    let angle = p5.atan2(endY - startY, endX - startX);

    // Draw the spring as a sinusoidal line
    p5.noFill();
    p5.beginShape();
    p5.stroke(0, 0, 0, opacity);
    for (let i = 0; i <= this.numPoints; i++) {
      // Calculate the interpolation factor along the spring
      let t = i / this.numPoints;

      // Calculate the x and y coordinates of the current point on the spring
      let x = startX + t * length * p5.cos(angle) +
          this.amplitude * p5.sin(this.frequency * p5.TWO_PI * t) *
              p5.cos(angle + p5.HALF_PI);
      let y = startY + t * length * p5.sin(angle) +
          this.amplitude * p5.sin(this.frequency * p5.TWO_PI * t) *
              p5.sin(angle + p5.HALF_PI);

      // Draw the current point
      p5.vertex(x, y);
    }
    p5.endShape();
  }
};

export default sinusoidal_namespace;