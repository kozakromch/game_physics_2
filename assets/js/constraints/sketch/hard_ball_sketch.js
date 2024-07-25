import hard_ball_namespace from '/js/constraints/hard_ball.min.js';
import main_visualizator_namespace from '/js/common/main_vis.min.js';
import p5 from '/js/libs/p5.min.js';

{
  let my_interface = new hard_ball_namespace.HardBallInterface();
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}