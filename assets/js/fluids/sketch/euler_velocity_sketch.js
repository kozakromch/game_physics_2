import velocity_field from '../../../js/fluids/velocity_field.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface = new velocity_field.Interface('euler_velocity_sketch');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, false, false, false);
  new p5(main_visualizator);
}