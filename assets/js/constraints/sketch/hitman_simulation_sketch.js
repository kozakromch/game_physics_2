import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import hitman_relax_namespace from '../../../js/constraints/hitman_relax.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new hitman_relax_namespace.SimulationInterface('hitman_simulation_sketch', true);
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}