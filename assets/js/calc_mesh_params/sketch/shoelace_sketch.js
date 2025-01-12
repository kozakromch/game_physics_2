import main_visualizator_namespace from '../../../../js/common/main_vis.min.js';
import shoelace from '../../../js/calc_mesh_params/shoelace.min.js';
import p5 from '../../../../js/libs/p5.min.js';

{
  let my_interface =
      new shoelace.Interface("shoelace_sketch");
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, false, true);
  new p5(main_visualizator);
}