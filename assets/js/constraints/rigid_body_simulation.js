import color_scheme from "../../js/common/color_scheme.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let rigid_body_sim = {};

class Parameters {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.gravity = math.matrix([0, 9.8]); // гравитация
    this.dt = 1 / 30; // фиксированное время шага
    this.friction = 1.0; // коэффициент трения
    this.restitution = 0.0; // коэффициент упругости (нулевой как требуется)
    this.floor = 400;
    this.width = 800; // ширина окна
    this.height = 600; // высота окна
    this.sub_steps = 4; // подшаги для интеграции
    this.impulse_iterations = 10; // итерации Sequential Impulses
    this.max_history = 1;
    this.baumgarte = 0.2; // коэффициент Баумгартена
  }
}

// Вспомогательные функции для работы с векторами
function getX(v) {
  return v.get([0]);
}

function getY(v) {
  return v.get([1]);
}

function cross2D(a, b) {
  return getX(a) * getY(b) - getY(a) * getX(b);
}

function crossScalar2D(scalar, vec) {
  return math.matrix([-scalar * getY(vec), scalar * getX(vec)]);
}

function crossVec2D(vec, scalar) {
  return math.matrix([scalar * getY(vec), -scalar * getX(vec)]);
}

function dot2D(a, b) {
  return getX(a) * getX(b) + getY(a) * getY(b);
}

function magnitude(v) {
  return Math.sqrt(getX(v) * getX(v) + getY(v) * getY(v));
}

function normalize(v) {
  let mag = magnitude(v);
  if (mag > 0) {
    return math.multiply(v, 1 / mag);
  }
  return math.matrix([0, 0]);
}

// Класс для контактной точки
class ContactPoint {
  constructor(point, normal, bodyA, bodyB, penetration) {
    this.point = point; // точка контакта
    this.normal = normal; // нормаль контакта
    this.bodyA = bodyA; // первое тело
    this.bodyB = bodyB; // второе тело или null для стенки
    this.penetration = penetration; // глубина проникновения

    // Предрасчитанные значения
    this.effectiveMass = 0;
    this.normalImpulse = 0;
    this.tangentImpulse = 0;
    this.relativeVelocity = math.matrix([0, 0]);

    this.computeEffectiveMass();
  }

  computeEffectiveMass() {
    let invMassSum = this.bodyA.invMass;
    let invInertiaSum = 0;

    // Вектор от центра масс до точки контакта для тела A
    let rA = math.subtract(this.point, this.bodyA.position);
    let rAcrossN = cross2D(rA, this.normal);
    invInertiaSum += this.bodyA.invInertia * rAcrossN * rAcrossN;

    if (this.bodyB) {
      invMassSum += this.bodyB.invMass;
      let rB = math.subtract(this.point, this.bodyB.position);
      let rBcrossN = cross2D(rB, this.normal);
      invInertiaSum += this.bodyB.invInertia * rBcrossN * rBcrossN;
    }

    this.effectiveMass = 1.0 / (invMassSum + invInertiaSum);
  }

  getRelativeVelocity() {
    let velA = this.bodyA.velocity;
    let rA = math.subtract(this.point, this.bodyA.position);
    let velAtPointA = math.add(
      velA,
      crossScalar2D(this.bodyA.angularVelocity, rA)
    );
    let relativeVelocity;
    if (this.bodyB) {
      let velB = this.bodyB.velocity;
      let rB = math.subtract(this.point, this.bodyB.position);
      let velAtPointB = math.add(
        velB,
        crossScalar2D(this.bodyB.angularVelocity, rB)
      );
      relativeVelocity = math.subtract(velAtPointA, velAtPointB);
    } else {
      relativeVelocity = velAtPointA;
    }
    return relativeVelocity;
  }
  updateRelativeVelocity() {
    this.relativeVelocity = this.getRelativeVelocity();
  }
}

// Класс для твердого тела
class RigidBody {
  constructor(vertices, mass, x, y, angle = 0) {
    this.vertices = vertices; // локальные координаты вершин
    this.mass = mass;
    this.invMass = mass > 0 ? 1 / mass : 0;

    // Вычисление момента инерции для многоугольника
    this.inertia = this.computeInertia();
    this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0;

    // Позиция и ориентация
    this.position = math.matrix([x, y]);
    this.angle = angle;

    // Скорости
    this.velocity = math.matrix([0, 0]);
    this.angularVelocity = 0;

    // Внешнее ускорение (гравитация)
    this.externalAcceleration = math.matrix([0, 0]);

    // История для визуализации траектории
    this.history = [];
  }

  computeInertia() {
    // Упрощенный расчет момента инерции для многоугольника
    let area = 0;
    let inertia = 0;
    let n = this.vertices.length;

    for (let i = 0; i < n; i++) {
      let v1 = this.vertices[i];
      let v2 = this.vertices[(i + 1) % n];

      let cross = v1.x * v2.y - v2.x * v1.y;
      area += cross;

      let dot11 = v1.x * v1.x + v1.y * v1.y;
      let dot12 = v1.x * v2.x + v1.y * v2.y;
      let dot22 = v2.x * v2.x + v2.y * v2.y;

      inertia += cross * (dot11 + dot12 + dot22);
    }

    area *= 0.5;
    inertia = Math.abs(inertia) / 12.0;

    return (this.mass * inertia) / Math.abs(area);
  }

  // Получение мировых координат вершин
  getWorldVertices() {
    let worldVertices = [];
    let cos_a = Math.cos(this.angle);
    let sin_a = Math.sin(this.angle);

    for (let vertex of this.vertices) {
      let x = vertex.x * cos_a - vertex.y * sin_a + getX(this.position);
      let y = vertex.x * sin_a + vertex.y * cos_a + getY(this.position);
      worldVertices.push({ x: x, y: y });
    }

    return worldVertices;
  }

  // Применение импульса
  applyImpulse(impulse, contactPoint) {
    if (this.invMass === 0) return;

    this.velocity = math.add(
      this.velocity,
      math.multiply(impulse, this.invMass)
    );

    let r = math.subtract(contactPoint, this.position);
    let angularImpulse = cross2D(r, impulse);
    this.angularVelocity += angularImpulse * this.invInertia;
  }

  // Интеграция позиции
  integrate(dt) {
    if (this.invMass === 0) return;

    // Интегрируем ускорения в скорости
    this.velocity = math.add(
      this.velocity,
      math.multiply(this.externalAcceleration, dt)
    );

    // Интегрируем скорости в позиции
    this.position = math.add(this.position, math.multiply(this.velocity, dt));
    this.angle += this.angularVelocity * dt;
  }

  collectHistory() {
    this.history.push([getX(this.position), getY(this.position)]);
    if (this.history.length > 500) {
      this.history.shift();
    }
  }
}

// Создание предустановленных форм
function createRectangle(width, height, mass, x, y, angle = 0) {
  let vertices = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];
  return new RigidBody(vertices, mass, x, y, angle);
}

function createTriangle(size, mass, x, y, angle = 0) {
  let vertices = [
    { x: 0, y: -size / 2 },
    { x: size / 2, y: size / 2 },
    { x: -size / 2, y: size / 2 },
  ];
  return new RigidBody(vertices, mass, x, y, angle);
}

// Система физики
class System {
  constructor() {
    this.P = new Parameters();
    this.bodies = [];
    this.contacts = [];
    this.initializeSystem();
  }

  reset() {
    this.initializeSystem();
  }

  initializeSystem() {
    this.bodies = [];

    // // Создаем 4 тела: 2 прямоугольника и 2 треугольника с разными позициями
    // this.bodies.push(createRectangle(40, 60, 1, 150, 50, 0.2));
    // this.bodies.push(createRectangle(50, 40, 1.5, 350, 80, -0.3));
    // this.bodies.push(createTriangle(60, 1, 250, 60, 0.5));
    // this.bodies.push(createTriangle(50, 1.2, 450, 90, -0.7));

    // // Добавляем небольшую начальную скорость для интереса
    // this.bodies[0].velocity = math.matrix([20, 0]);
    // this.bodies[1].velocity = math.matrix([-15, 10]);
    // this.bodies[2].velocity = math.matrix([10, -5]);
    // this.bodies[3].velocity = math.matrix([-25, 5]);

    // создаем пирамидку из кубиков. Внизу самый большой и выше меньше
    let offset_x = this.P.width / 2;
    let offset_y = this.P.height * 0.9;
    for (let i = 0; i < 10; i++) {
      let width = 80 - i * 8;
      let height = 20 - i;
      offset_y -= (height + 5);
      this.bodies.push(
        createRectangle(
          width,
          height,
          1,
          offset_x,
          offset_y,
          0
        )
      );
      this.bodies[i].velocity = math.matrix([0, 0]);
    }

    // Устанавливаем гравитацию для всех тел
    for (let body of this.bodies) {
      body.externalAcceleration = this.P.gravity;
    }
  }

  calcSystem() {
    for (let i = 0; i < this.P.sub_steps; i++) {
      this.step(this.P.dt / this.P.sub_steps);
    }
  }

  step(dt) {
    // 1. Интегрируем ускорения в скорости
    for (let body of this.bodies) {
      if (body.invMass > 0) {
        body.velocity = math.add(
          body.velocity,
          math.multiply(body.externalAcceleration, dt)
        );
      }
    }

    // 2. Обнаружение коллизий
    this.contacts = [];
    this.detectCollisions();

    // 3. Sequential Impulses
    for (let iter = 0; iter < this.P.impulse_iterations; iter++) {
      this.solveImpulses(false);
    }

    // 4. Интеграция скоростей в позиции
    for (let body of this.bodies) {
      body.integrate(dt);
      //   body.collectHistory();
    }
    // for (let iter = 0; iter < this.P.impulse_iterations; iter++) {
    //   this.solveImpulses(false);
    // }
  }

  detectCollisions() {
    // Коллизии между телами
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        this.checkBodyCollision(this.bodies[i], this.bodies[j]);
      }
    }

    // Коллизии со стенками
    for (let body of this.bodies) {
      this.checkWallCollisions(body);
    }
  }

  checkBodyCollision(bodyA, bodyB) {
    let verticesA = bodyA.getWorldVertices();
    let verticesB = bodyB.getWorldVertices();

    // Проверяем вершины A против ребер B
    this.checkVerticesAgainstPolygon(bodyA, bodyB, verticesA, verticesB);
    // Проверяем вершины B против ребер A
    this.checkVerticesAgainstPolygon(bodyB, bodyA, verticesB, verticesA);
  }

  checkVerticesAgainstPolygon(bodyA, bodyB, verticesA, verticesB) {
    for (let vertex of verticesA) {
      if (this.pointInPolygon(vertex, verticesB)) {
        // Находим ближайшее ребро
        let closestEdge = this.findClosestEdge(vertex, verticesB);
        if (closestEdge) {
          let contact = new ContactPoint(
            math.matrix([vertex.x, vertex.y]),
            math.multiply(closestEdge.normal, -1),
            bodyA,
            bodyB,
            closestEdge.distance
          );
          this.contacts.push(contact);
        }
      }
    }
  }

  pointInPolygon(point, vertices) {
    let inside = false;
    let j = vertices.length - 1;

    for (let i = 0; i < vertices.length; i++) {
      if (
        vertices[i].y > point.y !== vertices[j].y > point.y &&
        point.x <
          ((vertices[j].x - vertices[i].x) * (point.y - vertices[i].y)) /
            (vertices[j].y - vertices[i].y) +
            vertices[i].x
      ) {
        inside = !inside;
      }
      j = i;
    }
    return inside;
  }

  // Находит тело под курсором мыши
  getBodyAtPoint(x, y) {
    let point = { x: x, y: y };

    // Проверяем все тела от последнего к первому (сверху вниз)
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      let body = this.bodies[i];
      let vertices = body.getWorldVertices();

      if (this.pointInPolygon(point, vertices)) {
        return body;
      }
    }
    return null;
  }

  findClosestEdge(point, vertices) {
    let minDist = Infinity;
    let closestEdge = null;

    for (let i = 0; i < vertices.length; i++) {
      let edge1 = vertices[i];
      let edge2 = vertices[(i + 1) % vertices.length];

      // Вектор ребра
      let edgeVec = { x: edge2.x - edge1.x, y: edge2.y - edge1.y };
      let edgeLength = Math.sqrt(edgeVec.x * edgeVec.x + edgeVec.y * edgeVec.y);

      if (edgeLength === 0) continue;

      // Нормаль к ребру (внутрь многоугольника)
      let normal = math.matrix([
        -edgeVec.y / edgeLength,
        edgeVec.x / edgeLength,
      ]);

      // Вектор от первой вершины ребра к точке
      let toPoint = { x: point.x - edge1.x, y: point.y - edge1.y };

      // Расстояние до ребра
      let distance = toPoint.x * getX(normal) + toPoint.y * getY(normal);

      if (Math.abs(distance) < minDist) {
        minDist = Math.abs(distance);
        closestEdge = {
          normal: distance > 0 ? normal : math.multiply(normal, -1),
          distance: Math.abs(distance),
        };
      }
    }

    return closestEdge;
  }

  checkWallCollisions(body) {
    let vertices = body.getWorldVertices();

    for (let vertex of vertices) {
      // Пол
      if (vertex.y > this.P.floor) {
        let contact = new ContactPoint(
          math.matrix([vertex.x, this.P.floor]),
          math.matrix([0, -1]),
          body,
          null,
          vertex.y - this.P.floor
        );
        this.contacts.push(contact);
      }

      // Левая стенка
      if (vertex.x < 0) {
        let contact = new ContactPoint(
          math.matrix([0, vertex.y]),
          math.matrix([1, 0]),
          body,
          null,
          -vertex.x
        );
        this.contacts.push(contact);
      }

      // Правая стенка
      if (vertex.x > this.P.width) {
        let contact = new ContactPoint(
          math.matrix([this.P.width, vertex.y]),
          math.matrix([-1, 0]),
          body,
          null,
          vertex.x - this.P.width
        );
        this.contacts.push(contact);
      }

      // Потолок
      if (vertex.y < 0) {
        let contact = new ContactPoint(
          math.matrix([vertex.x, 0]),
          math.matrix([0, 1]),
          body,
          null,
          -vertex.y
        );
        this.contacts.push(contact);
      }
    }
  }

  solveImpulses(withBaumgarte) {
    for (let contact of this.contacts) {
      let relativeVelocity = contact.getRelativeVelocity();

      // Импульс по нормали
      let relativeNormalVelocity = dot2D(relativeVelocity, contact.normal);
      let deltaVelocity = -(1 + this.P.restitution) * relativeNormalVelocity;
      let impulseAmount = deltaVelocity * contact.effectiveMass;
      if (withBaumgarte) {
        impulseAmount +=
          (contact.penetration * this.P.baumgarte * contact.effectiveMass) /
          this.P.dt;
      }

      // Ограничиваем импульс (не может быть отрицательным)
      let newImpulse = Math.max(contact.normalImpulse + impulseAmount, 0);
      impulseAmount = newImpulse - contact.normalImpulse;
      contact.normalImpulse = newImpulse;

      // Применяем импульс
      let impulse = math.multiply(contact.normal, impulseAmount);
      contact.bodyA.applyImpulse(impulse, contact.point);

      if (contact.bodyB) {
        contact.bodyB.applyImpulse(math.multiply(impulse, -1), contact.point);
      }

      // Импульс по касательной (трение)
      relativeVelocity = contact.getRelativeVelocity();
      let tangent = normalize(
        math.subtract(
          relativeVelocity,
          math.multiply(contact.normal, dot2D(relativeVelocity, contact.normal))
        )
      );

      if (magnitude(tangent) > 0.00001) {
        let relativeTangentVelocity = dot2D(contact.relativeVelocity, tangent);
        let tangentImpulseAmount =
          -relativeTangentVelocity * contact.effectiveMass;

        // Ограничиваем трение законом Кулона
        let maxFriction = this.P.friction * contact.normalImpulse;
        tangentImpulseAmount =
          Math.max(
            -maxFriction,
            Math.min(maxFriction, contact.tangentImpulse + tangentImpulseAmount)
          ) - contact.tangentImpulse;
        contact.tangentImpulse += tangentImpulseAmount;

        let frictionImpulse = math.multiply(tangent, tangentImpulseAmount);
        contact.bodyA.applyImpulse(frictionImpulse, contact.point);

        if (contact.bodyB) {
          contact.bodyB.applyImpulse(
            math.multiply(frictionImpulse, -1),
            contact.point
          );
        }
      }
    }
  }
}

// Визуализатор
class Visualizer {
  constructor() {}

  drawHistory(p5, history, color, radius) {
    if (history.length < 2) return;

    p5.stroke(color);
    p5.strokeWeight(2);
    p5.noFill();

    // Рисуем линию траектории
    p5.beginShape();
    for (let i = 0; i < history.length; i++) {
      let alpha = i / history.length;
      let c = p5.lerpColor(p5.color(255, 255, 255, 0), color, alpha);
      p5.stroke(c);
      if (i === 0) {
        p5.vertex(history[i][0], history[i][1]);
      } else {
        p5.vertex(history[i][0], history[i][1]);
      }
    }
    p5.endShape();
  }

  drawBody(p5, body, color) {
    // Рисуем траекторию
    this.drawHistory(p5, body.history, color, 20);

    // Рисуем тело
    let vertices = body.getWorldVertices();

    p5.stroke(0);
    p5.strokeWeight(2);
    p5.fill(color);

    p5.beginShape();
    for (let vertex of vertices) {
      p5.vertex(vertex.x, vertex.y);
    }
    p5.endShape(p5.CLOSE);

    // Рисуем центр масс
    p5.fill(0);
    p5.noStroke();
    p5.circle(getX(body.position), getY(body.position), 4);

    // Рисуем направление (стрелка)
    let cos_a = Math.cos(body.angle);
    let sin_a = Math.sin(body.angle);
    let arrowLength = 20;

    p5.stroke(0);
    p5.strokeWeight(2);
    p5.line(
      getX(body.position),
      getY(body.position),
      getX(body.position) + cos_a * arrowLength,
      getY(body.position) + sin_a * arrowLength
    );
  }

  drawContacts(p5, contacts) {
    p5.stroke(255, 0, 0);
    p5.strokeWeight(3);

    for (let contact of contacts) {
      // Рисуем точку контакта
      p5.point(getX(contact.point), getY(contact.point));

      // Рисуем нормаль
      let normalEnd = math.add(
        contact.point,
        math.multiply(contact.normal, contact.normalImpulse)
      );
      p5.line(
        getX(contact.point),
        getY(contact.point),
        getX(normalEnd),
        getY(normalEnd)
      );
    }
  }

  draw(p5, system) {
    // Рисуем пол
    p5.fill(color_scheme.GROUND(p5));
    p5.noStroke();
    p5.rect(
      0,
      system.P.floor,
      system.P.width,
      system.P.height - system.P.floor
    );

    // Рисуем стенки
    p5.fill(200);

    // Рисуем тела разными цветами
    let colors = [
      color_scheme.RED(p5),
      color_scheme.GREEN(p5),
      color_scheme.BLUE(p5),
      p5.color(255, 200, 0), // желтый цвет
    ];

    for (let i = 0; i < system.bodies.length; i++) {
      this.drawBody(p5, system.bodies[i], colors[i % colors.length]);
    }

    // Рисуем контакты
    this.drawContacts(p5, system.contacts);
  }
}

// Интерфейс
rigid_body_sim.Interface = class {
  constructor(base_name) {
    this.system = new System();
    this.visualizer = new Visualizer();
    this.base_name = base_name;

    // Переменные для отслеживания перетаскивания
    this.selectedBody = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 }; // смещение от центра объекта до курсора
    this.lastMousePressed = false;
  }

  iter(p5) {
    let [is_mouse, mouse_x, mouse_y] = ui_namespace.mouseLogic(p5);

    // Логика взаимодействия с мышью
    this.handleMouseInteraction(p5, is_mouse, mouse_x, mouse_y);

    this.system.calcSystem();
    this.visualizer.draw(p5, this.system);

    // Подсвечиваем выбранный объект
    if (this.selectedBody) {
      this.drawSelectedBodyHighlight(p5, this.selectedBody);
    }
  }

  handleMouseInteraction(p5, is_mouse, mouse_x, mouse_y) {
    let mousePressed = p5.mouseIsPressed;

    // Обнаружение начала клика
    if (mousePressed && !this.lastMousePressed && is_mouse) {
      // Находим тело под курсором
      this.selectedBody = this.system.getBodyAtPoint(mouse_x, mouse_y);

      if (this.selectedBody) {
        this.isDragging = true;
        // Вычисляем смещение от центра объекта до курсора
        this.dragOffset.x = mouse_x - getX(this.selectedBody.position);
        this.dragOffset.y = mouse_y - getY(this.selectedBody.position);
      }
    }

    // Перетаскивание объекта
    if (this.isDragging && this.selectedBody && mousePressed && is_mouse) {
      // Вычисляем новую позицию с учетом смещения
      let newX = mouse_x - this.dragOffset.x;
      let newY = mouse_y - this.dragOffset.y;

      // Ограничиваем позицию границами экрана с небольшим отступом
      let margin = 30;
      newX = Math.max(margin, Math.min(p5.width - margin, newX));
      newY = Math.max(margin, Math.min(p5.height - margin, newY));

      // Устанавливаем новую позицию
      this.selectedBody.position = math.matrix([newX, newY]);

      // Обнуляем скорости, чтобы объект не дергался
      this.selectedBody.velocity = math.matrix([0, 0]);
      this.selectedBody.angularVelocity = 0;
    }

    // Завершение перетаскивания
    if (!mousePressed && this.lastMousePressed) {
      this.isDragging = false;
      this.selectedBody = null;
    }

    this.lastMousePressed = mousePressed;
  }

  drawSelectedBodyHighlight(p5, body) {
    // Рисуем подсветку вокруг выбранного объекта
    p5.push();
    p5.noFill();
    p5.stroke(255, 255, 0); // желтая подсветка
    p5.strokeWeight(3);

    let vertices = body.getWorldVertices();
    p5.beginShape();
    for (let vertex of vertices) {
      p5.vertex(vertex.x, vertex.y);
    }
    p5.endShape(p5.CLOSE);
    p5.pop();
  }

  setup(p5, base_name) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 50;
    //set fps
    p5.frameRate(60);

    // Add slider for impulse_iterations
    let [div_m_1, div_m_2] = ui_namespace.createDivsForSlider(
      this.base_name,
      "1",
      "Impulse Iterations"
    );
    this.sliderImpulseIterations = ui_namespace.createSlider(
      div_m_1,
      1,
      20,
      19,
      this.system.P.impulse_iterations
    );
    this.outputImpulseIterations = ui_namespace.createOutput(div_m_2);
    this.outputImpulseIterations.innerHTML = this.sliderImpulseIterations.value;

    this.sliderImpulseIterations.oninput = function () {
      this.outputImpulseIterations.innerHTML =
        this.sliderImpulseIterations.value;
      this.system.P.impulse_iterations = parseInt(
        this.sliderImpulseIterations.value,
        10
      );
    }.bind(this);

    // Пересоздаем систему с новыми размерами
    this.system.initializeSystem();
  }

  reset() {
    this.system.reset();
  }
};

export default rigid_body_sim;
