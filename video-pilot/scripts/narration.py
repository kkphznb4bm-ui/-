"""Generate the 'Life of a Star' narration with edge-tts, plus word timings for captions."""
import asyncio, json, os, subprocess, sys

OUT = sys.argv[1]
VOICE = "en-US-ChristopherNeural"
LINES = [
    ("hook", "The iron in your blood was made inside a dying star. This is how it happened."),
    ("nebula", "It begins in a cold, dark cloud of gas and dust, light-years across. Slowly, gravity pulls it tighter... and tighter."),
    ("ignite", "At the center, the gas grows hotter than ten million degrees. Hydrogen begins to fuse. A star is born."),
    ("main", "For millions of years, it shines, balancing the crush of gravity against the fire in its heart. Planets form in its light."),
    ("giant", "But the fuel runs out. The star swells into a red supergiant, hundreds of times wider than our Sun."),
    ("collapse", "Then, in less than a second, the core collapses."),
    ("supernova", "Supernova. For a few weeks, one star outshines its entire galaxy."),
    ("remnant", "What's left falls into itself, and becomes a black hole."),
    ("legacy", "But the star's ashes, carbon, oxygen, iron, drift through space, and become new stars, new planets... and you."),
]

async def one(key, text):
    import edge_tts
    com = edge_tts.Communicate(text, VOICE, rate="-6%", pitch="-2Hz", proxy=os.environ.get("HTTPS_PROXY"), boundary="WordBoundary")
    words, audio = [], bytearray()
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    path = os.path.join(OUT, f"{key}.mp3")
    open(path, "wb").write(audio)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))
    return {"key": key, "text": text, "duration": dur, "words": words}

async def main():
    res = [await one(k, t) for k, t in LINES]
    json.dump(res, open(os.path.join(OUT, "narration.json"), "w"), indent=1)
    for r in res:
        print(f"{r['key']:10s} {r['duration']:5.2f}s words={len(r['words'])}")

asyncio.run(main())
