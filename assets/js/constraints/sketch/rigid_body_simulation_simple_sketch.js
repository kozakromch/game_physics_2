import rigid_body_sim from "../../../js/constraints/rigid_body_simulation.min.js";
import main_visualizator_namespace from "../../../js/common/main_vis.min.js";
import p5 from "../../../js/libs/p5.min.js";

{
  let my_interface = new rigid_body_sim.Interface(
    "rigid_body_simulation_simple_sketch",
    false
  );
  let main_visualizator = main_visualizator_namespace.getMainVisualizator(
    my_interface,
    false
  );
  new p5(main_visualizator);
}
