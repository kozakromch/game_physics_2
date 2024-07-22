{
  let interface = new spring_namespace.SpringInterfaceEuler('forward_euler');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface);
  new p5(main_visualizator);
}