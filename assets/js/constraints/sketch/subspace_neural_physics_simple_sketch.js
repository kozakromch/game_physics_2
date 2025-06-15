import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import subspace_neural_physics from '../../../js/constraints/subspace_neural_physics.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface =
      new subspace_neural_physics.Interface('subspace_neural_physics_simple_sketch', false);
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, true);
  new p5(main_visualizator);
}