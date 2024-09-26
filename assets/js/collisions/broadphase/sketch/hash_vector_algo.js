import hash_vector_namespace from '../../../../js/collisions/broadphase/hash_vector.min.js';
import main_visualizator_namespace from '../../../../js/common/main_vis.min.js';
import p5 from '../../../../js/libs/p5.min.js';

{
  let my_interface = new hash_vector_namespace.AllPairsInterface(
      'hash_vector_algo');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}