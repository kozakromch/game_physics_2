let base_canvas_namespace = base_canvas_namespace || {};
base_canvas_namespace.BaseCanvasController = class {
  constructor(base_name) {
    this.is_paused = true;
    this.is_reset = true;
    this.base_name = base_name;
    this.initializeCanvas(base_name);
    this.pauseText();
  }
  pauseText() {
    this.pause_button.innerHTML = this.is_paused ? 'Start' : 'Pause';
  }
  pauseSimulation() {
    this.is_paused = !this.is_paused;
    this.pauseText();
  }
  resetSimulation() {
    this.is_reset = true;
  }
  initializeCanvas(base_name) {
    console.log(base_name);
    this.width = document.getElementById(base_name + '_base_id').clientWidth;
    this.height = 300;
    this.canvas = document.getElementById(base_name + '_canvas_id');
    this.pause_button = document.getElementById(base_name + '_stop_button_id');

    this.pause_button.onclick = this.pauseSimulation.bind(this);

    this.reset_button = document.getElementById(base_name + '_reset_button_id');
    this.reset_button.onclick = this.resetSimulation.bind(this);
  }
};

export default base_canvas_namespace;