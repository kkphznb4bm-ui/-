"""Countryballs: voice every beat of a chapter spec with edge-tts and build the frame timeline.
usage: cb_voices.py cb/chXX.json public/cb/chXX"""
import asyncio, json, math, os, subprocess, sys

SPEC, OUT = sys.argv[1], sys.argv[2]
FPS = 30
# character -> (voice, pitch, rate); no fake accents, just distinct voices
VOICES = {
    "narr": ("en-US-ChristopherNeural", "-4Hz", "-6%"),
    "usa": ("en-US-GuyNeural", "+16Hz", "+8%"),
    "rus": ("en-US-EricNeural", "-14Hz", "-8%"),
    "chn": ("en-GB-RyanNeural", "+0Hz", "-4%"),
    "jpn": ("en-US-RogerNeural", "+28Hz", "+10%"),
    "kgz": ("en-US-AndrewNeural", "+6Hz", "-4%"),
    "ger": ("en-US-SteffanNeural", "-6Hz", "-4%"),
    "fra": ("en-CA-LiamNeural", "+12Hz", "+4%"),
    "uk": ("en-GB-ThomasNeural", "+4Hz", "-2%"),
    "ita": ("en-US-BrianNeural", "+20Hz", "+12%"),
    "voice": ("en-US-ChristopherNeural", "-28Hz", "-18%"),
}
PRE, POST = 6, 14  # frames before / after each spoken line

async def tts(who, text, path):
    for attempt in range(4):
        try:
            return await _tts(who, text, path)
        except Exception as e:  # edge-tts occasionally drops a stream; retry
            print("retry", who, attempt, type(e).__name__)
            await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError(f"tts failed for {who}: {text}")

async def _tts(who, text, path):
    import edge_tts
    v, p, r = VOICES[who]
    com = edge_tts.Communicate(text, v, pitch=p, rate=r, proxy=os.environ.get("HTTPS_PROXY"), boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in com.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t": ch["offset"] / 1e7})
    open(path, "wb").write(audio)
    if who == "voice":  # mysterious island voice: echo
        tmp = path + ".tmp.mp3"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-af", "aecho=0.8:0.7:120|260:0.35|0.2", tmp], check=True)
        os.replace(tmp, path)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))
    return dur, words

async def main():
    spec = json.load(open(SPEC))
    os.makedirs(OUT, exist_ok=True)
    t, beats = 0, []
    for i, b in enumerate(spec["beats"]):
        nb = dict(b, i=i, start=t)
        length = math.ceil(b.get("min", 0) * FPS)
        if b.get("text"):
            fn = f"b{i:02d}_{b['who']}.mp3"
            dur, words = await tts(b["who"], b["text"], os.path.join(OUT, fn))
            nb["audio"] = fn
            nb["voiceAt"] = t + PRE
            nb["words"] = [{"w": w["w"], "f": round(t + PRE + w["t"] * FPS)} for w in words]
            nb["voiceEnd"] = t + PRE + math.ceil(dur * FPS)
            length = max(length, PRE + math.ceil(dur * FPS) + POST)
        nb["len"] = length
        beats.append(nb)
        t += length
    json.dump({"id": spec["id"], "num": spec["num"], "title": spec["title"], "fps": FPS, "total": t, "beats": beats},
              open(os.path.join(OUT, "timeline.json"), "w"), indent=1)
    for b in beats:
        print(f"{b['i']:2d} {b.get('act', ''):9s} {b.get('who', ''):5s} {b['len'] / FPS:5.2f}s")
    print("total", round(t / FPS, 1), "s")

asyncio.run(main())
