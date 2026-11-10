# Багдадская батарейка — вертикальный ролик (9:16)

`baghdad-battery.mp4` — русская версия (52,8 с), `baghdad-battery-en.mp4` — английская (52,4 с). Оба 1080×1920, 30 fps.

- `animation.html` — 2D-анимация (SVG), кадр задаётся функцией `renderAt(t)`
- `timing.ru.js`, `timing.en.js` — тайминги сцен, субтитры и надписи (генерируются `node build-timing.mjs`)
- `audio/voice.ru.mp3`, `audio/voice.en.mp3` — озвучка
- `render.mjs` — покадровый рендер через Playwright и сведение через ffmpeg

Пересборка: `node build-timing.mjs && node render.mjs ru && node render.mjs en`
