---
title: 2. Stable Fluids
author: Роман Козак
type: docs
math: true
toc: true
sidebar:
  open: true
---
{{< add_script "js/common/ui.js" >}}


{{< include_sketch path="fluids/sketch/stable_fluids_sketch.js" base_name="stable_fluids_sketch" >}}

## Intro

Это статья наверное перешла в раздел легендарных. Все кто начинает изучать симуляцию жидкостей в играх наткнутся на эту статью. 
Статья 1999 года и метод описанный в ней практически не используется, но она настолько базовая, что ее нельзя пропустить.

Автор практически сразу говорит, что это ненастоящая симуляция. Это метод который позволяет получить красивые и стабильные результаты, и лишь частично соответствует реальности.

## Идея



Основная идея -- это разбить пространство на ячейки (подход Эйлера) и в каждой ячейке хранить скорость. 
Численно решаем уравнение Навье-Стокса.
Для этого реализуем 3 шага:
- Диффузия
- Адвекция
- Проекция





## Источники
- Оригинальная статья от автора [Stable Fluids](https://pages.cs.wisc.edu/~chaol/data/cs777/stam-stable_fluids.pdf)
- Статья от автора в которой делается больший упор на реализацию [Real-Time Fluid Dynamics for Games](http://graphics.cs.cmu.edu/nsp/course/15-464/Fall09/papers/StamFluidforGames.pdf)
- Отличный видос ["Stable Fluids" by Dan Piponi](https://www.youtube.com/watch?v=766obijdpuU)
