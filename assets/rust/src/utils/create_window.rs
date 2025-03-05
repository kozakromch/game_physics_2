use three_d::{Window, WindowSettings};

#[cfg(not(target_arch = "wasm32"))]
pub fn create_window() -> Window {
    let window = Window::new(WindowSettings {
        max_size: Some((250, 350)),
        ..Default::default()
    });
    window.expect("Failed to create window")
}

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;
#[cfg(target_arch = "wasm32")]
pub fn create_window(canvas_id: &str) -> Window {
    let mut window_settings = WindowSettings {
        ..Default::default()
    };
    if !canvas_id.is_empty() {
        let canvas = web_sys::window()
            .unwrap()
            .document()
            .unwrap()
            .get_element_by_id(canvas_id)
            .unwrap()
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .unwrap();
        // get the size of the canvas
        let width = canvas.width();
        let height = canvas.height();
        window_settings.max_size = Some((width, height));
       
        window_settings.canvas = Some(canvas);
        let window = Window::new(window_settings).unwrap();
        window
    } else {
        let window = Window::new(window_settings).unwrap();
        window
    }
}
