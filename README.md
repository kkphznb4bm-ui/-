# Countryball Тренды

Всё лежит в папке `countryballs/`.

| Файл | Что это |
|---|---|
| `index.html` | интерактивные TikTok-тренды countryball-шариков (12 стран, 7 трендов) |
| `skit.html` → `uchitel-vyshel.mp4` | скетч «POV: учитель вышел из класса» (RU-подписи) |
| `jeepney.html` → `jeepney-transformer.mp4` | «Poor Philippine-ball has a JEEPNEY TRANSFORMER!» (английская озвучка) |
| `short5.html?clip=1..6` → `shorts/*.mp4` | 5-секундные шортсы с хуком и циклом: «Wait for it», «Who wins?», «Everyone was scared», Япония «Blink», Бразилия «Don't kick», «Pick one 1-2-3» |
| `part3.html` → `part3-winter-robots.mp4` | Part 3: снегопад, Russia-бот из снегоуборщика раздаёт ушанки, зимнее караоке; `part3-winter-robots-no-music.mp4` — без музыки |
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

# Part 3
python3 tools/part3_audio.py voice/p3-sfx.wav voice/p3-music.wav
tools/mix.sh voice/part3-take1.mp3 voice/p3-sfx.wav voice/p3-music.wav 24.8 part3-audio.m4a
tools/mix.sh voice/part3-take1.mp3 voice/p3-sfx.wav - 24.8 voice/part3-audio-nomusic.m4a
node tools/render_video.js part3.html part3-audio.m4a part3-winter-robots.mp4
ffmpeg -y -i part3-winter-robots.mp4 -i voice/part3-audio-nomusic.m4a -map 0:v -map 1:a -c copy part3-winter-robots-no-music.mp4

# 5-секундные шортсы
for c in 1 2 3 4 5 6; do python3 tools/short5_audio.py $c voice/s$c.wav && ffmpeg -y -i voice/s$c.wav -c:a aac short$c-audio.m4a; done
node tools/render_video.js "short5.html?clip=1" short1-audio.m4a shorts/short1-wait-for-it.mp4
node tools/render_video.js "short5.html?clip=2" short2-audio.m4a shorts/short2-who-wins.mp4
node tools/render_video.js "short5.html?clip=3" short3-audio.m4a shorts/short3-scared-russia-bot.mp4
node tools/render_video.js "short5.html?clip=4" short4-audio.m4a shorts/short4-japan-blink.mp4
node tools/render_video.js "short5.html?clip=5" short5-audio.m4a shorts/short5-brazil-kick.mp4
node tools/render_video.js "short5.html?clip=6" short6-audio.m4a shorts/short6-pick-one.mp4
```
