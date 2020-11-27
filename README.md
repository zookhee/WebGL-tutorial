# WeblGL Tutorial

## 2020-1학기 컴퓨터 그래픽스 Final Project
201620894 김연교

## Dice : 큐브 상에 texture mapping 을 이용한 주사위 만들기
![html](https://user-images.githubusercontent.com/30920480/100296072-9dac1100-2fce-11eb-99b7-e6ccd0948cf1.png)

gl-matrix를 사용해 큐브에 주사위를 image texture mapping 했다. <br>
실제로 주사위가 굴려지는 animation을 추가해보고 싶었지만 외부 모듈을 사용해야한다고 해서 패스하고 단순 rotate만 넣었다.

## 기본 정보
큐브 상에 dice 이미지를 image texture mapping 해서 실제 주사위와 같은 모양으로 보이게 구현했다.<br><br>
![dice](https://user-images.githubusercontent.com/30920480/100296075-a13f9800-2fce-11eb-8568-96b86b848ea5.gif)
(다음과 같은 gif를 cube에 image texture mapping 한다.)


![dicecube](https://user-images.githubusercontent.com/30920480/100296144-ccc28280-2fce-11eb-967e-6c2522dc9adb.png)<br>
(Cube에 Image texture mapping 한 결과물.)

Canvas Size : 600 X 600

gl-matrix.js 참조함.


## 기능

randomly rotate the dice 버튼을 이용해 주사위를 새로 굴릴 수 있다.	

+-translate 버튼들을 통해 dice의 translation 을 수행할 수있다.



## Reference
https://docs.tizen.org/application/web/guides/w3c/supplement/webgl/


## 보너스 Earth : 구 상에 texture mapping 을 통한 지구 모형 만들기. <- 그냥 한번 해본것..

![html2](https://user-images.githubusercontent.com/30920480/100296281-1a3eef80-2fcf-11eb-8908-b4b1ff8f5930.png)

이번학기 WebGL 수업에서 구를 표현하는 것을 배운적이 없기 때문에 구 상에 image texture mapping을 해봤다. 

다만 external module을 사용해야하기 때문에 Final Project로는 시도하지 못하고 그냥 한번 해본것..

Earth 구현 레퍼런스 : https://codepen.io/ktmpower/pen/ZbGRpW

