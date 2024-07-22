{
  let interface = new spring_namespace.SpringPhaseSpaceAnalitical();
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface, true);
  new p5(main_visualizator);
}