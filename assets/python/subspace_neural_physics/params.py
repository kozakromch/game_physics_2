# Simulation parameters
FPS = 60
TIME_STEP = 1.0 / FPS
VEL_ITERS, POS_ITERS = 8, 3
CLOTH_WIDTH = 8
CLOTH_HEIGHT = 8
MAX_FRAMES = 100000
# Stable soft body simulation parameters
SOFT_BODY_WIDTH = 10  # Number of particles horizontally (matches CLOTH_WIDTH)
SOFT_BODY_HEIGHT = 10  # Number of particles vertically (matches CLOTH_HEIGHT)
PARTICLE_SPACING = 20  # Distance between particles
PARTICLE_MASS = 1.0
PARTICLE_RADIUS = 30

# Spring parameters
SPRING_STIFFNESS = 200.0
SPRING_DAMPING = 10.0
LONG_DIAGONAL_SKIP_DISTANCE = 5  # Number of positions to skip for long diagonal springs
ENABLE_LONG_DISTANCE_SPRINGS = True  # Enable/disable long distance springs

# Sphere parameters
SPHERE_RADIUS = 20
SPHERE_MASS = 10.0

NODE_SPACING = 1.0
NODE_RADIUS = 1.0
FRAMES_SIMULATE = 1000
DIRECTORY = '/Users/romankozak/Documents/work/MIPT/web/game_physics_2/assets/info/subspace_neural_physics/'
SCALE = 20  # pixels per meter
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
BG_COLOR = (30, 30, 30)
SPRING_COLOR = (180, 180, 180)
NODE_COLOR = (50, 200, 255)
SUBSTEPS = 3
SPHERE_SIZE = 3
FRAMES_PER_TARGET = 200
NUM_PCA_NODES = 32  # Number of PCA components for soft body particles
NUM_PCA_SPHERE = 2   # Number of PCA components for sphere
NN_NAME = "20_checkpoint_epoch"

# XPBD parameters
SOFT_BODY_COMPLIANCE = 0.2
XPBD_ITERATIONS = 3
MAX_CORRECTION_PER_ITERATION = 0.1  # Maximum position correction per iteration
POSITION_DAMPING = 0.99  # Damping factor to prevent oscillations
