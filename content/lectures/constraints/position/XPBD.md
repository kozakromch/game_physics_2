---
title: 3. XPBD и SmallSteps
author: Роман Козак
type: docs
weight: 4
math: true
toc: true
sidebar:
  open: true
---

{{< add_script "js/constraints/pbd_cloth.js" >}}

## Интро

Здесь я расскажу сразу про две статьи.
XPBD - Extended Position Based Dynamics написана в 2016 году. Это улучшение метода PBD.
SmallSteps - написана в 2019 году. Скорее не улучшение XPBD, а режим работы который работает лучше всего.

## Идея

Большая проблема PBD - большое влияние количества итераций релаксации на результат симуляции.
Чем больше итераций тем жестче тело.
Вот так было в PBD:
{{< include_sketch path="constraints/sketch/pbd_cloth_sketch.js" base_name="pbd_cloth_sketch" >}}

XPBD предлагает решение этой проблемы.

## XPBD

В статье улучшаются мягкие ограничения. Это ограничения, которые ведут себя как критически демпфированные пружины.
Они постепенно сходятся к желаемому значению.
Сложность в том, что они должны себя вести примерно одинаково вне зависимости от количества итераций.
Для жестких ограничений ничего не поменялось.

{{<details title="Псевдокод симуляции" closed="true" >}}

```javascript
for (let point of points) {
  // интегрируем позиции точек
  point.p = dt * point.v + dt * dt * point.m_inv * point.fext;
}
// обнуляем лямбды
for (let c of constraints) {
  c.lambda = 0;
}
while (i < max_iterations) {
  for (let c of constraints) {
    // вычисляем delta_lambda
    let delta_lambda = c.compute_delta_lambda();
    let delta_p = c.compute_delta_x(delta_lambda);
    c.lambda += delta_lambda;
    c.update_positions(delta_p);
  }
  i++;
}
// обновляем позиции и скорости
for (let point of points) {
  point.v = (point.p - point.x) / dt;
  point.x = point.p;
}
```

{{< /details >}}

Дальше пойдет математика, которая не нужна для применения.
Кому нужна конечная формула смело пропускайте следующий раздел

### Математика XPBD

Базовая схема такая же как и в PBD. Сначала расчитываем позицию точки $x$ как будто она двигается без ограничений.
Потом применяем ограничения.
{{<details title="Подробнее" closed="true">}}

#### Получаем уравнения

Ограничения действуют силами $f$. У этих ограничений есть потенциальная энергия $U$.

$$
f = -\frac{\partial U(x)}{\partial x}
$$

$$
M \ddot{x} = f
$$

M -- это матрица массы.

$$
M \ddot{x} = -\frac{\partial U(x)}{\partial x}
$$

Теперь используют неявную численную схему:

$$
\begin{equation}
M \frac{x^{n+1} - 2x^n + x^{n-1}}{{\Delta t}^2} = -\frac{\partial U(x^{n+1})}{\partial x}
\end{equation}
$$

Эта схема неявная, так как $x^{n+1}$ зависит от U, которое зависит от $x^{n+1}$.
Для почти всех систем неявная схема абсолютно устойчива.

#### Вводим потенциал

Теперь нужно ввести $U$ для ограничений.
Мы считаем что уравнение ограничения $C(x) = 0$. зависит только от $x$. А еще мы считаем, что оно дифференцируемо.
Вообще можно в качестве потенциала использовать любую функцию, но нам полезно добиться хороших свойств от него.

- $U(x) = 0$ если $C(x) = 0$
  Т.е когда уравнение ограничения выполняется, потенциал равен 0 и сира ограничения тоже равна нулю. Что логично.
- При отклонении от $C(x) = 0$ потенциал растет. Ну и сила ограничения тоже будет расти.

Для этого хорошо подходит квадратичный потенциал:

$$
U(x) = \frac{1}{2} С(x)^T * \alpha^{-1} * C(x)
$$

Здесь $C(x)$ это вектор ограничений, а $\alpha$ это матрица compliance.
Вводится термин compliance $\alpha$: Это параметр обратный жесткости. Оно в пределах $(0; +\inf)$ Чем он больше тем мягче ограничение.
Эта матрица может быть не только диагональной. Благодаря этому можно комбинаю жесткости разных ограничений.

{{<details title="Пример" closed="true">}}
У нас есть простое уравнение пружинки:

$$
C(x) = x = 0
$$

И жесткость пружинки $k = \alpha^{-1}$.

$$
U(x) = \frac{1}{2} (x^T * \alpha^{-1} * x) = \frac{1}{2} k x^2
$$

Тогда сила ограничения будет равна:

$$
f = -\frac{\partial U(x)}{\partial x} = - \nabla C(x) * \alpha^{-1} * C(x)
$$

{{< /details >}}

Дальше вводим переменную $\lambda$ которая будет множителем Лагранжа.

$$
\lambda = -\tilde{\alpha} * C(x)
$$

Это уравнение можно переписать вот так:

$$
C(x) + \tilde{\alpha} * \lambda = 0
$$

Тут $\tilde{\alpha}$ это $\frac{\alpha} {\Delta t^2}$.

#### Уравнения которые нужно решить

Подставляем уравнение силы и $\lambda$ в уравнение движения (1) и получаем финальную систему, которую нужно решить:

$$
\begin{equation}
\begin{aligned}
M(x^{n+1} - \tilde{x}) - \Delta t^2 \nabla C(x^{n+1}) *\lambda^{n+1} = 0 \\\
C(x^{n+1}) + \tilde{\alpha} * \lambda^{n+1} = 0
\end{aligned}
\end{equation}
$$

Где $\tilde{x} = x^n + \Delta t * v^n$

#### Решаем

Получили нашу любимую нелинейную систему уравнений. Нам нужно найти  $x^{n+1}$ и $\lambda^{n+1}$. В общем виде ее решить невозможно.
Поэтому в статье предлагают решать ее итерационным методом Ньютона.
Обозначим уравнения из (2) как

$$
\begin{aligned}
g(x^{n+1}, \lambda^{n+1}) = 0 \\\
h(x^{n+1}, \lambda^{n+1}) = 0
\end{aligned}
$$

Линеаризовываем их относительно $x^{n+1}$ и $\lambda^{n+1}$:

Раньше мы писали ${n+1}$, и это означало значение на следующем шаге. Мы сейчас будем искать $x^{n+1}$ и $\lambda^{n+1}$ итеративно. И поэтому будем писать $x^{i}$ и $\lambda^{i}$, где $i$ -- номер итерации. Т.е. $x^{i}$ это приближение к $x^{n+1}$ на $i$-й итерации.

$$
\begin{bmatrix}
K,  &\nabla C^{T}(x^{i}) \\\
\nabla C{(x^{i})}, &\tilde{\alpha}
\end{bmatrix}
\begin{bmatrix}
\Delta x^{i} \\\
\Delta \lambda^{i}
\end{bmatrix} =
\begin{bmatrix}
g(x^{i}, \lambda^{i}) \\\
h(x^{i}, \lambda^{i})
\end{bmatrix}
$$

Где

$$
\begin{aligned}
&K = \partial{g(x^{n+1}, \lambda^{n+1})} / \partial{x^{n+1}}  = \\\
&= M - \Delta t^2 \nabla C(x^{n+1}) \nabla C^{T}(x^{n+1}) \\\
\end{aligned}
$$

Из этого уравнения мы получаем $\Delta x^{i}$ и $\Delta \lambda^{i}$, которые мы используем для улучшения наших приближений:

$$
\begin{aligned}
x^{i+1} = x^{i} + \Delta x^{i} \\\
\lambda^{i+1} = \lambda^{i} + \Delta \lambda^{i}
\end{aligned}
$$

И так делаем пока не сойдемся.
В качестве начального приближения $x^{0} = \tilde{x}$ и $\lambda^{0} = 0$.

Проблема этого метода в том, что его не всегда просто реализовать. Нужно расчитывать матрицу $K$
у которой второе слагаемое -- Гессиан функции $C(x)$. Это сложно.

#### Упрощаем

- Гессиан ограничений дает поправку как $O(\Delta t^2)$. Это мало. Мы можем его просто выкинуть. Тогда $K = M$. Это константная матрица масс, которая известна с самого начала.
- $g(x^{i}, \lambda^{i}) = 0$.
  Для начальных условий $g(x^{0}, \lambda^{0}) = 0$.
  Остальные итерации изменяют $g$ на малую величину, которая зависит от изменения градиента ограничений. Если ограничение линейное, то $g(x^{i}, \lambda^{i}) = 0$ всегда.

И вот мы получаем простую систему уравнений:

$$
\begin{bmatrix}
M, &\nabla C^{T}(x^{i}) \\\
\nabla C{(x^{i})}, &\tilde{\alpha}
\end{bmatrix}
\begin{bmatrix}
\Delta x^{i} \\\
\Delta \lambda^{i}
\end{bmatrix} =
\begin{bmatrix}
0 \\\
h(x^{i}, \lambda^{i})
\end{bmatrix}
$$

Переписав уравнения в удобной форме получаем:

$$
\begin{equation}
\begin{bmatrix}
\nabla C(x^{i}) M^{-1} \nabla C^{T}(x^{i}) + \tilde{\alpha}
\end{bmatrix}
\Delta \lambda = -C(x^{i}) - \tilde{\alpha} \lambda^{i}
\end{equation}
$$

$$
\begin{equation}
\Delta x = M^{-1} \nabla C^{T}(x^{i}) \Delta \lambda
\end{equation}
$$

{{< /details >}}

### Конец уже близок

В уравнении (3) мы имеем систему линейных уравнений относительно $\Delta \lambda$. Последнее что нужно сделать это решить ее.
Для этого можно использовать  Gauss-Seidel итерации, который уде использовали в PBD.
Если у нас матрица complience диагональная, то каждую $\Delta \lambda$ можно искать вот так:

$$
\begin{equation}
\Delta \lambda_{j} = -\frac{C_{j}(x^{i}) - \tilde{\alpha_{j}} \lambda_{j}^{i}}{\nabla C_{j} M^{-1} \nabla C_{j}^{T} + \tilde{\alpha_{j}}}
\end{equation}
$$

$$
\begin{equation}
\Delta x = M^{-1} \nabla C^{T}(x^{i}) \Delta \lambda
\end{equation}
$$

Где $\tilde{\alpha_{j}}$ это коэффициент compliance(обратная жесткость) для $j$-го ограничения.

И вот наконец-то мы приходим к финальной схеме:
Расчитываем $\Delta \lambda$ по формуле (5), а потом по формуле (4) находим $\Delta x$ И смещаем нужные точки.
И так для каждого ограничения. И повторяем нужное количество итераций.
Что самое крутое, так это то, что для абсолютно жесткого ограничения где $\alpha = 0$ мы получаем PBD если занулим $\alpha$ в формуле (5)

{{< include_sketch path="constraints/sketch/xpbd_cloth_sketch.js" base_name="xpbd_cloth_sketch" >}}

После 10 итераций зависимости жесткости от количества итераций практически нет. И мы можем спокойно настраивать жесткость ткани.

> Коэффициент compliance $\alpha$ для обычной симуляции достаточно маленький. В этой симуляции я делю пользовательское число на 5000. Так что если у вас что-то не работает, то попробуйте уменьшить это число.

Еще из приятностей. У нас есть $\lambda$, с помощью которой можно найти силу ограничения.
И это позволяет делать ограничения, которые можно отключать если силы ограничения становятся слишком большими.

### Дампинг

{{<details title="Дампинг" closed="true">}}
Дампинг здесь вводится через потенциал диссипации энергии.

$$
D(x, v) = \frac{1}{2} \dot{C}(x)^T \beta \dot{C}(x) = \frac{1}{2} v^T*\nabla C(x)^T \beta \nabla C(x) * v
$$

Где $\beta$ это матрица дампинга.

Сила дампинга равна:

$$
f = -\frac{\partial D(x, v)^T}{\partial v} = -\nabla C(x)^T \beta \nabla C(x) * v
$$

Точно также здесь можно ввести переменную $\lambda_{damp}$:

$$
\lambda_{damp} = -\tilde{\beta} \nabla C(x) * v
$$

Где $\tilde{\beta} = \frac{\beta}{\Delta t^2}$

Дальше мы делаем очень крутой переход. Сила дампинга должна быть сонаправлена с силой самого ограничения. Поэтому мы можем просто сложить $\lambda_{elastic}$ и $\lambda_{damp}$ и получить общую силу ограничения.

$$
\lambda = \lambda_{elastic} + \lambda_{damp} = -\tilde{\alpha} \nabla C(x) - \tilde{\beta} \nabla C(x) * v
$$

$$
h(x, \lambda) = C(x) + \tilde{\alpha} \lambda + \tilde{\alpha}\tilde{\beta} \nabla C(x) * v = 0
$$

Подставляя это в уравнение (3) и линеаризуя получаем:

$$
\left[\mathbf{I} + \frac{\tilde{\alpha} \tilde{\beta}}{\Delta t} \nabla \mathbf{C}(\mathbf{x}\_i) \mathbf{M}^{-1} \nabla \mathbf{C}(\mathbf{x}\_i)^{\mathrm{T}} + \tilde{\alpha}\right] \Delta \boldsymbol{\lambda} = -\mathbf{h}(\mathbf{x}\_i, \boldsymbol{\lambda}\_i)
$$

И в итоге получаем вот такое решение для $\Delta \lambda$:

{{< /details >}}

Если матрица compliance и дампинга диагональная, то получаем вот такую формулу:

$$
\begin{equation}
\Delta \lambda_j = \frac{-C_j(\mathbf{x}_i) - \tilde{\alpha}_j \lambda_j - \gamma_j \nabla C_j (\mathbf{x}_i - \mathbf{x}^n)}{(1 + \gamma_j) \nabla C_j \mathbf{M}^{-1} \nabla C_j^{\mathrm{T}} + \tilde{\alpha}_j}
\end{equation}
$$

Где

$$
\gamma = \frac{\tilde{\alpha} \tilde{\beta}}{\Delta t}
$$

Выглядит суперстремно, но тут все очень легко считается.

## SmallSteps

SmallSteps это режим работы XPBD, который был описан в [статье](#smallsteps_article) в 2019 году.


Используется тут [warp NVIDIA](https://github.com/NVIDIA/warp/blob/main/warp/sim/integrator_xpbd.py)

По дефолту используется в PhysX.

Я не знаю почему, но разработчики решили назвать этот солвер Temporal Gauss-Seidel (TGS).

## Источники

- Оригинальная статья [XPBD](https://matthias-research.github.io/pages/publications/XPBD.pdf)
- [Статья](https://ep.liu.se/ecp/019/005/ecp01905.pdf) в которой рассказывают почему квадратичный потенциал хорошо подходит для ограничений
- [Статья](https://www.cs.columbia.edu/cg/pdfs/131-ESIC.pdf) в которой рассказывают почему можно обнулять $g(x^{i}, \lambda^{i})$ в XPBD и как это влияет на результат
- Про потенциал диссипации энергии [тут](https://en.wikipedia.org/wiki/Rayleigh_dissipation_function)
- <a id="smallsteps_article"></a> Оригинальная статья [SmallSteps](https://www.cs.columbia.edu/cg/pdfs/131-ESIC.pdf)
