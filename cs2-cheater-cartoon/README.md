# «Как рождается читер в CS2» — 2D-мультфильм для TikTok

- `cs2_cheater_tiktok.mp4` — готовое видео 1080×1920 (9:16), 39 с, 30 к/с, без озвучки: музыка, звуковые эффекты и субтитры.
- `cartoon.html` — исходник анимации (canvas). Откройте в браузере; клик — проиграть со звуком.
- `cs2_cheater_audio.m4a` — звуковая дорожка отдельно.
- `tools/render.js` — покадровый рендер через Playwright; `tools/audio.py` — сборка звука.

## Пересборка
```bash
# без озвучки: python3 tools/audio.py - mix.wav
# с озвучкой: RHVoice (apt install rhvoice rhvoice-russian), реплики n1..n5 / p1..p3 в vo/*.wav, 44.1 кГц моно
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest cs2_cheater_tiktok.mp4
```
Тайминги реплик заданы в `LINES` (cartoon.html) и `VO` (audio.py) — при замене озвучки меняйте оба.
