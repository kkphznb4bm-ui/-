"""Generic ambience/music/SFX for chapters 2-9, driven by each beat's set + act -> sound.wav"""
import json, os, sys, wave
import numpy as np

D = sys.argv[1]
TL = json.load(open(os.path.join(D, "timeline.json")))
FPS, SR = TL["fps"], 44100
N = int(TL["total"] / FPS * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(TL["num"])
beats = TL["beats"]
sec = lambda f: f / FPS

def add(sig, at, gain=1.0, pan=0.0):
    i = max(0, int(at * SR)); j = min(N, i + len(sig))
    if j > i:
        L[i:j] += sig[: j - i] * gain * (1 - pan); R[i:j] += sig[: j - i] * gain * (1 + pan)
def lp(x, k):
    ker = np.exp(-np.arange(k) / (k / 5)); ker /= ker.sum(); return np.convolve(x, ker, mode="same")
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pluck(m, dur=0.5, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * note(m) * k * tt) / k ** (1.6 / bright) for k in range(1, 6))
    return y * np.exp(-tt * 7) * np.minimum(1, tt * 400)
def pad(ms, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * note(m) * tt * d) for m in ms for d in (0.997, 1.0, 1.003))
    e = np.minimum(1, tt / 1.5) * np.minimum(1, (dur - tt) / 1.5)
    return lp(y, 30) / (len(ms) * 3) * e
def noise(dur, k): return lp(rng.standard_normal(int(dur * SR)), k)
def norm(x): return x / (np.abs(x).max() + 1e-9)

# ---- resolve set per beat ----
cur = "beach"; sets = []
for b in beats:
    cur = b.get("set", cur); sets.append(cur)
segments = []  # (set, start_s, end_s)
for b, s in zip(beats, sets):
    a, e = sec(b["start"]), sec(b["start"] + b["len"])
    if segments and segments[-1][0] == s: segments[-1][2] = e
    else: segments.append([s, a, e])

for s, a, e in segments:
    dur = e - a
    if dur <= 0: continue
    n = int(dur * SR); tt = np.arange(n) / SR
    fade = np.minimum(1, np.minimum(tt, dur - tt) / 0.6)
    if s == "beach":
        w = norm(noise(dur, 300)) * (0.55 + 0.45 * np.sin(2 * np.pi * tt / 6.5) ** 2)
        add(w * fade * 0.09, a)
    elif s == "forest":
        add(norm(noise(dur, 900)) * fade * 0.04, a)
        for i in range(int(dur * 2.5)):
            m = int(0.08 * SR); t2 = np.arange(m) / SR
            add(np.sin(2 * np.pi * 4200 * t2) * (np.sin(2 * np.pi * 55 * t2) > 0) * np.sin(np.linspace(0, np.pi, m)), a + i * 0.4 + rng.random() * 0.1, 0.035, pan=rng.random() - 0.5)
    elif s in ("lab", "city"):
        hum = np.sin(2 * np.pi * 60 * tt) + 0.4 * np.sin(2 * np.pi * 120 * tt) + 0.2 * norm(noise(dur, 50))
        add(hum * fade * 0.035, a)
    elif s == "cave":
        add(norm(noise(dur, 1200)) * fade * 0.05, a)
        for i in range(int(dur * 1.2)):
            m = int(0.15 * SR); t2 = np.arange(m) / SR
            add(np.sin(2 * np.pi * (1400 - 4000 * t2) * t2) * np.exp(-t2 * 30), a + rng.random() * dur, 0.08, pan=rng.random() - 0.5)
    elif s == "volcano":
        add(norm(noise(dur, 600)) * fade * 0.16, a)
    elif s == "sky":
        add(pad([57, 64, 69, 73, 76], dur) * 0.5, a)

# ---- music by mood ----
def comedy(a, e, g=1.0):
    beat = 60 / 112; prog = [(60, [64, 67, 72]), (57, [60, 64, 69]), (53, [57, 60, 65]), (55, [59, 62, 67])]
    mel = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 71, 67, 69, 71]
    k = 0; t0 = a
    while t0 < e - beat:
        root, ch = prog[(k // 4) % 4]
        if k % 4 == 0: add(pluck(root - 24, 0.9, 0.6), t0, 0.2 * g)
        if k % 2 == 1: add(pluck(ch[(k // 2) % 3], 0.35), t0, 0.07 * g, pan=0.3)
        add(pluck(mel[k % 16], 0.3, 1.3), t0 + beat / 2, 0.05 * g, pan=-0.3)
        k += 1; t0 += beat
def mystery(a, e):
    t0 = a; seq = [57, 60, 64, 63, 62, 60, 59, 55]; k = 0
    while t0 < e - 1:
        add(pluck(seq[k % 8], 1.4, 0.7), t0, 0.08, pan=0.2 * ((k % 2) * 2 - 1)); k += 1; t0 += 0.9
    add(pad([45, 52, 57], e - a) * 0.6, a)
def tension(a, e):
    dur = e - a; n = int(dur * SR); tt = np.arange(n) / SR
    pulse = (np.sin(2 * np.pi * 55 * tt) * (np.sin(2 * np.pi * 2.0 * tt) > 0.3)) * np.minimum(1, np.minimum(tt, dur - tt))
    add(lp(pulse, 20) * 0.12, a); add(pad([45, 48, 52], dur) * 0.6, a)
def action(a, e):
    beat = 60 / 150; t0 = a; k = 0
    while t0 < e - beat:
        add(pluck([45, 45, 48, 45, 50, 45, 52, 48][k % 8] - 12, 0.25, 0.8), t0, 0.2)
        if k % 2 == 0:
            m = int(0.12 * SR); t2 = np.arange(m) / SR
            add(np.sin(2 * np.pi * (120 - 400 * t2) * t2) * np.exp(-t2 * 25), t0, 0.35)
        k += 1; t0 += beat
def warm(a, e): add(pad([60, 64, 67, 71], e - a) * 0.9, a); add(pad([48, 55], e - a) * 0.6, a)

MOOD = {"beach": "comedy", "forest": "mystery", "lab": "mystery", "cave": "mystery", "city": "tension", "volcano": "action", "home": "comedy", "sky": None}
ACT_MOOD = {"argue": "action", "panic": "action", "run": "action", "erupt": "action", "suspect": "tension", "thief": "mystery", "flood": "tension",
            "rain": "tension", "nightfall": "mystery", "forest-light": "mystery", "teamwork": "comedy", "keys": "comedy", "quiet": None, "freeze": None,
            "creator": "tension", "keys-insert": "warm", "timer-stop": "warm", "title": "keep", "recap": "warm", "next": None, "tbc": None, "fail": None,
            "flashback": "comedy", "laugh": "comedy", "lab-screen": "mystery", "lab-voice": "mystery", "watched": "mystery", "map-gone": "tension"}
moods = []
for b, s in zip(beats, sets):
    m = ACT_MOOD.get(b.get("act", ""), "keep")
    if m == "keep": m = MOOD.get(s)
    if TL["num"] == 9 and s == "city" and b.get("act") not in ("creator",) and b["i"] > 4: m = "warm"
    moods.append(m)
runs = []
for b, m in zip(beats, moods):
    a, e = sec(b["start"]), sec(b["start"] + b["len"])
    if runs and runs[-1][0] == m: runs[-1][2] = e
    else: runs.append([m, a, e])
for m, a, e in runs:
    if m == "comedy": comedy(a, e)
    elif m == "mystery": mystery(a, e)
    elif m == "tension": tension(a, e)
    elif m == "action": action(a, e)
    elif m == "warm": warm(a, e)

# ---- SFX by act ----
def boom(dur=3.0, f0=70, f1=30):
    n = int(dur * SR); tt = np.arange(n) / SR
    y = np.sin(2 * np.pi * (f1 + (f0 - f1) * np.exp(-tt * 2.5)) * tt) * np.exp(-tt * 1.3) + norm(noise(dur, 100)) * np.exp(-tt * 2) * 1.5
    return norm(y)
def whoosh(dur=1.0): x = norm(noise(dur, 40)) * np.sin(np.linspace(0, np.pi, int(dur * SR))) ** 2; return x
def blip(f0=800, f1=1600, dur=0.12):
    n = int(dur * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (f0 + (f1 - f0) * tt / dur) * tt) * np.exp(-tt * 20)
def hammer(): n = int(0.1 * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * 300 * tt) + norm(noise(0.1, 4))) * np.exp(-tt * 40)
def thunder(): n = int(4 * SR); tt = np.arange(n) / SR; return norm(noise(4, 220) * (np.exp(-((tt - 0.5) ** 2) * 3) + 0.5 * np.exp(-((tt - 1.8) ** 2) * 1.5)))
def chime(): return sum(pluck(m, 2.0, 1.4) for m in (79, 83, 86, 91)) * 0.5

prev_set = None
for b, s in zip(beats, sets):
    a, ln, act = sec(b["start"]), sec(b["len"]), b.get("act", "")
    if s != prev_set and prev_set is not None: add(whoosh(1.2), a - 0.6, 0.12)
    prev_set = s
    if act == "title": add(whoosh(0.8), a, 0.1); add(sum(pluck(m, 1.2) for m in (60, 64, 67, 72)) * 0.4, a + 0.3, 0.2)
    if act in ("quake", "erupt"): add(norm(noise(ln, 160)) * np.minimum(1, np.arange(int(ln * SR)) / SR), a, 0.45); add(boom(2.5, 50, 25), a + 0.2, 0.4)
    if act == "door": add(norm(noise(3.5, 250)), a, 0.25); add(boom(3, 60, 35), a + 3.6, 0.45); add(chime(), a + 4.0, 0.15)
    if act in ("shock", "disappear"): add(sum(pluck(m, 1.5, 0.7) for m in (44, 51, 56, 59)) * 0.5, a, 0.4)
    if act.startswith("build-"):
        for i in range(10): add(hammer(), a + 0.3 + i * 0.28, 0.25, pan=rng.random() - 0.5)
        add(blip(400, 1200, 0.3), a + 3.2, 0.2)
    if act == "rain":
        n = int((sec(beats[-1]["start"]) - a) * SR)
        for bb in beats:
            if bb.get("act") == "forest-light": n = int((sec(bb["start"]) - a) * SR)
        add(norm(noise(n / SR, 3)) * 0.5 + norm(noise(n / SR, 40)) * 0.5, a, 0.12)
        for k in range(4): add(thunder(), a + 0.5 + k * 3.2, 0.4)
    if act == "flood": add(norm(noise(ln, 20)), a, 0.12)
    if act in ("laugh",):
        for i in range(12): add(blip(300 + rng.random() * 300, 500 + rng.random() * 300, 0.15), a + 0.2 + i * 0.25, 0.12, pan=rng.random() - 0.5)
    if act in ("tally", "ballot"):
        for w in b.get("words", [])[::3]: add(blip(900, 1300, 0.08), sec(w["f"]), 0.06)
    if act in ("screen-on", "timer", "timer-stop", "keys-insert", "lab-screen"): add(blip(200, 2400, 0.4), a + 0.1, 0.15)
    if act == "lights-off": add(boom(1.5, 90, 40), a, 0.3)
    if act in ("map-gone",): add(whoosh(0.5), sec(b.get("voiceAt", b["start"])) + 0.66, 0.3)
    if act in ("panic",):
        n = int(ln * SR); tt = np.arange(n) / SR; add(np.sin(2 * np.pi * (700 + 300 * np.sign(np.sin(2 * np.pi * 2 * tt))) * tt) * 0.5, a, 0.06)
    if act in ("key-found", "keys"): add(chime(), a + 0.5, 0.2)
    if act == "fail": add(boom(4, 80, 25), a, 0.6); add(sum(pluck(m, 2.5, 0.6) for m in (40, 47, 52, 55)) * 0.6, a, 0.35)
    if act == "glow": add(chime(), a + 1, 0.2)
    if act == "fly-home":
        for i in range(10): add(whoosh(0.6), a + i * 0.4, 0.12, pan=rng.random() - 0.5)
    if act == "tbc": add(sum(pluck(m, 2.0, 0.8) for m in (57, 60, 64, 69)) * 0.5, a + 0.3, 0.3)
    if act == "next": add(sum(pluck(m, 1.2, 0.8) for m in (57, 60, 64)) * 0.4, a + 0.3, 0.2)
    if act == "watched": add(pad([43, 46], ln) , a, 0.25)

mix = np.tanh(np.stack([L, R], 1) * 1.2) * 0.85
with wave.open(os.path.join(D, "sound.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(TL["id"], "sound", round(N / SR, 1), "s")
