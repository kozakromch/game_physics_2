use super::system::System;
use crate::utils::colors::random_color_hsv;

use three_d::*;

pub struct Visualizer {
    circle_mesh: InstancedMesh,
    circle_instances: Instances,
    circle_material: ColorMaterial,
    edge_mesh: InstancedMesh,
    edge_instances: Instances,
    edge_material: ColorMaterial,
    camera: Camera,
    scale_factor: f32,
}

impl Visualizer {
    pub fn new(window: &Window, system: &System) -> Self {
        let context = window.gl();
        let scale_factor = window.device_pixel_ratio();

        let circle_mesh = Self::create_instanced_mesh(&context);
        let edge_mesh = Self::create_instanced_mesh(&context);
        let camera = Camera::new_2d(window.viewport());

        let circle_material = Self::create_material(&context, Srgba::WHITE);
        let edge_material = Self::create_material(&context, Srgba::BLACK);

        let circle_instances = Self::create_instances(system, true);
        let edge_instances = Self::create_instances(system, false);

        Self {
            circle_mesh,
            circle_instances,
            circle_material,
            edge_mesh,
            edge_instances,
            edge_material,
            camera,
            scale_factor,
        }
    }

    fn create_instanced_mesh(context: &Context) -> InstancedMesh {
        InstancedMesh::new(context, &Instances::default(), &CpuMesh::circle(64))
    }

    fn create_material(context: &Context, color: Srgba) -> ColorMaterial {
        ColorMaterial::new_opaque(
            context,
            &CpuMaterial {
                albedo: color,
                albedo_texture: None,
                ..Default::default()
            },
        )
    }

    fn create_instances(system: &System, random_colors: bool) -> Instances {
        let mut instances = Instances {
            transformations: vec![Matrix4::identity(); system.balls.len()],
            colors: Some(vec![Srgba::WHITE; system.balls.len()]),
            ..Default::default()
        };

        for (i, ball) in system.balls.iter().enumerate() {
            instances.transformations[i] =
                Matrix4::from_translation(Vector3::new(ball.pos.x as f32, ball.pos.y as f32, 0.0));
            if random_colors {
                if let Some(colors) = &mut instances.colors {
                    let (r, g, b, a) = random_color_hsv(360.0, 0.4, 0.9);
                    colors[i] = Srgba::new(r, g, b, a);
                }
            }
        }

        instances
    }

    pub fn update(&mut self, system: &System) {
        self.circle_instances = Self::create_instances(system, true);
        self.edge_instances = Self::create_instances(system, false);
    }

    fn update_transformations(&mut self, system: &System) {
        let thickness = 1.0;
        for (i, ball) in system.balls.iter().enumerate() {
            let x = ball.pos.x as f32 * self.scale_factor;
            let y = ball.pos.y as f32 * self.scale_factor;
            self.circle_instances.transformations[i] =
                Matrix4::from_translation(Vector3::new(x, y, 0.0))
                    * Matrix4::from_scale((ball.radius as f32 - thickness) * self.scale_factor);
            self.edge_instances.transformations[i] =
                Matrix4::from_translation(Vector3::new(x, y, 0.0))
                    * Matrix4::from_scale((ball.radius as f32 + 0.05) * self.scale_factor);
        }
    }

    pub fn render(&mut self, frame_input: &FrameInput, system: &System) {
        let screen = frame_input.screen();
        screen.clear(ClearState::color_and_depth(0.95, 0.95, 0.99, 1.0, 1.0));

        self.update_transformations(system);

        self.circle_mesh.set_instances(&self.circle_instances);
        self.edge_mesh.set_instances(&self.edge_instances);

        screen.render_with_material(&self.circle_material, &self.camera, &self.circle_mesh, &[]);
        screen.render_with_material(&self.edge_material, &self.camera, &self.edge_mesh, &[]);
    }
}
