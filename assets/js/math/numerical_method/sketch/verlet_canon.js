import main_visualizator_namespace from '/game_physics_2/js/common/main_vis.min.js';
import p5 from '/game_physics_2/js/libs/p5.min.js';
import canon_namespace from '../canon.min.js';

{
  let my_interface = new canon_namespace.CanonInterfaceEuler('verlet');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}