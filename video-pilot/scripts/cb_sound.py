"""Countryballs: ambience + music + SFX for one chapter, aligned to its timeline.json -> sound.wav"""
import json, os, sys, wave
import numpy as np

D = sys.argv[1]
TL = json.load(open(os.path.join(D, "timeline.json")))
FPS, SR = TL["fps"], 44100
N = int(TL["total"] / FPS * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(5)
t = np.arange(N) / SR
beats = TL["beats"]
def act(a):
    return next(b for b in beats if b.get("act") == a)
def s(frame): return frame / FPS

def add(sig, at, gain=1.0, pan=0.0):
    i = max(0, int(at * SR)); j = min(N, i + len(sig))
    if j > i:
        L[i:j] += sig[: j - i] * gain * (1 - pan); R[i:j] += sig[: j - i] * gain * (1 + pan)

def lp(x, k):
    ker = np.exp(-np.arange(k) / (k / 5)); ker /= ker.sum()
    return np.convolve(x, ker, mode="same")

def env(n, a, d):
    e = np.ones(n); na, nd = int(a * SR), int(d * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nd: e[-nd:] *= np.linspace(1, 0, nd)
    return e

def note(m): return 440 * 2 ** ((m - 69) / 12)

def pluck(m, dur=0.5, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * note(m) * k * tt) / k ** (1.6 / bright) for k in range(1, 6))
    return y * np.exp(-tt * 7) * np.minimum(1, tt * 400)

# ---- ocean ambience (whole chapter, ducked a little under dialogue) ----
waves = lp(rng.standard_normal(N), 300)
swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5) ** 2
ocean = waves / np.abs(waves).max() * swell
add(ocean * 0.10, 0, pan=-0.1); add(np.roll(ocean, 3000) * 0.10, 0, pan=0.1)

# ---- playful comedy music (pizzicato + bass) from wake until sign1 ----
wake, sign1, sign2 = act("wake"), act("sign1"), act("sign2")
start, end = s(wake["start"]), s(sign1["start"])
bpm = 112; beat = 60 / bpm
prog = [(60, [64, 67, 72]), (57, [60, 64, 69]), (53, [57, 60, 65]), (55, [59, 62, 67])]
melody = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 71, 67, 69, 71]
k = 0; tt0 = start
while tt0 < end - beat:
    bar = int(k / 4) % 4; root, ch = prog[bar]
    if k % 4 == 0: add(pluck(root - 24, 0.9, 0.6), tt0, 0.22)
    if k % 2 == 1: add(pluck(ch[(k // 2) % 3], 0.35), tt0, 0.08, pan=0.3)
    add(pluck(melody[k % 16], 0.3, 1.3), tt0 + beat / 2, 0.06, pan=-0.3)
    k += 1; tt0 += beat
argue = act("argue"); silence = act("silence")
# cut music during the silence beat (comic pause)
i0, i1 = int(s(silence["start"]) * SR), int(s(silence["start"] + silence["len"]) * SR)
for arr in (L, R):
    arr[i0:i1] -= arr[i0:i1]  # pure silence before re-adding ocean/crickets
add(ocean[i0:i1] * 0.05, s(silence["start"]))

# ---- argument murmur: overlapping formant-ish noise blips ----
a0 = s(argue["start"]); al = s(argue["len"])
for i in range(70):
    n = int((0.12 + rng.random() * 0.25) * SR); tt = np.arange(n) / SR
    f0 = 140 + rng.random() * 160
    blip = np.sign(np.sin(2 * np.pi * f0 * tt)) * 0.3 + lp(rng.standard_normal(n), 6) * 0.5
    blip = lp(blip, 12) * np.sin(np.linspace(0, np.pi, n))
    add(blip, a0 + rng.random() * (al - 0.4), 0.10, pan=rng.random() - 0.5)
# cartoon fight thumps
for i in range(14):
    n = int(0.18 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * (90 - tt * 200) * tt) * np.exp(-tt * 25), a0 + 0.3 + i * (al - 0.8) / 14, 0.25)

# ---- crickets in the silence ----
for i in range(int(s(silence["len"]) * 2.2)):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    chirp = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 60 * tt) > 0) * np.sin(np.linspace(0, np.pi, n))
    add(chirp, s(silence["start"]) + 0.2 + i * 0.45, 0.05, pan=0.4)

# ---- wake: little pops as balls wake up ----
for i in range(9):
    n = int(0.12 * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * (500 + 900 * tt / 0.12) * tt) * np.exp(-tt * 30), s(wake["start"] + 40 + i * 14), 0.12)

# ---- sign: tension drone, glitch, sting + boom + thunder ----
dr0 = s(sign1["start"]); drn = int((s(sign2["start"] + sign2["len"]) - dr0 + 6) * SR); tt = np.arange(drn) / SR
drone = (np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 82.4 * tt) + 0.3 * np.sin(2 * np.pi * 110.5 * tt)) * env(drn, 2.0, 2.5)
add(drone * 0.09, dr0)
g0 = s(sign2["start"])
gn = int(0.95 * SR)
glitch = rng.standard_normal(gn) * (rng.random(gn) > 0.6) * np.repeat(rng.random(gn // 400 + 1) > 0.4, 400)[:gn]
add(glitch * 0.12, g0)
hit = g0 + 28 / FPS
n = int(4 * SR); tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * (60 * np.exp(-tt * 1.5) + 30) * tt) * np.exp(-tt * 1.1) + lp(rng.standard_normal(n), 80) * np.exp(-tt * 2) * 2
add(boom / np.abs(boom).max() * 0.6, hit)
sting = sum(pluck(m, 2.5, 0.8) for m in (45, 52, 57, 60, 63)) * 0.6
add(sting, hit, 0.35)
n = int(5 * SR); tt = np.arange(n) / SR
thunder = lp(rng.standard_normal(n), 220) * (np.exp(-((tt - 0.6) ** 2) * 3) + 0.5 * np.exp(-((tt - 2.0) ** 2) * 1.5))
add(thunder / np.abs(thunder).max() * 0.45, hit + 1.2)
# shock: orchestral-ish stab
sh = act("shock")
add(sum(pluck(m, 1.5, 0.7) for m in (44, 51, 56, 59)) * 0.5, s(sh["start"]), 0.4)
# end card: mysterious motif
nx = act("next")
for i, m in enumerate([57, 60, 64, 63, 62]):
    add(pluck(m, 1.2, 0.8), s(nx["start"]) + 0.3 + i * 0.45, 0.14)

# transition whooshes
for a in ("wake", "sign1", "next"):
    n = int(1.2 * SR); x = lp(rng.standard_normal(n), 40) * np.sin(np.linspace(0, np.pi, n)) ** 2
    add(x / np.abs(x).max() * 0.12, s(act(a)["start"]) - 0.5)

mix = np.tanh(np.stack([L, R], 1) * 1.2) * 0.85
with wave.open(os.path.join(D, "sound.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("sound.wav", round(N / SR, 1), "s")
