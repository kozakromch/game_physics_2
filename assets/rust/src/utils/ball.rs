use nalgebra::{Vector2, Vector3};
use rand::random;

pub struct Ball {
    pub pos: Vector2<f64>,
    pub vel: Vector2<f64>,
    pub acel: Vector2<f64>,
    pub mass: f64,
    pub radius: f64,
}

impl Ball {
    pub fn update(&mut self, dt: f64) {
        self.vel += self.acel * dt;
        self.pos += self.vel * dt;
    }

    pub fn apply_gravity(&mut self, g: f64) {
        self.acel = Vector2::new(0.0, g);
    }
}

pub fn get_random_ball(
    width: u32,
    height: u32,
    mass_min: f64,
    mass_max: f64,
    average_radius: f64,
) -> Ball {
    let mass = random::<f64>() * (mass_max - mass_min) + mass_min;
    Ball {
        pos: Vector2::new(
            random::<f64>() * (width as f64),
            random::<f64>() * (height as f64),
        ),
        vel: Vector2::new(
            (random::<f64>() - 0.5) * 100.0,
            (random::<f64>() - 0.5) * 100.0,
        ),
        acel: Vector2::new(0.0, 0.0),
        mass,
        radius: average_radius * mass,
    }
}

pub fn wall_collision_2d(ball: &mut Ball, width: f64, height: f64, restitution: f64) {
    let r = restitution;
    if ball.pos.x - ball.radius < 0.0 {
        ball.pos.x = ball.radius;
        ball.vel.x = r * ball.vel.x.abs();
    }
    if ball.pos.x + ball.radius > width {
        ball.pos.x = width - ball.radius;
        ball.vel.x = -r * ball.vel.x.abs();
    }
    if ball.pos.y - ball.radius < 0.0 {
        ball.pos.y = ball.radius;
        ball.vel.y = r * ball.vel.y.abs();
    }
    if ball.pos.y + ball.radius > height {
        ball.pos.y = height - ball.radius;
        ball.vel.y = -r * ball.vel.y.abs();
    }
}

pub fn wall_collision_3d(
    pos: &mut Vector3<f64>,
    vel: &mut Vector3<f64>,
    radius: f64,
    width: f64,
    height: f64,
    depth: f64,
    restitution: f64,
) {
    let r = restitution;
    // if pos.x - radius < 0.0 {
    //     pos.x = radius;
    //     vel.x = r * vel.x.abs();
    // }
    // if pos.x + radius > width {
    //     pos.x = width - radius;
    //     vel.x = -r * vel.x.abs();
    // }
    if pos.y - radius < 0.0 {
        pos.y = radius;
        // vel.y = r * vel.y.abs();
    }
    if pos.y + radius > height {
        pos.y = height - radius;
        // vel.y = -r * vel.y.abs();
    }
    // if pos.z - radius < 0.0 {
    //     pos.z = radius;
    //     vel.z = r * vel.z.abs();
    // }
    // if pos.z + radius > depth {
    //     pos.z = depth - radius;
    //     vel.z = -r * vel.z.abs();
    // }
}
