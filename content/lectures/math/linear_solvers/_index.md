---
title: 2. Линейные солверы
author: Роман Козак
type: docs
toc: true
math: true
---

## Интро

Для начала условимся на обозначениях.
У нас есть матрица A

$$
A = \begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\\
a_{21} & a_{22} & \cdots & a_{2n} \\\
\vdots & \vdots & \ddots & \vdots \\\
a_{m1} & a_{m2} & \cdots & a_{mn} \\\
\end{pmatrix}
$$

есть вектор неизвестных x

$$
x = \begin{pmatrix}
x_1 \\\
x_2 \\\
\vdots \\\
x_n \\\
\end{pmatrix}
$$

и есть вектор свободных членов b

$$
b = \begin{pmatrix}
b_1 \\\
b_2 \\\
\vdots \\\
b_m \\\
\end{pmatrix}
$$

И у нас получается система линейных уравнений

$$
Ax = b
$$

Мы хотим найти x.

## Jacobi

{{< include_base_sketch base_name="jacobi" path="math/linear_solvers/linear_solvers.js" >}}

