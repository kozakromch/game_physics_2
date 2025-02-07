use super::system::System;
use super::visualizer::Visualizer;
use crate::utils::create_window;
use crate::utils::ui;
use three_d::{FrameInput, FrameOutput};

struct State {
    base: ui::BaseState,
    n_points: usize,
}
impl State {
    pub fn new() -> Self {
        State {
            base: ui::BaseState::new(),
            n_points: 50,
        }
    }
}

fn gui_logic(gui: &mut three_d::GUI, frame_input: &mut FrameInput, state: &mut State) {
    ui::gui_logic(
        gui,
        frame_input,
        &mut state.base,
        |ui, _base_state| {
            ui.horizontal(|ui| {
                ui.add(three_d::egui::Slider::new(&mut state.n_points, 1..=1000));
                ui.label(
                    three_d::egui::RichText::new("circles")
                        .strong()
                        .color(ui::TEXT_COLOR),
                );
            });
        },
        |_ui, _base_state| {},
    );
}

pub fn run(_canvas_id: &str) {
    #[cfg(not(target_arch = "wasm32"))]
    let window = create_window::create_window();
    #[cfg(target_arch = "wasm32")]
    let window = create_window::create_window(_canvas_id);

    let (width, height) = window.size();
    let mut sys = System::new(width, height);
    let mut vis = Visualizer::new(&window, &sys);
    let context = window.gl();
    let mut gui = three_d::GUI::new(&context);
    let mut state = State::new();
    let mut fps_counter = ui::FPSCounter::new();

    let mut prev_n_points = state.n_points;
    let mut n_points_timer = 0.0;
    window.render_loop(move |mut frame_input| {
        gui_logic(&mut gui, &mut frame_input, &mut state);

        if state.base.reset {
            sys.reset();
            state.base.reset = false;
        }

        if !state.base.stop {
            sys.update();
            state.base.fps = fps_counter.update(&frame_input);
        }
        vis.render(&frame_input, &sys);
        frame_input.screen().write(|| gui.render()).unwrap();

        if (state.n_points != prev_n_points)
            && (frame_input.accumulated_time - n_points_timer).abs() > 1000.0
        {
            sys.par.n_points = state.n_points;
            sys.reset();
            prev_n_points = state.n_points;
            n_points_timer = frame_input.accumulated_time;
            vis.update(&sys);
        }

        FrameOutput::default()
    });
}
