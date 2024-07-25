---
title: 1. Методы Эйлера
author: Роман Козак
type: docs
prev: 
next: 
toc: true
math: true
---


### Прямой метод Эйлера

Самый простой метод, который можно придумать для численного интегрирования можно получить,
если заменить в определении производной $\approx$ на $=$
$$
\begin{equation}
    \dot{x} = \frac{dx}{dt} = \lim_{\Delta t\rightarrow 0} \frac{x(t + \Delta t) -x(t)}{\Delta t} \approx \frac{x(t + \Delta t) -x(t)}{\Delta t},
\end{equation}
$$

$$
\begin{equation}
x(t + \Delta t) = x(t) + \dot{x}(t)\Delta t
\end{equation}
$$
Или в дискретной форме
$$
\begin{equation}
x_{k+1} = x_k + \dot{x_k}\Delta t
\end{equation}
$$
Если что это не мы только что придумали новый метод интегрирования, ему уже больше 200 лет. И имя ему -- метод Явного Эйлера (Explicit Euler).
Такие схемы называются явными, т.к. зная $x_k$, можно вычислить $f(x_k)$ и посчитать $x_{k+1}$.

Пока забъем на анализ устойчивости и точности, просто попробуем просимулировать решения модельных задач.


#### Пушка прямым методом Эйлера

{{<details title="Формальности" closed="true" >}}
Решение задачи стрельбы из пушки с помощью прямого Эйлера
$$
\begin{equation}
\dot{z} = A \cdot z + G
\end{equation}
$$

Подставляя это в метод прямого Эйлера получим
$$
\begin{equation}
z_{k+1} = z_k + A\cdot z_k\cdot\Delta t + G\cdot\Delta t = (I + A\cdot\Delta t)\cdot z_k + G\cdot\Delta t = F\cdot z_k + G\cdot\Delta t
z_{k+1} = F\cdot z_k + G\cdot\Delta t
\end{equation}
$$

{{< /details >}}

{{< include_sketch path="numerical_method/sketch/forward_euler_canon.js" base_name="forward_euler_canon" >}}

В принципе неплохо. Ошибка потихоньку накапливается и мы начинаем промазывать от аналитического движения. 
Иногда возникают задачи кинуть твердое тело в нужную цель. Например, босс кидает снаряды точно в игрока. И нужно это учитывать.

#### Пружинка прямым методом Эйлера

{{<details title="Формальности" closed="true" >}}

Решение задачи пружинки с помощью прямого Эйлера
$$
\begin{equation}
\dot{z} = A \cdot z
\end{equation}
$$

Подставляя это в метод прямого Эйлера получим
$$
\begin{equation}
z_{k+1} = z_k + A\cdot z_k\cdot\Delta t = (I + A\cdot\Delta t)\cdot z_k = F\cdot z_k\qquad
z_{k+1} = F\cdot z_k
\end{equation}
$$

{{< /details >}}

{{< include_sketch path="numerical_method/sketch/forward_euler_spring.js" base_name="forward_euler_spring" >}}

А вот здесь уже возрастание энергии не такое приятное. И проблема решается лишь частично уменьшением шага по времени.
Те энергия растет, но медленнее.

Для полноты картины, давайте сделаем анализ устойчивости и точности метода Эйлера.

#### Анализ устойчивости

{{<details title="Формальности" closed="true" >}}
Идея такая
$$
\begin{equation}
\begin{split}
&x_{1} = F \cdot x_0 \\
&x_{2} = F \cdot x_1 = F^2 \cdot x_0 \\
\ldots \\
&x_{k} = F^k \cdot x_0
\end{split}
\end{equation}
$$

Получается, что мы просто возводим матрицу в степень и умножаем на начальное состояние.
Если свести эту задачу к одномерной, то получим
$$
\begin{equation}
x_{k+1} = \lambda x_k
\end{equation}
$$

Для устойчивости решения необходимо
$$
\begin{equation}
|\lambda| < 1
\end{equation}
$$
{{< /details >}}
Для того чтобы многомерная система была устойчива, необходимо чтобы все собственные значения матрицы $F$ были меньше 1 по модулю.
Получается у прямого Эйлера вот такая зона устойчивости:
{{< image path="images/numerical_method/stable_zone_forward.excalidraw.png" >}}

Самое забавное в этом методе, что вот такая недемпфировання пружинка безусловно неустойчива.
Те можно уменьшать шаг по времени сколько угодно, но она все равно будет накачиваться энергией и улетать в космос.

{{<details title="Формальности" closed="true" >}}

//TODO: Сделать анализ устойчивости для конкретной пружинки

{{< /details >}}

#### Анализ точности

{{<details title="Формальности" closed="true" >}}
Посмотрим на ошибку метода Эйлера. Пусть у нас есть точное решение $x(t)$ и приближенное $x_k$. Тогда
$$
\begin{equation}
x(t + \Delta t) = x(t) + \dot{x}(t)\Delta t + \frac{\ddot{x}(t)\Delta t^2}{2} + \ldots
\end{equation}
$$

$$
\begin{equation}
x_{k+1} = x_k + \dot{x_k}\Delta t
\end{equation}
$$
Тогда
$$
\begin{equation}
x(t + \Delta t) - x*{k+1} = \frac{\ddot{x}(t)\Delta t^2}{2} + \ldots
\end{equation}
$$
{{< /details >}}
Получается что локальная ошибка метода Эйлера пропорциональна квадрату шага по времени.
Глобальная ошибка же пропорциональна числу шагов по времени умноженному на локальную ошибку.

{{< image path="images/numerical_method/accuracy_forward.excalidraw.png" >}}


#### Анализ энергии


#### Использование в движках

Этот метод используется только на начальном этапе разработки движках.
Вот, например, ребята предлагают поменять [интегратор в годоте](https://github.com/godotengine/godot-proposals/discussions/6610).
Базовое правило -- если можно не использовать этот метод -- не используйте. Он простой как пробка, но супер неустойчивый и неточный.
Да и какой в нем смысл, если он даже не может проинтегрировать простейшую пружинку.

### Обратный метод Эйлера

Для прямого Эйлера мы взяли определение производной справа. Теперь попробуем взять его слева.
$$
\begin{equation}
    \dot{x} = \frac{dx}{dt} = \lim_{\Delta t\rightarrow 0} \frac{x(t) -x(t - \Delta t)}{\Delta t} \approx \frac{x(t) -x(t - \Delta t)}{\Delta t},
\end{equation}
$$

$$
\begin{equation}
    x(t - \Delta t) = x(t) - \dot{x}(t)\Delta t
\end{equation}
$$
Или в дискретной форме
$$
\begin{equation}
    x_{k-1} = x_k - \dot{x_k}\Delta t
\end{equation}
$$

Такие схемы называются неявными, т.к. зная $x_k$, нужно решить уравнение $f(x_{k-1}) = \dot{x_k}$ для нахождения $x_{k-1}$.
Выглядит достаточно сложно, и такое просто не решить. В чистом виде такую схему никто не использует.
Тк уравнение системы редко получаются линейными. Но мы сейчас анализируем линейную систему,
поэтому можем попробовать просимулировать наши модельные задачи

{{<details title="Формальности" closed="true" >}}
Решение задачи стрельбы из пушки с помощью обратного Эйлера
$$
\begin{equation}
\dot{z} = A \cdot z + G
\end{equation}
$$
Подставляя это в метод обратного Эйлера получим
$$
\begin{equation}
z_{k-1} = z_k - A\cdot z_k\cdot\Delta t - G\cdot\Delta t = (I - A\cdot\Delta t)\cdot z_k - G\cdot\Delta t = F\cdot z_k - G\cdot\Delta t
\end{equation}
$$

И выражая из последнего уравнения $z_k$ получим
$$
\begin{equation}
z_{k} = F^{-1}\cdot(z_{k-1} + G\cdot\Delta t)
\end{equation}
$$
{{< /details >}}

{{< include_sketch path="numerical_method/sketch/backward_euler_canon.js" base_name="backward_euler_canon" >}}
Ситуация с энергией в обратном Эйлере обратная. Она убывает. И на баллистической кривой это нормально.

{{< include_sketch path="numerical_method/sketch/backward_euler_spring.js" base_name="backward_euler_spring" >}}
А вот здесь получается демпфированная пружинка. Из плюсов такой численной схемы. Пружинка безусловно устойчива.

#### Устойчивость

Да и вообще у неявного Эйлера очень большая зона устойчивости.

\input{pics/stable*zone_bwd.tex}
Для неявного метода, переходя к собственным векторам, получим
$$
\begin{equation}
y_{k+1} = (1 - \Delta t \cdot \lambda)^{-1}\cdot y_k
\end{equation}
$$
Для устойчивости решения необходимо
$$
\begin{equation}
|(1 - \Delta t \cdot \lambda)^{-1}| < 1 \Leftrightarrow |1 - \Delta t \cdot \lambda| > 1
\end{equation}
$$

Сразу можно заметить, что зона устойчивости для неявного метода больше

{{< image path="images/numerical_method/stable_zone_backward.excalidraw.png" >}}

Подставляя на место $\dot{z}$ обсужденное выше приближенное значение, получим следующие равенствo для неявной$(2)$ схем:
$$
\begin{equation}
z_{k+1} = (I - A\cdot\Delta t)^{-1}\cdot z_k = B\cdot z_k\qquad (2)
\end{equation}
$$
По индукции, получим
$$
\begin{equation}
z_k = B^k\cdot z_0\qquad (2)
\end{equation}
$$

#### Точность

У обратного Эйлера точно такая же точность как и у прямого. 

#### Использование в движках

Неявный метод очень сложно реализовать. 
Для симуляции простой пружинки, нам пришлось обратить матрицу, 
но если у нас более сложная система с ограничениями уравнение неявной схемы станет нелинейной. 
Поэтому их модифицируют дальше и например в [XPBD](https://blog.mmacklin.com/publications/2016-07-21-XPBD.pdf), 
делают разложение по Тейлору до первого порядка. Такой метод используется в PhysX.

Или например в [Projective Dynamics](), используют упрощение оптимизационной задачи для решения уравнения.

### Summary

В среднем это методы, которые вы с большой вероятностью не будете использовать.
Если вам нужно интегрировать уравнение движение с силами и прочи используйте методы из следующей главы.

Умные люди придумали схемы получше.
