"""Звуковая дорожка «Что происходит на 4000 Elo»: озвучка + бит + эффекты (синтез локально).
Использование: python3 audio.py <папка с репликами|-> <out.wav>"""
import sys, wave, os, numpy as np
SR = 44100; DUR = 35.5
vo_dir, out = sys.argv[1], sys.argv[2]
USE_VO = vo_dir != '-'
mix = np.zeros(int(SR * DUR)); rng = np.random.default_rng(3)
T = lambda d: np.arange(int(SR * d)) / SR
def add(buf, sig, t, g=1.0):
    i = int(t * SR); n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += sig[:n] * g
def readwav(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    return a[::2] if w.getnchannels() == 2 else a
def kick(): t = T(.35); return np.sin(2 * np.pi * (50 + 120 * np.exp(-t * 25)) * t) * np.exp(-t * 9)
def hat(): return rng.standard_normal(int(SR * .05)) * np.exp(-T(.05) * 80) * .3
def snare(): d = .2; return (rng.standard_normal(int(SR * d)) * .6 + np.sin(2 * np.pi * 190 * T(d)) * .5) * np.exp(-T(d) * 18)
def whoosh(d=.4):
    n = np.convolve(rng.standard_normal(int(SR * d)), np.ones(30) / 30, 'same'); t = T(d); return n * np.sin(np.pi * t / d) ** 2 * 3
def pop(f=600): t = T(.12); return np.sin(2 * np.pi * (f + 900 * t) * t) * np.exp(-t * 30)
def ding(f=1320): t = T(.6); return (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 6) * .5
def join(): return np.concatenate([ding(880)[:int(SR * .12)], ding(1320)])
def stamp(): return np.tanh(4 * (kick() * 1.3 + np.pad(snare(), (0, int(SR * .15)))[:int(SR * .35)]))
def cricket(d=1.6):
    t = T(d); chirp = (np.sin(2 * np.pi * 30 * t) > .6) * ((t * 2.5) % 1 < .35)
    return np.sin(2 * np.pi * 4300 * t) * chirp * .25
def cash():
    t = T(.5); return (ding(2000)[:len(t)] + ding(2600)[:len(t)] * .7) * .8 + np.pad(pop(300), (0, len(t)))[:len(t)]
def scratch(): t = T(.45); f = 300 + 900 * np.sin(2 * np.pi * 6 * t) ** 2; return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 3) * .3 + rng.standard_normal(len(t)) * .1 * np.exp(-t * 4)
def harp():
    out = np.zeros(int(SR * 1.2))
    for i, f in enumerate([523, 659, 784, 1047, 1319, 1568]): add(out, ding(f) * .6, i * .07)
    return out
def thud(): return np.tanh(3 * kick() * 1.5)
def bass_note(f, d): t = T(d); return np.tanh(2 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 3) * .5

# бит: с каждым уровнем плотнее
bpm = 128; beat = 60 / bpm; music = np.zeros_like(mix)
roots = [55.0, 55.0, 65.4, 49.0]; b = 0; t = 0.0
def level(t): return 0 if t < 6.4 else 1 if t < 10.4 else 2 if t < 14.9 else 3 if t < 19.5 else 4 if t < 27.2 else 5
while t < 34.0:
    L = level(t)
    quiet = 3.2 < t < 3.5 or 19.3 < t < 19.6
    if not quiet:
        if L >= 1 or b % 4 == 0: add(music, kick(), t, .9)
        if L >= 2 and b % 4 == 2: add(music, snare(), t, .5)
        if L >= 3: add(music, hat(), t + beat / 2, .5)
        if L >= 3 and L != 5: add(music, hat(), t + beat / 4, .3)
        add(music, bass_note(roots[(b // 8) % 4] * (1.5 if L == 4 else 1), beat * .9), t, .5)
    b += 1; t += beat
def pad(d, f):
    t = T(d); s = sum(np.sin(2 * np.pi * f * k * t + k) / k for k in (1, 1.5, 2, 3)); return s * np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.5) * .15
add(music, pad(7.7, 110), 19.5, 1.0); add(music, pad(8.2, 82.4), 27.2, 1.0)

VO = [('n0', .2), ('n1', 6.6), ('n2', 10.6), ('n3', 15.1), ('n4', 19.7), ('n5', 27.4)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int((st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .35
        add(mix, a / (np.abs(a).max() + 1e-9), st, .95)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

def gunshot(): d = .3; n = rng.standard_normal(int(SR * d)); return np.tanh(3 * (n * np.exp(-T(d) * 14) + kick()[:int(SR * d)] * 1.2))
def glass():
    out = np.zeros(int(SR * 1.2))
    for i in range(25): add(out, ding(2000 + rng.random() * 4000)[:int(SR * .3)] * .4, rng.random() * .5)
    add(out, rng.standard_normal(int(SR * .4)) * np.exp(-T(.4) * 8) * .6, 0); return out
def heartbeat(): return np.concatenate([kick()[:int(SR * .15)] * .9, np.zeros(int(SR * .08)), kick()[:int(SR * .15)] * .6])
def riser(d=1.0): t = T(d); return np.sin(2 * np.pi * (200 * t + 600 * t * t / d)) * (t / d) * .5
def coin(): return ding(2400)[:int(SR * .25)] * .6

add(mix, riser(1.3), 0.0, .3); add(mix, stamp(), .4, .4)
add(mix, riser(1.0), 2.3, .35); add(mix, glass(), 3.33, .9); add(mix, stamp(), 3.35, .7)
for at in (6.4, 10.4, 14.9, 19.5): add(mix, whoosh(.45), at - .25, .7); add(mix, stamp(), at, .6)
for i in range(13): add(mix, gunshot(), 6.75 + i * .26 + rng.random() * .05, .25)
add(mix, pop(400), 8.9, .4)
for i in range(7): add(mix, heartbeat(), 10.5 + i * .62 * (1 - i * .04), .55)
for i in range(6): add(mix, ding(1760), 15.3 + i * .6, .4); add(mix, gunshot(), 15.28 + i * .6, .3)
add(mix, ding(990), 17.6, .5)
add(mix, riser(1.2), 19.2, .3)
for i in range(10): add(mix, coin(), 23.45 + i * .22, .35)
add(mix, whoosh(.5), 27.0, .6); add(mix, ding(660), 27.25, .4)
add(mix, stamp(), 32.9, .7); add(mix, ding(1320), 33.0, .5)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
