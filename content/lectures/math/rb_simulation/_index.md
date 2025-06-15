---
title: 2. Симуляция твердого тела
author: Роман Козак
type: docs
toc: true
math: true
---

## Введение

Симуляция точки была простой и понятной. Есть позиция, есть скорость, есть сила. Простая интеграция, и все работает. В физике твердого тела все немного сложнее.

Ради формальности, мы работаем с абсолютно твердым телом. Т.е расстояние между любыми двумя точками в теле остается постоянным.

В реальной жизни это не так. Например, если вы возьмете резиновый мяч и бросите его, он будет деформироваться. Но в большинстве случаев это несущественно.

{{< add_script "js/math/rb_simulation/rb_free.js" >}}

{{% include_sketch path="math/rb_simulation/sketch/dzhanibekov.js" base_name="dzhanibekov"%}}
{{% include_sketch path="math/rb_simulation/sketch/dzhanibekov_implicit.js" base_name="dzhanibekov_implicit"%}}
