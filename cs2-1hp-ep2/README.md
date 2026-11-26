# «1 HP против пятерых» · Серия 2 — 2D-мультфильм для TikTok (CS2)

- `ep2_tiktok.mp4` — видео 1080×1920 (9:16), 40,5 с. Мягкий звук: без сирен и мигалок.
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/*.wav` — реплики: n1–n3 — рассказчик/комментатор (Pavel), p1, p2 — герой (Egor), mom1–mom3 — мама (Liubava), mgr — менеджер (Unreality2ime).

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest ep2_tiktok.mp4
```
