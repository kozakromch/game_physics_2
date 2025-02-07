use super::system::System;
use super::visualizer::Visualizer;
use crate::utils::{create_window, tetra_mesh, ui, ui::BaseState, base_url};
use three_d::*;

#[cfg(target_arch = "wasm32")]
use web_sys::console;
///
/// A control that makes the camera orbit around a target.
///
#[derive(Clone, Copy, Debug)]
pub struct OrbitControl {
    /// The target point to orbit around.
    pub target: Vec3,
    /// The minimum distance to the target point.
    pub min_distance: f32,
    /// The maximum distance to the target point.
    pub max_distance: f32,
    pub rotation_speed: f32,
}

impl OrbitControl {
    /// Creates a new orbit control with the given target and minimum and maximum distance to the target.
    pub fn new(target: Vec3, min_distance: f32, max_distance: f32, rotation_speed: f32) -> Self {
        Self {
            target,
            min_distance,
            max_distance,
            rotation_speed,
        }
    }

    /// Handles the events. Must be called each frame.
    pub fn handle_events(&mut self, camera: &mut Camera, events: &mut [Event]) -> bool {
        let mut change = false;
        for event in events.iter_mut() {
            match event {
                Event::MouseMotion {
                    delta,
                    button,
                    handled,
                    ..
                } => {
                    if !*handled {
                        if Some(MouseButton::Left) == *button {
                            let speed = self.rotation_speed;
                            camera.rotate_around_with_fixed_up(
                                self.target,
                                speed * delta.0,
                                speed * delta.1,
                            );
                            *handled = true;
                            change = true;
                        }
                    }
                }
                Event::MouseWheel { delta, handled, .. } => {
                    if !*handled {
                        let speed = 0.01 * self.target.distance(camera.position()) + 0.001;
                        camera.zoom_towards(
                            self.target,
                            speed * delta.1,
                            self.min_distance,
                            self.max_distance,
                        );
                        *handled = true;
                        change = true;
                    }
                }
                Event::PinchGesture { delta, handled, .. } => {
                    if !*handled {
                        let speed = self.target.distance(camera.position()) + 0.1;
                        camera.zoom_towards(
                            self.target,
                            speed * *delta,
                            self.min_distance,
                            self.max_distance,
                        );
                        *handled = true;
                        change = true;
                    }
                }
                _ => {}
            }
        }
        change
    }
}

///
/// Finds the closest intersection between a ray from the given camera in the given pixel coordinate and the given geometries.
/// The pixel coordinate must be in physical pixels, where (viewport.x, viewport.y) indicate the bottom left corner of the viewport
/// and (viewport.x + viewport.width, viewport.y + viewport.height) indicate the top right corner.
/// Returns ```None``` if no geometry was hit between the near (`z_near`) and far (`z_far`) plane for this camera.
///
pub fn custom_pick(
    context: &Context,
    camera: &Camera,
    pixel: impl Into<PhysicalPoint> + Copy,
    geometries: impl IntoIterator<Item = impl Geometry>,
) -> Option<CustomIntersectionResult> {
    let pos = camera.position_at_pixel(pixel);
    let dir = camera.view_direction_at_pixel(pixel);
    custom_ray_intersect(
        context,
        pos + dir * camera.z_near(),
        dir,
        camera.z_far() - camera.z_near(),
        geometries,
    )
}

/// Result from an intersection test
#[derive(Debug, Clone, Copy)]
pub struct CustomIntersectionResult {
    /// The position of the intersection.
    pub position: Vec3,
    pub depth: f32,
    pub direction: Vec3,
    /// The index of the intersected geometry in the list of geometries.
    pub geometry_id: u32,
    /// The index of the intersected instance in the list of instances, ie. [gl_InstanceID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_InstanceID.xhtml).
    /// This is 0 if the intersection did not hit an instanced geometry.
    pub instance_id: u32,
}

///
/// Finds the closest intersection between a ray starting at the given position in the given direction and the given geometries.
/// Returns ```None``` if no geometry was hit before the given maximum depth.
///
pub fn custom_ray_intersect(
    context: &Context,
    position: Vec3,
    direction: Vec3,
    max_depth: f32,
    geometries: impl IntoIterator<Item = impl Geometry>,
) -> Option<CustomIntersectionResult> {
    let viewport = Viewport::new_at_origo(1, 1);
    let up = if direction.dot(vec3(1.0, 0.0, 0.0)).abs() > 0.99 {
        direction.cross(vec3(0.0, 1.0, 0.0))
    } else {
        direction.cross(vec3(1.0, 0.0, 0.0))
    };
    let camera = Camera::new_orthographic(
        viewport,
        position,
        position + direction * max_depth,
        up,
        0.01,
        0.0,
        max_depth,
    );
    let mut texture = Texture2D::new_empty::<[f32; 4]>(
        context,
        viewport.width,
        viewport.height,
        Interpolation::Nearest,
        Interpolation::Nearest,
        None,
        Wrapping::ClampToEdge,
        Wrapping::ClampToEdge,
    );
    let mut depth_texture = DepthTexture2D::new::<f32>(
        context,
        viewport.width,
        viewport.height,
        Wrapping::ClampToEdge,
        Wrapping::ClampToEdge,
    );
    let mut material = IntersectionMaterial {
        ..Default::default()
    };
    let result = RenderTarget::new(
        texture.as_color_target(None),
        depth_texture.as_depth_target(),
    )
    .clear(ClearState::color_and_depth(1.0, 1.0, 1.0, 1.0, 1.0))
    .write::<RendererError>(|| {
        for (id, geometry) in geometries.into_iter().enumerate() {
            material.geometry_id = id as u32;
            render_with_material(context, &camera, &geometry, &material, &[]);
        }
        Ok(())
    })
    .unwrap()
    .read_color::<[f32; 4]>()[0];
    let depth = result[0];
    if depth < 1.0 {
        Some(CustomIntersectionResult {
            position: position + direction * depth * max_depth,
            depth: depth * max_depth,
            direction,
            geometry_id: result[1].to_bits(),
            instance_id: result[2].to_bits(),
        })
    } else {
        None
    }
}

struct State {
    base: BaseState,
    compliance: f64,
}
impl State {
    pub fn new() -> Self {
        State {
            base: BaseState::new(),
            compliance: 0.001,
        }
    }
}

fn gui_logic(gui: &mut three_d::GUI, frame_input: &mut FrameInput, state: &mut State) {
    ui::gui_logic(
        gui,
        frame_input,
        &mut state.base,
        |ui, _base_state| {
            ui.horizontal(|ui| {
                ui.add(three_d::egui::Slider::new(
                    &mut state.compliance,
                    0.0..=0.01,
                ));
                ui.label(
                    three_d::egui::RichText::new("compliance")
                        .strong()
                        .color(ui::TEXT_COLOR),
                );
            });
        },
        |_ui, _base_state| {},
    );
}

pub async fn run(_canvas_id: &str) {
    #[cfg(not(target_arch = "wasm32"))]
    let window = create_window::create_window();
    #[cfg(target_arch = "wasm32")]
    let window = create_window::create_window(_canvas_id);
    let context = window.gl();

    let path_to_assets = base_url::get_base_url();
    let path_to_obj = "tetra_cube.obj";
    //console_log path_to_assets for wasm 
    #[cfg(target_arch = "wasm32")]
{
    console::log_1(&format!("path_to_assets: {:?}", path_to_assets).into());
    let path = format!("{}/{}", path_to_assets, path_to_obj);
    console::log_1(&format!("path: {:?}", path).into());
}
// console::log_1(&format!("Here {}", 0).into());

    let tetra_mesh = tetra_mesh::TetraMesh::new(&path_to_assets, path_to_obj).await;
    // console::log_1(&format!("Here {}", 1).into());

    let target = three_d::vec3(0.0, 3.0, 0.0);
    let scene_radius = 20.0;

    let mut control = OrbitControl::new(target, 0.1 * scene_radius, 100.0 * scene_radius, 0.005);
    let mut sys = System::new(&tetra_mesh.positions, &tetra_mesh.tetr_indexes);
    let mut state = State::new();
    let mut gui = three_d::GUI::new(&context);
    let mut fps_counter = ui::FPSCounter::new();
    let mut vis = Visualizer::new(&window, &sys, &tetra_mesh, &target, scene_radius);
    let mut picked = false;
    let mut intersection_result = CustomIntersectionResult {
        position: vec3(0.0, 0.0, 0.0),
        depth: 0.0,
        direction: vec3(0.0, 0.0, 0.0),
        geometry_id: 0,
        instance_id: 0,
    };
    // console::log_1(&format!("Here {}", 2).into());
    window.render_loop(move |mut frame_input| {
        gui_logic(&mut gui, &mut frame_input, &mut state);

        vis.camera.set_viewport(frame_input.viewport);
        for event in frame_input.events.iter() {
            if let Event::MousePress {
                button, position, ..
            } = *event
            {
                if button == MouseButton::Left {
                    if let Some(pick) = custom_pick(&context, &vis.camera, position, &[&vis.edges])
                    {
                        picked = true;
                        intersection_result = pick;
                        let pos = nalgebra::Vector3::new(
                            pick.position.x as f64,
                            pick.position.y as f64,
                            pick.position.z as f64,
                        );

                        sys.init_grab(pos);
                        sys.move_grab(pos);
                    }
                }
            }
            if let Event::MouseMotion { position, .. } = *event {
                if picked {
                    let mut pos_new = vis.camera.position_at_pixel(position);
                    let dir_new = vis.camera.view_direction_at_pixel(position);
                    pos_new += dir_new * intersection_result.depth;
                    sys.move_grab(nalgebra::Vector3::new(
                        pos_new.x as f64,
                        pos_new.y as f64,
                        pos_new.z as f64,
                    ));
                }
            }
            if let Event::MouseRelease { button, .. } = *event {
                if button == MouseButton::Left {
                    picked = false;
                    sys.release_grab();
                }
            }
        }
        if !picked {
            control.handle_events(&mut vis.camera, &mut frame_input.events);
        }

        if state.base.reset {
            sys.reset();
            state.base.reset = false;
        }

        if !state.base.stop {
            sys.par.vol_compliance = state.compliance;
            sys.par.dev_compliance = state.compliance;
            sys.simulate();
            state.base.fps = fps_counter.update(&frame_input);
            vis.update(&sys, &tetra_mesh);
        }

        vis.render(&mut frame_input, &sys);
        frame_input.screen().write(|| gui.render()).unwrap();

        FrameOutput::default()
    });
}
