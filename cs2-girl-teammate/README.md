# «2 типа игроков, когда в команде появилась девушка» — 2D-мультфильм для TikTok

- `girl_teammate_tiktok.mp4` — видео 1080×1920 (9:16), 43,5 с, озвучка, звуки, субтитры (мат в субтитрах замаскирован звёздочками).
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/*.wav` — реплики: n — рассказчик (Pavel), g — девушка (Marusya G), a — джентльмен (Egor), f — друг (Evgeniy Rybakov), b — «F1».
  `b1.wav`/`b2.wav` — временные (RHVoice), пока не сгенерирован голос ElevenLabs.

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest girl_teammate_tiktok.mp4
```
Тайминги реплик: `LINES` (cartoon.html) и `VO` (tools/audio.py). Камера: `SHOTS`/`PUNCH`.
