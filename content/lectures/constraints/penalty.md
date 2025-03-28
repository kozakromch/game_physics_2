---
title: 1.  Penalty method
author: Роман Козак
type: docs
weight: 1
math: true
toc: true
sidebar:
  open: true
---

{{< add_script "js/constraints/hard_ball.js" >}}
{{< add_script "js/constraints/spring_pendulum.js" >}}
{{< add_script "js/common/point.js" >}}

Если бы могли симулировать пружинку идеально точно, то никаких проблем бы не было. Вот у нас два тела столкнулись. Мы поставили там жесткую пружинку и тела разлетятся. Cобственно метод Penalty method и реализует идею, что все можно описать через пружинки. Например, если два тела проникли друг в друга, то создаем выталкивающую пружинку.

{{< image path="images/constraints/penalty_method/penalty_method.excalidraw.png" >}}

Этого достаточно для реализации простейшего примера -- двойной маятник.
Здесь вместо палочек -- жесткие пружинки.
{{< include_sketch path="constraints/sketch/double_pendulum_sketch.js" base_name="double_pendulum_sketch" >}}
Возникают проблему с высокочастотными колебаниями. Выглядит странновато. В принципе для конкретной системы можно настроить пружинки получше, но это не решение проблемы.

Проблема в следующем. Если мы хотим жесткое ограничения, то нам нужно ставить очень жесткую пружинку.
Если пружинка достаточно жесткая то практически любая схема развалится (кроме безусловно устойчивых, но и они тоже будут давать неадекватный результат) тк недостаточно точно симулируется пружинка.
Если мы хотим чтобы симуляция не разваливалась, то нужно либо уменьшать шаг интегрирования, либо уменьшать жесткость пружинки. Но тогда ограничение становится мягким.
В общем просто поиграйтесь и все поймете.
Но даже если у вас все получится, то часто возникает проблема с высокочастотными колебаниями. И такие пружинки приходится настраивать для каждой системы отдельно.
{{< include_sketch path="constraints/sketch/hard_ball_sketch.js" base_name="hard_ball_sketch" >}}

Это условно твердое тело которое состоит из материальных точек.
Здесь стоит simplectic Euler.
Между всеми парами стоят пружинки с одинаковой жесткостью и дампингом.
Это тело подвешено за верхнюю точку. Пока система мягкая численная схема хорошо справляется, но как только пытаешься сделать так чтобы твердое тело было твердым система разваливается. Поэтому если хотите использовать penalty method, то нужно либо использовать интегратор большей точности, либо уменьшать шаг по времени и немножеско страдать при настройке пружинок.

В общем в этом методе больше проблем чем решений. Поэтому используют другие методы.
