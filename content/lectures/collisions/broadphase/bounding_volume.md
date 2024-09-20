---
title: 1. Bounding Volume
author: Роман Козак
credential:
type: docs
prev: 
next: 
toc: true
math: true
---

{{< add_script "js/collisions/broadphase/bounding_volume.js" >}}

## Intro

Очень простая идея, которая очень сильно ускоряет процесс поиска коллизий - это использование ограничивающих объемов.
Те мы ассоциируем фигуру с его упрощенным представлением.
Если не пересекаются ограничивающие объемы, то и сами фигуры не будут пересекаться.

{{< image path="images/collisions/broadphase/bounding_volume/bounding.excalidraw.png" >}}


Таких видов объемов много. Для ленивых, которые не хотят читать весь список, переходите сразу на AABB. Они чаще всего используются.

### Bounding Sphere
Bounding sphere - это сфера, которая ограничивает оригинальный объект. Ее плюс в том что нужно мало данных для хранения и ее не нужно перестраивать при повороте объекта.

Для определения коллизий boundings sphere редко используются. Вот например они используются для потимизации рендера в [Three.js](https://threejs.org/docs/#api/en/core/BufferGeometry.computeBoundingSphere)

Выглядят эти сферы как-то так:
{{< include_sketch path="collisions/broadphase/sketch/bs_sketch.js" base_name="bs_sketch" >}}

Для простейших форм, посчитать такие сферы, достаточно просто. Но для вогнутых фигур посчитать оптимальную сферу, уже сложнее.
Для этого есть 2 популярных алгоритма.

#### BS по AABB
Строим ограничивающий прямоугольник (AABB): Ищем минимальную и максимальную координату объекта по каждой оси.
и по AABB строим сферу. Это самый простой способ, но часто не оптимальный.
Например, для форм близких к треугольнику, сфера будет сильно отличаться от описанной около треугольника.

{{< image path="images/collisions/broadphase/bounding_volume/BS_AABB_problem.excalidraw.png" >}}


#### Алгоритм Риттера
Делаем два прохода по всем вершинам объекта:
1. Находим минимальную и максимальные точки по каждой оси.
Считаем центр сферы как среднее арифметическое между минимальной и максимальной точкой.
А диаметр сферы как максимальное расстояние между точками. 
2. Второй раз проходимся по всем точкам объекта и увеличиваем радиус сферы, чтобы она описывала все вершины объекта.

{{< image path="images/collisions/broadphase/bounding_volume/ritter.excalidraw.png" >}}

Автор статьи утверждает, что максимальная ошибка этого алгоритма 5 процентов. 

### OBB
Oriented bounding box - это прямоугольник, который ограничивает оригинальный объект, но может быть повернут в пространстве.
Если фигура обладает известными осями симметрии, то OBB можно достаточно просто построить, но в общем случае это сложная задача.

{{< image path="images/collisions/broadphase/bounding_volume/poorly_OBB.excalidraw.png" >}}


{{< include_sketch path="collisions/broadphase/sketch/obb_sketch.js" base_name="obb_sketch" >}}

### AABB
Axis-aligned bounding box - это прямоугольник, который ограничивает оригинальный объект и выровнен по осям координат.

Супер простая идея, которая чаще всего встречается почти всех движках
[bullet](https://pybullet.org/Bullet/BulletFull/classbtAABB.html),
[jolt](https://jrouwe.github.io/JoltPhysics/class_a_a_b_b_tree_builder.html) и
[box2d](https://box2d.org/files/ErinCatto_DynamicBVH_GDC2019.pdf)

Выглядит это как-то так:
{{< include_sketch path="collisions/broadphase/sketch/aabb_sketch.js" base_name="aabb_sketch" >}}

Существует несколько способов генерации AABB. И это всегда трейдофф между скоростью и точностью.


## Источники  
  
[Ritter's bounding sphere](https://www.researchgate.net/publication/242453691_An_Efficient_Bounding_Sphere)
[Smallest circle problem](https://en.wikipedia.org/wiki/Smallest-circle_problem)
