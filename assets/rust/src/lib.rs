#[cfg(target_arch = "wasm32")]
mod systems;
#[cfg(target_arch = "wasm32")]
mod utils;

// Entry point for wasm
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn circles_collisions(canvas_id: &str) -> Result<(), JsValue> {
    systems::collisions::circles_collisions::interface::run(canvas_id);
    Ok(())
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn xpbd_neohookean(canvas_id: &str) -> Result<(), JsValue> {
    systems::constraints::xpbd::neohookean::interface::run(canvas_id).await;
    Ok(())
}
