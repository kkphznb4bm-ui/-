# «1 HP против пятерых» · Серия 1 — 2D-мультфильм для TikTok (CS2)

- `clutch_tiktok.mp4` — видео 1080×1920 (9:16), 43,5 с: соперники s1mple, donk, m0NESY, kyousuke, magixx; герой делает эйс; в конце «Продолжение следует… Серия 1». Озвучка ElevenLabs, бит, эффекты, субтитры.
- `cartoon.html` — исходник анимации (canvas), клик — проиграть со звуком.
- `vo/*.wav` — реплики: n1, n2 — рассказчик (Pavel), m1–m3 — тиммейт (Evgeniy Rybakov), mom — мама (Liubava), idu — герой (Egor).
- Основная часть сдвинута на 2,5 с после хука: `SHIFT` в cartoon.html и `SH` в tools/audio.py.

## Пересборка
```bash
python3 tools/audio.py vo mix.wav
node tools/render.js frames frames 30
ffmpeg -framerate 30 -i frames/f_%05d.png -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest clutch_tiktok.mp4
```
Тайминги: `LINES` (cartoon.html) и `VO` (tools/audio.py). Камера: `SHOTS`/`PUNCH`.
