---
title: 7. Мягкие ограничения
author: Роман Козак
type: docs
prev: docs/first-page
next: docs/folder/leaf
sidebar:
  open: true
---

<script src = "{{site.baseurl}}/assets/scripts/libs/p5.min.js"></script>
<script src = "{{site.baseurl}}/assets/scripts/libs/p5.scribble.js"></script>
<script src = "{{site.baseurl}}/assets/scripts/libs/math.js"></script>

<script src = "{{site.baseurl}}/assets/scripts/common/base_vis.js"> </script>
<script src = "{{site.baseurl}}/assets/scripts/common/sc_grid.js"> </script>
<script src = "{{site.baseurl}}/assets/scripts/common/main_vis.js"></script>
<script src = "{{site.baseurl}}/assets/scripts/common/color_scheme.js"></script>
<script src = "{{site.baseurl}}/assets/scripts/common/common_vis.js"></script>


<script src = "{{site.baseurl}}/assets/scripts/soft_constraints/soft_ball.js"></script>

## Мягкие ограничения (Soft Constraints)
<div>
Взяв адекватный интегратор и уравнения пружинки, можно уже делать крутые вещи. По типу таких:

{{< include_sketch path="soft_constraints/sketch/soft_ball_sketch.js" base_name="soft_ball_sketch" >}}

Но очень быстро появляется несколько проблем, которые портят жизнь. Во-первых, если пружинка слишком жесткая, то симуляция развалится. Во-вторых, настройка параметров пружинки -- это отдельное искусство.
Поэтому в некоторых движках вместо вместо симуляции пружинки
делают что-то что визуально похоже на нее, но математически пружинкой не является. Поэтому такие примитивы называют soft constraints.
В этот раз я хочу рассказать о том как реализованы мягкие ограничения в Jolt, Box2D и ODE. 

Для того чтобы упростить настройку пружинки нужно почти сразу переходить от настройки жесткости с дампингом на настройку частоты и доли критического дампинга.

</div>


## Источники
Слайды от создателя Box2D Erin Catto : [Soft Constraints](https://box2d.org/files/ErinCatto_SoftConstraints_GDC2011.pdf)
