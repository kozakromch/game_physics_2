use three_d::egui::*;
use three_d::{egui::Color32, FrameInput, GUI};

pub static BACKGROUND: Color32 = Color32::from_rgba_premultiplied(200, 200, 250, 150);
pub static BUTTON_BACKGROUND: Color32 = Color32::from_rgba_premultiplied(150, 150, 200, 255);
pub static TEXT_COLOR: Color32 = Color32::from_rgb(0, 0, 0);

pub struct BaseState {
    // functor for the system that reset system
    pub reset: bool,
    pub stop: bool,
    pub fps: f64,
}
impl BaseState {
    pub fn new() -> Self {
        Self {
            reset: false,
            stop: false,
            fps: 0.0,
        }
    }
}

pub struct FPSCounter {
    fps: f64,
    time: f64,
}
impl FPSCounter {
    pub fn new() -> Self {
        Self {
            fps: 0.0,
            time: 0.0,
        }
    }
    pub fn update(&mut self, frame_input: &FrameInput) -> f64 {
        if (self.time - frame_input.accumulated_time).abs() > 1000.0 {
            self.fps = 1000.0 / frame_input.elapsed_time;
            self.time = frame_input.accumulated_time;
        }
        self.fps
    }
}

pub fn gui_logic(
    gui: &mut GUI,
    frame_input: &mut FrameInput,
    state: &mut BaseState,
    horizontal_ui: impl FnMut(&mut three_d::egui::Ui, &mut BaseState),
    mut vertical_ui: impl FnMut(&mut three_d::egui::Ui, &mut BaseState),
) {
    gui.update(
        &mut frame_input.events,
        frame_input.accumulated_time,
        frame_input.viewport,
        frame_input.device_pixel_ratio,
        |ctx| {
            Area::new(Id::new(1))
                .fixed_pos(pos2(2.0, 2.0))
                .show(ctx, |ui| {
                    ui.horizontal(|ui| {
                        gui_logic_horizontal(ui, state, horizontal_ui);
                    });
                    vertical_ui(ui, state);
                });
        },
    );
}

fn gui_logic_horizontal(
    ui: &mut three_d::egui::Ui,
    state: &mut BaseState,
    mut horizontal_ui: impl FnMut(&mut three_d::egui::Ui, &mut BaseState),
) {
    use three_d::egui::*;
    Frame::none()
        .fill(BACKGROUND)
        .rounding(Rounding::same(3.0))
        .inner_margin(Margin::symmetric(2.0, 2.0))
        .show(ui, |ui| {
            let start_stop_text = if state.stop { "Start" } else { "Stop" };
            let start_b = Button::new(RichText::new(start_stop_text).color(TEXT_COLOR).strong())
                .fill(BUTTON_BACKGROUND);
            if ui.add(start_b).clicked() {
                state.stop = !state.stop;
            }
            let reset_b = Button::new(RichText::new("Reset").color(TEXT_COLOR).strong())
                .fill(BUTTON_BACKGROUND);
            if ui.add(reset_b).clicked() {
                state.reset = true;
            }
            Frame::none()
                .fill(BACKGROUND)
                .rounding(Rounding::same(3.0))
                .show(ui, |ui| {
                    let fps_text = RichText::new(format!("FPS: {:.1}", state.fps))
                        .strong()
                        .color(TEXT_COLOR);
                    ui.label(fps_text);
                });
            horizontal_ui(ui, state);
        });
}
