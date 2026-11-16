"""Synthesize an ambient space score + SFX aligned to timeline.json -> score.wav (stereo, 44.1k)."""
import json, os, sys, wave
import numpy as np

D = sys.argv[1]
TL = json.load(open(os.path.join(D, "timeline.json")))
FPS, SR = TL["fps"], 44100
N = int(TL["total"] / FPS * SR) + SR
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)
S = {s["key"]: s for s in TL["scenes"]}

def sec(frame): return frame / FPS
def word(key, w, nth=0):
    hits = [x for x in S[key]["words"] if "".join(c for c in x["w"].lower() if c.isalpha()) == w]
    return hits[min(nth, len(hits) - 1)]["f"]

def env(a, d, length):
    n = int(length * SR); e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    e[:na] = np.linspace(0, 1, na) if na else 1
    if nd: e[-nd:] *= np.linspace(1, 0, nd)
    return e

def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if j <= i: return
    L[i:j] += sig[: j - i] * gain * (1 - pan) ; R[i:j] += sig[: j - i] * gain * (1 + pan)

def lowpass(x, k):
    ker = np.exp(-np.arange(k) / (k / 5)); ker /= ker.sum()
    return np.convolve(x, ker, mode="same")

# ---- pad: slow chord progression (A minor-ish), detuned sines + octave shimmer ----
def note(n): return 440 * 2 ** ((n - 69) / 12)
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67],
          [57, 60, 64, 71], [53, 57, 62, 65], [52, 55, 59, 64], [57, 61, 64, 69]]
total_s = N / SR
seg = total_s / len(chords)
pad = np.zeros(N)
for ci, ch in enumerate(chords):
    st, ln = ci * seg, seg + 3.0
    tt = np.arange(int(ln * SR)) / SR
    s = np.zeros_like(tt)
    for k, m in enumerate(ch):
        for det in (-0.12, 0.0, 0.11):
            fq = note(m) * 2 ** (det / 12)
            s += np.sin(2 * np.pi * fq * tt + k) * (0.6 if det == 0 else 0.35)
        s += 0.15 * np.sin(2 * np.pi * note(m + 12) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * tt + k))
    s *= env(2.5, 3.0, ln) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * tt))
    i = int(st * SR); j = min(N, i + len(s)); pad[i:j] += s[: j - i]
pad = lowpass(pad, 60)
pad /= np.abs(pad).max()
# space wind
wind = lowpass(rng.standard_normal(N), 400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t))
wind /= np.abs(wind).max()
# intensity curve: quiet at start, rising to the supernova, calm resolve at end
sn = sec(S["supernova"]["start"])
inten = np.interp(t, [0, 6, sn - 6, sn, sn + 8, total_s - 6, total_s], [0.5, 0.7, 0.9, 1.0, 0.75, 0.8, 0.0])
add(pad * inten * 0.16, 0, pan=-0.05)
add(np.roll(pad, int(0.013 * SR)) * inten * 0.16, 0, pan=0.05)
add(wind * 0.05, 0)

# ---- SFX ----
def whoosh(dur=1.4, up=True):
    n = int(dur * SR); x = rng.standard_normal(n)
    k = np.linspace(300, 40, n).astype(int) if up else np.linspace(40, 300, n).astype(int)
    y = np.zeros(n)
    for a in range(0, n, 2048):  # piecewise lowpass sweep
        b = min(n, a + 2048); y[a:b] = lowpass(x[a:b], max(8, k[a]))
    return y / (np.abs(y).max() + 1e-9) * np.sin(np.linspace(0, np.pi, n)) ** 2

def boom(dur=4.0, f0=70, f1=28, noise=0.8):
    n = int(dur * SR); tt = np.arange(n) / SR
    fq = f1 + (f0 - f1) * np.exp(-tt * 2.5)
    s = np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-tt * 1.2)
    nz = lowpass(rng.standard_normal(n), 120) * np.exp(-tt * 1.6) * noise
    y = s + nz * 3
    return y / np.abs(y).max()

def riser(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    fq = 80 * 2 ** (tt / dur * 3)
    s = np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.5 + lowpass(rng.standard_normal(n), 30) * 0.6
    return s * (tt / dur) ** 2

def shimmer(dur=3.0):
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in (76, 79, 83, 88, 91):
        s += np.sin(2 * np.pi * note(m) * tt + m) * np.exp(-tt * 1.3)
    return s / np.abs(s).max() * np.minimum(1, tt * 20)

def hum(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * 41 * tt) + 0.5 * np.sin(2 * np.pi * 61.5 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * tt))
    return s / np.abs(s).max() * env(1.0, 1.5, dur)

for s in TL["scenes"][1:]:
    add(whoosh(1.6), sec(s["start"]) - 0.8, 0.12)
fuse = word("ignite", "fuse")
add(boom(3.0, 90, 40, 0.5), sec(fuse), 0.35)
add(shimmer(3.5), sec(fuse) - 0.05, 0.12)
add(shimmer(3.0), sec(word("ignite", "born")), 0.08)
col = word("collapse", "collapses")
cst = S["collapse"]["start"]
add(riser(sec(col - cst)), sec(cst), 0.18)
add(whoosh(0.9, up=False), sec(col), 0.3)
add(boom(5.5, 80, 25, 1.0), sec(S["supernova"]["start"]), 0.75)
add(boom(3.0, 50, 30, 0.6), sec(S["supernova"]["start"]) + 0.12, 0.3, pan=0.3)
add(hum(sec(S["remnant"]["len"]) + 1.0), sec(S["remnant"]["start"]), 0.12)
add(shimmer(4.0), sec(word("legacy", "you")), 0.1)

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.1) * 0.8  # gentle limiter
pcm = (mix * 32767).astype(np.int16)
with wave.open(os.path.join(D, "score.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("score.wav", round(N / SR, 1), "s, peak", round(float(np.abs(mix).max()), 2))
