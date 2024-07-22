{
  let interface = new canon_namespace.CanonInterfaceEuler('backward_euler');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface);
  new p5(main_visualizator);
}