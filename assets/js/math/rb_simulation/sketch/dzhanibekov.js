import main_visualizator_namespace from "/js/common/main_vis.min.js";
import p5 from "/js/libs/p5.min.js";
import rb_free from "/js/rb_simulation/rb_free.min.js";

{
  let my_interface = new rb_free.Interface("dzhanibekov", false);
  let main_visualizator = main_visualizator_namespace.getMainVisualizator(
    my_interface,
    false,
    false,
    false,
    true
  );
  new p5(main_visualizator);
}
