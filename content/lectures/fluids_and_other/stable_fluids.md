---
title: 1. Stable Fluids
author: Роман Козак
type: docs
math: true
toc: true
sidebar:
  open: true
---


{{< include_sketch path="fluids/sketch/stable_fluids_sketch.js" base_name="stable_fluids_sketch" >}}


## Intro

Это статья наверное перешла в раздел легендарных. Пожалуй, все кто начинает изучать симуляцию жидкостей в играх наткнутся на эту статью. Она 1999 года, но настолько базовая, что можно и еще раз прочитать.

Автор говорит, что такой метод не подойдет для инженерных расчетов. Тк они используют неявный метод, он сильно демпингует жидкость. Что для игр в принципе не так уж и плохо.

## Источники
- Оригинальная статья от автора [Stable Fluids](https://pages.cs.wisc.edu/~chaol/data/cs777/stam-stable_fluids.pdf)
- Статья от автора в которой делается больший упор на реализацию [Real-Time Fluid Dynamics for Games](http://graphics.cs.cmu.edu/nsp/course/15-464/Fall09/papers/StamFluidforGames.pdf)