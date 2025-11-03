import Interface from "../../../js/fluids/weakly_sph.min.js";
import main_visualizator_namespace from "../../../js/common/main_vis.min.js";
import p5 from "../../../js/libs/p5.min.js";

{
  let my_interface = new Interface("weakly_sph_sketch");
  let main_visualizator = main_visualizator_namespace.getMainVisualizator(
    my_interface,
    true,
    true,
    false
  );
  new p5(main_visualizator);
}
