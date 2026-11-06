/* 자동 생성 (생성기: 저장소 밖). 정답·해설은 DB learn_items 에만 있다 */
import type { Item } from "./types";

export const POLY_ITEMS: Item[] = [
 {
  "key": "poly.b01",
  "stage": "basic",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "두 다항식 $A=2 x^{2} - x + 3$, $B=x^{2} + 4 x - 2$에 대하여 $A+B$를 계산했을 때, $x$의 계수는?",
  "hints": [
   "$A+B$는 $A$, $B$에 식을 대입한 뒤 동류항끼리 모으면 돼.",
   "먼저 각각 정리해: $A=2 x^{2} - x + 3$, $B=x^{2} + 4 x - 2$",
   "$x$의 계수만 모으면 $(-1)+(4)$야."
  ],
  "choices": [
   "-5",
   "-3",
   "-1",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.b02",
  "stage": "basic",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "두 다항식 $A=x^{2} + 3 x - 5$, $B=2 x^{2} - x + 1$에 대하여 $A-B$를 계산했을 때, 상수항은?",
  "hints": [
   "$A-B$는 $A$, $B$에 식을 대입한 뒤 동류항끼리 모으면 돼.",
   "먼저 각각 정리해: $A=x^{2} + 3 x - 5$, $B=2 x^{2} - x + 1$ (빼는 거니까 부호를 모두 바꿔서 더해)",
   "상수항만 모으면 $(-5)+(-1)$이야."
  ],
  "choices": [
   "-7",
   "-6",
   "-5",
   "-4",
   "6"
  ]
 },
 {
  "key": "poly.b03",
  "stage": "basic",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "$(x + 2)(x^{2} - 3 x + 4)$를 전개했을 때, $x^2$의 계수는?",
  "hints": [
   "다 전개할 필요 없어. 차수를 더해서 원하는 차수가 되는 항끼리만 곱하면 돼.",
   "차수 합이 2가 되는 짝을 찾아: (0차, 2차), (1차, 1차)",
   "$(2)\\times(x^2)+(x)\\times(-3x)$를 계산해."
  ],
  "choices": [
   "-2",
   "-1",
   "0",
   "1",
   "2"
  ]
 },
 {
  "key": "poly.b04",
  "stage": "basic",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "$a+b=5$, $ab=3$일 때, $a^2+b^2$의 값은?",
  "hints": [
   "$(a+b)^2$을 전개하면 $a^2+b^2$이 들어 있어.",
   "$(a+b)^2=a^2+2ab+b^2$이니까 $a^2+b^2=(a+b)^2-2ab$야.",
   "$5^2-2\\times3$을 계산해."
  ],
  "choices": [
   "19",
   "20",
   "22",
   "25",
   "31"
  ]
 },
 {
  "key": "poly.b05",
  "stage": "basic",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "$a-b=3$, $ab=2$일 때, $a^2+b^2$의 값은?",
  "hints": [
   "이번엔 $(a-b)^2$을 이용해.",
   "$(a-b)^2=a^2-2ab+b^2$이니까 $a^2+b^2=(a-b)^2+2ab$야.",
   "$3^2+2\\times2$"
  ],
  "choices": [
   "5",
   "9",
   "11",
   "13",
   "14"
  ]
 },
 {
  "key": "poly.b06",
  "stage": "basic",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "$(x+2)^3$을 전개했을 때, $x$의 계수는?",
  "hints": [
   "$(a+b)^3=a^3+3a^2b+3ab^2+b^3$ 공식을 써.",
   "$a=x$, $b=2$를 넣어.",
   "전개하면 $x^{3} + 6 x^{2} + 12 x + 8$이야."
  ],
  "choices": [
   "-12",
   "6",
   "8",
   "12",
   "13"
  ]
 },
 {
  "key": "poly.b07",
  "stage": "basic",
  "tag": "poly.div",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} - 2 x^{2} + 3 x + 4$를 $x-1$로 나누었을 때, 나머지는?",
  "hints": [
   "일차식 $x-a$로 나눌 때는 조립제법이 제일 빨라.",
   "조립제법 왼쪽에 $1$을 쓰고, 계수 $1, -2, 3, 4$를 차례로 내려 써.",
   "조립제법 결과: 몫의 계수 1, -1, 2, 나머지 6"
  ],
  "choices": [
   "-2",
   "2",
   "5",
   "6",
   "7"
  ]
 },
 {
  "key": "poly.b08",
  "stage": "basic",
  "tag": "poly.div",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)=2 x^{3} + x^{2} - 5 x + 3$을 $x-2$로 나누었을 때, 몫의 상수항은?",
  "hints": [
   "일차식 $x-a$로 나눌 때는 조립제법이 제일 빨라.",
   "조립제법 왼쪽에 $2$를 쓰고, 계수 $2, 1, -5, 3$을 차례로 내려 써.",
   "조립제법 결과: 몫의 계수 2, 5, 5, 나머지 13"
  ],
  "choices": [
   "1",
   "5",
   "6",
   "12",
   "13"
  ]
 },
 {
  "key": "poly.b09",
  "stage": "basic",
  "tag": "poly.div",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x - 2$로 나누었을 때의 몫이 $x + 3$, 나머지가 $4$이다. $P(1)$의 값은?",
  "hints": [
   "나눗셈의 기본: (나누어지는 식) = (나누는 식)×(몫)+(나머지)",
   "$P(x)=(x - 2)(x + 3)+(4)$",
   "$x=1$을 넣으면 $(-1)\\times(4)+(4)$"
  ],
  "choices": [
   "-4",
   "0",
   "1",
   "4",
   "8"
  ]
 },
 {
  "key": "poly.b10",
  "stage": "basic",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $(x+2)(ax+b)=3 x^{2} + 5 x - 2$가 $x$에 대한 항등식일 때, $a+b$의 값은?",
  "hints": [
   "왼쪽을 전개해서 오른쪽과 계수를 비교해 (계수비교법).",
   "왼쪽 $=ax^2+(2a+b)x+2b$",
   "$x^2$ 계수: $a=3$, 상수항: $2b=-2$"
  ],
  "choices": [
   "-3",
   "2",
   "3",
   "4",
   "5"
  ]
 },
 {
  "key": "poly.b11",
  "stage": "basic",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $(a+b-5)x+(a-b-1)=0$이 $x$에 대한 항등식일 때, $ab$의 값은?",
  "hints": [
   "$px+q=0$이 모든 $x$에서 성립하려면 $p=0$, $q=0$이어야 해.",
   "$a+b=5$, $a-b=1$인 연립방정식이야.",
   "두 식을 더하면 $2a=6$"
  ],
  "choices": [
   "-6",
   "1",
   "5",
   "6",
   "7"
  ]
 },
 {
  "key": "poly.b12",
  "stage": "basic",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} - 3 x + 5$를 $x-2$로 나누었을 때의 나머지는?",
  "hints": [
   "나머지정리: $P(x)$를 $x-a$로 나눈 나머지는 $P(a)$야.",
   "$x-2=0$이 되는 $x$값은 $2$야.",
   "$P(2)$를 계산해."
  ],
  "choices": [
   "3",
   "5",
   "6",
   "7",
   "8"
  ]
 },
 {
  "key": "poly.b13",
  "stage": "basic",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^3-2x^2+kx-6$이 $x-3$으로 나누어떨어지도록 하는 상수 $k$의 값은?",
  "hints": [
   "인수정리: $P(x)$가 $x-a$로 나누어떨어지면 $P(a)=0$이야.",
   "$x=3$을 넣은 값이 0이 되어야 해.",
   "$P(3)=3 k + 3=0$을 $k$에 대해 풀어."
  ],
  "choices": [
   "-17",
   "-2",
   "-1",
   "0",
   "1"
  ]
 },
 {
  "key": "poly.b14",
  "stage": "basic",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "이차식 $f(x)=x^{2} + 7 x + 10$이 $(x+p)(x+q)$로 인수분해될 때, $q-p$의 값은? (단, $p<q$)",
  "hints": [
   "곱해서 상수항, 더해서 $x$의 계수가 되는 두 수를 찾아.",
   "곱이 $10$, 합이 $7$인 두 수야.",
   "두 수는 $2$와 $5$야."
  ],
  "choices": [
   "2",
   "3",
   "4",
   "7",
   "10"
  ]
 },
 {
  "key": "poly.b15",
  "stage": "basic",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 1,
  "qtype": "mc",
  "body": "$x^3+8$을 바르게 인수분해한 것은?",
  "hints": [
   "$a^3+b^3$의 인수분해 공식을 떠올려.",
   "$a^3+b^3=(a+b)(a^2-ab+b^2)$야. 가운데 부호가 반대인 걸 조심해.",
   "$a=x$, $b=2$를 넣어."
  ],
  "choices": [
   "$(x-2)(x^2+2x+4)$",
   "$(x+2)(x^2-2x+4)$",
   "$(x+2)(x^2+2x+4)$",
   "$(x+2)^3$",
   "$(x+2)(x^2-4x+4)$"
  ]
 },
 {
  "key": "poly.t11",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "두 다항식 $A=3 x^{2} - 2 x + 1$, $B=x^{2} + x - 4$에 대하여 $2A-3B$를 계산했을 때, $x$의 계수는?",
  "hints": [
   "$2A-3B$는 $A$, $B$에 식을 대입한 뒤 동류항끼리 모으면 돼.",
   "먼저 각각 정리해: $2A=6 x^{2} - 4 x + 2$, $3B=3 x^{2} + 3 x - 12$ (빼는 거니까 부호를 모두 바꿔서 더해)",
   "$x$의 계수만 모으면 $(-4)+(-3)$이야."
  ],
  "choices": [
   "-7",
   "-6",
   "-4",
   "-1",
   "7"
  ]
 },
 {
  "key": "poly.t12",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "두 다항식 $A$, $B$에 대하여 $A+B=3 x^{2} + 2 x + 2$, $A-B=x^{2} - 4 x + 4$일 때, 다항식 $A$의 상수항은?",
  "hints": [
   "두 식을 더하면 $B$가 사라져. 연립방정식이랑 똑같아.",
   "$(A+B)+(A-B)=2A$야. 두 식을 더해 봐.",
   "$2A=4 x^{2} - 2 x + 6$이니까 2로 나누면 $A$가 나와."
  ],
  "choices": [
   "-1",
   "2",
   "3",
   "4",
   "5"
  ]
 },
 {
  "key": "poly.t13",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "$(2 x^{2} - x + 3)(x^{2} + 4 x - 2)$를 전개했을 때, $x^2$의 계수는?",
  "hints": [
   "다 전개할 필요 없어. 차수를 더해서 원하는 차수가 되는 항끼리만 곱하면 돼.",
   "차수 합이 2가 되는 짝을 찾아: (0차, 2차), (1차, 1차), (2차, 0차)",
   "$(3)\\times(x^2)+(-x)\\times(4x)+(2x^2)\\times(-2)$를 계산해."
  ],
  "choices": [
   "-5",
   "-4",
   "-2",
   "3",
   "5"
  ]
 },
 {
  "key": "poly.t14",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "세 다항식 $A=x^{2} - 2 x + 3$, $B=2 x^{2} + x - 1$, $C=- x^{2} + 3 x + 2$에 대하여 $X-(A-2B)=C$를 만족시키는 다항식 $X$의 모든 계수의 합은?",
  "hints": [
   "방정식처럼 $X$만 남기고 나머지를 오른쪽으로 넘겨.",
   "$X=C+(A-2B)$야. 괄호 앞의 부호를 조심해.",
   "모든 계수의 합은 $x=1$을 넣은 값이야. $X(1)=C(1)+A(1)-2B(1)$로 계산해도 돼."
  ],
  "choices": [
   "-2",
   "2",
   "3",
   "6",
   "10"
  ]
 },
 {
  "key": "poly.t15",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "두 다항식 $A$, $B$에 대하여 $A+B=- x^{2} + 5 x + 2$, $A-B=3 x^{2} + 3 x - 8$일 때, 다항식 $A$의 $x$의 계수는?",
  "hints": [
   "두 식을 더하면 $B$가 사라져. 연립방정식이랑 똑같아.",
   "$(A+B)+(A-B)=2A$야. 두 식을 더해 봐.",
   "$2A=2 x^{2} + 8 x - 6$이니까 2로 나누면 $A$가 나와."
  ],
  "choices": [
   "1",
   "3",
   "4",
   "5",
   "6"
  ]
 },
 {
  "key": "poly.t16",
  "stage": "type",
  "tag": "poly.ops",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "$(x^{2} - 2 x + 1)(3 x^{3} - x + 2)$를 전개했을 때, $x^3$의 계수는?",
  "hints": [
   "다 전개할 필요 없어. 차수를 더해서 원하는 차수가 되는 항끼리만 곱하면 돼.",
   "차수 합이 3가 되는 짝을 찾아: (0차, 3차), (2차, 1차)",
   "$(1)\\times(3x^3)+(x^2)\\times(-x)$를 계산해."
  ],
  "choices": [
   "-2",
   "1",
   "2",
   "3",
   "5"
  ]
 },
 {
  "key": "poly.t21",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "$a+b=4$, $ab=-3$일 때, $a^2+b^2$의 값은?",
  "hints": [
   "$(a+b)^2$을 전개하면 $a^2+b^2$이 들어 있어.",
   "$(a+b)^2=a^2+2ab+b^2$이니까 $a^2+b^2=(a+b)^2-2ab$야.",
   "$4^2-2\\times(-3)$을 계산해."
  ],
  "choices": [
   "10",
   "16",
   "19",
   "22",
   "23"
  ]
 },
 {
  "key": "poly.t22",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$a+b=3$, $ab=1$일 때, $a^3+b^3$의 값은?",
  "hints": [
   "$(a+b)^3$을 전개하면 $a^3+b^3$과 나머지 항이 나와.",
   "$(a+b)^3=a^3+b^3+3ab(a+b)$야.",
   "$a^3+b^3=(a+b)^3-3ab(a+b)=3^3-3\\times(1)\\times3$"
  ],
  "choices": [
   "17",
   "18",
   "19",
   "24",
   "36"
  ]
 },
 {
  "key": "poly.t23",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$x+\\dfrac{1}{x}=4$일 때, $x^2+\\dfrac{1}{x^2}$의 값은? (단, $x\\neq0$)",
  "hints": [
   "$a+b$, $ab$를 알면 $a^2+b^2$을 구할 수 있었지? 여기서 $a=x$, $b=\\dfrac{1}{x}$야.",
   "$x\\cdot\\dfrac{1}{x}=1$이야.",
   "$4^2-2\\times1$을 계산해."
  ],
  "choices": [
   "13",
   "14",
   "15",
   "16",
   "18"
  ]
 },
 {
  "key": "poly.t24",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$x+\\dfrac{1}{x}=3$일 때, $x^3+\\dfrac{1}{x^3}$의 값은? (단, $x\\neq0$)",
  "hints": [
   "$a=x$, $b=\\dfrac{1}{x}$로 보면 $ab=1$이야. $a^3+b^3$ 공식을 써 봐.",
   "$a^3+b^3=(a+b)^3-3ab(a+b)$에서 $ab=1$이야.",
   "$3^3-3\\times3$을 계산해."
  ],
  "choices": [
   "18",
   "19",
   "24",
   "27",
   "36"
  ]
 },
 {
  "key": "poly.t25",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$a+b+c=5$, $ab+bc+ca=7$일 때, $a^2+b^2+c^2$의 값은?",
  "hints": [
   "$(a+b+c)^2$을 전개해 봐.",
   "$(a+b+c)^2=a^2+b^2+c^2+2(ab+bc+ca)$야.",
   "$5^2-2\\times(7)$을 계산해."
  ],
  "choices": [
   "11",
   "12",
   "18",
   "25",
   "39"
  ]
 },
 {
  "key": "poly.t26",
  "stage": "type",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$a+b=2$, $ab=-3$일 때, $a^3+b^3$의 값은?",
  "hints": [
   "$(a+b)^3$을 전개하면 $a^3+b^3$과 나머지 항이 나와.",
   "$(a+b)^3=a^3+b^3+3ab(a+b)$야.",
   "$a^3+b^3=(a+b)^3-3ab(a+b)=2^3-3\\times(-3)\\times2$"
  ],
  "choices": [
   "-10",
   "14",
   "17",
   "26",
   "27"
  ]
 },
 {
  "key": "poly.t31",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} + 3 x^{2} - 2 x + 5$를 $x+2$로 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$이라 하자. $Q(1)+R$의 값은?",
  "hints": [
   "일차식 $x-a$로 나눌 때는 조립제법이 제일 빨라.",
   "조립제법 왼쪽에 $-2$를 쓰고, 계수 $1, 3, -2, 5$를 차례로 내려 써.",
   "조립제법 결과: 몫의 계수 1, 1, -4, 나머지 13"
  ],
  "choices": [
   "-4",
   "-2",
   "11",
   "13",
   "21"
  ]
 },
 {
  "key": "poly.t32",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} + 2 x^{2} - 3 x + 4$를 $x^{2} - x + 2$로 나누었을 때의 나머지를 $ax+b$라 할 때, $a+b$의 값은?",
  "hints": [
   "이차식으로 나누면 나머지는 일차 이하야. 직접 나눗셈을 해 봐.",
   "몫의 첫 항은 $x$야. 이걸 나누는 식에 곱해서 빼는 과정을 반복해.",
   "몫은 $x + 3$이 돼."
  ],
  "choices": [
   "-4",
   "-3",
   "-2",
   "0",
   "4"
  ]
 },
 {
  "key": "poly.t33",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x^{2} - 1$로 나누었을 때의 몫이 $x + 2$, 나머지가 $3 x - 1$이다. $P(2)$의 값은?",
  "hints": [
   "나눗셈의 기본: (나누어지는 식) = (나누는 식)×(몫)+(나머지)",
   "$P(x)=(x^{2} - 1)(x + 2)+(3 x - 1)$",
   "$x=2$를 넣으면 $(3)\\times(4)+(5)$"
  ],
  "choices": [
   "5",
   "9",
   "12",
   "17",
   "18"
  ]
 },
 {
  "key": "poly.t34",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)=2 x^{4} - 3 x^{3} + x - 4$를 $x-2$로 나누었을 때, 나머지는?",
  "hints": [
   "일차식 $x-a$로 나눌 때는 조립제법이 제일 빨라.",
   "조립제법 왼쪽에 $2$를 쓰고, 계수 $2, -3, 0, 1, -4$를 차례로 내려 써.",
   "조립제법 결과: 몫의 계수 2, 1, 2, 5, 나머지 6"
  ],
  "choices": [
   "5",
   "6",
   "7",
   "10",
   "50"
  ]
 },
 {
  "key": "poly.t35",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)=2 x^{4} - x^{3} + 3 x + 1$을 $x^{2} + x - 1$로 나누었을 때의 나머지를 $ax+b$라 할 때, $a+b$의 값은?",
  "hints": [
   "이차식으로 나누면 나머지는 일차 이하야. 직접 나눗셈을 해 봐.",
   "몫의 첫 항은 $2 x^{2}$이야. 이걸 나누는 식에 곱해서 빼는 과정을 반복해.",
   "몫은 $2 x^{2} - 3 x + 5$가 돼."
  ],
  "choices": [
   "-11",
   "-5",
   "1",
   "4",
   "6"
  ]
 },
 {
  "key": "poly.t36",
  "stage": "type",
  "tag": "poly.div",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x^{2} + x - 2$로 나누었을 때의 몫이 $2 x - 1$, 나머지가 $x + 5$이다. $P(-1)$의 값은?",
  "hints": [
   "나눗셈의 기본: (나누어지는 식) = (나누는 식)×(몫)+(나머지)",
   "$P(x)=(x^{2} + x - 2)(2 x - 1)+(x + 5)$",
   "$x=-1$을 넣으면 $(-2)\\times(-3)+(4)$"
  ],
  "choices": [
   "1",
   "4",
   "6",
   "10",
   "11"
  ]
 },
 {
  "key": "poly.t41",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "등식 $a(x-1)^2+b(x-1)+c=x^{2} + 3 x + 5$가 $x$에 대한 항등식일 때, $a+b+c$의 값은? (단, $a$, $b$, $c$는 상수)",
  "hints": [
   "항등식은 $x$에 어떤 값을 넣어도 성립해. 계산하기 쉬운 값을 넣어 봐.",
   "$x-1$이 간단해지는 값을 골라. 예를 들어 $x=1$이면 $x-1=0$",
   "$x=2$를 넣으면 왼쪽이 $a+b+c$가 돼."
  ],
  "choices": [
   "9",
   "10",
   "14",
   "15",
   "16"
  ]
 },
 {
  "key": "poly.t42",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "등식 $a(x-2)^2+b(x-2)+c=2 x^{2} - x + 4$가 $x$에 대한 항등식일 때, $b$의 값은? (단, $a$, $b$, $c$는 상수)",
  "hints": [
   "항등식은 $x$에 어떤 값을 넣어도 성립해. 계산하기 쉬운 값을 넣어 봐.",
   "$x-2$가 간단해지는 값을 골라. 예를 들어 $x=2$이면 $x-2=0$",
   "$x=2$를 넣으면 $c=10$, 이차항 비교로 $a=2$야. 남은 건 $x$의 계수 비교."
  ],
  "choices": [
   "5",
   "7",
   "10",
   "12",
   "17"
  ]
 },
 {
  "key": "poly.t43",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "등식 $(x-3)(ax+b)=2 x^{2} - x - 15$가 $x$에 대한 항등식일 때, $a+b$의 값은?",
  "hints": [
   "왼쪽을 전개해서 오른쪽과 계수를 비교해 (계수비교법).",
   "왼쪽 $=ax^2+(b-3a)x-3b$",
   "$x^2$ 계수: $a=2$, 상수항: $-3b=-15$"
  ],
  "choices": [
   "-3",
   "-1",
   "7",
   "8",
   "10"
  ]
 },
 {
  "key": "poly.t44",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "등식 $(a+b-7)x+(a-b+3)=0$이 $x$에 대한 항등식일 때, $ab$의 값은?",
  "hints": [
   "$px+q=0$이 모든 $x$에서 성립하려면 $p=0$, $q=0$이어야 해.",
   "$a+b=7$, $a-b=-3$인 연립방정식이야.",
   "두 식을 더하면 $2a=4$"
  ],
  "choices": [
   "-10",
   "-3",
   "7",
   "10",
   "11"
  ]
 },
 {
  "key": "poly.t45",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "등식 $(x^{2} - x + 2)^4=a_0+a_1x+a_2x^2+\\cdots+a_{8}x^{8}$이 $x$에 대한 항등식일 때, $a_0+a_1+a_2+\\cdots+a_{8}$의 값은?",
  "hints": [
   "직접 전개하면 너무 길어. 항등식이니까 $x$에 값을 넣어서 원하는 합을 만들어.",
   "$x=1$, $x=-1$, $x=0$을 넣으면 각각 어떤 합이 나오는지 생각해.",
   "$x=1$을 넣어."
  ],
  "choices": [
   "15",
   "16",
   "17",
   "32",
   "256"
  ]
 },
 {
  "key": "poly.t46",
  "stage": "type",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "등식 $(2 x - 1)^5=a_0+a_1x+a_2x^2+\\cdots+a_{5}x^{5}$이 $x$에 대한 항등식일 때, $a_{0}+a_{2}+a_{4}$의 값은?",
  "hints": [
   "직접 전개하면 너무 길어. 항등식이니까 $x$에 값을 넣어서 원하는 합을 만들어.",
   "$x=1$, $x=-1$, $x=0$을 넣으면 각각 어떤 합이 나오는지 생각해.",
   "$x=1$과 $x=-1$을 넣은 두 식을 더하면 짝수 차수 항만 두 배로 남아."
  ],
  "choices": [
   "-243",
   "-242",
   "-121",
   "-1",
   "1"
  ]
 },
 {
  "key": "poly.t51",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)=2 x^{3} - 3 x^{2} + x - 4$를 $x+1$로 나누었을 때의 나머지는?",
  "hints": [
   "나머지정리: $P(x)$를 $x-a$로 나눈 나머지는 $P(a)$야.",
   "$x+1=0$이 되는 $x$값은 $-1$이야.",
   "$P(-1)$을 계산해."
  ],
  "choices": [
   "-11",
   "-10",
   "-9",
   "-8",
   "-4"
  ]
 },
 {
  "key": "poly.t52",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "다항식 $P(x)=2x^3+kx^2-5x+6$이 $x-2$로 나누어떨어지도록 하는 상수 $k$의 값은?",
  "hints": [
   "인수정리: $P(x)$가 $x-a$로 나누어떨어지면 $P(a)=0$이야.",
   "$x=2$를 넣은 값이 0이 되어야 해.",
   "$P(2)=4 k + 12=0$을 $k$에 대해 풀어."
  ],
  "choices": [
   "-4",
   "-3",
   "-2",
   "0",
   "3"
  ]
 },
 {
  "key": "poly.t53",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x-1$로 나눈 나머지는 $3$, $x-2$로 나눈 나머지는 $5$이다. $P(x)$를 $(x-1)(x-2)$로 나눈 나머지를 $R(x)$라 할 때, $R(4)$의 값은?",
  "hints": [
   "이차식으로 나눈 나머지는 일차 이하야. $R(x)=ax+b$로 놓아.",
   "$P(x)=(x-1)(x-2)Q(x)+ax+b$에 $x=1$, $x=2$를 넣어.",
   "$a+b=3$, $2a+b=5$를 풀어."
  ],
  "choices": [
   "7",
   "8",
   "9",
   "10",
   "15"
  ]
 },
 {
  "key": "poly.t54",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $x^3+ax^2+bx-6$이 $(x-1)(x-2)$로 나누어떨어질 때, $a+b$의 값은? (단, $a$, $b$는 상수)",
  "hints": [
   "두 일차식으로 각각 나누어떨어진다는 뜻이야. 인수정리를 두 번 써.",
   "$P(1)=0$, $P(2)=0$",
   "$P(1)=0$과 $P(2)=0$을 $a$, $b$에 대한 연립방정식으로 풀어."
  ],
  "choices": [
   "-17",
   "-5",
   "5",
   "6",
   "10"
  ]
 },
 {
  "key": "poly.t55",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x+1$로 나눈 나머지는 $7$, $x-3$으로 나눈 나머지는 $-1$이다. $P(x)$를 $(x+1)(x-3)$으로 나눈 나머지를 $R(x)$라 할 때, $R(1)$의 값은?",
  "hints": [
   "이차식으로 나눈 나머지는 일차 이하야. $R(x)=ax+b$로 놓아.",
   "$P(x)=(x+1)(x-3)Q(x)+ax+b$에 $x=-1$, $x=3$을 넣어.",
   "$-a+b=7$, $3a+b=-1$을 풀어."
  ],
  "choices": [
   "-7",
   "2",
   "3",
   "4",
   "6"
  ]
 },
 {
  "key": "poly.t56",
  "stage": "type",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $x^3+ax^2+bx+6$이 $(x+1)(x-3)$으로 나누어떨어질 때, $a+b$의 값은? (단, $a$, $b$는 상수)",
  "hints": [
   "두 일차식으로 각각 나누어떨어진다는 뜻이야. 인수정리를 두 번 써.",
   "$P(-1)=0$, $P(3)=0$",
   "$P(-1)=0$과 $P(3)=0$을 $a$, $b$에 대한 연립방정식으로 풀어."
  ],
  "choices": [
   "-5",
   "-4",
   "-3",
   "-2",
   "3"
  ]
 },
 {
  "key": "poly.t61",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "이차식 $f(x)=x^{2} + 4 x - 21$이 $(x+p)(x+q)$로 인수분해될 때, $q-p$의 값은? (단, $p<q$)",
  "hints": [
   "곱해서 상수항, 더해서 $x$의 계수가 되는 두 수를 찾아.",
   "곱이 $-21$, 합이 $4$인 두 수야.",
   "두 수는 $-3$과 $7$이야."
  ],
  "choices": [
   "-21",
   "4",
   "10",
   "11",
   "12"
  ]
 },
 {
  "key": "poly.t62",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} + 4 x^{2} + x - 6$이 $(x-1)(x^2+ax+b)$로 인수분해될 때, $a+b$의 값은?",
  "hints": [
   "삼차식은 인수정리로 일차 인수를 하나 찾고, 조립제법으로 나눠.",
   "$x=1$을 넣으면 0이 돼. 조립제법으로 $x-1$로 나눠.",
   "몫이 $x^{2} + 5 x + 6$이야."
  ],
  "choices": [
   "-11",
   "-1",
   "11",
   "12",
   "30"
  ]
 },
 {
  "key": "poly.t63",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "$(x^2+2x)^2-2(x^2+2x)-3$을 인수분해하였더니 일차식들의 곱이 되었다. 모든 일차 인수 $x+c$의 상수 $c$의 합은? (같은 인수가 여러 번 곱해지면 그만큼 더한다)",
  "hints": [
   "똑같이 반복되는 덩어리 $x^2+2x$를 $t$로 바꿔 봐 (치환).",
   "$t^2-2t-3$을 먼저 인수분해해.",
   "결과는 $\\left(x - 1\\right) \\left(x + 1\\right)^{2} \\left(x + 3\\right)$이야."
  ],
  "choices": [
   "-4",
   "-3",
   "-2",
   "4",
   "6"
  ]
 },
 {
  "key": "poly.t64",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{4} - 10 x^{2} + 9$가 $(x+a)(x-a)(x+b)(x-b)$로 인수분해될 때, $a^2+b^2$의 값은? (단, $a>0$, $b>0$)",
  "hints": [
   "$x^2$을 $t$로 놓으면 이차식이 돼.",
   "$t^2-10t+9$를 인수분해해.",
   "$(t-1)(t-9)$이고, 각각 $x^2-1=(x+1)(x-1)$처럼 다시 나뉘어."
  ],
  "choices": [
   "3",
   "4",
   "9",
   "10",
   "11"
  ]
 },
 {
  "key": "poly.t65",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)=x^{3} + x^{2} - 10 x + 8$이 $(x-2)(x^2+ax+b)$로 인수분해될 때, $a+b$의 값은?",
  "hints": [
   "삼차식은 인수정리로 일차 인수를 하나 찾고, 조립제법으로 나눠.",
   "$x=2$를 넣으면 0이 돼. 조립제법으로 $x-2$로 나눠.",
   "몫이 $x^{2} + 3 x - 4$야."
  ],
  "choices": [
   "-12",
   "-1",
   "0",
   "1",
   "7"
  ]
 },
 {
  "key": "poly.t66",
  "stage": "type",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 2,
  "qtype": "mc",
  "body": "$x^3+27$을 바르게 인수분해한 것은?",
  "hints": [
   "$a^3+b^3$의 인수분해 공식을 떠올려.",
   "$a^3+b^3=(a+b)(a^2-ab+b^2)$야. 가운데 부호가 반대인 걸 조심해.",
   "$a=x$, $b=3$을 넣어."
  ],
  "choices": [
   "$(x+3)(x^2-6x+9)$",
   "$(x+3)^3$",
   "$(x+3)(x^2-3x+9)$",
   "$(x-3)(x^2+3x+9)$",
   "$(x+3)(x^2+3x+9)$"
  ]
 },
 {
  "key": "poly.c11",
  "stage": "concept",
  "tag": "poly.c1",
  "lesson": "poly.l1",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $3x^4-2x^2+x-7$의 차수는?",
  "hints": [
   "다항식의 차수는 가장 높은 차수의 항으로 정해.",
   "각 항의 차수: $3x^4$은 4차, $-2x^2$은 2차, …",
   "가장 높은 차수를 찾아."
  ],
  "choices": [
   "2",
   "3",
   "4",
   "5",
   "7"
  ]
 },
 {
  "key": "poly.c12",
  "stage": "concept",
  "tag": "poly.c1",
  "lesson": "poly.l1",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $5x^3-x^2+4$에서 $x^2$의 계수는?",
  "hints": [
   "계수는 문자 앞에 곱해진 수야. 부호도 포함해.",
   "$-x^2$은 $(-1)\\times x^2$이야.",
   "그러니까 $x^2$의 계수는 부호까지 붙여서 읽어."
  ],
  "choices": [
   "-2",
   "-1",
   "0",
   "1",
   "5"
  ]
 },
 {
  "key": "poly.c13",
  "stage": "concept",
  "tag": "poly.c1",
  "lesson": "poly.l1",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $2xy^2-3x^2y+5$를 $x$에 대하여 내림차순으로 정리한 것은?",
  "hints": [
   "내림차순은 기준 문자의 차수가 큰 항부터 쓰는 거야.",
   "기준 문자는 $x$야. $y$는 그냥 숫자처럼 봐.",
   "$x$의 차수: $-3x^2y$은 2, $2xy^2$은 1, $5$는 0"
  ],
  "choices": [
   "$5+2xy^2-3x^2y$",
   "$-3x^2y+5+2xy^2$",
   "$2y^2x+5-3x^2y$",
   "$2xy^2-3x^2y+5$",
   "$-3x^2y+2xy^2+5$"
  ]
 },
 {
  "key": "poly.c14",
  "stage": "concept",
  "tag": "poly.c1",
  "lesson": "poly.l1",
  "diff": 1,
  "qtype": "mc",
  "body": "$4x^2+3x-2x^2+5-x$를 동류항끼리 정리했을 때, $x$의 계수는?",
  "hints": [
   "동류항은 문자와 차수가 같은 항이야.",
   "$x$항만 모아: $3x$와 $-x$",
   "$3x-x$를 계산해."
  ],
  "choices": [
   "-2",
   "1",
   "2",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.c15",
  "stage": "concept",
  "tag": "poly.c1",
  "lesson": "poly.l1",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $x^2y+3xy-y+2$를 $x$에 대한 다항식으로 볼 때, $x$의 계수는?",
  "hints": [
   "$x$에 대해 정리할 때는 $y$를 숫자처럼 생각해.",
   "$x$가 딱 하나 곱해진 항을 찾아.",
   "그 항은 $3xy=(3y)\\cdot x$야."
  ],
  "choices": [
   "$y$",
   "$x^2y$",
   "$3y$",
   "$3y-y$",
   "$3$"
  ]
 },
 {
  "key": "poly.c21",
  "stage": "concept",
  "tag": "poly.c2",
  "lesson": "poly.l2",
  "diff": 1,
  "qtype": "mc",
  "body": "$A=x^2+2x-1$, $B=2x^2-x+3$일 때, $A+B$의 $x^2$의 계수는?",
  "hints": [
   "$x^2$항끼리 더해.",
   "$x^2+2x^2$",
   "$1+2$"
  ],
  "choices": [
   "1",
   "2",
   "3",
   "4",
   "5"
  ]
 },
 {
  "key": "poly.c22",
  "stage": "concept",
  "tag": "poly.c2",
  "lesson": "poly.l2",
  "diff": 1,
  "qtype": "mc",
  "body": "$A=x^2+2x-1$, $B=2x^2-x+3$일 때, $A-B$의 상수항은?",
  "hints": [
   "빼는 식의 모든 항의 부호를 바꿔서 더해.",
   "상수항만 보면 $-1-3$",
   "$-1-(+3)$"
  ],
  "choices": [
   "-4",
   "-3",
   "-2",
   "2",
   "4"
  ]
 },
 {
  "key": "poly.c23",
  "stage": "concept",
  "tag": "poly.c2",
  "lesson": "poly.l2",
  "diff": 1,
  "qtype": "mc",
  "body": "$(3x^2-x+2)-(x^2+4x-5)$를 정리했을 때, $x$의 계수는?",
  "hints": [
   "괄호 앞이 $-$이면 괄호 안의 부호가 전부 바뀌어.",
   "$-(x^2+4x-5)=-x^2-4x+5$",
   "$x$항: $-x-4x$"
  ],
  "choices": [
   "-5",
   "-4",
   "-3",
   "3",
   "5"
  ]
 },
 {
  "key": "poly.c24",
  "stage": "concept",
  "tag": "poly.c2",
  "lesson": "poly.l2",
  "diff": 1,
  "qtype": "mc",
  "body": "$A=2x-3$일 때, $3A-(A+x)$를 정리한 식의 상수항은?",
  "hints": [
   "먼저 $A$에 대한 식으로 간단히 해.",
   "$3A-(A+x)=2A-x$",
   "$2A=4x-6$이야."
  ],
  "choices": [
   "-9",
   "-6",
   "-5",
   "-3",
   "6"
  ]
 },
 {
  "key": "poly.c25",
  "stage": "concept",
  "tag": "poly.c2",
  "lesson": "poly.l2",
  "diff": 1,
  "qtype": "mc",
  "body": "$A+B=B+A$처럼 더하는 순서를 바꿔도 결과가 같다는 성질은?",
  "hints": [
   "자리를 '바꾼다'는 말에 집중해.",
   "$(A+B)+C=A+(B+C)$는 묶는 순서, $A+B=B+A$는 놓는 순서야.",
   "'교환'은 서로 맞바꾼다는 뜻이야."
  ],
  "choices": [
   "내림차순",
   "항등식",
   "교환법칙",
   "분배법칙",
   "결합법칙"
  ]
 },
 {
  "key": "poly.c31",
  "stage": "concept",
  "tag": "poly.c3",
  "lesson": "poly.l3",
  "diff": 1,
  "qtype": "mc",
  "body": "$(x+3)^2$을 전개했을 때, $x$의 계수는?",
  "hints": [
   "$(a+b)^2=a^2+2ab+b^2$",
   "가운데 항은 $2\\times x\\times3$",
   "$2\\times3$"
  ],
  "choices": [
   "1",
   "3",
   "6",
   "7",
   "9"
  ]
 },
 {
  "key": "poly.c32",
  "stage": "concept",
  "tag": "poly.c3",
  "lesson": "poly.l3",
  "diff": 1,
  "qtype": "mc",
  "body": "$(x+4)(x-4)$를 전개했을 때, 상수항은?",
  "hints": [
   "합과 차의 곱: $(a+b)(a-b)=a^2-b^2$",
   "$a=x$, $b=4$",
   "$-4^2$"
  ],
  "choices": [
   "-16",
   "-15",
   "-8",
   "0",
   "16"
  ]
 },
 {
  "key": "poly.c33",
  "stage": "concept",
  "tag": "poly.c3",
  "lesson": "poly.l3",
  "diff": 1,
  "qtype": "mc",
  "body": "$(x+2)(x+5)$를 전개했을 때, $x$의 계수는?",
  "hints": [
   "$(x+a)(x+b)=x^2+(a+b)x+ab$",
   "$x$의 계수는 두 수의 합",
   "$2+5$"
  ],
  "choices": [
   "3",
   "5",
   "7",
   "8",
   "10"
  ]
 },
 {
  "key": "poly.c34",
  "stage": "concept",
  "tag": "poly.c3",
  "lesson": "poly.l3",
  "diff": 1,
  "qtype": "mc",
  "body": "$(a+b)^3$을 전개했을 때, $a^2b$의 계수는?",
  "hints": [
   "$(a+b)^3=a^3+\\square a^2b+\\square ab^2+b^3$",
   "계수는 1, 3, 3, 1이야.",
   "$a^2b$은 두 번째 항"
  ],
  "choices": [
   "1",
   "2",
   "3",
   "4",
   "6"
  ]
 },
 {
  "key": "poly.c35",
  "stage": "concept",
  "tag": "poly.c3",
  "lesson": "poly.l3",
  "diff": 1,
  "qtype": "mc",
  "body": "$a+b=4$, $ab=1$일 때, $a^2+b^2$의 값은?",
  "hints": [
   "$(a+b)^2$을 이용해.",
   "$a^2+b^2=(a+b)^2-2ab$",
   "$16-2$"
  ],
  "choices": [
   "13",
   "14",
   "15",
   "16",
   "18"
  ]
 },
 {
  "key": "poly.c41",
  "stage": "concept",
  "tag": "poly.c4",
  "lesson": "poly.l4",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^2+5x+7$을 $x+2$로 나누었을 때의 나머지는?",
  "hints": [
   "직접 나눠 봐. 몫의 첫 항은 $x$야.",
   "$x(x+2)=x^2+2x$를 빼면 $3x+7$",
   "$3(x+2)=3x+6$을 또 빼."
  ],
  "choices": [
   "-1",
   "1",
   "2",
   "3",
   "7"
  ]
 },
 {
  "key": "poly.c42",
  "stage": "concept",
  "tag": "poly.c4",
  "lesson": "poly.l4",
  "diff": 1,
  "qtype": "mc",
  "body": "삼차식을 이차식으로 나누었을 때, 나머지의 차수로 가능한 가장 큰 값은?",
  "hints": [
   "나머지는 나누는 식보다 차수가 작아야 해.",
   "나누는 식이 이차식이야.",
   "2보다 작은 가장 큰 차수"
  ],
  "choices": [
   "정할 수 없다",
   "1",
   "3",
   "0",
   "2"
  ]
 },
 {
  "key": "poly.c43",
  "stage": "concept",
  "tag": "poly.c4",
  "lesson": "poly.l4",
  "diff": 1,
  "qtype": "mc",
  "body": "조립제법으로 $x^3-x+2$를 $x-1$로 나누었을 때의 나머지는?",
  "hints": [
   "빠진 차수($x^2$)의 계수 0을 꼭 써야 해.",
   "계수: 1, 0, −1, 2 / 왼쪽에 1",
   "차례로 내려서 곱하고 더해: 1 → 1 → 0 → ?"
  ],
  "choices": [
   "0",
   "1",
   "2",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.c44",
  "stage": "concept",
  "tag": "poly.c4",
  "lesson": "poly.l4",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)=(x+1)(x-2)+3$일 때, $P(x)$를 $x+1$로 나눈 나머지는?",
  "hints": [
   "$A=BQ+R$ 꼴로 보여.",
   "나누는 식 $x+1$, 몫 $x-2$",
   "남는 부분이 나머지야."
  ],
  "choices": [
   "-2",
   "0",
   "1",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.c45",
  "stage": "concept",
  "tag": "poly.c4",
  "lesson": "poly.l4",
  "diff": 1,
  "qtype": "mc",
  "body": "$2x^2-3x+1$을 $x-1$로 나누었을 때, 몫의 $x$의 계수는?",
  "hints": [
   "최고차항끼리 나누면 몫의 첫 항이 나와.",
   "$2x^2\\div x=2x$",
   "몫은 $2x-1$이야."
  ],
  "choices": [
   "-1",
   "1",
   "2",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.c51",
  "stage": "concept",
  "tag": "poly.c5",
  "lesson": "poly.l5",
  "diff": 1,
  "qtype": "mc",
  "body": "다음 중 $x$에 대한 항등식은?",
  "hints": [
   "항등식은 $x$에 어떤 값을 넣어도 성립하는 식이야.",
   "양변을 정리했을 때 완전히 같으면 항등식",
   "$x=0$, $x=1$을 넣어서 둘 다 맞는지 봐."
  ],
  "choices": [
   "$2x=x+1$",
   "$x^2=1$",
   "$x^2+1=0$",
   "$x+1=3$",
   "$2(x+1)=2x+2$"
  ]
 },
 {
  "key": "poly.c52",
  "stage": "concept",
  "tag": "poly.c5",
  "lesson": "poly.l5",
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $ax+b=3x-2$가 $x$에 대한 항등식일 때, $a+b$의 값은?",
  "hints": [
   "항등식이면 같은 차수의 계수끼리 같아.",
   "$a=3$, $b=-2$",
   "$3+(-2)$"
  ],
  "choices": [
   "-1",
   "1",
   "2",
   "3",
   "5"
  ]
 },
 {
  "key": "poly.c53",
  "stage": "concept",
  "tag": "poly.c5",
  "lesson": "poly.l5",
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $a(x+1)+b(x-1)=5x+1$이 $x$에 대한 항등식일 때, $ab$의 값은?",
  "hints": [
   "괄호가 0이 되는 $x$값을 넣으면 빨라 (수치대입법).",
   "$x=1$이면 $2a=6$",
   "$x=-1$이면 $-2b=-4$"
  ],
  "choices": [
   "2",
   "3",
   "5",
   "6",
   "7"
  ]
 },
 {
  "key": "poly.c54",
  "stage": "concept",
  "tag": "poly.c5",
  "lesson": "poly.l5",
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $(a-2)x+(b+1)=0$이 $x$에 대한 항등식일 때, $a+b$의 값은?",
  "hints": [
   "모든 $x$에서 0이 되려면 계수가 전부 0이어야 해.",
   "$a-2=0$, $b+1=0$",
   "$a=2$, $b=-1$"
  ],
  "choices": [
   "-1",
   "0",
   "1",
   "2",
   "3"
  ]
 },
 {
  "key": "poly.c55",
  "stage": "concept",
  "tag": "poly.c5",
  "lesson": "poly.l5",
  "diff": 1,
  "qtype": "mc",
  "body": "등식 $(x+1)^3=x^3+ax^2+bx+1$이 $x$에 대한 항등식일 때, $a+b$의 값은?",
  "hints": [
   "왼쪽을 전개해서 비교해도 되고, 값을 넣어도 돼.",
   "$x=1$을 넣으면 $8=1+a+b+1$",
   "$a+b=8-2$"
  ],
  "choices": [
   "3",
   "4",
   "6",
   "7",
   "9"
  ]
 },
 {
  "key": "poly.c61",
  "stage": "concept",
  "tag": "poly.c6",
  "lesson": "poly.l6",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^3-2x+5$를 $x-1$로 나누었을 때의 나머지는?",
  "hints": [
   "나머지정리: $x-a$로 나눈 나머지는 $P(a)$",
   "$a=1$",
   "$1-2+5$"
  ],
  "choices": [
   "2",
   "3",
   "4",
   "5",
   "6"
  ]
 },
 {
  "key": "poly.c62",
  "stage": "concept",
  "tag": "poly.c6",
  "lesson": "poly.l6",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^2+kx+6$이 $x-2$로 나누어떨어질 때, 상수 $k$의 값은?",
  "hints": [
   "나누어떨어진다 = 나머지가 0",
   "$P(2)=0$",
   "$4+2k+6=0$"
  ],
  "choices": [
   "-5",
   "-4",
   "-3",
   "-2",
   "5"
  ]
 },
 {
  "key": "poly.c63",
  "stage": "concept",
  "tag": "poly.c6",
  "lesson": "poly.l6",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x+1$로 나누었을 때의 나머지는?",
  "hints": [
   "$x-a$ 꼴로 바꿔 봐.",
   "$x+1=x-(-1)$",
   "그러니까 $a=-1$"
  ],
  "choices": [
   "$P(1)$",
   "$P(-1)$",
   "$P(0)$",
   "$-P(1)$",
   "알 수 없다"
  ]
 },
 {
  "key": "poly.c64",
  "stage": "concept",
  "tag": "poly.c6",
  "lesson": "poly.l6",
  "diff": 1,
  "qtype": "mc",
  "body": "$2x^3-x^2+3$을 $x+1$로 나누었을 때의 나머지는?",
  "hints": [
   "$P(-1)$을 계산해.",
   "$2(-1)^3-(-1)^2+3$",
   "$-2-1+3$"
  ],
  "choices": [
   "-2",
   "0",
   "1",
   "4",
   "6"
  ]
 },
 {
  "key": "poly.c65",
  "stage": "concept",
  "tag": "poly.c6",
  "lesson": "poly.l6",
  "diff": 1,
  "qtype": "mc",
  "body": "다항식 $P(x)$에 대하여 $P(3)=0$이면, $P(x)$는 다음 중 무엇으로 나누어떨어지는가?",
  "hints": [
   "인수정리를 떠올려.",
   "$P(a)=0$이면 $x-a$가 인수야.",
   "$a=3$"
  ],
  "choices": [
   "$x+1$",
   "$x-3$",
   "$3x$",
   "$x+3$",
   "$x-\\frac{1}{3}$"
  ]
 },
 {
  "key": "poly.c71",
  "stage": "concept",
  "tag": "poly.c7",
  "lesson": "poly.l7",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^2-9=(x+a)(x-a)$일 때, 양수 $a$의 값은?",
  "hints": [
   "$A^2-B^2=(A+B)(A-B)$ 꼴이야.",
   "$9=3^2$",
   "그러니까 $x^2-3^2=(x+3)(x-3)$"
  ],
  "choices": [
   "1",
   "3",
   "4",
   "9",
   "81"
  ]
 },
 {
  "key": "poly.c72",
  "stage": "concept",
  "tag": "poly.c7",
  "lesson": "poly.l7",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^2-7x+12=(x-p)(x-q)$일 때, $p+q$의 값은?",
  "hints": [
   "곱해서 12, 더해서 7인 두 수",
   "$3\\times4=12$",
   "$3+4$"
  ],
  "choices": [
   "-7",
   "1",
   "7",
   "8",
   "12"
  ]
 },
 {
  "key": "poly.c73",
  "stage": "concept",
  "tag": "poly.c7",
  "lesson": "poly.l7",
  "diff": 1,
  "qtype": "mc",
  "body": "$a^3-b^3$을 바르게 인수분해한 것은?",
  "hints": [
   "$a^3+b^3$ 공식과 부호만 반대야.",
   "첫 괄호의 부호는 원래 식과 같고, 가운데 항 부호는 반대",
   "$a^3-b^3=(a-b)(a^2\\,\\square\\,ab+b^2)$"
  ],
  "choices": [
   "$(a-b)^3$",
   "$(a+b)(a^2-ab+b^2)$",
   "$(a-b)(a+b)^2$",
   "$(a-b)(a^2+ab+b^2)$",
   "$(a-b)(a^2-ab+b^2)$"
  ]
 },
 {
  "key": "poly.c74",
  "stage": "concept",
  "tag": "poly.c7",
  "lesson": "poly.l7",
  "diff": 1,
  "qtype": "mc",
  "body": "$x^2+6x+9=(x+k)^2$일 때, $k$의 값은?",
  "hints": [
   "완전제곱식 $a^2+2ab+b^2=(a+b)^2$",
   "$9=3^2$, $6x=2\\times x\\times3$",
   "$k=?$"
  ],
  "choices": [
   "-3",
   "3",
   "4",
   "6",
   "9"
  ]
 },
 {
  "key": "poly.c75",
  "stage": "concept",
  "tag": "poly.c7",
  "lesson": "poly.l7",
  "diff": 1,
  "qtype": "mc",
  "body": "$2x^2+4x=2x(x+k)$일 때, $k$의 값은?",
  "hints": [
   "공통인수를 먼저 묶어.",
   "두 항 모두 $2x$를 가지고 있어.",
   "$4x\\div2x$"
  ],
  "choices": [
   "0",
   "1",
   "2",
   "3",
   "4"
  ]
 },
 {
  "key": "poly.p01",
  "stage": "practical",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$a+b=3$, $a^2+b^2=5$일 때, $a^3+b^3$의 값은?",
  "hints": [
   "$ab$를 먼저 구해야 $a^3+b^3$ 공식을 쓸 수 있어.",
   "$a^2+b^2=(a+b)^2-2ab$에서 $5=9-2ab$",
   "$ab=2$니까 $a^3+b^3=(a+b)^3-3ab(a+b)$"
  ],
  "choices": [
   "3",
   "9",
   "10",
   "15",
   "27"
  ]
 },
 {
  "key": "poly.p02",
  "stage": "practical",
  "tag": "poly.div",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "다항식 $x^3+ax+b$를 $x^2+x+1$로 나누었을 때의 나머지가 $2x+3$이다. $a+b$의 값은? (단, $a$, $b$는 상수)",
  "hints": [
   "직접 나눗셈을 하되, $a$, $b$는 문자 그대로 들고 가.",
   "$x^3$을 $x^2+x+1$로 나누면 몫이 $x-1$, 나머지가 $1$이야.",
   "그러면 나머지는 $ax+(b+1)$. 이게 $2x+3$과 같아."
  ],
  "choices": [
   "2",
   "3",
   "4",
   "5",
   "6"
  ]
 },
 {
  "key": "poly.p03",
  "stage": "practical",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x^2-3x+2$로 나누었을 때의 나머지가 $2x+1$이다. 다항식 $(x+1)P(x)$를 $x-1$로 나누었을 때의 나머지는?",
  "hints": [
   "$x^2-3x+2=(x-1)(x-2)$로 인수분해해 봐.",
   "$P(x)=(x-1)(x-2)Q(x)+2x+1$이니까 $P(1)$은 바로 나와.",
   "구하는 나머지는 $(1+1)P(1)$이야."
  ],
  "choices": [
   "3",
   "4",
   "5",
   "6",
   "7"
  ]
 },
 {
  "key": "poly.p04",
  "stage": "practical",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "$x^{20}+x^{11}+1$을 $x^2-1$로 나누었을 때의 나머지를 $R(x)$라 할 때, $R(3)$의 값은?",
  "hints": [
   "차수가 높아도 걱정 마. 나머지는 일차 이하니까 $R(x)=ax+b$로 놓아.",
   "$x^2-1=(x-1)(x+1)$이니까 $x=1$, $x=-1$을 넣어.",
   "$a+b=3$, $-a+b=1$"
  ],
  "choices": [
   "1",
   "3",
   "5",
   "6",
   "7"
  ]
 },
 {
  "key": "poly.p05",
  "stage": "practical",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "$x^4+x^2+1$이 $(x^2+ax+1)(x^2+bx+1)$로 인수분해될 때, $a-b$의 값은? (단, $a>b$)",
  "hints": [
   "$x^2$을 $t$로 바꿔도 $t^2+t+1$은 인수분해가 안 돼. 다른 방법이 필요해.",
   "$x^4+x^2+1=(x^4+2x^2+1)-x^2$으로 바꿔 봐.",
   "$(x^2+1)^2-x^2$은 $A^2-B^2$ 꼴이야."
  ],
  "choices": [
   "-2",
   "0",
   "1",
   "2",
   "3"
  ]
 },
 {
  "key": "poly.p06",
  "stage": "practical",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 3,
  "qtype": "mc",
  "body": "$x^3-3x^2-x+3$을 인수분해하면 세 일차식 $x+p$, $x+q$, $x+r$의 곱이다. $p+q+r$의 값은?",
  "hints": [
   "항을 두 개씩 묶어 봐 (공통인수).",
   "$x^2(x-3)-(x-3)$",
   "$(x-3)(x^2-1)$이고, $x^2-1$을 한 번 더."
  ],
  "choices": [
   "-3",
   "-2",
   "-1",
   "1",
   "3"
  ]
 },
 {
  "key": "poly.p07",
  "stage": "practical",
  "tag": "poly.rem",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "이차식 $P(x)$를 $x-1$, $x-2$, $x-3$으로 나누었을 때의 나머지가 각각 $2$, $3$, $6$이다. $P(4)$의 값은?",
  "hints": [
   "나머지정리로 바꾸면 $P(1)=2$, $P(2)=3$, $P(3)=6$이야.",
   "$P(x)=ax^2+bx+c$로 놓고 세 식을 세워.",
   "연립하면 $a=1$이 나와."
  ],
  "choices": [
   "9",
   "10",
   "11",
   "12",
   "13"
  ]
 },
 {
  "key": "poly.p08",
  "stage": "practical",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "$x^2-3x+1=0$일 때, $x^3+\\dfrac{1}{x^3}$의 값은?",
  "hints": [
   "$x\\neq0$이니까 양변을 $x$로 나눠 봐.",
   "$x-3+\\dfrac{1}{x}=0$, 즉 $x+\\dfrac{1}{x}=3$",
   "$x^3+\\dfrac{1}{x^3}=\\left(x+\\dfrac1x\\right)^3-3\\left(x+\\dfrac1x\\right)$"
  ],
  "choices": [
   "9",
   "18",
   "19",
   "21",
   "27"
  ]
 },
 {
  "key": "poly.p09",
  "stage": "practical",
  "tag": "poly.div",
  "lesson": null,
  "diff": 5,
  "qtype": "mc",
  "body": "다항식 $P(x)$를 $x-1$로 나눈 몫은 $Q(x)$, 나머지는 $3$이다. $Q(x)$를 $x+2$로 나눈 나머지가 $-1$일 때, $P(x)$를 $(x-1)(x+2)$로 나눈 나머지를 $R(x)$라 하자. $R(0)$의 값은?",
  "hints": [
   "$P(x)=(x-1)Q(x)+3$, $Q(x)=(x+2)Q'(x)-1$로 써.",
   "두 번째 식을 첫 번째에 넣어.",
   "$P(x)=(x-1)(x+2)Q'(x)-(x-1)+3$"
  ],
  "choices": [
   "-4",
   "2",
   "3",
   "4",
   "5"
  ]
 },
 {
  "key": "poly.p10",
  "stage": "practical",
  "tag": "poly.formula",
  "lesson": null,
  "diff": 5,
  "qtype": "mc",
  "body": "$x^2+x+1=0$일 때, $x^{100}+x^{50}$의 값은?",
  "hints": [
   "$x^2+x+1=0$의 양변에 $x-1$을 곱해 봐.",
   "$(x-1)(x^2+x+1)=x^3-1$이니까 $x^3=1$",
   "$x^{100}=x^{99}\\cdot x=x$, $x^{50}=x^{48}\\cdot x^2=x^2$"
  ],
  "choices": [
   "-2",
   "-1",
   "0",
   "1",
   "2"
  ]
 },
 {
  "key": "poly.p11",
  "stage": "practical",
  "tag": "poly.factor",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "다항식 $x^3+ax^2-4x-4$가 $x+1$로 나누어떨어지고, $(x+1)(x+p)(x+q)$로 인수분해된다. $a+p+q$의 값은?",
  "hints": [
   "인수정리로 $a$부터 구해.",
   "$P(-1)=-1+a+4-4=0$이니까 $a=1$",
   "$x^3+x^2-4x-4=x^2(x+1)-4(x+1)$"
  ],
  "choices": [
   "-1",
   "0",
   "1",
   "2",
   "3"
  ]
 },
 {
  "key": "poly.p12",
  "stage": "practical",
  "tag": "poly.ident",
  "lesson": null,
  "diff": 4,
  "qtype": "mc",
  "body": "등식 $(x^2+x-1)^6=a_0+a_1x+a_2x^2+\\cdots+a_{12}x^{12}$이 $x$에 대한 항등식일 때, $a_1+a_3+a_5+\\cdots+a_{11}$의 값은?",
  "hints": [
   "홀수 차수 항의 계수만 더하려면 $x=1$, $x=-1$을 넣은 두 식을 빼면 돼.",
   "$x=1$: 합 $=1$, $x=-1$: $(1-1-1)^6=1$",
   "$2(a_1+a_3+\\cdots)=1-1$"
  ],
  "choices": [
   "-2",
   "-1",
   "0",
   "1",
   "2"
  ]
 }
];
