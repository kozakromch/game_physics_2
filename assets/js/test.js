import p5 from 'js/libs/p5.min.js';
// a P5 moire pattern.
let s = (sk) => {
  let layers = [];

  // sk.translate(window.innerWidth/2,window.innerHeight/2);
  sk.setup = () => {
    let gfx = sk.createGraphics(window.innerWidth, window.innerHeight);
    let gfx2;

    sk.createCanvas(window.innerWidth, window.innerHeight);
    sk.angleMode(sk.DEGREES);
    sk.imageMode(sk.CENTER);
    sk.translate(window.innerWidth / 2, window.innerHeight / 2);
    sk.background(40);
    gfx.stroke(200);
    gfx.strokeWeight(3);
    gfx.line(0, 0, window.innerWidth, 0);
    for (let i = 0; i < 1000; i++) {
      gfx.point(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight);
    }

    gfx2 = {...gfx};
    sk.image(gfx, 0, 0);
    sk.rotate(1);
    sk.image(gfx2, 0, 0);
  }
};
const P5 = new p5(s);
