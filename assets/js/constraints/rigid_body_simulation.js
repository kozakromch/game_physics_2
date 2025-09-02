import color_scheme from "../../js/common/color_scheme.min.js";
import ui_namespace from "../../js/common/ui.min.js";

let rigid_body_sim = {};

class Parameters {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.gravity = math.matrix([0, 10]); // гравитация
    this.dt = 1 / 60; // фиксированное время шага
    this.friction = 0.5; // коэффициент трения
    this.restitution = 0.0; // коэффициент упругости (нулевой как требуется)
    this.floor = 400;
    this.width = 800; // ширина окна
    this.height = 600; // высота окна
    this.sub_steps = 4; // подшаги для интеграции
    this.impulse_iterations = 10; // итерации Sequential Impulses
    this.max_history = 1;
    this.baumgarte = 0.2; // коэффициент Баумгартена
    this.collisionMargin = 0.0; // отступ для проверки коллизий
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
  constructor(vertices, mass, x, y, angle = 0, radius = null) {
    this.vertices = vertices; // локальные координаты вершин (null для кругов)
    this.radius = radius; // радиус для кругов (null для многоугольников)
    this.isCircle = radius !== null;
    this.mass = mass;
    this.invMass = mass > 0 ? 1 / mass : 0;

    // Вычисление момента инерции
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
    if (this.isCircle) {
      // Момент инерции для круга: I = 0.5 * m * r^2
      return 0.5 * this.mass * this.radius * this.radius;
    } else {
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
  }

  // Получение мировых координат вершин
  getWorldVertices() {
    if (this.isCircle) {
      return null; // Круги не имеют вершин
    }

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
    this.externalAcceleration = math.matrix([0, 0]);
    // this.velocity = math.add(this.velocity, math.multiply(gravity, dt));

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

function createCircle(radius, mass, x, y) {
  return new RigidBody(null, mass, x, y, 0, radius);
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

    // создаем пирамидку из кубиков.
    // let offset_x = this.P.width / 2;
    // let offset_y = this.P.floor - 20;
    // for (let i = 0; i < 10; i++) {
    //   let width = 50 + i * 18;
    //   let height = 15 + i;
    //   this.bodies.push(
    //     createRectangle(width, height, 1 + i, offset_x, offset_y, 0)
    //   );
    //   this.bodies[i].velocity = math.matrix([0, 0]);
    //   offset_y -= height + 5; // Move upwards for the next block
    // }

    // Два тяжелых тела друг над другом и несколько кругов
    this.bodies.push(createRectangle(40, 40, 0.1, 200, 100, 0));
    this.bodies.push(createRectangle(80, 80, 5, 200, 30, 0));

    // Добавляем круги
    // this.bodies.push(createCircle(20, 50, 100, 50));
    // this.bodies.push(createCircle(15, 0.8, 300, 80));
    // this.bodies.push(createCircle(25, 1.5, 500, 60));
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
          math.multiply(this.P.gravity, dt)
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
    if (bodyA.isCircle && bodyB.isCircle) {
      this.checkCircleCircleCollision(bodyA, bodyB);
    } else if (bodyA.isCircle && !bodyB.isCircle) {
      this.checkCirclePolygonCollision(bodyA, bodyB);
    } else if (!bodyA.isCircle && bodyB.isCircle) {
      this.checkCirclePolygonCollision(bodyB, bodyA);
    } else {
      // Polygon-polygon collision (existing code)
      let verticesA = bodyA.getWorldVertices();
      let verticesB = bodyB.getWorldVertices();

      // Проверяем вершины A против ребер B
      this.checkVerticesAgainstPolygon(bodyA, bodyB, verticesA, verticesB);
      // Проверяем вершины B против ребер A
      this.checkVerticesAgainstPolygon(bodyB, bodyA, verticesB, verticesA);
    }
  }

  checkVerticesAgainstPolygon(bodyA, bodyB, verticesA, verticesB) {
    let margin = this.P.collisionMargin;

    for (let vertex of verticesA) {
      if (this.pointInPolygon(vertex, verticesB)) {
        // Находим ближайшее ребро
        let closestEdge = this.findClosestEdge(vertex, verticesB);
        if (closestEdge) {
          // Учитываем collision margin в глубине проникновения
          let adjustedPenetration = closestEdge.distance + margin;
          let contact = new ContactPoint(
            math.matrix([vertex.x, vertex.y]),
            math.multiply(closestEdge.normal, -1),
            bodyA,
            bodyB,
            adjustedPenetration
          );
          this.contacts.push(contact);
        }
      } else {
        // Проверяем, находится ли точка в пределах collision margin от поверхности
        let closestEdge = this.findClosestEdge(vertex, verticesB);
        if (closestEdge && closestEdge.distance < margin) {
          let adjustedPenetration = margin - closestEdge.distance;
          if (adjustedPenetration > 0) {
            let contact = new ContactPoint(
              math.matrix([vertex.x, vertex.y]),
              closestEdge.normal,
              bodyA,
              bodyB,
              adjustedPenetration
            );
            this.contacts.push(contact);
          }
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

      if (body.isCircle) {
        // Проверка для круга
        let dx = point.x - getX(body.position);
        let dy = point.y - getY(body.position);
        let distSq = dx * dx + dy * dy;
        if (distSq <= body.radius * body.radius) {
          return body;
        }
      } else {
        // Проверка для многоугольника
        let vertices = body.getWorldVertices();
        if (this.pointInPolygon(point, vertices)) {
          return body;
        }
      }
    }
    return null;
  }

  checkCircleCircleCollision(circleA, circleB) {
    let dx = getX(circleB.position) - getX(circleA.position);
    let dy = getY(circleB.position) - getY(circleA.position);
    let distance = Math.sqrt(dx * dx + dy * dy);
    let radiusSum = circleA.radius + circleB.radius;

    if (distance < radiusSum) {
      let penetration = radiusSum - distance;
      let normal;

      if (distance > 0.001) {
        normal = math.matrix([-dx / distance, -dy / distance]);
      } else {
        // Если круги точно совпадают, используем произвольную нормаль
        normal = math.matrix([1, 0]);
      }

      // Точка контакта находится между центрами кругов
      let contactPoint = math.add(
        circleA.position,
        math.multiply(normal, circleA.radius)
      );

      let contact = new ContactPoint(
        contactPoint,
        normal,
        circleA,
        circleB,
        penetration
      );
      this.contacts.push(contact);
    }
  }

  checkCirclePolygonCollision(circle, polygon) {
    let vertices = polygon.getWorldVertices();
    let circleCenter = { x: getX(circle.position), y: getY(circle.position) };

    // Находим ближайшую точку на многоугольнике к центру круга
    let closestPoint = this.findClosestPointOnPolygon(circleCenter, vertices);

    let dx = circleCenter.x - closestPoint.x;
    let dy = circleCenter.y - closestPoint.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < circle.radius) {
      let penetration = circle.radius - distance;
      let normal;

      if (distance > 0.001) {
        normal = math.matrix([dx / distance, dy / distance]);
      } else {
        // Если центр круга точно на границе, используем нормаль полигона
        let edge = this.findClosestEdge(circleCenter, vertices);
        normal = edge ? edge.normal : math.matrix([0, -1]);
      }

      let contactPoint = math.matrix([closestPoint.x, closestPoint.y]);

      let contact = new ContactPoint(
        contactPoint,
        normal,
        circle,
        polygon,
        penetration
      );
      this.contacts.push(contact);
    }
  }

  findClosestPointOnPolygon(point, vertices) {
    let closestPoint = null;
    let minDistance = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      let v1 = vertices[i];
      let v2 = vertices[(i + 1) % vertices.length];

      let edgePoint = this.closestPointOnLineSegment(point, v1, v2);
      let dx = point.x - edgePoint.x;
      let dy = point.y - edgePoint.y;
      let distance = dx * dx + dy * dy;

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = edgePoint;
      }
    }

    return closestPoint;
  }

  closestPointOnLineSegment(point, lineStart, lineEnd) {
    let dx = lineEnd.x - lineStart.x;
    let dy = lineEnd.y - lineStart.y;
    let lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return lineStart; // Отрезок является точкой
    }

    let t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t)); // Ограничиваем t отрезком [0, 1]

    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };
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
    if (body.isCircle) {
      this.checkCircleWallCollisions(body);
    } else {
      let vertices = body.getWorldVertices();

      for (let vertex of vertices) {
        // Пол
        if (vertex.y > this.P.floor) {
          let penetration = vertex.y - this.P.floor;
          let contact = new ContactPoint(
            math.matrix([vertex.x, this.P.floor]),
            math.matrix([0, -1]),
            body,
            null,
            penetration
          );
          this.contacts.push(contact);
        }

        // Левая стенка
        if (vertex.x < 0) {
          let penetration = 0 - vertex.x;
          let contact = new ContactPoint(
            math.matrix([0, vertex.y]),
            math.matrix([1, 0]),
            body,
            null,
            penetration
          );
          this.contacts.push(contact);
        }

        // Правая стенка
        if (vertex.x > this.P.width) {
          let penetration = vertex.x - this.P.width;
          let contact = new ContactPoint(
            math.matrix([this.P.width, vertex.y]),
            math.matrix([-1, 0]),
            body,
            null,
            penetration
          );
          this.contacts.push(contact);
        }

        // Потолок
        if (vertex.y < 0) {
          let penetration = 0 - vertex.y;
          let contact = new ContactPoint(
            math.matrix([vertex.x, 0]),
            math.matrix([0, 1]),
            body,
            null,
            penetration - vertex.y
          );
          this.contacts.push(contact);
        }
      }
    }
  }

  checkCircleWallCollisions(circle) {
    let x = getX(circle.position);
    let y = getY(circle.position);
    let r = circle.radius;

    // Пол
    if (y + r > this.P.floor) {
      let penetration = y + r - this.P.floor;
      let contact = new ContactPoint(
        math.matrix([x, this.P.floor]),
        math.matrix([0, -1]),
        circle,
        null,
        penetration
      );
      this.contacts.push(contact);
    }

    // Левая стенка
    if (x - r < 0) {
      let penetration = r - x;
      let contact = new ContactPoint(
        math.matrix([0, y]),
        math.matrix([1, 0]),
        circle,
        null,
        penetration
      );
      this.contacts.push(contact);
    }

    // Правая стенка
    if (x + r > this.P.width) {
      let penetration = x + r - this.P.width;
      let contact = new ContactPoint(
        math.matrix([this.P.width, y]),
        math.matrix([-1, 0]),
        circle,
        null,
        penetration
      );
      this.contacts.push(contact);
    }

    // Потолок
    if (y - r < 0) {
      let penetration = r - y;
      let contact = new ContactPoint(
        math.matrix([x, 0]),
        math.matrix([0, 1]),
        circle,
        null,
        penetration
      );
      this.contacts.push(contact);
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

      if (magnitude(tangent) > 0.01) {
        let relativeTangentVelocity = dot2D(relativeVelocity, tangent);
        let tangentImpulseAmount =
          -relativeTangentVelocity * contact.effectiveMass;

        // Ограничиваем трение законом Кулона
        let maxFriction = this.P.friction * contact.normalImpulse;
        // clamp (-maxFriction, maxFriction)
        let newTangentImpulse = Math.max(
          -maxFriction,
          Math.min(maxFriction, contact.tangentImpulse + tangentImpulseAmount)
        );
        tangentImpulseAmount = newTangentImpulse - contact.tangentImpulse;
        contact.tangentImpulse = newTangentImpulse;

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
    p5.stroke(0);
    p5.strokeWeight(2);
    p5.fill(color);

    if (body.isCircle) {
      // Рисуем круг
      p5.circle(getX(body.position), getY(body.position), body.radius * 2);

      // Рисуем линию для показа ориентации
      let endX = getX(body.position) + Math.cos(body.angle) * body.radius * 0.8;
      let endY = getY(body.position) + Math.sin(body.angle) * body.radius * 0.8;
      p5.stroke(0);
      p5.strokeWeight(2);
      p5.line(getX(body.position), getY(body.position), endX, endY);
    } else {
      // Рисуем многоугольник
      let vertices = body.getWorldVertices();
      p5.beginShape();
      for (let vertex of vertices) {
        p5.vertex(vertex.x, vertex.y);
      }
      p5.endShape(p5.CLOSE);
    }

    // Рисуем центр масс
    p5.fill(0);
    p5.noStroke();
    p5.circle(getX(body.position), getY(body.position), 4);
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
        // math.multiply(contact.normal, 20)
        math.multiply(contact.normal, contact.normalImpulse * 50)
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
  constructor(base_name, with_slider) {
    this.system = new System();
    this.visualizer = new Visualizer();
    this.base_name = base_name;
    this.with_slider = with_slider;

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

      // Реализуем PID-контроллер для плавного перетаскивания
      let kp = 10; // Пропорциональный коэффициент
      let kd = 5; // Дифференциальный коэффициент

      let positionError = math.matrix([
        newX - getX(this.selectedBody.position),
        newY - getY(this.selectedBody.position),
      ]);

      let velocityError = math.multiply(
        math.subtract(math.matrix([0, 0]), this.selectedBody.velocity),
        kd
      );

      let pidForce = math.add(math.multiply(positionError, kp), velocityError);

      // Устанавливаем внешнее ускорение на основе PID-контроллера
      this.selectedBody.externalAcceleration = pidForce;
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

    if (body.isCircle) {
      // Подсветка для круга
      p5.circle(
        getX(body.position),
        getY(body.position),
        (body.radius + 5) * 2
      );
    } else {
      // Подсветка для многоугольника
      let vertices = body.getWorldVertices();
      p5.beginShape();
      for (let vertex of vertices) {
        p5.vertex(vertex.x, vertex.y);
      }
      p5.endShape(p5.CLOSE);
    }
    p5.pop();
  }

  setup(p5) {
    this.system.P.width = p5.width;
    this.system.P.height = p5.height;
    this.system.P.floor = p5.height - 50;
    //set fps
    p5.frameRate(60);
    if (this.with_slider) {
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
      this.outputImpulseIterations.innerHTML =
        this.sliderImpulseIterations.value;

      this.sliderImpulseIterations.oninput = function () {
        this.outputImpulseIterations.innerHTML =
          this.sliderImpulseIterations.value;
        this.system.P.impulse_iterations = parseInt(
          this.sliderImpulseIterations.value,
          10
        );
      }.bind(this);
    } else {
      this.system.P.impulse_iterations = 1;
    }
    // Пересоздаем систему с новыми размерами
    this.system.initializeSystem();
  }

  reset() {
    this.system.reset();
  }
};

export default rigid_body_sim;
