use super::system_parameters::SystemParameters;
use nalgebra::Vector2;

#[derive(Debug)]
pub struct Parameters {
    pub m: f32,
    pub g: f32,
    pub dt: f32,
    pub friction_coeff: f32,
}

impl Parameters {
    pub fn new() -> Self {
        Parameters {
            m: 1.0,
            g: 5000.0,
            dt: 0.001,
            friction_coeff: 1.0,
        }
    }
}

// Function to calculate the area (volume) of a 2D shape
fn calculate_area(points: &[Point]) -> f32 {
    let mut area = 0.0;
    let n = points.len();

    for i in 0..n {
        let j = (i + 1) % n; // Wrap around to the first point
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    (area / 2.0).abs() // Return absolute value of the area
}

fn relax_points(points: &mut [Point], target_area: f32, iterations: usize) {
    let n = points.len();
    // Helper function to compute the area constraint
    fn area_constraint(points: &[Point], target_area: f32) -> f32 {
        calculate_area(points) - target_area
    }
    // Helper function to compute the gradient of the area constraint
    fn gradient(points: &[Point], idx: usize) -> Point {
        let n = points.len();
        let prev = (idx + n - 1) % n;
        let next = (idx + 1) % n;

        Point {
            x: (points[prev].y - points[next].y) / 2.0,
            y: (points[next].x - points[prev].x) / 2.0,
        }
    }

    for _ in 0..iterations {
        let c = area_constraint(points, target_area);
        if c.abs() < 1e-1 {
            break; // Convergence criterion
        }

        // Compute the denominator for the scaling factor
        let mut denominator = 0.0;
        for i in 0..n {
            let grad = gradient(points, i);
            denominator += grad.x * grad.x + grad.y * grad.y;
        }

        let alpha = c / denominator;

        // Update the points
        for i in 0..n {
            let grad = gradient(points, i);
            points[i].x -= alpha * grad.x;
            points[i].y -= alpha * grad.y;
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CollisionPointInfo {
    pub point: Vector2<f32>,
    pub normal: Vector2<f32>,
    pub distance: f32,
}

impl CollisionPointInfo {
    pub fn new(point: Vector2<f32>, normal: Vector2<f32>, distance: f32) -> Self {
        CollisionPointInfo {
            point,
            normal,
            distance,
        }
    }
}

#[derive(Debug)]
pub struct Object {
    pub position: Vector2<f32>,
    pub velocity: Vector2<f32>,
    pub mass: f32,
    pub radius: f32,
}

impl Object {
    pub fn new(position: Vector2<f32>, velocity: Vector2<f32>, mass: f32, radius: f32) -> Self {
        Object {
            position,
            velocity,
            mass,
            radius,
        }
    }

    pub fn update(&mut self, dt: f32) {
        self.position += self.velocity * dt;
    }

    pub fn apply_force(&mut self, force: Vector2<f32>, dt: f32) {
        let acceleration = force / self.mass;
        self.velocity += acceleration * dt;
    }

    pub fn check_collision(&self, other: &Object) -> Option<CollisionPointInfo> {
        let delta = other.position - self.position;
        let distance = delta.norm();
        if distance < self.radius + other.radius {
            let normal = delta.normalize();
            let penetration_depth = self.radius + other.radius - distance;
            Some(CollisionPointInfo::new(self.position + normal * self.radius, normal, penetration_depth))
        } else {
            None
        }
    }
}

#[derive(Debug)]
pub struct System {
    pub objects: Vec<Object>,
    pub collisions: Vec<CollisionPointInfo>,
}

impl System {
    pub fn new() -> Self {
        System {
            objects: Vec::new(),
            collisions: Vec::new(),
        }
    }

    pub fn add_object(&mut self, object: Object) {
        self.objects.push(object);
    }

    pub fn update(&mut self, dt: f32) {
        for object in &mut self.objects {
            object.update(dt);
        }
        self.handle_collisions();
    }

    pub fn handle_collisions(&mut self) {
        self.collisions.clear();
        let n = self.objects.len();
        for i in 0..n {
            for j in (i + 1)..n {
                if let Some(collision) = self.objects[i].check_collision(&self.objects[j]) {
                    self.collisions.push(collision);
                }
            }
        }
    }

    pub fn apply_forces(&mut self, forces: Vec<Vector2<f32>>, dt: f32) {
        for (object, force) in self.objects.iter_mut().zip(forces.iter()) {
            object.apply_force(*force, dt);
        }
    }
}