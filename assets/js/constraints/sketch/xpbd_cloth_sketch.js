import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import pbd_cloth from '../../../js/constraints/pbd_cloth.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new pbd_cloth.SimulationInterface('xpbd_cloth_sketch', false);
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}