{
  let interface = new canon_namespace.CanonPhaseSpaceEuler('symplectic_euler');
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface);
  new p5(main_visualizator);
}