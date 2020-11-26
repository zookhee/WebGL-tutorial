# WeblGL Tutorial

## 2020-1학기 컴퓨터 그래픽스 Final Project
201620894 김연교

## Dice : 큐브 상에 texture mapping 을 이용한 주사위 만들기
![html](/uploads/47f9e516fff7db777cf03039ef98f9bd/html.png)

gl-matrix를 사용해 큐브에 주사위를 image texture mapping 했다. <br>
실제로 주사위가 굴려지는 animation을 추가해보고 싶었지만 외부 모듈을 사용해야한다고 해서 패스하고 단순 rotate만 넣었다.

## 기본 정보
큐브 상에 dice 이미지를 image texture mapping 해서 실제 주사위와 같은 모양으로 보이게 구현했다.<br><br>
![dice](/uploads/6a8e07634b1804cb3fec79b55dd0847f/dice.gif)
(다음과 같은 gif를 cube에 image texture mapping 한다.)


![dicecube](/uploads/a006962372e8aa3ea3571d7be0d7de2e/dicecube.png)<br>
(Cube에 Image texture mapping 한 결과물.)

Canvas Size : 600 X 600

gl-matrix.js 참조함.


## 기능

randomly rotate the dice 버튼을 이용해 주사위를 새로 굴릴 수 있다.	

+-translate 버튼들을 통해 dice의 translation 을 수행할 수있다.

## 코드 구조
따로 script.js 를 생성하지 않고 html 코드 안에 script 코드를 넣어주었다. https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L56

순서는 glContext 생성 -> initShaders(); ->initBuffers() -> drawScene() -> initTexture() 이다.

glContext 생성 https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L79

initShaders(); https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L97

initBuffers(); https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L149

drawScene(); https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L195

initTexture(); https://git.ajou.ac.kr/zookhee/weblgl-tutorial/-/blob/master/1.Dice/index.html#L140

## Reference
https://docs.tizen.org/application/web/guides/w3c/supplement/webgl/


## 보너스 Earth : 구 상에 texture mapping 을 통한 지구 모형 만들기. <- 그냥 한번 해본것..
이번학기 WebGL 수업에서 구를 표현하는 것을 배운적이 없기 때문에 구 상에 image texture mapping을 해봤다. 다만 external module을 사용해야하기 때문에 Final Project로는 시도하지 못하고 그냥 한번 해본것..
Earth 구현 레퍼런스 : https://codepen.io/ktmpower/pen/ZbGRpW

