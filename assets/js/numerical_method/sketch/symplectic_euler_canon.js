import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';
import canon_namespace from '../../../js/numerical_method/canon.min.js';

{
  let my_interface = new canon_namespace.CanonInterfaceEuler('symplectic_euler');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}