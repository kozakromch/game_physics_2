use super::system::System;
use crate::utils::tetra_mesh;
use nalgebra::Vector3;
use three_d::prelude::*;
use three_d::{
    AmbientLight, Camera, CpuMaterial, CpuMesh, Cull, FrameInput, Gm, InstancedMesh, Instances,
    Mat4, Mesh, PhysicalMaterial, Quat, SpotLight, Srgba, Vec3, Window,
};
pub struct Visualizer {
    pub camera: Camera,
    pub plane: Gm<Mesh, PhysicalMaterial>,
    pub edges: InstancedMesh,
    wireframe_material: PhysicalMaterial,
    ambient: AmbientLight,
    spot_light: SpotLight,
    instances: Instances,
}

impl Visualizer {
    pub fn new(
        window: &Window,
        _sys: &System,
        tetra_mesh: &tetra_mesh::TetraMesh,
        target: &three_d::Vector3<f32>,
        scene_radius: f32,
    ) -> Self {
        let context = window.gl();

        let camera = Camera::new_perspective(
            window.viewport(),
            target + (scene_radius * three_d::vec3(0.6, 0.3, 1.0).normalize()),
            *target,
            three_d::vec3(0.0, 1.0, 0.0),
            three_d::degrees(45.0),
            0.1,
            1000.0,
        );

        //light
        let ambient = AmbientLight::new(&context, 0.5, Srgba::WHITE);
        let spot_light = three_d::SpotLight::new(
            &context,
            5.0,
            Srgba::WHITE,
            three_d::vec3(8.0, 8.0, 0.0),
            three_d::vec3(-1.0, -1.0, 0.0),
            three_d::degrees(50.0),
            three_d::Attenuation::default(),
        );

        let mut cpu_plane = CpuMesh::square();
        cpu_plane
            .transform(
                three_d::Mat4::from_translation(three_d::vec3(0.0, -0.01, 0.0))
                    * three_d::Mat4::from_scale(5.0)
                    * three_d::Mat4::from_angle_x(three_d::degrees(-90.0)),
            )
            .unwrap();
        let plane = three_d::Gm::new(
            Mesh::new(&context, &cpu_plane),
            PhysicalMaterial::new_opaque(&context, &CpuMaterial {
                albedo: Srgba::new_opaque(200, 200, 250),
                ..Default::default()
            }),
        );

        // mesh
        let mut wireframe_material = PhysicalMaterial::new_opaque(&context, &CpuMaterial {
            albedo: Srgba::new_opaque(140, 40, 40),
            roughness: 0.5,
            metallic: 0.0,
            ..Default::default()
        });
        wireframe_material.render_states.cull = Cull::Back;
        let mut cylinder = CpuMesh::cylinder(3);
        cylinder
            .transform(Mat4::from_nonuniform_scale(1.0, 0.03, 0.03))
            .unwrap();
        let mut instances = Instances {
            transformations: Vec::new(),
            ..Default::default()
        };
        instances
            .transformations
            .resize(tetra_mesh.edge_indexes.len() / 2, Mat4::identity());
        Self::edge_transformations(
            &mut instances,
            &tetra_mesh.edge_indexes,
            &tetra_mesh.positions,
        );
        let mut edges = InstancedMesh::new(&context, &instances, &cylinder);
        Visualizer {
            camera,
            plane,
            edges,
            wireframe_material,
            ambient,
            spot_light,
            instances,
        }
    }

    fn edge_transformations(
        instances: &mut Instances,
        edge_indexes: &Vec<usize>,
        positions: &Vec<Vector3<f64>>,
    ) {
        // вектор размерa edge_indexes/2
        for i in (0..edge_indexes.len()).step_by(2) {
            let p1 = positions[edge_indexes[i]];
            let p2 = positions[edge_indexes[i + 1]];
            let p1_t: three_d::Vec3 = three_d::vec3(p1.x as f32, p1.y as f32, p1.z as f32);
            let p2_t: three_d::Vec3 = three_d::vec3(p2.x as f32, p2.y as f32, p2.z as f32);
            instances.transformations[i / 2] = Self::edge_transform(p1_t, p2_t);
        }
    }
    fn edge_transform(p1: Vec3, p2: Vec3) -> Mat4 {
        Mat4::from_translation(p1)
            * Into::<Mat4>::into(Quat::from_arc(
                vec3(1.0, 0.0, 0.0),
                (p2 - p1).normalize(),
                None,
            ))
            * Mat4::from_nonuniform_scale((p1 - p2).magnitude(), 1.0, 1.0)
    }
    pub fn update(&mut self, sys: &System, tetra_mesh: &tetra_mesh::TetraMesh) {
        Self::edge_transformations(&mut self.instances, &tetra_mesh.edge_indexes, &sys.pos);
        self.edges.set_instances(&self.instances);
        // shadow
        self.spot_light.generate_shadow_map(2048, &[&self.edges]);
    }

    pub fn render(&mut self, frame_input: &FrameInput, _sys: &System) {
        frame_input
            .screen()
            .clear(three_d::ClearState::color_and_depth(
                1.0, 1.0, 1.0, 1.0, 1.0,
            ))
            .render_with_material(&self.wireframe_material, &self.camera, &[&self.edges], &[
                &self.ambient,
                &self.spot_light,
            ])
            .render(&self.camera, &self.plane, &[
                &self.ambient,
                &self.spot_light,
            ]);
    }
}
