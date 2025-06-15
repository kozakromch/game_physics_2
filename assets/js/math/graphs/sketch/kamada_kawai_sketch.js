import main_visualizator_namespace from "/game_physics_2/js/common/main_vis.min.js";
import shoelace from "/game_physics_2/js/math/graphs/kamada_kawai.min.js";
import p5 from "/game_physics_2/js/libs/p5.min.js";

{
  let my_interface = new shoelace.Interface("kamada_kawai_sketch");
  let main_visualizator = main_visualizator_namespace.getMainVisualizator(
    my_interface,
    false,
    true,
    false
  );
  new p5(main_visualizator);
}
