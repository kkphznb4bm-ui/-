# «3 типа игроков на Mirage 💀» — 2D-мультфильм для TikTok

- `mirage_types_tiktok.mp4` — видео 1080×1920 (9:16), 44,5 с: озвучка, бит, эффекты, субтитры (мат в субтитрах — со звёздочками).
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/*.wav` — реплики (ElevenLabs): h — мидовый герой (Egor), c — кемпер (EscobarRKZ), r — вечный A (Evgeniy Rybakov),
  m — тиммейт (Unreality2ime). `n1.wav` — рассказчик, пока временный (RHVoice): у ElevenLabs была занята очередь.

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest mirage_types_tiktok.mp4
```
Тайминги: `LINES` (cartoon.html) и `VO` (tools/audio.py). Камера: `SHOTS`/`PUNCH`.
