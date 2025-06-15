---
title: 1. Subspace Neural Physics
author: Роман Козак
type: docs
weight: 1
math: true
toc: true
sidebar:
  open: true
---

{{< publish_obj path="info/subspace_neural_physics/cloth_parameters.csv" >}}
{{< publish_obj path="info/subspace_neural_physics/cloth_simulation_data_pca.csv">}}
{{< publish_obj path="info/subspace_neural_physics/cloth_simulation_data.csv" >}}

{{< add_script "js/constraints/subspace_neural_physics.js" >}}

## Введение
Предположим, что мы хотим смоделировать физику конкретного объекта, например плаща героя или чего-нибудь еще. Этот плащ очень детализированный, но мы понимаем, что нам нужна реакция плаща только на движение героя и допустим не нужно учитывать взаимодействие с другими объектами.
В этом случае было бы круто не задействовать физический движок на каждом кадре в игре, а как-то посчитать поведение плаща в зависимости от движений героя заранее, а потом просто использовать эти данные в игре.
Для этого мы можем использовать метод Subspace Neural Physics, который позволяет нам сжать данные о физике в низкоразмерное пространство и использовать нейронную сеть для предсказания поведения объекта.

## Получение данных
Сначала используем любой физический движок и симулируем нужную нам систему. 




{{< include_sketch path="constraints/sketch/subspace_neural_physics_simple_sketch.js" base_name="subspace_neural_physics_simple_sketch" >}}



## Источники
- [Subspace Neural Physics](https://theorangeduck.com/media/uploads/other_stuff/deep-cloth-paper.pdf)
- [Частичная реализация](https://github.com/sutongkui/SubPhysics/tree/master)
