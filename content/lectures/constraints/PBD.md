---
title: 3. PBD
author: Роман Козак
type: docs
math: true
toc: true
sidebar:
  open: true
---
{{< add_script "js/constraints/elastic_inelastic.js" >}}


## Интро



## PBD 

Это первая статья в серии XPBD. Она является логичным продолжением метода hitman. Была написана в далеком 2006. Зацените видос [Position Based Dynamics](https://www.youtube.com/watch?v=j5igW5-h4ZM)

### Интегратор

Первое улучшение -- это использование другого интегратора.
В прошлом методе было сложно добиться хороших и сочных упругих коллизий. В основном мы получали неупругое столкновение, из-за того что не могли управлять скоростью
В PBD Вместо Vanilla Euler используется Symplectic Euler.
Напомню, что Symplectic Euler выглядит так:

$$
\begin{equation}
\begin{split}
v_{i+1} = v_i + \Delta t \cdot a_i
x_{i+1} = x_i + \Delta t \cdot v_{i+1}
\end{split}
\end{equation}
$$

В этом интеграторе есть скорость в явном виде. И это позволяет без всяких костылей управлять скоростью. Поэтому можно просто сделать вот такое упругое столкновение.

{{< include_sketch path="constraints/sketch/elastic_inelastic_sketch.js" base_name="elastic_inelastic_sketch" >}}


### Универсальное решение
В статье Hitman авторы придумывали разные методы для разрешения ограничений. И математического обоснование под это не было. Они действовали скорее интуитивно. 
В PBD предлагают универсальное решение по тому как лучше всего разрешать ограничения $C(\vec{p})$.


Для того чтобы разрешить уравнение нужно найти такое $\Delta \vec{p}$, чтобы $C(\vec{p} + \Delta \vec{p}) = 0$. Здесь $\vec{p}$ -- конкатенация всех позиций всех точек. Те если у нас есть два шарика, то $\vec{p} = [x_1, y_1, x_2, y_2]$.

Для произвольного ограничения мы не можем так просто его найти, поэтому делают стандартное разложение в ряд Тейлора и оставляют только первые два члена.

$$
\begin{equation}
C(\vec{p} + \Delta \vec{p}) \approx C(\vec{p}) + \nabla_{\vec{p}} C(\vec{p}) \cdot \Delta \vec{p} = 0
\end{equation}
$$

Если бы это было обычное уравнение, то мы бы его запросто решил. Но тут векторы и получается проблемка. Предположим, что $C(\vec{p}) = c$ и $\nabla_{\vec{p}} C(\vec{p}) = [a, b]$ и $\Delta \vec{p} = [x, y]$. Тогда у нас получится такое уравнение:

$$
a * x + b * y = -c
$$

{{< image path="images/constraints/pbd/straight.excalidraw.png" >}}

Собственно это уравнение прямой. Для того чтобы найти однозначное решение, нужно добавить еще одно ограничение.  
В качестве него мы можем требовать чтобы $\Delta \vec{p}$ была сонаправлена с градиентом.  Т.е $\Delta \vec{p} = \lambda \nabla_p C(\vec{p})$.

Почему так, можно понять на простом примере. Вот у нас есть две точки, которые должны быть на одном расстоянии друг от друга.
И мы пытаемся найти решение для первого шарика. Самое логичное решение -- это двигать шарик по самому короткому пути к второму шарику. Т.е по направлению градиента.

{{< image path="images/constraints/pbd/stretch_grad.excalidraw.png" >}}

С дополнительным уравнением можно получить решение 
$$
\begin{equation}
\Delta \vec{p} = -\frac{C(\vec{p})}{\nabla_p C(\vec{\vec{p}}) \cdot \nabla_p C(\vec{p})} \nabla_p C(\vec{p})
\end{equation}
$$

Для того чтобы было удобнее считать, нужно разбить $\vec{p}$ на $\vec{p_1}, \dots, \vec{p_n}$, можно переписать решение для конкретной $\vec{p_i}$ и разрешить ограничение вида $C(\vec{p_1}, \dots, \vec{p_n})$ нужно переписать уравнение вот так:

$$
\begin{equation}
\begin{split}
&\Delta \vec{p_i} = -s * \nabla_{\vec{p_i}} C \\\
&s = \frac{C}{\sum_{k} (\nabla_{\vec{p_k}} C)^2}
\end{split}
\end{equation}
$$

### Пытаемся понять
Расчет $\Delta \vec{p}$ состоит из двух частей. 
Первая часть -- это градиент ограничения:
 $-\nabla_{\vec{p_i}} C(\vec{p})$ -- Это вектор, который показывает в какую сторону нужно двигаться чтобы уменьшить ограничение. 
Собственно, это то что я показывал на прошлом рисунке. 

Вторая часть -- это коэффициент $s$. Он показывает насколько сильно нужно двигаться в этом направлении. Знаменатель в нем означает, что чем больше точек участвует в ограничении, тем меньше нужно двигаться каждой точке.

Давайте на примере. Вот у нас есть ограничение на площадь десятиугольника. $C(\vec{p_1}, \dots, \vec{p_{10}}) = S - S_0$.

{{< image path="images/constraints/pbd/v_conserv.excalidraw.png" >}}

И давайте предположим, что эту фигуру сжало, 
чтобы площадь сохранилась. Этого можно добиться несколькими способами: Например, подвинуть одну точку очень сильно, а остальные вообще не двигать. Или можно подвинуть все точки немного. Второй вариант просто логичнее. Если у точек


## Источники

- [Position Based Dynamics](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf)
- Хороший видос с объяснением [Position Based Dynamics](https://www.youtube.com/watch?v=fH3VW9SaQ_c)