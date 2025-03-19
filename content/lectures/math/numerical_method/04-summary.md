---
title: 4. Summary
author: Роман Козак
type: docs
prev: 
next: 
toc: true
math: true
---



<div>
По итогу 


<table class="table">
  <thead>
    <tr>
      <th scope="col">Метод</th>
      <th scope="col">Cхема</th>
      <th scope="col">Точность</th>
      <th scope="col">Применение</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row"> Explicit Euler </th>
        <td>
        $$
        x_{k+1} = x_k + \dot{x}_k\Delta t
        $$
        </td>
        <td>
            O($\Delta t$)
        </td>
        <td>
            Не используйте. Даже простая пружинка может уйти в бесконечность
        </td>
    </tr>
    <tr>
      <th scope="row">Implicit Euler</th>
        <td>
        $$
        x_{k+1} = x_k + \dot{x}_{k+1}\Delta t
        $$
        </td>
        <td>
            O($\Delta t$)
        </td>
        <td>
            Хорошо подходит для жестких систем. Но требует решения системы уравнений
        </td>
    </tr>
    <tr>
      <th scope="row">Symplectic Euler</th>
      <td>
      $$
        \begin{equation*}
            \begin{split}
                &v_{k+1} = v_k + a_k\Delta t \\\
                &x_{k+1} = x_k + v_{k+1}\Delta t
            \end{split}
        \end{equation*}
        $$
      </td>
      <td>
        O($\Delta t$)
      </td>
        <td>
            Хорошо подходит для симуляции твердых тел
        </td>
    </tr>
    <tr>
      <th scope="row"> Vanila Verlet</th>
        <td>
        $$
        x_{k+1} = 2x_k - x_{k-1} + a_k\Delta t^2\\
        $$
        </td>
        <td>
            O($\Delta t^3$)
        </td>
        <td>
            Хорошо подходит для симуляции материальных точек
        </td>
    </tr>
    <tr>
      <th scope="row"> Velocity Verlet </th>
        <td>
            $$
            \begin{equation*}
                \begin{split}
                    &v_{k+1} = v_k + a_k\Delta t\\\
                    &x_{k+1} = x_k + v_{k+1}\Delta t
                \end{split}
            \end{equation*}
            $$
        </td>
        <td>
            O($\Delta t^2$)
        </td>
        <td>
            Хорошо подходит для симуляции материальных точек, где нужна скорость в явном виде
        </td>
    </tr>
  </tbody>
</table>

</div>