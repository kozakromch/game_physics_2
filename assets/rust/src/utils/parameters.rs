#[derive(Debug, Clone)]
pub struct Parameters {
    pub width: u32,
    pub height: u32,
}

impl Parameters {
    pub fn new(width: u32, height: u32) -> Self {
        Parameters { width, height }
    }
}
