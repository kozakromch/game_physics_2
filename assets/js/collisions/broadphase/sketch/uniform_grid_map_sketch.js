import all_pairs_namespace from '../../../../js/collisions/broadphase/all_pairs.min.js';
import main_visualizator_namespace from '../../../../js/common/main_vis.min.js';
import p5 from '../../../../js/libs/p5.min.js';

{
  let my_interface = new all_pairs_namespace.AllPairsInterface(
      'uniform_grid_map_sketch', 'uniform_grid_map');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}