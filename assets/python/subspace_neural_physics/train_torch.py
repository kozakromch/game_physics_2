# %% Imports and Device Setup
from data_paths import *
from params import *
import torch
import torch.optim as optim
import numpy as np
import os
import mlp_model
import random

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# %% Parameters
EPOCHS = 100
batch_size = 400
max_window_size = 5
delta_t = 1
noise_scale = 0.0
print(f"Batch size: {batch_size}, Max window size: {max_window_size}, Noise scale: {noise_scale}")
# %% Data Loading and Normalization
z_path = STABLE_NODES_PCA
w_path = SPHERE_PCA
w_mean_path = SPHERE_PCA_MEAN

num_pca_x = NUM_PCA_NODES
num_pca_y = NUM_PCA_SPHERE

all_z = np.load(z_path)
all_w = np.load(w_path)


# print minimum and maximum values
print(f"Z PCA min: {np.min(all_z)}, max: {np.max(all_z)}")
print(f"W PCA min: {np.min(all_w)}, max: {np.max(all_w)}")

# alpha = torch.tensor(np.load(alpha_path), dtype=torch.float32, device=device)
# beta = torch.tensor(np.load(beta_path), dtype=torch.float32, device=device)
nodes_min = torch.tensor(np.load(STABLE_NODES_MIN),
                         dtype=torch.float32, device=device)
nodes_max = torch.tensor(np.load(STABLE_NODES_MAX),
                         dtype=torch.float32, device=device)


z_train = torch.tensor(all_z, dtype=torch.float32, device=device)
w_train = torch.tensor(all_w, dtype=torch.float32, device=device)
nodes_transform = torch.tensor(
    np.load(STABLE_NODES_PCA_TRANSFORM), dtype=torch.float32, device=device)
nodes_mean = torch.tensor(np.load(STABLE_NODES_PCA_MEAN),
                          dtype=torch.float32, device=device)

model = mlp_model.MLPModel(num_pca_x, num_pca_x * 2 + num_pca_y * 2).to(device)
optimizer = optim.Adam(model.parameters(), lr=0.001, betas=(0.9, 0.999))
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=30, gamma=0.8)

# %% Model Checkpoint Loading
checkpoint_dir = "SavedModel"
os.makedirs(checkpoint_dir, exist_ok=True)
last_epoch = 0
latest_checkpoint = None
checkpoints = [f for f in os.listdir(checkpoint_dir) if f.startswith(
    NN_NAME) and f.endswith(".pt")]
if checkpoints:
    checkpoints.sort(key=lambda x: int(x.split("_")[-1].split(".")[0]))
    latest_checkpoint = os.path.join(checkpoint_dir, checkpoints[-1])

if latest_checkpoint:
    print(f"Loading checkpoint: {latest_checkpoint}")
    model.load_state_dict(torch.load(latest_checkpoint))
    last_epoch = int(latest_checkpoint.split("_")[-1].split(".")[0])
    print(f"Resuming training from epoch {last_epoch}")

# %% Sample and Batch Construction


def construct_sample(input_z, input_w, idx=None, current_epoch=0, total_epochs=100):
    window_size = max_window_size
    if idx + window_size > len(input_z) or idx + window_size > len(input_w):
        return None

    z0 = input_z[idx] + torch.randn_like(input_z[idx]) * noise_scale
    z1 = input_z[idx + 1] + torch.randn_like(input_z[idx + 1]) * noise_scale
    truths, predicts = [], []

    current_z0 = z0
    current_z1 = z1

    for k in range(2, window_size):

        model_input = torch.cat(
            [current_z0, current_z1, input_w[idx + k - 1], input_w[idx + k]]).unsqueeze(0)
        prediction = model(model_input).squeeze(0)

        truths.append(input_z[idx + k])
        predicts.append(prediction)

        current_z0 = current_z1
        current_z1 = prediction

    if not truths:
        return None

    return (
        torch.stack(truths),
        torch.stack(predicts)
    )


def construct_batch(z_input, w_input, current_epoch=0, total_epochs=100):
    truths, predicts = [], []
    for _ in range(batch_size):
        random_idx = random.randint(0, len(z_input) - max_window_size)
        sample = construct_sample(
            z_input, w_input, random_idx, current_epoch, total_epochs)
        if sample is not None:
            t, p = sample
            truths.append(t)
            predicts.append(p)

    if truths and predicts:
        truths_tensor = torch.stack(truths)
        predicts_tensor = torch.stack(predicts)
        return (
            truths_tensor.to(device),
            predicts_tensor.to(device)
        )
    else:
        return None


def loss_fn(pred, truth):
    # pred, truth: [batch, window, num_pca_x]
    # Unnormalize and recover world coordinates
    pred_pca = pred * (nodes_max - nodes_min) + \
        nodes_min  # [batch, window, num_pca_x]
    truth_pca = truth * (nodes_max - nodes_min) + nodes_min

    # nodes_transform: [num_pca_x, num_nodes]
    # nodes_mean: [num_nodes]
    # We want: [batch, window, num_nodes]
    pred_recovery = torch.matmul(pred_pca, nodes_transform.T) + nodes_mean
    truth_recovery = torch.matmul(truth_pca, nodes_transform.T) + nodes_mean

    # Position loss
    loss_poss = torch.mean(torch.abs(pred_recovery - truth_recovery))

    # Velocity loss (difference along window axis)
    pred_vel = (pred_recovery[:, 1:] - pred_recovery[:, :-1]) / delta_t
    truth_vel = (truth_recovery[:, 1:] - truth_recovery[:, :-1]) / delta_t
    loss_vel = torch.mean(torch.abs(pred_vel - truth_vel))

    total_loss = loss_poss + loss_vel
    return total_loss


    # %% Training Loop
z_rows = z_train.shape[0]
model.train()
print(z_train.shape)
model.train()
for epoch in range(last_epoch, EPOCHS):
    print(f"\nEpoch {epoch+1}/{EPOCHS}")
    step = 0
    mean_loss = 0.0
    initial_state_dict = model.state_dict()  # Save initial model state

    for i in range(0, 10000):
        optimizer.zero_grad()
        batch = construct_batch(z_train, w_train, epoch, EPOCHS)
        if batch is None:
            continue

        truths, predicts = batch
        loss = loss_fn(predicts, truths)

        loss.backward()
        optimizer.step()
        mean_loss += loss.item()
        step += 1
        if step % 100 == 0:
            print(f"Step {step}, Loss: {loss.item():.8f}")
    mean_loss /= step if step > 0 else 1
    print(f"Epoch {epoch+1} completed. Mean Loss: {mean_loss:.8f}")

    # Step the learning rate scheduler
    scheduler.step()
    current_lr = scheduler.get_last_lr()[0]
    print(f"Learning rate: {current_lr:.6f}")

    print(f"Saving checkpoint for epoch {epoch + 1}")
    checkpoint_path = f"{checkpoint_dir}/{NN_NAME}_{epoch+1}.pt"
    torch.save(model.state_dict(), checkpoint_path)
    print(f"Checkpoint saved at {checkpoint_path}")
