use crate::utils::parameters::Parameters;

#[derive(Debug)]
pub struct SystemParameters {
    pub base: Parameters,
    pub g: f64,
    pub dt: f64,
    pub restitution: f64,
    pub sub_steps: usize,
    pub relax_iter: usize,
    pub n_points: usize,
}

// Default parameters
impl SystemParameters {
    pub fn default_parameters(width: u32, height: u32) -> SystemParameters {
        SystemParameters {
            base: Parameters::new(width, height),
            g: -200.,
            dt: 0.001,
            restitution: 0.95,
            sub_steps: 5,
            relax_iter: 2,
            n_points: 10,
        }
    }
}
