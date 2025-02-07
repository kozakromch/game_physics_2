mod systems;
mod utils;
use tokio;

#[cfg(not(target_arch = "wasm32"))]
#[tokio::main]
async fn main() {
    systems::constraints::xpbd::neohookean::interface::run("").await;
}
