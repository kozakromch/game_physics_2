---
title: 4. Жидкости и прочее
author: Роман Козак
credential:
type: docs
prev: 
next: 
toc: true
math: true
---
{{< add_script "js/fluids/stable_fluids.js" >}}
{{< add_script "js/fluids/velocity_field.js" >}}

{{< image path="images/fluids/frog.excalidraw.png" >}}

## Intro
Даже не знаю какое тут интро может быть. Жидкости это круто. Надо научиьбся их симулировать. Первый вопрос который возникает -- как описывать жидкости?

### Микроскопический подход
Жидкости и газы представляют из себя супер много частиц, которые взаимодействуют между собой. 

И в данном контексте мы можем говорить о характеристиках конкретной частицы, например о ее скорости или расстояние до других частиц.

{{< image path="images/fluids/molecules.excalidraw.png" >}}

Такая точка зрения называется микроскопической.

Никто не пытается симулировать жидкости на микроскопическом уровне. Это было бы чистым сумасшествием. Хотя, а вдруг когда-нибудь получится?

### Макроскопический подход
Когда мы немножечко отдаляемся от этих молекул, то картина становится непрерывной. Мы можем говорить о скорости в каждой точке пространства. 
Так же появляется смысл говорить о давлении, плотности и температуре. 

{{< image path="images/fluids/macroscopic.excalidraw.png" >}}

Методы которые симулируют на макроскопическом уровне в основном решают уравнение Навье-Стокса численно.

### Что-то между
На английском такой подход иногда называют mesoscopic. Он основан на уравнении Больцамана, что мы можем смотреть на макроскопические параметры системы: температура и концентрация и по этим параметрам прикинуть скорости и позиции частиц.
