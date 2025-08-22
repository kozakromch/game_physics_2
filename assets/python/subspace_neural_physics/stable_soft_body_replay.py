
import numpy as np
import pygame
import sys
from params import *
from data_paths import *
import mlp_model
import torch


def world_to_screen(pos, scale, win_w, win_h):
    """Convert world coordinates to screen coordinates for stable simulation"""
    x, y = pos
    # For stable simulation, coordinates are already in pixel space
    # Just need to offset to center them in the window
    sx = int(x - 400 + win_w // 2)  # Offset to center
    sy = int(y - 300 + win_h // 2)  # Offset to center
    return sx, sy


def get_particles_from_frame(frame_data, soft_body_width, soft_body_height):
    """Get particle positions from frame data for stable soft body simulation"""
    particles = []
    idx = 0
    for y in range(soft_body_height):
        row = []
        for x in range(soft_body_width):
            px = frame_data[idx]
            py = frame_data[idx+1]
            row.append((px, py))
            idx += 2
        particles.append(row)
    return particles


def main():
    """Main replay function"""
    # --- Pygame visualization ---
    pygame.init()
    screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
    pygame.display.set_caption(
        "Stable Soft Body Linear Model Simulation (pygame)")
    clock = pygame.time.Clock()

    num_pca_x = NUM_PCA_NODES
    num_pca_y = NUM_PCA_SPHERE

    # Load PCA data
    try:
        alpha = np.load(STABLE_NODES_ALPHA)
        beta = np.load(STABLE_NODES_BETA)

        z_normalized = np.load(STABLE_NODES_PCA)
        nodes_max = np.load(STABLE_NODES_MAX)
        nodes_min = np.load(STABLE_NODES_MIN)
        nodes_transform = np.load(STABLE_NODES_PCA_TRANSFORM)
        nodes_mean = np.load(STABLE_NODES_PCA_MEAN)

        w = np.load(STABLE_SPHERE_PCA)
        sphere_max = np.load(STABLE_SPHERE_MAX)
        sphere_min = np.load(STABLE_SPHERE_MIN)
        sphere_transform = np.load(STABLE_SPHERE_PCA_TRANSFORM)
        sphere_mean = np.load(STABLE_SPHERE_PCA_MEAN)
    except FileNotFoundError as e:
        print(f"Error loading data files: {e}")
        print("Please run stable_soft_body_simulation.py first to generate the data files.")
        return

    # Set up device and model
    device = torch.device(
        "mps" if torch.backends.mps.is_available() else "cpu")

    model = mlp_model.MLPModel(num_pca_x, num_pca_x * 2 + num_pca_y * 2).to(device)

    checkpoint_path = "SavedModel/20_checkpoint_epoch_55.pt"
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    print(f"Loaded model checkpoint: {checkpoint_path}")
    # Initialize simulation
    z_1 = z_normalized[1, :].copy()
    z_0 = z_normalized[0, :].copy()

    frame = 2
    model.eval()
    running = True

    print("Controls:")
    print("- ESC: Quit")
    print("- Red particles: Neural network prediction")
    print("- Green particles: Ground truth")
    print("- Blue particles: Linear simulation")
    print("- Light blue circle: Sphere")

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

        # Reset simulation periodically
        # if (frame % 300) == 0:
        #     z_0 = z_normalized[frame - 2, :].copy()
        #     z_1 = z_normalized[frame - 1, :].copy()

        # Prepare model inputs
        z_0_tensor = torch.tensor(z_0, dtype=torch.float32).to(device)
        z_1_tensor = torch.tensor(z_1, dtype=torch.float32).to(device)
        w_tensor_0 = torch.tensor(w[frame - 1, :], dtype=torch.float32).to(device)
        w_tensor_1 = torch.tensor(w[frame, :], dtype=torch.float32).to(device)


        # Neural network prediction
        model_input = torch.cat(
            [z_0_tensor, z_1_tensor, w_tensor_0, w_tensor_1], dim=0).unsqueeze(0)

        with torch.no_grad():
            prediction_norm = model(model_input).squeeze(0).cpu().numpy()

        # Unnormalize and recover world coordinates
        prediction_pca = prediction_norm * (nodes_max - nodes_min) + nodes_min
        ground_tr = z_normalized[frame, :] * \
            (nodes_max - nodes_min) + nodes_min

        x_recovery_1 = np.matmul(
            prediction_pca, nodes_transform.T) + nodes_mean  # Prediction
        x_recovery_2 = np.matmul(
            ground_tr, nodes_transform.T) + nodes_mean      # Ground truth
#  calculate mean abs error
        mean_abs_error = np.mean(np.abs(x_recovery_1 - x_recovery_2))
        print(f"Frame {frame}, Mean Abs Error: {mean_abs_error:.4f}")
        # Correct sphere PCA unnormalization
        sphere_pca = w[frame, :] * (sphere_max - sphere_min) + sphere_min
        sphere_recovery = np.matmul(
            sphere_pca, sphere_transform.T) + sphere_mean

        # Convert to particle grid format
        particles_1 = get_particles_from_frame(
            x_recovery_1, SOFT_BODY_WIDTH, SOFT_BODY_HEIGHT)
        particles_2 = get_particles_from_frame(
            x_recovery_2, SOFT_BODY_WIDTH, SOFT_BODY_HEIGHT)

        # Update for next step
        z_0 = z_1.copy()
        z_1 = prediction_norm.copy()

        frame += 1
        if frame >= len(w):
            frame = 0

        # Render
        screen.fill(BG_COLOR)

        # Draw spring connections for prediction (red)
        for y in range(SOFT_BODY_HEIGHT):
            for x in range(SOFT_BODY_WIDTH):
                pos = world_to_screen(
                    particles_1[y][x], 1, WINDOW_WIDTH, WINDOW_HEIGHT)
                # Right neighbor
                if x < SOFT_BODY_WIDTH - 1:
                    npos = world_to_screen(
                        particles_1[y][x+1], 1, WINDOW_WIDTH, WINDOW_HEIGHT)
                    pygame.draw.line(screen, SPRING_COLOR, pos, npos, 1)
                # Bottom neighbor
                if y < SOFT_BODY_HEIGHT - 1:
                    npos = world_to_screen(
                        particles_1[y+1][x], 1, WINDOW_WIDTH, WINDOW_HEIGHT)
                    pygame.draw.line(screen, SPRING_COLOR, pos, npos, 1)

        # Draw particles
        particle_radius = 5  # Fixed radius for display

        # Red -- Neural network prediction
        for row in particles_1:
            for px, py in row:
                sx, sy = world_to_screen(
                    (px, py), 1, WINDOW_WIDTH, WINDOW_HEIGHT)
                pygame.draw.circle(screen, (200, 30, 30),
                                   (sx, sy), particle_radius)

        # Green -- Ground truth
        # for row in particles_2:
        #     for px, py in row:
        #         sx, sy = world_to_screen(
        #             (px, py), 1, WINDOW_WIDTH, WINDOW_HEIGHT)
        #         pygame.draw.circle(screen, (30, 200, 30),
        #                            (sx, sy), particle_radius)

        # Draw sphere
        cx, cy = sphere_recovery[0], sphere_recovery[1]
        sx, sy = world_to_screen((cx, cy), 1, WINDOW_WIDTH, WINDOW_HEIGHT)
        sphere_display_radius = 15  # Fixed radius for display
        pygame.draw.circle(screen, (100, 100, 255), (sx, sy),
                           sphere_display_radius)  # Fill color
        pygame.draw.circle(screen, (0, 0, 200), (sx, sy),
                           sphere_display_radius, 2)  # Outline

        pygame.display.flip()
        clock.tick(FPS * 2)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
