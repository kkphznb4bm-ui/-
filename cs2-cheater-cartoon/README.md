# «Как рождается читер в CS2» — 2D-мультфильм для TikTok

- `cs2_cheater_tiktok.mp4` — готовое видео 1080×1920 (9:16), 39 с, 30 к/с, 45,6 с: тизер-спойлер, озвучка ElevenLabs (рассказчик — Pavel, игрок — Egor), динамичная камера, музыка, эффекты и субтитры.
- `cartoon.html` — исходник анимации (canvas). Откройте в браузере; клик — проиграть со звуком.
- `cs2_cheater_audio.m4a` — звуковая дорожка отдельно.
- `tools/render.js` — покадровый рендер через Playwright; `tools/audio.py` — сборка звука.

## Пересборка
```bash
# реплики t0, n1..n5, p1..p3 лежат в vo/*.wav (44.1 кГц моно); без озвучки: python3 tools/audio.py - mix.wav
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest cs2_cheater_tiktok.mp4
```
Тайминги реплик заданы в `LINES` (cartoon.html) и `VO` (audio.py) — при замене озвучки меняйте оба.
Камера — `SHOTS`/`PUNCH` в cartoon.html; растяжка сцен под голос — `WARP` (одинаковая в обоих файлах).
