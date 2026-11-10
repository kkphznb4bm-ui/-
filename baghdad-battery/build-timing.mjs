// Builds timing.<lang>.js: caption chunks distributed inside the speech segments
// found with `ffmpeg silencedetect` on audio/voice.<lang>.mp3.
// Usage: node build-timing.mjs
import { writeFileSync } from 'node:fs';

// A segment is [start, end, chunks]; a chunk is [text, cueName?, spokenFormForWeighting?].
// `scenes` lists the index of the first segment of scenes 2..5.
const LANGS = {
  ru: {
    tail: 3.1,
    scenes: [3, 5, 8, 11],
    segs: [
      [0.03, 0.68, [['Представьте:']]],
      [1.07, 4.69, [['археологи находят предмет'], ['возрастом около двух тысяч лет…', 'age']]],
      [5.27, 8.49, [['который удивительно напоминает', 'bat'], ['современную батарейку!']]],
      [9.08, 15.12, [['В 1936 году', 'year', 'в тысяча девятьсот тридцать шестом году'], ['недалеко от Багдада', 'pin'], ['археологи обнаружили'], ['необычный глиняный сосуд.', 'jar2']]],
      [15.63, 18.05, [['Но самое интересное', 'scan'], ['находилось внутри него.']]],
      [18.56, 21.57, [['Внутри находились', 'cut'], ['медный цилиндр', 'cu'], ['и железный стержень.', 'fe']]],
      [22.06, 24.81, [['Такая конструкция заставила'], ['исследователей задуматься:']]],
      [25.24, 28.13, [['а вдруг древние люди', 'spark'], ['умели получать электричество?']]],
      [28.69, 32.16, [['Учёные предположили,'], ['что если наполнить сосуд', 'fill'], ['кислой жидкостью,']]],
      [32.46, 35.10, [['он мог создавать небольшое', 'volt'], ['электрическое напряжение.']]],
      [35.60, 37.30, [['Но это пока лишь гипотеза.', 'stamp']]],
      [37.82, 38.98, [['И самое удивительное:']]],
      [39.32, 43.26, [['до сих пор никто точно не знает,'], ['для чего был создан этот предмет.']]],
      [43.83, 46.21, [['Возможно, перед нами', 'optA'], ['древняя батарейка…']]],
      [46.77, 49.70, [['А возможно, мы просто', 'optB'], ['неправильно понимаем историю.']]],
    ],
  },
  en: {
    tail: 3.1,
    decimal: '.',
    voltUnit: 'V',
    strings: {
      'БАГДАДСКАЯ БАТАРЕЙКА': 'THE BAGHDAD BATTERY',
      'Электричество': 'Electricity',
      '2000 лет назад?': '2,000 years ago?',
      '≈ 2000 лет': '≈ 2,000 yrs',
      'Тигр': 'Tigris',
      'Евфрат': 'Euphrates',
      'МЕСОПОТАМИЯ': 'MESOPOTAMIA',
      'Багдад': 'Baghdad',
      'высота ≈ 13 см': 'height ≈ 13 cm',
      'Медный цилиндр': 'Copper cylinder',
      'Железный стержень': 'Iron rod',
      'Кислая': 'Acidic',
      'жидкость': 'liquid',
      'font-size="116" font-weight="900" text-anchor="middle" fill="#ff4d4d" letter-spacing="6">ГИПОТЕЗА': 'font-size="96" font-weight="900" text-anchor="middle" fill="#ff4d4d" letter-spacing="4">HYPOTHESIS',
      'Батарейка?': 'A battery?',
      'Что-то другое?': 'Something else?',
      'А как': 'What do',
      'думаешь ты?': 'you think?',
    },
    scenes: [3, 6, 9, 13],
    segs: [
      [0.03, 0.47, [['Imagine:']]],
      [1.09, 4.62, [['archaeologists find an object'], ['about two thousand years old…', 'age']]],
      [5.18, 7.47, [['that looks remarkably like', 'bat'], ['a modern battery!']]],
      [8.44, 11.28, [['In 1936,', 'year', 'in nineteen thirty six'], ['not far from Baghdad,', 'pin']]],
      [11.65, 14.69, [['archaeologists discovered'], ['an unusual clay jar.', 'jar2']]],
      [15.25, 17.70, [['But the most interesting part', 'scan'], ['was hidden inside it.']]],
      [18.28, 21.16, [['Inside were', 'cut'], ['a copper cylinder', 'cu'], ['and an iron rod.', 'fe']]],
      [21.65, 23.49, [['This design made'], ['researchers wonder:']]],
      [24.04, 26.87, [['what if ancient people', 'spark'], ['knew how to produce electricity?']]],
      [27.56, 31.35, [['Scientists suggested that'], ['if the jar were filled', 'fill'], ['with an acidic liquid,']]],
      [31.66, 34.02, [['it could generate', 'volt'], ['a small electric voltage.']]],
      [34.48, 35.11, [['But for now,']]],
      [35.34, 36.87, [['this is only a hypothesis.', 'stamp']]],
      [37.45, 38.80, [['And the most amazing thing:']]],
      [39.41, 40.08, [['to this day,']]],
      [40.37, 43.16, [['no one knows for sure'], ['what this object was made for.']]],
      [43.71, 45.89, [['Perhaps it really is', 'optA'], ['an ancient battery…']]],
      [46.42, 46.75, [['Or perhaps', 'optB']]],
      [46.95, 49.26, [['we simply misunderstand history.']]],
    ],
  },
};

for (const [lang, L] of Object.entries(LANGS)) {
  const caps = [], cues = {};
  for (const [a, b, chunks] of L.segs) {
    const w = chunks.map(c => (c[2] || c[0]).replace(/[^\p{L}]/gu, '').length);
    const total = w.reduce((x, y) => x + y, 0);
    let t = a;
    chunks.forEach((c, i) => {
      const d = (b - a) * w[i] / total;
      const last = i === chunks.length - 1;
      const cap = { a: +Math.max(0, t - 0.06).toFixed(3), b: +(t + d + (last ? 0.22 : -0.06)).toFixed(3), text: c[0] };
      caps.push(cap);
      if (c[1]) cues[c[1]] = cap.a;
      t += d;
    });
  }
  // a scene starts in the middle of the pause before its first segment
  const scenes = [0, ...L.scenes.map(i => +((L.segs[i - 1][1] + L.segs[i][0]) / 2 - 0.05).toFixed(2))];
  const voiceEnd = L.segs.at(-1)[1];
  const timing = { lang, fps: 30, scenes, voiceEnd, duration: +(voiceEnd + L.tail).toFixed(1), cues, caps,
    strings: L.strings || {}, decimal: L.decimal || ',', voltUnit: L.voltUnit || 'В' };
  writeFileSync(new URL(`./timing.${lang}.js`, import.meta.url), 'window.TIMING = ' + JSON.stringify(timing, null, 1) + ';\n');
  console.log(lang, 'scenes', scenes.join(' '), 'duration', timing.duration);
}
