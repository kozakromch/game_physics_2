let ui_namespace = {};

ui_namespace.createDiv = function(parent_id, name, class_attr) {
  let div = document.createElement('div');
  div.setAttribute('class', class_attr);
  let div_name = name;
  div.id = div_name;
  document.getElementById(parent_id).appendChild(div);
  return div;
};

ui_namespace.createSlider = function(div, min, max, steps = 100, value) {
  let slider = document.createElement('input');
  slider.setAttribute('type', 'range');
  slider.setAttribute('min', min);
  slider.setAttribute('max', max);
  slider.setAttribute('class', 'align-middle');
  slider.setAttribute('style', 'width:100%');
  if (value) {
    slider.value = value;
  } else {
  slider.value = (max - min) / 2;
  }
  slider.step = (max - min) / steps;
  slider.id = div.id + 'slider';
  document.getElementById(div.id).appendChild(slider);
  return slider;
};
ui_namespace.createBoolButton = function(div, name) {
  let button = document.createElement('button');
  button.setAttribute('class', 'hx-border hx-rounded-lg hx-m-2');
  button.innerHTML = name;
  button.id = div.id + 'button';
  document.getElementById(div.id).appendChild(button);
  return button;
};

ui_namespace.createOutput = function(div) {
  let output = document.createElement('output');
  output.id = div.id + 'output';
  document.getElementById(div.id).appendChild(output);
  return output;
};

ui_namespace.createDivsForSlider = function(base_name, additional, inner) {
  let parent_name = base_name + '_add_space';
  let div_c_1 =
      ui_namespace.createDiv(parent_name, parent_name + additional, 'col-12');
  let div_r_1 = ui_namespace.createDiv(div_c_1.id, div_c_1.id + '1', 'row');
  let div_m_0 =
      ui_namespace.createDiv(div_r_1.id, div_r_1.id + '0', 'col-sm-auto');
  div_m_0.innerHTML = inner;
  let div_m_1 = ui_namespace.createDiv(div_r_1.id, div_r_1.id + '1', 'col-7');
  let div_m_2 = ui_namespace.createDiv(div_r_1.id, div_r_1.id + '2', '');
  return [div_m_1, div_m_2];
};

export default ui_namespace;
