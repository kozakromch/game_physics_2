---
title: 2. Broadphase
author: Роман Козак
credential:
type: docs
prev: 
next: 
toc: true
math: true
---

{{< add_script "js/collisions/broadphase/all_pairs.js" >}}


## Интро

Итак у нас есть алгоритмы, которые позволяют определить коллизии между объектами. Проблема появится тогда, когда объектов становится очень много, тк количество проверок будет расти квадратично числу объектов. 


{{< image path="images/collisions/broadphase/all_pairs.excalidraw.png" >}}

И из-за такого быстрого увеличения сложности в простом скетче уже происходят тормоза.

{{< include_sketch path="collisions/broadphase/sketch/all_pairs_sketch.js" base_name="all_pairs_sketch" >}}

Здесь я делаю неполностью упругое столкновение и релаксирую позиции объектов, так чтобы они не пересекались. У меня на тысячи объектов фпс уже падает до 10.

Для того чтобы уменьшить количество проверок, придумали разные алгоритмы о которых расскажу дальше.