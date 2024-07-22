{
  let interface = new soft_ball_namespace.SoftBallInterface();
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface);
  new p5(main_visualizator);
}