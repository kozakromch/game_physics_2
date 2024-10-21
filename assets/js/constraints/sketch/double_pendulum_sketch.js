import double_pendulum from '../../../js/constraints/spring_pendulum.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface = new double_pendulum.Interface("double_pendulum_sketch");
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}