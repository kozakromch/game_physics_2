import in_elastic from '../../../js/constraints/elastic_inelastic.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';

{
  let my_interface = new in_elastic.Interface("elastic_inelastic_sketch");
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}