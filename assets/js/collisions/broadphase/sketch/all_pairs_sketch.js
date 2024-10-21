import all_pairs_namespace from '../../../../js/collisions/broadphase/all_pairs.min.js';
import main_visualizator_namespace from '../../../../js/common/main_vis.min.js';
import p5 from '../../../../js/libs/p5.min.js';

{
  let my_interface = new all_pairs_namespace.AllPairsInterface(
      'all_pairs_sketch', 'brute_force');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}