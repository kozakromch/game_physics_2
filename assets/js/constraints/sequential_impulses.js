import color_scheme from "../../js/common/color_scheme.min.js";

class Pendulum {
    constructor(x, y, length) {
        this.anchor = { x, y }; // Точка подвеса
        this.position = { x: x + length, y }; // Начальная позиция точки
        this.velocity = { x: 0, y: 0 };
        this.length = length;
        this.gravity = 9.81;
        this.dt = 0.016; // Шаг интеграции (примерно 60 Гц)
    }

    applyGravity() {
        this.velocity.y += this.gravity * this.dt;
    }

    satisfyConstraint() {
        let dx = this.position.x - this.anchor.x;
        let dy = this.position.y - this.anchor.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

    //    { let diff = (dist - this.length) / dist;
    //     // Исправляем положение
    //     this.position.x -= dx * diff;
    //     this.position.y -= dy * diff;}

        // Исправляем скорость
        let velDot = (this.velocity.x * dx + this.velocity.y * dy) / dist;
        this.velocity.x -= velDot * dx / dist;
        this.velocity.y -= velDot * dy / dist;
    }

    update() {
        this.applyGravity();
        this.position.x += this.velocity.x * this.dt;
        this.position.y += this.velocity.y * this.dt;
        this.satisfyConstraint();
    }
}
