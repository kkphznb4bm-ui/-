# Countryball Тренды

Всё лежит в папке `countryballs/`.

| Файл | Что это |
|---|---|
| `index.html` | интерактивные TikTok-тренды countryball-шариков (12 стран, 7 трендов) |
| `skit.html` → `uchitel-vyshel.mp4` | скетч «POV: учитель вышел из класса» (RU-подписи) |
| `jeepney.html` → `jeepney-transformer.mp4` | «Poor Philippine-ball has a JEEPNEY TRANSFORMER!» (английская озвучка) |

## Пересобрать видео

```bash
cd countryballs
# Учитель
python3 tools/make_audio.py skit-audio.wav
node tools/render_video.js skit.html skit-audio.wav uchitel-vyshel.mp4
# Джипни: музыка + голос (voice/take1.mp3, ElevenLabs, голос Paul H.)
python3 tools/jeepney_audio.py voice/jeepney-music.wav
ffmpeg -y -i voice/take1.mp3 -i voice/jeepney-music.wav -filter_complex \
 "[0:a]aresample=44100,apad,volume=1.5,asplit=2[v][vk];[1:a]volume=0.35[m];[m][vk]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=350[md];[md][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,atrim=0:26.6[a]" \
 -map "[a]" -c:a aac -b:a 160k jeepney-audio.m4a
node tools/render_video.js jeepney.html jeepney-audio.m4a jeepney-transformer.mp4
```
