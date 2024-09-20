let aabb_namespace = {};
aabb_namespace.Parameters = class {
  constructor() {
    this.width = 800;
    this.height = 800;
  }
};

aabb_namespace.BaseFigure = class {
  constructor(x, y, rotation, vx, vy, ang, parameters) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.vx = vx;
    this.vy = vy;
    this.angular_velocity = ang;
    this.parameters = parameters;
    this.is_colliding = false;
  }
  draw(p5) {}
  colorCollidingLogic(p5) {
    if (this.is_colliding) {
      p5.stroke(255, 0, 0);
      p5.fill(255, 0, 0, 50);
    } else {
      p5.stroke(0, 0, 0);
      p5.noFill();
    }
  }
  drawAABB(p5) {
    this.colorCollidingLogic(p5);
    let [x, y, w, h] = this.calcAABB();
    p5.rect(x - 2, y - 2, w + 4, h + 4);
    // p5.rect(x, y, w, h);
  }
  drawOBB(p5) {
    this.colorCollidingLogic(p5);
    let [x, y, w, h] = this.calcOBB();
    // rotate rect
    // expand figure for two pixels from center
    // x = x - 2;
    // y = y - 2;
    // w = w + 4;
    // h = h + 4;

    let [x1, y1, x2, y2, x3, y3, x4, y4] =
        this.rotateRect(x, y, x + w, y, x + w, y + h, x, y + h, this.rotation);
    p5.beginShape();
    p5.vertex(x1, y1);
    p5.vertex(x2, y2);
    p5.vertex(x3, y3);
    p5.vertex(x4, y4);
    p5.endShape(p5.CLOSE);
  }
  drawBS(p5) {
    this.colorCollidingLogic(p5);
    let [x, y, r] = this.calcBS();
    // rotate x, y about this.x and this.y by this.rotation
    let x1 = this.x + (x - this.x) * Math.cos(this.rotation) -
        (y - this.y) * Math.sin(this.rotation);
    let y1 = this.y + (x - this.x) * Math.sin(this.rotation) +
        (y - this.y) * Math.cos(this.rotation);
    p5.circle(x1, y1, r * 2);
  }
  calcAABB() {}
  collideWithWall() {
    let [x, y, w, h] = this.calcAABB();
    if (x < 0) {
      if (this.vx < 0) {
        this.vx *= -1;
      }
    }
    if (x + w > this.parameters.width) {
      if (this.vx > 0) {
        this.vx *= -1;
      }
    }
    if (y < 0) {
      if (this.vy < 0) {
        this.vy *= -1;
      }
    }
    if (y + h > this.parameters.height) {
      if (this.vy > 0) {
        this.vy *= -1;
      }
    }
  }
  rotateRect(x1, y1, x2, y2, x3, y3, x4, y4, rotation) {
    let x_center = this.x;
    let y_center = this.y;
    let x1r = x_center + (x1 - x_center) * Math.cos(rotation) -
        (y1 - y_center) * Math.sin(rotation);
    let y1r = y_center + (x1 - x_center) * Math.sin(rotation) +
        (y1 - y_center) * Math.cos(rotation);
    let x2r = x_center + (x2 - x_center) * Math.cos(rotation) -
        (y2 - y_center) * Math.sin(rotation);
    let y2r = y_center + (x2 - x_center) * Math.sin(rotation) +
        (y2 - y_center) * Math.cos(rotation);
    let x3r = x_center + (x3 - x_center) * Math.cos(rotation) -
        (y3 - y_center) * Math.sin(rotation);
    let y3r = y_center + (x3 - x_center) * Math.sin(rotation) +
        (y3 - y_center) * Math.cos(rotation);
    let x4r = x_center + (x4 - x_center) * Math.cos(rotation) -
        (y4 - y_center) * Math.sin(rotation);
    let y4r = y_center + (x4 - x_center) * Math.sin(rotation) +
        (y4 - y_center) * Math.cos(rotation);
    return [x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r];
  }

  simulate() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.angular_velocity;
  }
};

// SPHERE

aabb_namespace.Sphere = class extends aabb_namespace.BaseFigure {
  constructor(x, y, rotation, vx, vy, ang, parameters, r) {
    super(x, y, rotation, vx, vy, ang, parameters);
    this.r = r;
  }
  draw(p5) {
    p5.colorMode(p5.HSB, 360, 100, 100);
    if (this.color === undefined)
      this.color = p5.color(p5.random(0, 360), 50, 100);
    p5.stroke(0);
    p5.fill(this.color);
    p5.circle(this.x, this.y, this.r * 2);
    p5.colorMode(p5.RGB, 255);
  }
  calcAABB() {
    // top left corner, width, height
    return [this.x - this.r, this.y - this.r, this.r * 2, this.r * 2];
  }
  calcBS() {
    return [this.x, this.y, this.r];
  }
  calcOBB() {
    return this.calcAABB();
  }
};

// RECT

aabb_namespace.Rect = class extends aabb_namespace.BaseFigure {
  constructor(x, y, rotation, vx, vy, ang, parameters, w, h, rowdness = 0) {
    super(x, y, rotation, vx, vy, ang, parameters);
    this.w = w;
    this.h = h;
    this.rowdness = rowdness;
  }
  getRotatedCoord() {
    let x = this.x;
    let y = this.y;
    let w = this.w;
    let h = this.h;
    let c_x = w / 2;
    let c_y = h / 2;
    let x1 = x - c_x;
    let y1 = y - c_y;
    let x2 = x + w - c_x;
    let y2 = y - c_y;
    let x3 = x + w - c_x;
    let y3 = y + h - c_y;
    let x4 = x - c_x;
    let y4 = y + h - c_y;
    return this.rotateRect(x1, y1, x2, y2, x3, y3, x4, y4, this.rotation);
  }
  calcAABB() {
    let [x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r] = this.getRotatedCoord();
    let min_x = Math.min(x1r, x2r, x3r, x4r);
    let max_x = Math.max(x1r, x2r, x3r, x4r);
    let min_y = Math.min(y1r, y2r, y3r, y4r);
    let max_y = Math.max(y1r, y2r, y3r, y4r);
    return [min_x, min_y, max_x - min_x, max_y - min_y];
  }
  calcBS() {
    // sphere that bounds the rectangle
    let x = this.x;
    let y = this.y;
    let w = this.w;
    let h = this.h;
    let x_center = x
    let y_center = y
    let radius = Math.sqrt(w * w + h * h) / 2;
    return [x_center, y_center, radius];
  }
  calcOBB() {
    // return self params because OBB is the same rectangle
    return [this.x - this.w / 2, this.y - this.h / 2, this.w, this.h];
  }
  draw(p5) {
    p5.stroke(0);
    p5.colorMode(p5.HSB, 360, 100, 100);
    if (this.color === undefined)
      this.color = p5.color(p5.random(0, 360), 50, 100);
    p5.fill(this.color);
    p5.push();
    p5.translate(this.x, this.y);
    p5.rotate(this.rotation);
    p5.rect(-this.w / 2, -this.h / 2, this.w, this.h, this.rowdness);
    p5.pop();
    p5.colorMode(p5.RGB, 255);
  }
};

aabb_namespace.Ellipse = class extends aabb_namespace.BaseFigure {
  constructor(x, y, rotation, vx, vy, ang, parameters, a, b) {
    super(x, y, rotation, vx, vy, ang, parameters);
    this.a = a;
    this.b = b;
  }
  draw(p5) {
    p5.stroke(0);
    p5.colorMode(p5.HSB, 360, 100, 100);
    if (this.color === undefined)
      this.color = p5.color(p5.random(0, 360), 50, 100);
    p5.fill(this.color);
    // rotate ellipse
    p5.push();
    p5.translate(this.x, this.y);
    p5.rotate(this.rotation);
    p5.ellipse(0, 0, this.a * 2, this.b * 2);
    p5.pop();
    p5.colorMode(p5.RGB, 255);
  }
  calcAABB() {
    // https://stackoverflow.com/questions/87734/how-do-you-calculate-the-axis-aligned-bounding-box-of-an-ellipse
    let a = this.a;
    let b = this.b;
    let angle = this.rotation;

    let ux = a * Math.cos(angle)
    let uy = a * Math.sin(angle)
    let vx = b * Math.cos(angle + Math.PI / 2)
    let vy = b * Math.sin(angle + Math.PI / 2)

    let bbox_halfwidth = Math.sqrt(ux * ux + vx * vx)
    let bbox_halfheight = Math.sqrt(uy * uy + vy * vy)

    let minx = this.x - bbox_halfwidth;
    let miny = this.y - bbox_halfheight;
    let maxx = this.x + bbox_halfwidth;
    let maxy = this.y + bbox_halfheight;
    return [minx, miny, maxx - minx, maxy - miny];
  }
  calcBS() {
    return [this.x, this.y, Math.max(this.a, this.b)];
  }
  calcOBB() {
    // calculate OBB for ellipse based on a and b parameters in local space
    let a = this.a;
    let b = this.b;
    let w = 2 * a;
    let h = 2 * b;
    let x = this.x;
    let y = this.y;
    // need left top corner
    let x1 = x - a;
    let y1 = y - b;
    return [x1, y1, w, h];
  }
}


aabb_namespace.Dog1 = class extends aabb_namespace.BaseFigure {
  constructor(x, y, rotation, vx, vy, ang, parameters) {
    super(x, y, rotation, vx, vy, ang, parameters);
    this.initVertices();

    this.outer_color = [120, 46, 0];
    this.ears_color = [255, 204, 153];
    this.nose_color = [2, 2, 2];
    this.lips_color = [100, 10, 10];

    this.calcDefaultAABB();
    this.calcDefaultBS();
  }
  initVertices() {
    this.outer_vertices = [
      [20, -80], [-20, -80], [-80, -60], [-60, -50], [-90, -40], [-80, -30],
      [-90, -30], [-60, 60], [-40, 80], [-10, 50], [10, 50], [40, 80], [60, 60],
      [90, -30], [80, -30], [90, -40], [60, -50], [80, -60], [20, -80]
    ];
    this.outer_vertices = this.transformVertices(this.outer_vertices);
    this.ear1 = [[-20, 40], [-40, 60], [-50, 40], [-20, 40]];
    this.ear2 = [[20, 40], [40, 60], [50, 40], [20, 40]];
    this.nose = [[0, -30], [-20, -10], [20, -10], [0, -30], [0, -50]];
    this.lips = [[-20, -70], [0, -50], [20, -70]];
    this.eye_1 = [-30, 10];
    this.eye_2 = [30, 10];
    this.ear1 = this.transformVertices(this.ear1);
    this.ear2 = this.transformVertices(this.ear2);
    this.nose = this.transformVertices(this.nose);
    this.lips = this.transformVertices(this.lips);
    this.eye_1 = this.transformVertices([this.eye_1])[0];
    this.eye_2 = this.transformVertices([this.eye_2])[0];
  }
  transformVertices(arr) {
    this.scale = 0.3;
    this.const_translate = this.scale;
    let transformed = [];
    for (let vertex of arr) {
      transformed.push([
        vertex[0] * this.scale + this.const_translate,
        vertex[1] * this.scale + this.const_translate
      ]);
    }
    return transformed;
  }
  draw(p5) {
    p5.push();
    p5.translate(this.x, this.y);
    p5.rotate(this.rotation);

    p5.stroke(0);
    p5.fill(this.outer_color);
    p5.beginShape();
    for (let vertex of this.outer_vertices) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(this.ears_color);
    p5.beginShape();
    for (let vertex of this.ear1) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.beginShape();
    for (let vertex of this.ear2) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(0);
    p5.beginShape();
    for (let vertex of this.nose) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(this.lips_color);
    p5.beginShape();
    for (let vertex of this.lips) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(0);
    p5.circle(this.eye_1[0], this.eye_1[1], 5);
    p5.circle(this.eye_2[0], this.eye_2[1], 5);
    p5.pop();
  }
  calcDefaultBS() {
    let [min_x, min_y, height, width] = this.defaultAABB;
    let radius = Math.sqrt(width * width + height * height) / 2;
    this.BS = [0, 0, radius];
  }
  calcDefaultAABB() {
    let min_x = Number.MAX_VALUE;
    let max_x = Number.MIN_VALUE;
    let min_y = Number.MAX_VALUE;
    let max_y = Number.MIN_VALUE;
    for (let vertex of this.outer_vertices) {
      min_x = Math.min(min_x, vertex[0]);
      max_x = Math.max(max_x, vertex[0]);
      min_y = Math.min(min_y, vertex[1]);
      max_y = Math.max(max_y, vertex[1]);
    }
    this.defaultAABB = [min_x, min_y, max_x - min_x, max_y - min_y];
  }
  calcAABB() {
    let min_x = Number.MAX_VALUE;
    let max_x = Number.MIN_VALUE;
    let min_y = Number.MAX_VALUE;
    let max_y = Number.MIN_VALUE;
    // rotate vertices
    for (let vertex of this.outer_vertices) {
      let x = vertex[0];
      let y = vertex[1];
      let x_rot = x * Math.cos(this.rotation) - y * Math.sin(this.rotation);
      let y_rot = x * Math.sin(this.rotation) + y * Math.cos(this.rotation);
      min_x = Math.min(min_x, x_rot);
      max_x = Math.max(max_x, x_rot);
      min_y = Math.min(min_y, y_rot);
      max_y = Math.max(max_y, y_rot);
    }
    // add x, y
    return [min_x + this.x, min_y + this.y, max_x - min_x, max_y - min_y];
  }
  calcOBB() {
    return [
      this.defaultAABB[0] + this.x, this.defaultAABB[1] + this.y,
      this.defaultAABB[2], this.defaultAABB[3]
    ];
  }
  calcBS() {
    let bs = this.BS;
    return [bs[0] + this.x, bs[1] + this.y, bs[2]];
  }
};

aabb_namespace.Dog2 = class extends aabb_namespace.BaseFigure {
  constructor(x, y, rotation, vx, vy, ang, parameters) {
    super(x, y, rotation, vx, vy, ang, parameters);
    this.initVertices();
    this.body_color = [217, 136, 6];
    this.head_color = [210, 120, 20];
    this.ears_color = [255, 204, 153];
    this.nose_color = [2, 2, 2];
    this.lips_color = [100, 10, 10];
    this.calcDefaultAABB();
    // this.calcDefaultBS();
    this.calcRitterBS();
  }
  initVertices() {
    this.body = [
      [-3, 3],  [2, 3],   [3, 2],   [4, 0],   [7, 1],   [6, 0],   [7, 0],
      [6, -1],  [7, -1],  [5, -2],  [3, -1],  [4, -3],  [3, -6],  [2, -6],
      [3, -4],  [1, -2],  [2, -3],  [0, -6],  [-1, -6], [0, -4],  [0, -2],
      [-2, -2], [-3, -4], [-3, -6], [-4, -6], [-4, -3], [-5, -6], [-6, -6],
      [-5, -3], [-6, -1], [-7, 0],  [-6, 2]
    ];
    this.head = [
      [-3, 4], [-3, 3], [-5, 1], [-7, 3], [-7, 4], [-6, 6], [-4, 6], [-3, 4]
    ];
    this.ear1 = [[-4, 6], [-2, 6], [-3, 4]];
    this.ear2 = [[-6, 6], [-8, 6], [-7, 4]];
    // combine body, head, ears

    this.nose = [[-6, 2], [-4, 4], [-6, 4], [-4, 2]];
    this.eye1 = [-6, 5];
    this.eye2 = [-4, 5];
    this.body = this.transformVertices(this.body);
    this.head = this.transformVertices(this.head);
    this.ear1 = this.transformVertices(this.ear1);
    this.ear2 = this.transformVertices(this.ear2);
    this.nose = this.transformVertices(this.nose);
    this.eye1 = this.transformVertices([this.eye1])[0];
    this.eye2 = this.transformVertices([this.eye2])[0];
    this.outer_vertices = this.body.concat(this.head, this.ear1, this.ear2);
  }
  transformVertices(arr) {
    this.scale = 5;
    this.const_translate = this.scale;
    let transformed = [];
    for (let vertex of arr) {
      transformed.push([
        vertex[0] * this.scale + this.const_translate,
        vertex[1] * this.scale + this.const_translate
      ]);
    }
    return transformed;
  }
  draw(p5) {
    p5.push();
    p5.translate(this.x, this.y);
    p5.rotate(this.rotation);

    p5.stroke(0);
    p5.fill(this.body_color);
    p5.beginShape();
    for (let vertex of this.body) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(this.head_color);
    p5.beginShape();
    for (let vertex of this.head) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(this.ears_color);
    p5.beginShape();
    for (let vertex of this.ear1) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.beginShape();
    for (let vertex of this.ear2) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(this.nose_color);
    p5.beginShape();
    for (let vertex of this.nose) {
      p5.vertex(vertex[0], vertex[1]);
    }
    p5.endShape(p5.CLOSE);

    p5.fill(0);
    p5.circle(this.eye1[0], this.eye1[1], 5);
    p5.circle(this.eye2[0], this.eye2[1], 5);

    // center of the dog
    p5.pop();
  }
  minArray(arr, min_x, max_x, min_y, max_y) {
    for (let vertex of arr) {
      min_x = Math.min(min_x, vertex[0]);
      max_x = Math.max(max_x, vertex[0]);
      min_y = Math.min(min_y, vertex[1]);
      max_y = Math.max(max_y, vertex[1]);
    }
    return [min_x, min_y, max_x, max_y];
  }
  calcDefaultAABB() {
    let min_x = Number.MAX_VALUE;
    let max_x = Number.MIN_VALUE;
    let min_y = Number.MAX_VALUE;
    let max_y = Number.MIN_VALUE;
    [min_x, min_y, max_x, max_y] =
        this.minArray(this.outer_vertices, min_x, max_x, min_y, max_y);
    this.defaultAABB = [min_x, min_y, max_x - min_x, max_y - min_y];
  }
  calcDefaultBS() {
    let [min_x, min_y, height, width] = this.defaultAABB;
    // create BS based on rectangular
    let max = Math.max(width, height);
    let radius = max / 2 * Math.sqrt(2);
    this.BS = [0, 0, radius];
  }
  calcRitterBS() {
    // Ritter Bounding sphere

    let min_x = Number.MAX_VALUE;
    let max_x = Number.MIN_VALUE;
    let min_y = Number.MAX_VALUE;
    let max_y = Number.MIN_VALUE;
    [min_x, min_y, max_x, max_y] =
        this.minArray(this.outer_vertices, min_x, max_x, min_y, max_y);
    let xdiff = max_x - min_x;
    let ydiff = max_y - min_y;
    let diameter = Math.max(xdiff, ydiff);
    let center_x = (max_x + min_x) / 2;
    let center_y = (max_y + min_y) / 2;
    let radius = diameter / 2;
    let sq_radius = radius * radius;

    for (let vertex of this.outer_vertices) {
      let x = vertex[0];
      let y = vertex[1];
      let distance =
          (x - center_x) * (x - center_x) + (y - center_y) * (y - center_y);
      if (distance > sq_radius) {
        let new_radius = Math.sqrt(distance);
        radius = new_radius;
        sq_radius = radius * radius;
      }
    }
    this.BS = [center_x, center_y, radius];
  }
  calcAABB() {
    let min_x = Number.MAX_VALUE;
    let max_x = Number.MIN_VALUE;
    let min_y = Number.MAX_VALUE;
    let max_y = Number.MIN_VALUE;
    // rotate vertices
    for (let vertex of this.outer_vertices) {
      let x = vertex[0];
      let y = vertex[1];
      let x_rot = x * Math.cos(this.rotation) - y * Math.sin(this.rotation);
      let y_rot = x * Math.sin(this.rotation) + y * Math.cos(this.rotation);
      min_x = Math.min(min_x, x_rot);
      max_x = Math.max(max_x, x_rot);
      min_y = Math.min(min_y, y_rot);
      max_y = Math.max(max_y, y_rot);
    }
    // add x, y
    return [min_x + this.x, min_y + this.y, max_x - min_x, max_y - min_y];
  }
  calcOBB() {
    return [
      this.defaultAABB[0] + this.x, this.defaultAABB[1] + this.y,
      this.defaultAABB[2], this.defaultAABB[3]
    ];
  }
  calcBS() {
    let bs = this.BS;
    return [bs[0] + this.x, bs[1] + this.y, bs[2]];
  }
};


function collideAABBAABB(figure1, figure2) {
  let [x1, y1, w1, h1] = figure1.calcAABB();
  let [x2, y2, w2, h2] = figure2.calcAABB();

  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};
function collideAABBFigures(figure1, figure2) {
  if (figure1 === figure2) return;

  if (collideAABBAABB(figure1, figure2)) {
    figure1.is_colliding = true;
    figure2.is_colliding = true;
    if (figure1.vx > 0 && figure2.vx < 0) {
      figure1.vx *= -1;
      figure2.vx *= -1;
    }
    if (figure1.vy > 0 && figure2.vy < 0) {
      figure1.vy *= -1;
      figure2.vy *= -1;
    }
  }
}

function collideOBBOBB(figure_one, figure_other) {
  let [x1, y1, w1, h1] = figure_one.calcOBB();
  let [x2, y2, w2, h2] = figure_other.calcOBB();

  let [x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r] = figure_one.rotateRect(
      x1, y1, x1 + w1, y1, x1 + w1, y1 + h1, x1, y1 + h1, figure_one.rotation);
  let [x1o, y1o, x2o, y2o, x3o, y3o, x4o, y4o] = figure_other.rotateRect(
      x2, y2, x2 + w2, y2, x2 + w2, y2 + h2, x2, y2 + h2,
      figure_other.rotation);

  // check that one of the points of the first figure is inside the second
  // figure
  if (pointInRect(x1r, y1r, x1o, y1o, x2o, y2o, x3o, y3o, x4o, y4o)) {
    return true;
  }
  if (pointInRect(x2r, y2r, x1o, y1o, x2o, y2o, x3o, y3o, x4o, y4o)) {
    return true;
  }
  if (pointInRect(x3r, y3r, x1o, y1o, x2o, y2o, x3o, y3o, x4o, y4o)) {
    return true;
  }
  if (pointInRect(x4r, y4r, x1o, y1o, x2o, y2o, x3o, y3o, x4o, y4o)) {
    return true;
  }

  // check that one of the points of the second figure is inside the first
  // figure
  if (pointInRect(x1o, y1o, x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r)) {
    return true;
  }
  if (pointInRect(x2o, y2o, x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r)) {
    return true;
  }
  if (pointInRect(x3o, y3o, x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r)) {
    return true;
  }
  if (pointInRect(x4o, y4o, x1r, y1r, x2r, y2r, x3r, y3r, x4r, y4r)) {
    return true;
  }
  return false;
}

function pointInRect(x, y, x1, y1, x2, y2, x3, y3, x4, y4) {
  // check if point is inside the rectangle
  let a = (x1 - x) * (y2 - y1) - (x2 - x1) * (y1 - y);
  let b = (x2 - x) * (y3 - y2) - (x3 - x2) * (y2 - y);
  let c = (x3 - x) * (y4 - y3) - (x4 - x3) * (y3 - y);
  let d = (x4 - x) * (y1 - y4) - (x1 - x4) * (y4 - y);
  return (a > 0 && b > 0 && c > 0 && d > 0) ||
      (a < 0 && b < 0 && c < 0 && d < 0);
}

function collideOBBFigures(figure1, figure2) {
  if (figure1 === figure2) return;
  let is_colliding = collideOBBOBB(figure1, figure2);
  if (is_colliding) {
    figure1.is_colliding = true;
    figure2.is_colliding = true;
    if (figure1.vx > 0 && figure2.vx < 0) {
      figure1.vx *= -1;
      figure2.vx *= -1;
    }
    if (figure1.vy > 0 && figure2.vy < 0) {
      figure1.vy *= -1;
      figure2.vy *= -1;
    }
  }
}

function collideBSBS(figure1, figure2) {
  let [x1, y1, r1] = figure1.calcBS();
  let [x2, y2, r2] = figure2.calcBS();
  let distance = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  return distance < r1 + r2;
}

function collideBSFigures(figure1, figure2) {
  if (figure1 === figure2) return;
  if (collideBSBS(figure1, figure2)) {
    figure1.is_colliding = true;
    figure2.is_colliding = true;
    if (figure1.vx > 0 && figure2.vx < 0) {
      figure1.vx *= -1;
      figure2.vx *= -1;
    }
    if (figure1.vy > 0 && figure2.vy < 0) {
      figure1.vy *= -1;
      figure2.vy *= -1;
    }
  }
}


aabb_namespace.Interface = class {
  constructor(base_name, bounding_volume) {
    this.base_name = base_name;
    this.bounding_volume = bounding_volume;
  }
  iter(p5) {
    for (let figure of this.figures) {
      figure.is_colliding = false;
      figure.collideWithWall();
      figure.simulate();
    }
    for (let i = 0; i < this.figures.length; i++) {
      let figure1 = this.figures[i];
      for (let j = i + 1; j < this.figures.length; j++) {
        let figure2 = this.figures[j];
        if (this.bounding_volume === 'BS') {
          collideBSFigures(figure1, figure2);
        }
        if (this.bounding_volume === 'OBB') {
          collideOBBFigures(figure1, figure2);
        }
        if (this.bounding_volume === 'AABB') {
          collideAABBFigures(figure1, figure2);
        }
      }
    }
    for (let figure of this.figures) {
      figure.draw(p5);
    }
    for (let figure of this.figures) {
      if (this.bounding_volume === 'AABB') figure.drawAABB(p5);
      if (this.bounding_volume === 'OBB') figure.drawOBB(p5);
      if (this.bounding_volume === 'BS') figure.drawBS(p5);
    }
  }
  init() {
    this.figures = [];
    this.figures.push(
        new aabb_namespace.Sphere(100, 100, 0, 1, 1, 0, this.parameters, 30));
    this.figures.push(new aabb_namespace.Sphere(
        200, 200, 0, -1, -1, 0.0, this.parameters, 20));
    // this.figures.push(new aabb_namespace.Rect(
    // 200, 200, 0, -0, -0, 0.05, this.parameters, 50, 100));
    this.figures.push(new aabb_namespace.Ellipse(
        150, 100, 0, 1, -1, -0.03, this.parameters, 20, 50));
    this.figures.push(new aabb_namespace.Rect(
        200, 200, 0, 1, 1, -0.08, this.parameters, 50, 30));
    this.figures.push(new aabb_namespace.Rect(
        300, 300, 0, -1, 1, -0.08, this.parameters, 50, 50, 10));
    this.figures.push(
        new aabb_namespace.Dog1(200, 200, 0, -1, 1, -0.08, this.parameters));
    this.figures.push(
        new aabb_namespace.Dog2(150, 100, 0, 0.5, -0.5, 0.01, this.parameters));
  }
  setup(p5, base_name) {
    this.parameters = new aabb_namespace.Parameters();
    this.parameters.width = p5.width;
    this.parameters.height = p5.height - 10;
    this.init();
  }
  reset() {
    this.init();
  }
};

export default aabb_namespace;