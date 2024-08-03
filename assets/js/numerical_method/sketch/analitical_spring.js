import color_scheme from '../../../js/common/color_scheme.min.js';
import energy_namespace from '../../../js/common/energy.min.js';
import main_visualizator_namespace from '../../../js/common/main_vis.min.js';
import p5 from '../../../js/libs/p5.min.js';
import spring_namespace from '../../../js/numerical_method/spring.min.js';

{
  class SpringInterfaceAnalitical {
    constructor() {
      this.method = 'analitical';
      this.base_name = 'analitical_spring';
      this.spring_system = new spring_namespace.SpringSystem(this.method);
      this.spring_vis = new spring_namespace.SpringVis();
    }
    iter(p5) {
      this.spring_system.calcSystem();
      energy_namespace.drawEnergyGraph(p5, this.spring_system.energy);
      this.spring_vis.draw(p5, this.spring_system, color_scheme.GREEN(p5), 255);

      // Draw info
      p5.fill(0);
      p5.stroke(0);
      p5.text('Energy: ' + this.spring_system.E.toFixed(2), 10, 20);
    }
    setup(p5) {}
    reset() {
      this.spring_system.reset();
    }
  };

  let spring_interface_analitical = new SpringInterfaceAnalitical();
  let main_visualizator_namespace_analitical =
      main_visualizator_namespace.getMainVisualizator(
          spring_interface_analitical);
  new p5(main_visualizator_namespace_analitical);
};
