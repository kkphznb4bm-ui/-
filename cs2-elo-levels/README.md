# «Что происходит на 4000 Elo» — 2D-мультфильм для TikTok (CS2)

- `elo_levels_tiktok.mp4` — видео 1080×1920 (9:16), 35,5 с: озвучка (ElevenLabs, рассказчик Pavel), бит, эффекты, субтитры.
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/n0..n5.wav` — фразы рассказчика.

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest elo_levels_tiktok.mp4
```
Тайминги: `LINES` (cartoon.html) и `VO` (tools/audio.py). Камера: `SHOTS`/`PUNCH`.
