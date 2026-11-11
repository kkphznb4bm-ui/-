# Countryball Тренды

Всё лежит в папке `countryballs/`.

| Файл | Что это |
|---|---|
| `index.html` | интерактивные TikTok-тренды countryball-шариков (12 стран, 7 трендов) |
| `skit.html` → `uchitel-vyshel.mp4` | скетч «POV: учитель вышел из класса» (RU-подписи) |
| `jeepney.html` → `jeepney-transformer.mp4` | «Poor Philippine-ball has a JEEPNEY TRANSFORMER!» (английская озвучка) |
| `part2.html` → `part2-robot-battle.mp4` | Part 2: USA-бот против Jeepney-бота; `part2-robot-battle-no-music.mp4` — без музыки (голос + эффекты), чтобы добавить трендовый звук в TikTok/Shorts |

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

# Part 2 (эффекты и музыка отдельно -> две версии)
python3 tools/part2_audio.py voice/p2-sfx.wav voice/p2-music.wav
tools/mix.sh voice/part2-take1.mp3 voice/p2-sfx.wav voice/p2-music.wav 27.3 part2-audio.m4a
tools/mix.sh voice/part2-take1.mp3 voice/p2-sfx.wav - 27.3 voice/part2-audio-nomusic.m4a
node tools/render_video.js part2.html part2-audio.m4a part2-robot-battle.mp4
ffmpeg -y -i part2-robot-battle.mp4 -i voice/part2-audio-nomusic.m4a -map 0:v -map 1:a -c copy part2-robot-battle-no-music.mp4
```
