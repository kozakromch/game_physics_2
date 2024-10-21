import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import hitman_cloth_namespace from '../../../js/constraints/hitman_cloth.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new hitman_cloth_namespace.SimulationInterface('hitman_cloth_sketch');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}