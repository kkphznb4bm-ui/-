"""Build the scene timeline (in frames) from the narration durations."""
import json, math, sys, os
D = sys.argv[1]
FPS = 30
# frames of silence before / after each narration line
PADS = {
    "hook": (14, 24), "nebula": (12, 30), "ignite": (12, 40), "main": (12, 30), "giant": (12, 30),
    "collapse": (10, 26), "supernova": (40, 46), "remnant": (12, 36), "legacy": (12, 120),
}
narr = json.load(open(os.path.join(D, "narration.json")))
t, out = 0, []
for n in narr:
    pre, post = PADS[n["key"]]
    length = pre + math.ceil(n["duration"] * FPS) + post
    words = [{"w": w["w"], "f": round(t + pre + w["t"] * FPS), "e": round(t + pre + (w["t"] + w["d"]) * FPS)} for w in n["words"]]
    out.append({"key": n["key"], "start": t, "len": length, "voiceAt": t + pre, "words": words})
    t += length
json.dump({"fps": FPS, "total": t, "scenes": out}, open(os.path.join(D, "timeline.json"), "w"), indent=1)
for s in out:
    print(f"{s['key']:10s} start={s['start']:5d} len={s['len']:4d}")
print("total", t, "frames =", round(t / FPS, 1), "s")
