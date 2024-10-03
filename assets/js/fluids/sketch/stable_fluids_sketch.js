import stable_fluids_namespaces from '../../../js/fluids/stable_fluids.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface = new stable_fluids_namespaces.Interface('stable_fluids_sketch');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface, false, false);
  new p5(main_visualizator);
}