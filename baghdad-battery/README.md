# Багдадская батарейка — вертикальный ролик (9:16)

`baghdad-battery.mp4` — готовое видео: 1080×1920, 30 fps, 52,8 с, озвучка на русском.

- `animation.html` — 2D-анимация (SVG), кадр задаётся функцией `renderAt(t)`
- `timing.js` — тайминги сцен и субтитров (генерируется `node build-timing.mjs`)
- `audio/voice.mp3` — озвучка
- `render.mjs` — покадровый рендер через Playwright и сведение через ffmpeg

Пересборка: `node build-timing.mjs && node render.mjs`
