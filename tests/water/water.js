const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const shapeSelector = document.getElementById('shapeSelector');

const gpu = new GPU.GPU();

const width = 500;
const height = 500;

// Initialize water data
let water = new Array(width).fill(0).map(() => new Array(height).fill(0));
let velocity = new Array(width).fill(0).map(() => new Array(height).fill(0));
const viscosity = 0.1;
const updateWater = gpu.createKernel(function(water, velocity, width, height, shape) {
    const x = this.thread.x;
    const y = this.thread.y;

    if (shape === 0) { // Square
        if (x > width / 4 && x < 3 * width / 4 && y > height / 4 && y < 3 * height / 4) {
            const avg = (water[x-1][y] + water[x+1][y] + water[x][y-1] + water[x][y+1]) / 4;
            return avg + velocity[x][y];
        }
    } else if (shape === 1) { // Ellipse
        const centerX = width / 2;
        const centerY = height / 2;
        const a = width / 4;
        const b = height / 4;
        if ((Math.pow(x - centerX, 2) / Math.pow(a, 2) + Math.pow(y - centerY, 2) / Math.pow(b, 2)) < 1) {
            const avg = (water[x-1][y] + water[x+1][y] + water[x][y-1] + water[x][y+1]) / 4;
            return avg + velocity[x][y];
        }
    }
    return water[x][y];
}).setOutput([width, height]);
const updateVelocity = gpu.createKernel(function(water, velocity, width, height, shape, viscosity) {
    const x = this.thread.x;
    const y = this.thread.y;

    let newVelocity = 0;
    if (shape === 0) { // Square
        if (x > width / 4 && x < 3 * width / 4 && y > height / 4 && y < 3 * height / 4) {
            newVelocity = (water[x-1][y] + water[x+1][y] + water[x][y-1] + water[x][y+1]) / 4 - water[x][y];
        }
    } else if (shape === 1) { // Ellipse
        const centerX = width / 2;
        const centerY = height / 2;
        const a = width / 4;
        const b = height / 4;
        if ((Math.pow(x - centerX, 2) / Math.pow(a, 2) + Math.pow(y - centerY, 2) / Math.pow(b, 2)) < 1) {
            newVelocity = (water[x-1][y] + water[x+1][y] + water[x][y-1] + water[x][y+1]) / 4 - water[x][y];
        }
    }

    // Apply viscosity
    if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        newVelocity += viscosity * (velocity[x-1][y] + velocity[x+1][y] + velocity[x][y-1] + velocity[x][y+1] - 4 * velocity[x][y]);
    }

    return newVelocity;
}).setOutput([width, height]);

function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const value = velocity[x][y];
            ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    const shape = shapeSelector.value === 'square' ? 0 : 1;
    water = updateWater(water, velocity, width, height, shape);
    velocity = updateVelocity(water, velocity, width, height, shape, viscosity);

    requestAnimationFrame(draw);
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x >= 0 && x < width && y >= 0 && y < height) {
        const shape = shapeSelector.value === 'square' ? 0 : 1;
        for (let i = -5; i <= 5; i++) {
            for (let j = -5; j <= 5; j++) {
                if (x + i >= 0 && x + i < width && y + j >= 0 && y + j < height) {
                    if (shape === 0 && (x + i > width / 4 && x + i < 3 * width / 4 && y + j > height / 4 && y + j < 3 * height / 4)) {
                        velocity[x + i][y + j] += 10;
                    } else if (shape === 1) {
                        const centerX = width / 2;
                        const centerY = height / 2;
                        const a = width / 4;
                        const b = height / 4;
                        if ((Math.pow((x + i) - centerX, 2) / Math.pow(a, 2) + Math.pow((y + j) - centerY, 2) / Math.pow(b, 2)) < 1) {
                            velocity[x + i][y + j] += 10;
                        }
                    }
                }
            }
        }
    }
});

shapeSelector.addEventListener('change', () => {
    // Reset water and velocity when shape changes
    water = new Array(width).fill(0).map(() => new Array(height).fill(0));
    velocity = new Array(width).fill(0).map(() => new Array(height).fill(0));
});

draw();
