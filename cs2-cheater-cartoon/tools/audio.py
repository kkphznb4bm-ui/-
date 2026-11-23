"""Сборка звуковой дорожки: озвучка + звуковые эффекты + фоновый бит (всё синтезируется локально)."""
import sys, wave, numpy as np, subprocess, os
SR = 44100
OFF = 4.4          # длительность тизера: всё основное сдвигается на OFF
DUR = 39.0 + 2.2 + OFF
WARP = [(0, 0), (9.8, 9.8), (14.2, 13), (23.2, 21), (41.2, 39), (99, 96.8)]
def unwarp(a):
    if a < 0: return a
    for (n0, a0), (n1, a1) in zip(WARP, WARP[1:]):
        if a <= a1: return n0 + (n1 - n0) * (a - a0) / (a1 - a0)
    return a
vo_dir, out = sys.argv[1], sys.argv[2]
USE_VO = vo_dir != "-"  # "-" = без озвучки (только музыка и эффекты)
mix = np.zeros(int(SR * DUR))
def add(sig, t, g=1.0, raw=False, anim=True):
    # raw — абсолютное время; anim — время анимации (переводится в таймлайн); иначе — время таймлайна
    i = int((t if raw else (unwarp(t) if anim else t) + OFF) * SR); n = min(len(sig), len(mix) - i)
    if n > 0: mix[i:i + n] += sig[:n] * g
def readwav(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    if w.getnchannels() == 2: a = a[::2]
    assert w.getframerate() == SR; return a
T = lambda d: np.arange(int(SR * d)) / SR
rng = np.random.default_rng(7)
def env(d, a=.005, r=None):
    t = T(d); e = np.minimum(1, t / a)
    return e * (np.exp(-t / r) if r else 1)
def kick(): t = T(.35); return np.sin(2 * np.pi * (50 + 120 * np.exp(-t * 25)) * t) * np.exp(-t * 9)
def hat(): return rng.standard_normal(int(SR * .05)) * np.exp(-T(.05) * 80) * .3
def snare(): d = .2; return (rng.standard_normal(int(SR * d)) * .6 + np.sin(2 * np.pi * 190 * T(d)) * .5) * np.exp(-T(d) * 18)
def shot(): d = .3; n = rng.standard_normal(int(SR * d)); return np.tanh(3 * (n * np.exp(-T(d) * 14) + kick()[:int(SR * d)] * 1.2))
def whoosh(d=.4):
    n = rng.standard_normal(int(SR * d)); t = T(d); e = np.sin(np.pi * t / d) ** 2
    # грубый полосовой фильтр через скользящее среднее
    k = 30; n = np.convolve(n, np.ones(k) / k, 'same'); return n * e * 3
def pop(f=600): t = T(.12); return np.sin(2 * np.pi * (f + 900 * t) * t) * np.exp(-t * 30)
def boing(): t = T(.5); return np.sin(2 * np.pi * (220 + 120 * np.sin(t * 40) * np.exp(-t * 4)) * t) * np.exp(-t * 5)
def sad_trombone():
    out = []
    for f, d in [(392, .35), (370, .35), (349, .35), (330, 1.0)]:
        t = T(d); vib = 1 + .01 * np.sin(2 * np.pi * 6 * t) * (t > .2)
        s = sum(np.sin(2 * np.pi * f * h * vib * t) / h for h in range(1, 6)) * env(d, .02) * np.minimum(1, (d - t) / .05)
        out.append(s * .35)
    return np.concatenate(out)
def alarm(d=2.4):
    t = T(d); f = np.where((t * 4) % 1 < .5, 880, 660)
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .25
def stamp(): return np.tanh(4 * (kick() * 1.3 + np.pad(snare(), (0, int(SR * .15)))[:int(SR * .35)]))
def riser(d=1.0): t = T(d); return np.sin(2 * np.pi * (200 * t + 600 * t * t / d)) * (t / d) * .5
def ding(f=1320): t = T(.6); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 6) * .5
def bass_note(f, d): t = T(d); return np.tanh(2 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 3) * .5

# ---- фоновый бит (тише во время озвучки) ----
bpm = 128; beat = 60 / bpm
music = np.zeros_like(mix)
def madd(sig, t, g):
    i = int((t + OFF) * SR); n = min(len(sig), len(music) - i)
    if n > 0: music[i:i + n] += sig[:n] * g
roots = [55, 55, 65.4, 49]
b = 0; t = -OFF
while t < 37.7:
    # пауза в бите: момент выстрела, крик и бан
    if not (8.15 < t < 8.7 or 33.8 < t < 34.6 or -OFF + 1.25 < t < -OFF + 2.0):
        evil = 23.2 <= t < 32.2 or t < -OFF + 1.3
        madd(kick(), t, .9 if b % 2 == 0 else 0)
        if b % 4 == 2: madd(snare(), t, .55)
        madd(hat(), t + beat / 2, .5)
        r = roots[(b // 8) % 4] * (0.94 if evil else 1)
        madd(bass_note(r, beat * .9), t, .55)
    b += 1; t += beat
# огибающая громкости музыки: ниже под голосом
VO = [('t0', -OFF + .2), ('n1', .35), ('n2', 6.05), ('p1', 11.6), ('n3', 14.4), ('p2', 19.4), ('n4', 23.5), ('p3', 28.5), ('n5', 33.9)]
if USE_VO and os.path.exists(os.path.join(vo_dir, 'timing.txt')):
    VO = [(a, float(b)) for a, b in (l.split() for l in open(os.path.join(vo_dir, 'timing.txt')) if l.strip())]
duck = np.ones_like(mix)
for name, st in (VO if USE_VO else []):
    a = readwav(os.path.join(vo_dir, name + '.wav'))
    i0, i1 = int((st + OFF - .1) * SR), int((st + OFF + len(a) / SR + .15) * SR)
    duck[i0:i1] = .35
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

# ---- озвучка ----
for name, st in (VO if USE_VO else []):
    a = readwav(os.path.join(vo_dir, name + '.wav'))
    add(a / (np.abs(a).max() + 1e-9), st, .95, anim=False)

# ---- эффекты тизера (абсолютное время) ----
def rewind(d=1.8):
    t = T(d); f = 300 + 1500 * np.abs(np.sin(2 * np.pi * 7 * t)) * (1 - t / d * .6)
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .18 * np.minimum(1, (d - t) / .1)
add(stamp(), 0.02, .7, raw=True); add(riser(1.0), 0.1, .25, raw=True)
add(stamp(), 1.15, .5, raw=True); add(ding(1760), 1.17, .4, raw=True)   # очки сели
add(stamp(), 1.3, .9, raw=True); add(alarm(1.2), 1.32, .4, raw=True)    # VAC-бан
add(rewind(1.75), 2.6, .7, raw=True); add(whoosh(.5), OFF - .25, .6, raw=True)
# ---- эффекты ----
add(ding(), .15, .5)
add(whoosh(), 2.45, .5); add(pop(500), 2.6, .4)
add(sad_trombone(), 3.75, .55)
add(boing(), 4.45, .5)
add(whoosh(.5), 5.75, .6)
add(shot(), 8.2, .9)
add(whoosh(.3), 9.7, .4)
add(riser(1.2), 9.9, .3)
add(whoosh(.5), 12.75, .6)
for i in range(5): add(pop(400 + i * 120), 13.0 + i * .15, .35)
for i in range(8): add(pop(900), 13.4 + i * .35, .12)
add(stamp(), 19.9, .8)
add(whoosh(.5), 20.75, .6)
add(pop(300), 22.0, .5)
add(riser(1.0), 24.6, .4); add(ding(660), 25.5, .5)
add(whoosh(.4), 29.0, .5); add(stamp(), 29.45, .6); add(ding(1760), 29.5, .5)
add(whoosh(.3), 29.8, .5); add(ding(990), 30.5, .5)
for i in range(4): add(shot(), 30.95 + i * .18, .45)
add(stamp(), 31.7, .9); add(alarm(2.4), 31.75, .5)
add(alarm(1.5), 34.0, .2)
add(whoosh(.5), 35.25, .6); add(boing(), 35.55, .6); add(ding(1320), 35.8, .4)
# ---- финал: мастеринг ----
mix = np.tanh(mix * 1.1) * .9
fade = np.minimum(1, (DUR - np.arange(len(mix)) / SR) / 1.0); mix *= np.clip(fade, 0, 1)
pcm = (mix * 32767).astype(np.int16)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print('ok', out)
