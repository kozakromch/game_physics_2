import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import sequential_impulses from '../sequential_impulses.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new sequential_impulses.PendulumInterface('impulses_pendulum');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, false);
  new p5(main_visualizator);
}