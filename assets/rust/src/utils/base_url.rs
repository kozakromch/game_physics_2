use once_cell::sync::Lazy;
use std::sync::Mutex;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

// Глобальная переменная с потокобезопасным доступом дефолтное значение src/assets
// static BASE_URL: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static BASE_URL: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(Some("src/assets".to_string())));
// Экспортируемая функция для установки значения глобальной переменной
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn set_base_url(base_url: &str) {
    let mut url = BASE_URL.lock().unwrap();
    *url = Some(base_url.to_string());
}

// Экспортируемая функция для получения значения глобальной переменной
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn get_base_url() -> String {
    let url = BASE_URL.lock().unwrap();
    url.clone().unwrap_or_else(|| "Не установлен".to_string())
}
#[cfg(not(target_arch = "wasm32"))]
pub fn get_base_url() -> String {
    let url = BASE_URL.lock().unwrap();
    url.clone().unwrap_or_else(|| "Не установлен".to_string())
}
