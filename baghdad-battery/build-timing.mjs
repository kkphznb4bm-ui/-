// Builds timing.js: caption chunks distributed inside the speech segments
// found with `ffmpeg silencedetect` on audio/voice.mp3.
import { writeFileSync } from 'node:fs';

// [start, end] of each spoken phrase (seconds), then its caption chunks.
// A chunk is "text" or ["text", "spoken form used for weighting"].
const segs = [
  [0.03, 0.68, ['Представьте:']],
  [1.07, 4.69, ['археологи находят предмет', 'возрастом около двух тысяч лет…']],
  [5.27, 8.49, ['который удивительно напоминает', 'современную батарейку!']],
  [9.08, 15.12, [['В 1936 году', 'в тысяча девятьсот тридцать шестом году'], 'недалеко от Багдада', 'археологи обнаружили', 'необычный глиняный сосуд.']],
  [15.63, 18.05, ['Но самое интересное', 'находилось внутри него.']],
  [18.56, 21.57, ['Внутри находились', 'медный цилиндр', 'и железный стержень.']],
  [22.06, 24.81, ['Такая конструкция заставила', 'исследователей задуматься:']],
  [25.24, 28.13, ['а вдруг древние люди', 'умели получать электричество?']],
  [28.69, 32.16, ['Учёные предположили,', 'что если наполнить сосуд', 'кислой жидкостью,']],
  [32.46, 35.10, ['он мог создавать небольшое', 'электрическое напряжение.']],
  [35.60, 37.30, ['Но это пока лишь гипотеза.']],
  [37.82, 38.98, ['И самое удивительное:']],
  [39.32, 43.26, ['до сих пор никто точно не знает,', 'для чего был создан этот предмет.']],
  [43.83, 46.21, ['Возможно, перед нами', 'древняя батарейка…']],
  [46.77, 49.70, ['А возможно, мы просто', 'неправильно понимаем историю.']],
];

const caps = [];
let n = 0;
for (const [a, b, chunks] of segs) {
  const w = chunks.map(c => (Array.isArray(c) ? c[1] : c).replace(/[^\p{L}]/gu, '').length);
  const total = w.reduce((x, y) => x + y, 0);
  let t = a;
  chunks.forEach((c, i) => {
    const d = (b - a) * w[i] / total;
    const last = i === chunks.length - 1;
    caps.push({ id: 'c' + (++n), a: +Math.max(0, t - 0.06).toFixed(3), b: +(t + d + (last ? 0.22 : -0.06)).toFixed(3), text: Array.isArray(c) ? c[0] : c });
    t += d;
  });
}

const timing = {
  fps: 30,
  scenes: [0, 8.8, 18.3, 28.4, 37.55],
  voiceEnd: 49.7,
  duration: 52.8,
  caps,
};
writeFileSync(new URL('./timing.js', import.meta.url), 'window.TIMING = ' + JSON.stringify(timing, null, 1) + ';\n');
console.log(caps.map(c => `${c.id} ${c.a}-${c.b} ${c.text}`).join('\n'));
