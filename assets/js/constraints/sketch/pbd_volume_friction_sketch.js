import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import pbd_volume from '../../../js/constraints/pbd_volume.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new pbd_volume.Interface('pbd_volume_friction_sketch', true);
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}