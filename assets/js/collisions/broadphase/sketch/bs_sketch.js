import main_visualizator_namespace from '../../../../js/common/main_vis.min.js';
import aabb_namespace from '../../../../js/collisions/broadphase/bounding_volume.min.js';
import p5 from '../../../../js/libs/p5.min.js';

{
  let my_interface =
      new aabb_namespace.Interface("bs_sketch", "BS");
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}