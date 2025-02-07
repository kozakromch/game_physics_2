use super::system_parameters::SystemParameters;
use crate::utils::ball;
use ball::Ball;

fn fix_position(ball1: &mut Ball, ball2: &mut Ball, distance: f64) {
    if distance < 1e-6 {
        return;
    }
    let overlap = (ball1.radius + ball2.radius - distance) * 1.5;
    let correction = overlap * (ball2.pos - ball1.pos) / distance / 2.0;
    ball1.pos -= correction;
    ball2.pos += correction;
}

fn collide(ball1: &mut Ball, ball2: &mut Ball, distance: f64, par: &SystemParameters) {
    fix_position(ball1, ball2, distance);

    let normal = (ball2.pos - ball1.pos).normalize();
    let relative_velocity = ball2.vel - ball1.vel;
    let velocity_along_normal = relative_velocity.dot(&normal);
    if velocity_along_normal > 0.0 {
        return;
    }
    let e = par.restitution;
    let j = -(1.0 + e) * velocity_along_normal
        / (1.0 / ball1.mass + 1.0 / ball2.mass)
        / normal.norm_squared();
    let impulse = j * normal;
    ball1.vel -= impulse / ball1.mass;
    ball2.vel += impulse / ball2.mass;
}
fn relax(
    ball1: &mut Ball,
    ball2: &mut Ball,
    with_collisions: bool,
    par: &SystemParameters,
) -> bool {
    let w = par.base.width as f64;
    let h = par.base.height as f64;
    let r = par.restitution;
    ball::wall_collision_2d(ball1, w, h, r);
    ball::wall_collision_2d(ball2, w, h, r);

    let distance = (ball2.pos - ball1.pos).norm();
    if distance < (ball1.radius + ball2.radius) {
        if with_collisions {
            collide(ball1, ball2, distance, par);
        } else {
            fix_position(ball1, ball2, distance);
        }
        false
    } else {
        true
    }
}

pub struct System {
    pub par: SystemParameters,
    pub balls: Vec<Ball>,
    pub t: f64,
}

impl System {
    pub fn new(width: u32, height: u32) -> Self {
        let par = SystemParameters::default_parameters(width, height);
        let mut system = System {
            par,
            balls: Vec::new(),
            t: 0.0,
        };
        system.initialize_system();
        system
    }

    pub fn reset(&mut self) {
        self.initialize_system();
    }

    pub fn initialize_system(&mut self) {
        self.t = 0.0;
        let n_points = self.par.n_points;
        let width = self.par.base.width;
        let height = self.par.base.height;
        let space = (width * height) as f64;
        let space_per_point = space / (n_points as f64);
        let radius = (space_per_point).sqrt() / 3.14;
        let mass_min = 0.9;
        let mass_max = 1.5;

        self.balls = (0..n_points)
            .map(|_| ball::get_random_ball(width, height, mass_min, mass_max, radius))
            .collect();
        self.update();
    }

    pub fn update(&mut self) {
        for _ in 0..self.par.sub_steps {
            for ball in &mut self.balls {
                ball.apply_gravity(self.par.g);
                ball.update(self.par.dt);
            }
            for _ in 0..self.par.relax_iter {
                if self.relax_all_points_brute_force(true) {
                    break;
                }
            }
            self.t += self.par.dt;
        }
    }

    pub fn relax_all_points_brute_force(&mut self, with_collisions: bool) -> bool {
        let mut all_ok = true;
        for i in 0..self.par.n_points {
            let (left, right) = self.balls.split_at_mut(i + 1);
            let ball1 = &mut left[i];
            for ball2 in right.iter_mut() {
                let result = relax(ball1, ball2, with_collisions, &self.par);
                all_ok = all_ok && result;
            }
        }
        all_ok
    }
}
