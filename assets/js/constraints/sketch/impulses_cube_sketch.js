import impulses_cube from '../../../js/constraints/impulses_cube.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface = new impulses_cube.Interface("impulses_cube_sketch");
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}