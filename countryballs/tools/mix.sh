#!/usr/bin/env bash
# Сведение: голос + эффекты (+ музыка, приглушаемая под голос).
# tools/mix.sh <voice> <sfx.wav> <music.wav|-> <длительность> <out.m4a>
set -e
V=$1; S=$2; M=$3; D=$4; O=$5
if [ "$M" = "-" ]; then
  ffmpeg -loglevel error -y -i "$V" -i "$S" -filter_complex \
   "[0:a]aresample=44100,apad,volume=1.5[v];[1:a]volume=0.45[s];[v][s]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,atrim=0:$D[a]" \
   -map "[a]" -c:a aac -b:a 160k "$O"
else
  ffmpeg -loglevel error -y -i "$V" -i "$S" -i "$M" -filter_complex \
   "[0:a]aresample=44100,apad,volume=1.5,asplit=2[v][vk];[2:a]volume=0.32[m];[m][vk]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=350[md];[1:a]volume=0.45[s];[md][v][s]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95,atrim=0:$D[a]" \
   -map "[a]" -c:a aac -b:a 160k "$O"
fi
