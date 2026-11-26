# «1 HP против пятерых» · Серия 3 — 2D-мультфильм для TikTok (CS2)

- `ep3_tiktok.mp4` — видео 1080×1920 (9:16), 38,6 с. Мягкий звук, без сирен и мигалок.
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/*.wav` — реплики: n1–n4 — рассказчик (Pavel), p1, p2 — сын (Egor), mom1, mom2 — мама (Liubava).
- Тайминги сцен — объект `K` в cartoon.html; реплики — `LINES` и `VO` (tools/audio.py).

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest ep3_tiktok.mp4
```
