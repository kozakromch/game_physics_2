use nalgebra::{Matrix3, Vector3};

pub struct SystemParameters {
    time_step: f64,
    num_substeps: usize,
    friction: f64,
    world_bounds: (Vector3<f64>, Vector3<f64>),
    pub dev_compliance: f64,
    pub vol_compliance: f64,
    density: f64,
    gravity: Vector3<f64>,
}

impl Default for SystemParameters {
    fn default() -> Self {
        SystemParameters {
            time_step: 0.1 / 60.0,
            num_substeps: 50,
            friction: 1000.0,
            world_bounds: (Vector3::new(-5.0, 0.0, -5.0), Vector3::new(5.0, 10.0, 5.0)),
            dev_compliance: 0.001,
            vol_compliance: 0.001,
            density: 1.0,
            gravity: Vector3::new(0.0, -100.0, 0.0),
        }
    }
}

pub struct System {
    orig_pos: Vec<Vector3<f64>>,
    pub par: SystemParameters,
    num_particles: usize,
    num_elems: usize,
    pub pos: Vec<Vector3<f64>>,
    prev_pos: Vec<Vector3<f64>>,
    vel: Vec<Vector3<f64>>,
    inv_mass: Vec<f64>,
    inv_rest_pose: Vec<Matrix3<f64>>,
    tet_ids: Vec<[usize; 4]>,
    vol_error: f64,
    grab_pos: Vector3<f64>,
    grab_id: i32,
    grads: Vec<Vector3<f64>>,
}

impl System {
    pub fn new(vertices: &Vec<Vector3<f64>>, tet_ids: &Vec<[usize; 4]>) -> Self {
        let num_particles = vertices.len();
        let num_elems = tet_ids.len();

        let pos = vertices.clone();
        let prev_pos = vertices.clone();
        let vel = vec![Vector3::zeros(); num_particles];
        let inv_mass = vec![0.0; num_particles];
        let inv_rest_pose = vec![Matrix3::zeros(); num_elems];
        let vol_error = 0.0;

        let grab_pos = Vector3::zeros();
        let grab_id = -1;

        let grads = vec![Vector3::zeros(); 4];
        let par = SystemParameters::default();
        let mut system = System {
            orig_pos: vertices.clone(),
            par,
            num_particles,
            num_elems,
            pos,
            prev_pos,
            vel,
            inv_mass,
            inv_rest_pose,
            tet_ids: tet_ids.clone(),
            vol_error,
            grab_pos,
            grab_id,
            grads,
        };

        system.init_physics();
        system
    }
    pub fn reset(&mut self) {
        self.pos = self.orig_pos.clone();
        self.prev_pos = self.orig_pos.clone();
        self.vel = vec![Vector3::zeros(); self.num_particles];
        self.grads = vec![Vector3::zeros(); 4];
        self.init_physics();
    }
    fn init_physics(&mut self) {
        for i in 0..self.num_particles {
            self.inv_mass[i] = 0.0;
        }

        for i in 0..self.num_elems {
            let id0 = self.tet_ids[i][0];
            let id1 = self.tet_ids[i][1];
            let id2 = self.tet_ids[i][2];
            let id3 = self.tet_ids[i][3];
            let p0 = self.pos[id1] - self.pos[id0];
            let p1 = self.pos[id2] - self.pos[id0];
            let p2 = self.pos[id3] - self.pos[id0];
            let p = Matrix3::from_columns(&[p0, p1, p2]);
            let v = (p.determinant() / 6.0).abs();
            if v == 0.0 {
                continue;
            }
            let inv_rest_pose = p.try_inverse().unwrap();
            let pm = v / 4.0 * self.par.density;
            self.inv_mass[id0] += pm;
            self.inv_mass[id1] += pm;
            self.inv_mass[id2] += pm;
            self.inv_mass[id3] += pm;
            self.inv_rest_pose[i] = inv_rest_pose;
        }

        for i in 0..self.num_particles {
            if self.inv_mass[i] != 0.0 {
                self.inv_mass[i] = 1.0 / self.inv_mass[i];
            }
        }
    }

    fn solve_shape(&mut self, elem_nr: usize, dt: f64) {
        //set grads to zero
        for i in 0..4 {
            self.grads[i] = Vector3::zeros();
        }
        let ir = &self.inv_rest_pose[elem_nr];

        let id0 = self.tet_ids[elem_nr][0];
        let id1 = self.tet_ids[elem_nr][1];
        let id2 = self.tet_ids[elem_nr][2];
        let id3 = self.tet_ids[elem_nr][3];

        let p0 = self.pos[id1] - self.pos[id0];
        let p1 = self.pos[id2] - self.pos[id0];
        let p2 = self.pos[id3] - self.pos[id0];
        let p = Matrix3::from_columns(&[p0, p1, p2]);
        let f = p * ir;

        let f0 = f.column(0);
        let f1 = f.column(1);
        let f2 = f.column(2);

        self.grads[1] += f0 * 2.0 * ir[(0, 0)];
        self.grads[1] += f1 * 2.0 * ir[(0, 1)];
        self.grads[1] += f2 * 2.0 * ir[(0, 2)];

        self.grads[2] += f0 * 2.0 * ir[(1, 0)];
        self.grads[2] += f1 * 2.0 * ir[(1, 1)];
        self.grads[2] += f2 * 2.0 * ir[(1, 2)];

        self.grads[3] += f0 * 2.0 * ir[(2, 0)];
        self.grads[3] += f1 * 2.0 * ir[(2, 1)];
        self.grads[3] += f2 * 2.0 * ir[(2, 2)];

        let c = f0.norm_squared() + f1.norm_squared() + f2.norm_squared() - 3.0;

        self.apply_to_elem(elem_nr, c, self.par.dev_compliance, dt);
    }

    fn solve_volume(&mut self, elem_nr: usize, dt: f64) {
        let ir = &self.inv_rest_pose[elem_nr];

        let id0 = self.tet_ids[elem_nr][0];
        let id1 = self.tet_ids[elem_nr][1];
        let id2 = self.tet_ids[elem_nr][2];
        let id3 = self.tet_ids[elem_nr][3];

        let p0 = self.pos[id1] - self.pos[id0];
        let p1 = self.pos[id2] - self.pos[id0];
        let p2 = self.pos[id3] - self.pos[id0];
        let p = Matrix3::from_columns(&[p0, p1, p2]);
        let f = p * ir;

        //set grads to zero
        for i in 0..4 {
            self.grads[i] = Vector3::zeros();
        }
        let f0 = f.column(0);
        let f1 = f.column(1);
        let f2 = f.column(2);

        let df0 = f1.cross(&f2);
        let df1 = f2.cross(&f0);
        let df2 = f0.cross(&f1);

        self.grads[1] += df0 * ir[(0, 0)];
        self.grads[1] += df1 * ir[(0, 1)];
        self.grads[1] += df2 * ir[(0, 2)];

        self.grads[2] += df0 * ir[(1, 0)];
        self.grads[2] += df1 * ir[(1, 1)];
        self.grads[2] += df2 * ir[(1, 2)];

        self.grads[3] += df0 * ir[(2, 0)];
        self.grads[3] += df1 * ir[(2, 1)];
        self.grads[3] += df2 * ir[(2, 2)];

        let c = f.determinant() - 1.0;
        self.vol_error += c;

        self.apply_to_elem(elem_nr, c, self.par.vol_compliance, dt);
    }

    fn apply_to_elem(&mut self, elem_nr: usize, c: f64, compliance: f64, dt: f64) {
        if c == 0.0 {
            return;
        }
        self.grads[0] = -self.grads[1] - self.grads[2] - self.grads[3];

        let mut w = 0.0;
        for i in 0..4 {
            let id = self.tet_ids[elem_nr][i];
            // make vector3
            let g = self.grads[i];
            w += g.norm_squared() * self.inv_mass[id];
        }

        if w == 0.0 {
            return;
        }
        let alpha = compliance / (dt * dt);
        let dlambda = -c / (w + alpha);

        for i in 0..4 {
            let id = self.tet_ids[elem_nr][i];
            let g = self.grads[i];
            self.pos[id] += g * dlambda * self.inv_mass[id];
        }
    }

    fn solve_elem(&mut self, elem_nr: usize, dt: f64) {
        self.solve_shape(elem_nr, dt);
        self.solve_volume(elem_nr, dt);
    }
    fn world_bounds(pos: &mut Vector3<f64>, world_bounds: (Vector3<f64>, Vector3<f64>)) {
        for i in 0..3 {
            pos[i] = f64::max(pos[i], world_bounds.0[i]);
            pos[i] = f64::min(pos[i], world_bounds.1[i]);
        }
    }
    fn find_closest(&self, p: Vector3<f64>) -> i32 {
        let mut min_dist = f64::MAX;
        let mut min_id = -1;
        for i in 0..self.num_particles {
            let dist = (self.pos[i] - p).norm_squared();
            if dist < min_dist {
                min_dist = dist;
                min_id = i as i32;
            }
        }
        min_id
    }
    pub fn init_grab(&mut self, p: Vector3<f64>) {
        self.grab_id = self.find_closest(p);
    }
    pub fn move_grab(&mut self, p: Vector3<f64>) {
        self.grab_pos = p;
    }
    pub fn release_grab(&mut self) {
        self.grab_id = -1;
    }

    pub fn simulate(&mut self) {
        let dt = self.par.time_step / self.par.num_substeps as f64;
        for _ in 0..self.par.num_substeps {
            // XPBD prediction
            for i in 0..self.num_particles {
                self.vel[i] += self.par.gravity * dt;
                self.prev_pos[i] = self.pos[i];
                self.pos[i] += self.vel[i] * dt * 0.99995;
            }
            if self.grab_id >= 0 {
                self.pos[self.grab_id as usize] = self.grab_pos;
            }
            // solve
            self.vol_error = 0.0;
            for i in 0..self.num_elems {
                self.solve_elem(i, dt);
            }
            self.vol_error /= self.num_elems as f64;
            // world collision
            for i in 0..self.num_particles {
                Self::world_bounds(&mut self.pos[i], self.par.world_bounds);
            }

            // XPBD velocity update
            for i in 0..self.num_particles {
                self.vel[i] = (self.pos[i] - self.prev_pos[i]) / dt;
            }
        }
    }
}
