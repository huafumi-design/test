export const GAME_DURATION = 60; // seconds
export const SCORE_PER_TICK = 0.2; // 0.2 per 100ms = 2 points per second
export const MAX_SCORE = 100;

export const TEACHER_SCAN_MIN_INTERVAL = 4000; // 4 seconds
export const TEACHER_SCAN_MAX_INTERVAL = 7000; // 7 seconds
export const TEACHER_PRE_SCAN_DURATION = 2000; // Warning time (yellow alert)
export const TEACHER_SCAN_DURATION = 2000; // Active scanning time (red alert)

export const VOICE_LINES = [
  "自己答自己的啊！",
  "不要东张西望搞小动作！",
  "那个穿白衣服的同学，头抬起来！",
  "考试还有最后几分钟，抓紧时间。",
  "再让我看到谁眼睛乱瞟，直接收卷！"
];

export const EXAM_CONTENT = `
一、高等数学综合题 (40分)

1. 设 f(x) 在 [a,b] 上连续，在 (a,b) 内可导，且 f(a) = f(b) = 0. 证明：
   存在 ξ ∈ (a,b)，使得 f(ξ) + f'(ξ) = 0.

2. 计算曲面积分 ∬_∑ (x^3 + y^3 + z^3) dS，其中 ∑ 是球面 x^2 + y^2 + z^2 = R^2.

二、哲学辨析 (60分)

1. 康德在《纯粹理性批判》中如何论证“先天综合判断”的各种可能性？
   请结合几何学与自然科学的实例进行深度剖析。

2. 论述海德格尔“向死而生” (Sein-zum-Tode) 的存在论意义，并反驳萨特的存在主义观点。

... (题目太难了，完全看不懂) ...
`;