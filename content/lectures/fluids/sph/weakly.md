---
title: 1. Weakly compressible SPH
author: Роман Козак
type: docs
math: true
toc: true
sidebar:
  open: true
---
{{< add_script "js/fluids/weakly_sph.js" >}}

{{< include_sketch path="fluids/sketch/weakly_sph_sketch.js" base_name="weakly_sph_sketch" >}}

Для того чтобы симулировать жидкости с помощью SPH, нам нужно ответить на несколько вопросов.
- Как определить давление жидкости?
- Как применить силы давления на частицы? 



## Давление
Weakly compressible SPH это метод который моделирует жидкость как слабо сжимаемую среду. 
Основная идея заключается в использовании уравнения Тэйта для связи плотности и давления жидкости.

$$
P = K_0/n \left( \left( \frac{\rho}{\rho_0} \right)^n - 1 \right)
$$
Где $K_0$ - это параметр сжимаемости, $\rho_0$ - дефолтная плотность жидкости, а $n$ = 7 для воды (Я не знаю почему 7, так Тэйт сказал).





## Источники
- [Weakly compressible SPH for free surface flows](https://cg.informatik.uni-freiburg.de/publications/2007_SCA_SPH.pdf)
- [Демо с похожим кодом](https://interactivecomputergraphics.github.io/physics-simulation/examples/wcsph.html)
- [Уравнение Тэйта на вики](https://en.wikipedia.org/wiki/Tait_equation)