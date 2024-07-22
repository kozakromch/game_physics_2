import color_scheme from 'js/common/color_scheme';
import energy_namespace from 'js/common/energy.js';
import main_visualizator_namespace from 'js/common/main_vis.js';
import p5 from 'js/libs/p5.min.js';
import canon_namespace from 'js/numerical_method/canon.js';

class CanonInterfaceAnalitical {
  constructor() {
    this.method = 'analitical';
    this.base_name = 'analitical_canon';
    this.canon_system = new canon_namespace.CanonSystem(this.method);
    this.canon_vis = new canon_namespace.CanonVis();
  }
  iter(p5) {
    this.canon_system.calcSystem();
    energy_namespace.drawEnergyGraph(p5, this.canon_system.energy);
    this.canon_vis.draw(p5, this.canon_system, color_scheme.GREEN(p5));

    // Draw info
    p5.fill(0);
    p5.stroke(0);
    p5.text('Full Energy: ' + this.canon_system.E.toFixed(2), 10, 20);
  }
  setup(p5) {}
  reset() {
    this.canon_system.reset();
  }
};

{
  let my_interface = new CanonInterfaceAnalitical();
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(my_interface);
  new p5(main_visualizator);
}