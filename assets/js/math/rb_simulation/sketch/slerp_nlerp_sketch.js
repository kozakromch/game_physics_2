import main_visualizator_namespace from "/game_physics_2/js/common/main_vis.min.js";
import p5 from "/game_physics_2/js/libs/p5.min.js";
import slerpNlerp from "/game_physics_2/js/math/rb_simulation/slerp_nlerp.min.js";

{
  let my_interface = new slerpNlerp.Interface("slerp_nlerp_sketch");
  let main_visualizator = main_visualizator_namespace.getMainVisualizator(
    my_interface,
    false,
    false,
    false,
    true
  );
  new p5(main_visualizator);
}
