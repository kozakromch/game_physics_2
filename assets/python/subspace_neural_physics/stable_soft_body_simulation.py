"""
Stable 2D Soft Body Simulation with PyMunk
High-performance implementation for data collection and PCA analysis
"""

import pygame
import pymunk
import pymunk.pygame_util
import numpy as np
import random
import csv
import math
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
from typing import List, Tuple, Dict
import time
from params import *


class SoftBodySimulation:

    def __init__(self, width=800, height=600):
        # Initialize Pygame
        pygame.init()
        self.width = width
        self.height = height
        self.screen = pygame.display.set_mode((width, height))
        pygame.display.set_caption("Stable Soft Body Simulation")
        self.clock = pygame.time.Clock()

        # Initialize PyMunk space
        self.space = pymunk.Space()
        self.space.gravity = (0, 0)  # Earth gravity in pixels/s²

        # Drawing options
        self.draw_options = pymunk.pygame_util.DrawOptions(self.screen)

        # Simulation parameters from params.py
        self.soft_body_width = SOFT_BODY_WIDTH
        self.soft_body_height = SOFT_BODY_HEIGHT
        self.particle_spacing = PARTICLE_SPACING
        self.particle_mass = PARTICLE_MASS
        self.particle_radius = PARTICLE_RADIUS

        # Spring parameters from params.py
        self.spring_stiffness = SPRING_STIFFNESS
        self.spring_damping = SPRING_DAMPING
        self.long_diagonal_skip_distance = LONG_DIAGONAL_SKIP_DISTANCE
        self.enable_long_distance_springs = ENABLE_LONG_DISTANCE_SPRINGS

        # Sphere parameters from params.py
        self.sphere_radius = SPHERE_RADIUS
        self.sphere_mass = SPHERE_MASS

        # Data collection
        self.node_positions_history = []
        self.sphere_positions_history = []
        self.frame_count = 0
        self.max_frames = MAX_FRAMES

        # Create simulation objects
        self.soft_body_particles = []
        self.soft_body_springs = []
        self.sphere = None
        self.ground_constraints = []

        self._create_soft_body()
        self._create_sphere()
        self._create_boundaries()

    def _create_soft_body(self):
        """Create a stable soft body with fixed bottom constraint"""
        # Calculate soft body position (centered horizontally, in upper part of screen)
        start_x = self.width // 2 - \
            (self.soft_body_width - 1) * self.particle_spacing // 2
        start_y = self.height // 3

        # Create particle grid
        particles = []
        for row in range(self.soft_body_height):
            particle_row = []
            for col in range(self.soft_body_width):
                x = start_x + col * self.particle_spacing
                y = start_y + row * self.particle_spacing

                # Create particle body
                body = pymunk.Body(self.particle_mass, pymunk.moment_for_circle(
                    self.particle_mass, 0, self.particle_radius))
                body.position = x, y

                # Create particle shape
                shape = pymunk.Circle(body, self.particle_radius)
                shape.friction = 0.3
                shape.collision_type = 1  # Soft body collision type

                # Remove collision between soft body particles
                shape.filter = pymunk.ShapeFilter(group=1)

                # Add to space
                self.space.add(body, shape)

                particle_row.append((body, shape))

                # Fix bottom row particles (make them static)
                if row == self.soft_body_height - 1:
                    # Create static constraint to fix bottom particles
                    constraint = pymunk.PinJoint(
                        self.space.static_body, body, (x, y), (0, 0))
                    constraint.stiffness = 10000
                    constraint.damping = 100
                    self.space.add(constraint)
                    self.ground_constraints.append(constraint)

            particles.append(particle_row)

        self.soft_body_particles = particles

        # Create spring connections
        self._create_springs()

    def _create_springs(self):
        """Create spring connections between particles for structural integrity"""
        springs = []

        for row in range(self.soft_body_height):
            for col in range(self.soft_body_width):
                current_body = self.soft_body_particles[row][col][0]

                # Horizontal springs
                if col < self.soft_body_width - 1:
                    right_body = self.soft_body_particles[row][col + 1][0]
                    spring = pymunk.DampedSpring(
                        current_body, right_body,
                        (0, 0), (0, 0),
                        self.particle_spacing,
                        self.spring_stiffness,
                        self.spring_damping
                    )
                    self.space.add(spring)
                    springs.append(spring)

                # Vertical springs
                if row < self.soft_body_height - 1:
                    bottom_body = self.soft_body_particles[row + 1][col][0]
                    spring = pymunk.DampedSpring(
                        current_body, bottom_body,
                        (0, 0), (0, 0),
                        self.particle_spacing,
                        self.spring_stiffness,
                        self.spring_damping
                    )
                    self.space.add(spring)
                    springs.append(spring)

                # Diagonal springs for better stability
                if row < self.soft_body_height - 1 and col < self.soft_body_width - 1:
                    diag_body = self.soft_body_particles[row + 1][col + 1][0]
                    diagonal_distance = self.particle_spacing * math.sqrt(2)
                    spring = pymunk.DampedSpring(
                        current_body, diag_body,
                        (0, 0), (0, 0),
                        diagonal_distance,
                        self.spring_stiffness * 0.7,  # Slightly weaker diagonal springs
                        self.spring_damping * 0.7
                    )
                    self.space.add(spring)
                    springs.append(spring)

                # Anti-diagonal springs
                if row < self.soft_body_height - 1 and col > 0:
                    anti_diag_body = self.soft_body_particles[row + 1][col - 1][0]
                    diagonal_distance = self.particle_spacing * math.sqrt(2)
                    spring = pymunk.DampedSpring(
                        current_body, anti_diag_body,
                        (0, 0), (0, 0),
                        diagonal_distance,
                        self.spring_stiffness * 0.7,
                        self.spring_damping * 0.7
                    )
                    self.space.add(spring)
                    springs.append(spring)

        # Create long diagonal springs (connecting points 5 positions away)
        if self.enable_long_distance_springs:
            self._create_long_distance_springs(springs)

        # Create cross springs from center point to all particles
        self._create_cross_springs()
        self.soft_body_springs = springs

    def _create_sphere(self):
        """Create a kinematic sphere with controlled movement"""
        # Random position above the soft body
        sphere_x = random.uniform(100, self.width - 100)
        sphere_y = random.uniform(50, 150)

        # Create kinematic sphere body (infinite mass, controlled by code)
        sphere_body = pymunk.Body(body_type=pymunk.Body.KINEMATIC)
        sphere_body.position = sphere_x, sphere_y

        # Set initial velocity for kinematic movement
        vel_x = random.uniform(-100, 100)
        vel_y = random.uniform(100, 300)
        sphere_body.velocity = (vel_x, vel_y)

        # Create sphere shape
        sphere_shape = pymunk.Circle(sphere_body, self.sphere_radius)
        sphere_shape.friction = 0.5
        sphere_shape.elasticity = 0.8  # Bounciness
        sphere_shape.collision_type = 2  # Sphere collision type

        # Add to space
        self.space.add(sphere_body, sphere_shape)

        self.sphere = (sphere_body, sphere_shape)

        # Store initial movement parameters for kinematic control
        self.sphere_target_pos = None
        self.sphere_movement_time = 0
        self.sphere_movement_duration = random.uniform(2.0, 4.0)  # seconds

    def _create_boundaries(self):
        """Create invisible boundaries to keep objects in view"""
        # Create static segments for boundaries
        boundaries = [
            # Left wall
            pymunk.Segment(self.space.static_body,
                           (0, 0), (0, self.height), 5),
            # Right wall
            pymunk.Segment(self.space.static_body, (self.width,
                           0), (self.width, self.height), 5),
            # Bottom wall
            pymunk.Segment(self.space.static_body,
                           (0, self.height), (self.width, self.height), 5),
            # Top wall
            pymunk.Segment(self.space.static_body, (0, 0), (self.width, 0), 5)
        ]

        for boundary in boundaries:
            boundary.friction = 0.5
            boundary.elasticity = 0.8
            self.space.add(boundary)

    def _collect_data(self):
        """Collect position data for PCA analysis"""
        # Collect soft body node positions
        node_positions = []
        for row in range(self.soft_body_height):
            for col in range(self.soft_body_width):
                body = self.soft_body_particles[row][col][0]
                pos = body.position
                node_positions.extend([pos.x, pos.y])

        # Collect sphere position
        sphere_pos = self.sphere[0].position
        sphere_data = [sphere_pos.x, sphere_pos.y]

        self.node_positions_history.append(node_positions)
        self.sphere_positions_history.append(sphere_data)

    def reset_sphere(self):
        """Reset kinematic sphere to a new random position and movement pattern"""
        # Remove old sphere
        if self.sphere:
            self.space.remove(self.sphere[0], self.sphere[1])

        # Create new kinematic sphere
        self._create_sphere()

    def _update_kinematic_sphere(self, dt):
        """Update kinematic sphere movement with controlled patterns and avoid deep penetration into soft body"""
        if not self.sphere:
            return

        sphere_body = self.sphere[0]
        current_pos = sphere_body.position

        # Calculate soft body bounding box
        soft_body_center_x = self.width // 2
        soft_body_center_y = self.height // 3 + \
            (self.soft_body_height - 1) * self.particle_spacing // 2
        left = soft_body_center_x - ((self.soft_body_width - 1) * self.particle_spacing) // 2
        right = soft_body_center_x + ((self.soft_body_width - 1) * self.particle_spacing) // 2
        top = self.height // 3
        bottom = top + (self.soft_body_height - 1) * self.particle_spacing

        # Margin to avoid deep penetration
        border_margin = max(self.sphere_radius * 2, 40)
        safe_left = left - border_margin
        safe_right = right + border_margin
        safe_top = top - border_margin
        safe_bottom = bottom + border_margin

        # Check if sphere is too deep inside soft body
        if (left + self.sphere_radius < current_pos.x < right - self.sphere_radius and
            top + self.sphere_radius < current_pos.y < bottom - self.sphere_radius):
            # Too deep, force new target outside
            # Pick nearest border
            distances = {
                'left': abs(current_pos.x - left),
                'right': abs(current_pos.x - right),
                'top': abs(current_pos.y - top),
                'bottom': abs(current_pos.y - bottom)
            }
            nearest = min(distances, key=distances.get)
            if nearest == 'left':
                tx = safe_left
                ty = current_pos.y
            elif nearest == 'right':
                tx = safe_right
                ty = current_pos.y
            elif nearest == 'top':
                tx = current_pos.x
                ty = safe_top
            else:  # bottom
                tx = current_pos.x
                ty = safe_bottom
            self.sphere_target_pos = (tx, ty)
            self.sphere_movement_time = 0
            self.sphere_movement_duration = random.uniform(1.0, 2.0)

        # Update movement timer
        self.sphere_movement_time += dt

        # Generate new target position if needed
        if self.sphere_target_pos is None or self.sphere_movement_time >= self.sphere_movement_duration:
            # Generate new target with randomness, but keep near the border
            side = random.choice(['top', 'left', 'right'])
            if side == 'top':
                tx = random.uniform(left + border_margin, right - border_margin)
                ty = safe_top
            elif side == 'left':
                tx = safe_left
                ty = random.uniform(top + border_margin, bottom - border_margin)
            else:  # right
                tx = safe_right
                ty = random.uniform(top + border_margin, bottom - border_margin)

            self.sphere_target_pos = (tx, ty)
            self.sphere_movement_time = 0
            self.sphere_movement_duration = random.uniform(1.5, 3.0)

        # Calculate movement toward target
        if self.sphere_target_pos:
            target_x, target_y = self.sphere_target_pos
            dx = target_x - current_pos.x
            dy = target_y - current_pos.y
            distance = math.sqrt(dx*dx + dy*dy)

            if distance > 10:  # Not yet at target
                # Smooth movement with variable speed
                speed = random.uniform(100, 250)
                vel_x = (dx / distance) * speed
                vel_y = (dy / distance) * speed

                # Add some sinusoidal variation for more interesting movement
                time_factor = self.sphere_movement_time * 2.0
                vel_x += math.sin(time_factor) * 30
                vel_y += math.cos(time_factor * 1.3) * 30

                sphere_body.velocity = (vel_x, vel_y)
            else:
                # Reached target, set new target
                self.sphere_target_pos = None

    def _create_cross_springs(self):
        """Create cross springs from the center point to all particles"""
        # Calculate center point
        center_x = self.width // 2
        center_y = self.height // 3 + (self.soft_body_height // 2) * self.particle_spacing

        # Create center body
        center_body = pymunk.Body(body_type=pymunk.Body.STATIC)
        center_body.position = center_x, center_y

        # Add cross springs
        for row in range(self.soft_body_height):
            for col in range(self.soft_body_width):
                particle_body = self.soft_body_particles[row][col][0]
                distance = math.sqrt((center_x - particle_body.position.x)**2 + (center_y - particle_body.position.y)**2)
                spring = pymunk.DampedSpring(
                    center_body, particle_body,
                    (0, 0), (0, 0),
                    distance,
                    self.spring_stiffness * 0.5,  # Adjust stiffness for cross springs
                    self.spring_damping * 0.5
                )
                self.space.add(spring)
                self.soft_body_springs.append(spring)

        print("Cross springs created from center point to all particles.")

    def _create_long_distance_springs(self, springs):
        """Create long distance springs (horizontal, vertical, diagonal) connecting points skip_distance positions away"""
        skip_distance = self.long_diagonal_skip_distance  # Use parameter from config
        
        # Long horizontal springs (connecting point [row][col] with [row][col+skip])
        for row in range(self.soft_body_height):
            for col in range(self.soft_body_width - skip_distance):
                current_body = self.soft_body_particles[row][col][0]
                target_body = self.soft_body_particles[row][col + skip_distance][0]
                
                # Calculate distance for this long horizontal spring
                horizontal_distance = self.particle_spacing * skip_distance
                
                spring = pymunk.DampedSpring(
                    current_body, target_body,
                    (0, 0), (0, 0),
                    horizontal_distance,
                    self.spring_stiffness * 0.4,  # Slightly stronger than diagonal for stability
                    self.spring_damping * 0.4
                )
                self.space.add(spring)
                springs.append(spring)
        
        # Long vertical springs (connecting point [row][col] with [row+skip][col])
        for row in range(self.soft_body_height - skip_distance):
            for col in range(self.soft_body_width):
                current_body = self.soft_body_particles[row][col][0]
                target_body = self.soft_body_particles[row + skip_distance][col][0]
                
                # Calculate distance for this long vertical spring
                vertical_distance = self.particle_spacing * skip_distance
                
                spring = pymunk.DampedSpring(
                    current_body, target_body,
                    (0, 0), (0, 0),
                    vertical_distance,
                    self.spring_stiffness * 0.4,  # Slightly stronger than diagonal for stability
                    self.spring_damping * 0.4
                )
                self.space.add(spring)
                springs.append(spring)
        
        # Diagonal springs going down-right (connecting point [row][col] with [row+skip][col+skip])
        for row in range(self.soft_body_height - skip_distance):
            for col in range(self.soft_body_width - skip_distance):
                current_body = self.soft_body_particles[row][col][0]
                target_body = self.soft_body_particles[row + skip_distance][col + skip_distance][0]
                
                # Calculate distance for this long diagonal
                diagonal_distance = self.particle_spacing * skip_distance * math.sqrt(2)
                
                spring = pymunk.DampedSpring(
                    current_body, target_body,
                    (0, 0), (0, 0),
                    diagonal_distance,
                    self.spring_stiffness * 0.3,  # Weaker for long springs
                    self.spring_damping * 0.3
                )
                self.space.add(spring)
                springs.append(spring)
        
        # Anti-diagonal springs going down-left (connecting point [row][col] with [row+skip][col-skip])
        for row in range(self.soft_body_height - skip_distance):
            for col in range(skip_distance, self.soft_body_width):
                current_body = self.soft_body_particles[row][col][0]
                target_body = self.soft_body_particles[row + skip_distance][col - skip_distance][0]
                
                # Calculate distance for this long diagonal
                diagonal_distance = self.particle_spacing * skip_distance * math.sqrt(2)
                
                spring = pymunk.DampedSpring(
                    current_body, target_body,
                    (0, 0), (0, 0),
                    diagonal_distance,
                    self.spring_stiffness * 0.3,  # Weaker for long springs
                    self.spring_damping * 0.3
                )
                self.space.add(spring)
                springs.append(spring)
        
        print(f"Created long distance springs (horizontal, vertical, and diagonal) connecting points {skip_distance} positions away")

    def run_simulation(self, visualize=True, collect_data=True):
        """Run the simulation with optional visualization and data collection"""
        running = True
        dt = 1.0 / 60.0  # 60 FPS

        print("Starting stable soft body simulation...")
        print("Press SPACE to reset sphere, ESC to quit")

        start_time = time.time()

        while running and self.frame_count < self.max_frames:
            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif event.key == pygame.K_SPACE:
                        self.reset_sphere()

            # Step physics simulation
            self.space.step(dt)

            # Update kinematic sphere movement
            self._update_kinematic_sphere(dt)

            # Update kinematic sphere movement
            self._update_kinematic_sphere(dt)

            # Collect data if enabled
            if collect_data:
                self._collect_data()

            # Visualization
            if visualize:
                self.screen.fill((30, 30, 30))  # Dark background

                # Draw physics objects
                self.space.debug_draw(self.draw_options)

                # Draw additional info
                font = pygame.font.Font(None, 36)
                text = font.render(
                    f"Frame: {self.frame_count}/{self.max_frames}", True, (255, 255, 255))
                self.screen.blit(text, (10, 10))

                # Show sphere info
                sphere_pos = self.sphere[0].position
                sphere_vel = self.sphere[0].velocity
                info_text = f"Sphere: pos({sphere_pos.x:.1f}, {sphere_pos.y:.1f}) vel({sphere_vel.x:.1f}, {sphere_vel.y:.1f})"
                info_surface = font.render(info_text, True, (255, 255, 255))
                self.screen.blit(info_surface, (10, 50))

                pygame.display.flip()
                self.clock.tick(60)

            self.frame_count += 1

            # Reset sphere periodically for varied interactions
            if self.frame_count % 200 == 0:
                self.reset_sphere()

        end_time = time.time()
        print(f"Simulation completed in {end_time - start_time:.2f} seconds")
        print(f"Collected {len(self.node_positions_history)} frames of data")

        if visualize:
            pygame.quit()

    def get_simulation_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Get collected simulation data as numpy arrays"""
        nodes_data = np.array(self.node_positions_history)
        sphere_data = np.array(self.sphere_positions_history)
        return nodes_data, sphere_data

    def perform_pca_analysis(self, variance_threshold=0.95, save_results=True, filename_prefix="stable_soft_body"):
        """Perform PCA analysis on collected data and optionally save results"""
        if not self.node_positions_history:
            print("No data collected. Run simulation first.")
            return None, None

        nodes_data, sphere_data = self.get_simulation_data()

        print(f"Performing PCA analysis on {nodes_data.shape[0]} frames")
        print(f"Soft body data shape: {nodes_data.shape}")
        print(f"Sphere data shape: {sphere_data.shape}")

        # PCA for soft body nodes
        pca_nodes = PCA(n_components=NUM_PCA_NODES)
        nodes_transformed = pca_nodes.fit_transform(nodes_data)

        # Use predefined number of components from params
        n_components_nodes = NUM_PCA_NODES

        # PCA for sphere
        pca_sphere = PCA(n_components=NUM_PCA_SPHERE)
        sphere_transformed = pca_sphere.fit_transform(sphere_data)

        # Use predefined number of components from params
        n_components_sphere = NUM_PCA_SPHERE

        # Calculate cumulative variance for plotting
        cum_var_nodes = np.cumsum(pca_nodes.explained_variance_ratio_)
        cum_var_sphere = np.cumsum(pca_sphere.explained_variance_ratio_)

        # Plot variance explained
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

        # Soft body PCA plot
        ax1.plot(range(1, len(cum_var_nodes) + 1), cum_var_nodes, 'bo-')
        ax1.axvline(x=n_components_nodes, color='g', linestyle='--',
                    label=f'n_components = {n_components_nodes} (from params)')
        ax1.set_xlabel('Number of Components')
        ax1.set_ylabel('Cumulative Explained Variance')
        ax1.set_title('PCA - Soft Body Nodes')
        ax1.grid(True)
        ax1.legend()

        # Sphere PCA plot
        ax2.plot(range(1, len(cum_var_sphere) + 1), cum_var_sphere, 'ro-')
        ax2.axvline(x=n_components_sphere, color='g', linestyle='--',
                    label=f'n_components = {n_components_sphere} (from params)')
        ax2.set_xlabel('Number of Components')
        ax2.set_ylabel('Cumulative Explained Variance')
        ax2.set_title('PCA - Sphere Position')
        ax2.grid(True)
        ax2.legend()

        plt.tight_layout()
        plt.show()

        print(
            f"Using {n_components_nodes} components for soft body (explains {cum_var_nodes[n_components_nodes-1]*100:.1f}% variance)")
        print(
            f"Using {n_components_sphere} components for sphere (explains {cum_var_sphere[n_components_sphere-1]*100:.1f}% variance)")

        # Save PCA results if requested
        if save_results:
            self.save_pca_results(
                nodes_data, pca_nodes, nodes_transformed, n_components_nodes,
                sphere_data, pca_sphere, sphere_transformed, n_components_sphere,
                filename_prefix
            )

        return (pca_nodes, nodes_transformed), (pca_sphere, sphere_transformed)

    def save_data(self, filename_prefix="soft_body_simulation"):
        """Save simulation data to CSV files"""
        if not self.node_positions_history:
            print("No data to save. Run simulation first.")
            return

        nodes_data, sphere_data = self.get_simulation_data()

        # Save nodes data
        nodes_filename = f"{filename_prefix}_nodes.csv"
        np.savetxt(nodes_filename, nodes_data, delimiter=',',
                   header=f"Soft body node positions - {nodes_data.shape[0]} frames, {nodes_data.shape[1]} features")

        # Save sphere data
        sphere_filename = f"{filename_prefix}_sphere.csv"
        np.savetxt(sphere_filename, sphere_data, delimiter=',',
                   header=f"Sphere positions - {sphere_data.shape[0]} frames, {sphere_data.shape[1]} features")

        print(f"Data saved to {nodes_filename} and {sphere_filename}")

    def save_pca_results(self, nodes_data, pca_nodes, nodes_transformed, n_components_nodes,
                         sphere_data, pca_sphere, sphere_transformed, n_components_sphere,
                         filename_prefix="assets/info/subspace_neural_physics/"):
        """Save PCA results including nodes, transform, mean, min, and max"""
        print("Saving PCA results...")

        # Process nodes PCA data
        nodes_z_min = np.min(nodes_transformed, axis=0)
        nodes_z_max = np.max(nodes_transformed, axis=0)

        # Normalize nodes PCA data
        denominator_nodes = nodes_z_max - nodes_z_min
        denominator_nodes[denominator_nodes ==
                          0] = 1e-6  # Avoid division by zero
        nodes_z_normalized = (nodes_transformed -
                              nodes_z_min) / denominator_nodes

        # Process sphere PCA data
        sphere_z_min = np.min(sphere_transformed, axis=0)
        sphere_z_max = np.max(sphere_transformed, axis=0)

        # Normalize sphere PCA data
        denominator_sphere = sphere_z_max - sphere_z_min
        denominator_sphere[denominator_sphere ==
                           0] = 1e-6  # Avoid division by zero
        sphere_z_normalized = (sphere_transformed -
                               sphere_z_min) / denominator_sphere

        # Save nodes PCA data
        np.save(f"{filename_prefix}nodes_pca.npy", nodes_z_normalized)
        np.save(f"{filename_prefix}nodes_min.npy", nodes_z_min)
        np.save(f"{filename_prefix}nodes_max.npy", nodes_z_max)
        np.save(f"{filename_prefix}nodes_pca_transform.npy",
                pca_nodes.components_.T)
        np.save(f"{filename_prefix}nodes_pca_mean.npy", pca_nodes.mean_)

        # Save sphere PCA data
        np.save(f"{filename_prefix}sphere_pca.npy", sphere_z_normalized)
        np.save(f"{filename_prefix}sphere_min.npy", sphere_z_min)
        np.save(f"{filename_prefix}sphere_max.npy", sphere_z_max)
        np.save(f"{filename_prefix}sphere_pca_transform.npy",
                pca_sphere.components_.T)
        np.save(f"{filename_prefix}sphere_pca_mean.npy", pca_sphere.mean_)

        # Save original data as well
        np.save(f"{filename_prefix}nodes_pos.npy", nodes_data)
        np.save(f"{filename_prefix}sphere_pos.npy", sphere_data)

        print(f"PCA results saved with prefix: {filename_prefix}")
        print(
            f"Nodes: {n_components_nodes} components, shape: {nodes_z_normalized.shape}")
        print(
            f"Sphere: {n_components_sphere} components, shape: {sphere_z_normalized.shape}")

        # Estimate alpha and beta for nodes PCA components (similar to data_generator)
        alpha_nodes, beta_nodes = self._estimate_alpha_beta(
            nodes_z_normalized, n_components_nodes)
        np.save(f"{filename_prefix}nodes_alpha.npy", alpha_nodes)
        np.save(f"{filename_prefix}nodes_beta.npy", beta_nodes)

        print(f"Alpha and beta coefficients saved for nodes PCA components")

    def _estimate_alpha_beta(self, z, num_pca_x):
        """Estimate alpha and beta coefficients for PCA components (from data_generator)"""
        alpha = np.zeros(num_pca_x)
        beta = np.zeros(num_pca_x)

        for i in range(num_pca_x):
            rows = z.shape[0]
            cur_z = z[:, i]
            b = cur_z[2:rows]
            A = np.zeros([rows-2, 2])
            A[:, 0] = cur_z[1:rows-1]
            A[:, 1] = cur_z[1:rows-1] - cur_z[0:rows-2]
            res = np.linalg.lstsq(A, b, rcond=None)
            alpha[i] = res[0][0]
            beta[i] = res[0][1]
        return alpha, beta


def main():
    """Main function to run the simulation"""
    # Create simulation
    sim = SoftBodySimulation(width=1000, height=700)

    # Run simulation with visualization and data collection
    sim.run_simulation(visualize=True, collect_data=True)

    # Perform PCA analysis and save results
    pca_results = sim.perform_pca_analysis(
        variance_threshold=0.95, save_results=True, filename_prefix=DIRECTORY)

    # Save raw data
    sim.save_data("stable_soft_body_data")

    print("Simulation completed successfully!")
    print("PCA results saved including nodes, transform, mean, min, max, alpha, and beta coefficients")


if __name__ == "__main__":
    main()
