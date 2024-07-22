{
  let interface = new hard_ball_namespace.HardBallInterface();
  let main_visualizator =
      main_visualizator_namespace.getMainVisualizator(interface);
  new p5(main_visualizator);
}