import main_visualizator_namespace from '/game_physics_2/js/common/main_vis.min.js';
import p5 from '/game_physics_2/js/libs/p5.min.js';
import spring_namespace from '../spring.min.js';

{
  let my_interface = new spring_namespace.SpringInterfaceEuler('verlet');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}