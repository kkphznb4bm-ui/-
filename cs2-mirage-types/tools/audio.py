"""Звуковая дорожка «3 типа игроков на Mirage»: озвучка + бит + эффекты (синтез локально).
Использование: python3 audio.py <папка с репликами|-> <out.wav>"""
import sys, wave, os, numpy as np
SR = 44100; DUR = 44.5
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

# бит
bpm = 124; beat = 60 / bpm; music = np.zeros_like(mix)
roots = [73.4, 73.4, 87.3, 65.4]; b = 0; t = 0.0
while t < 42.5:
    quiet = 9.9 < t < 10.5 or 18.4 < t < 19.7 or 33.1 < t < 33.6
    if not quiet:
        if b % 2 == 0: add(music, kick(), t, .9)
        if b % 4 == 2: add(music, snare(), t, .5)
        add(music, hat(), t + beat / 2, .5)
        add(music, bass_note(roots[(b // 8) % 4], beat * .9), t, .5)
    b += 1; t += beat

VO = [('n1', .3), ('h1', 6.9), ('h2', 10.6), ('m1', 14.6), ('c1', 16.6), ('m2', 19.8), ('c2', 22.0),
      ('r1', 25.4), ('m3', 27.6), ('r2', 30.4), ('h3', 34.7), ('c3', 36.5), ('r3', 38.1),
      ('h4', 39.8), ('c4', 39.82), ('r4', 39.78)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int((st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .3
        g = .7 if name in ('h4', 'c4', 'r4') else .95
        add(mix, a / (np.abs(a).max() + 1e-9), st, g)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

def gunshot(): d = .3; n = rng.standard_normal(int(SR * d)); return np.tanh(3 * (n * np.exp(-T(d) * 14) + kick()[:int(SR * d)] * 1.2))
def tick(): t = T(.05); return np.sin(2 * np.pi * 2000 * t) * np.exp(-t * 90)
def explosion(): d = 1.2; n = np.convolve(rng.standard_normal(int(SR * d)), np.ones(60) / 60, 'same'); return np.tanh(4 * (n * np.exp(-T(d) * 3) * 4 + np.pad(kick(), (0, int(SR * d) - len(kick()))) * 1.5))
def slurp(): t = T(.6); return np.sin(2 * np.pi * (300 + 200 * np.sin(2 * np.pi * 9 * t)) * t) * .2 * np.sin(np.pi * t / .6)
def steps(d, rate=7):
    out = np.zeros(int(SR * d))
    for i in range(int(d * rate)): add(out, kick()[:int(SR * .05)] * .5 + hat() * .5, i / rate)
    return out

# эффекты
add(mix, whoosh(), .05, .5); [add(mix, pop(500 + i * 150), .5 + i * .25, .4) for i in range(3)]
[add(mix, pop(800), 1.6 + i * .4, .35) for i in range(3)]
add(mix, whoosh(.4), 5.2, .7); add(mix, stamp(), 5.45, .8)
add(mix, cash(), 6.75, .6)
add(mix, whoosh(.3), 7.2, .5); add(mix, steps(2.6, 7), 7.3, .5)
add(mix, gunshot(), 9.9, 1.0); add(mix, ding(1760), 9.95, .5); add(mix, thud(), 10.3, .6)
add(mix, scratch(), 11.3, .4)
add(mix, whoosh(.4), 13.2, .7); add(mix, stamp(), 13.45, .8)
add(mix, join(), 14.45, .4)
for i in range(9): add(mix, tick(), 18.45 + i * .13, .6)
add(mix, ding(990), 19.6, .4)
for i in range(6): add(mix, ding(1200 if i % 2 else 900)[:int(SR * .2)], 20.3 + i * .25, .35)
add(mix, slurp(), 22.0, .6); add(mix, slurp(), 23.6, .5)
add(mix, whoosh(.4), 24.0, .7); add(mix, stamp(), 24.25, .8)
add(mix, pop(600), 27.7, .4)
add(mix, stamp(), 30.4, .6); add(mix, whoosh(.5), 32.1, .7); add(mix, steps(.8, 12), 32.3, .6)
for i in range(6): add(mix, gunshot(), 33.1 + i * .1, .6)
add(mix, explosion(), 33.15, .7)
for i in range(5): add(mix, pop(300), 33.1 + i * .12, .3)
add(mix, whoosh(.4), 34.2, .6); add(mix, join(), 34.5, .4)
add(mix, stamp(), 39.75, .9); add(mix, whoosh(.4), 41.0, .6); add(mix, ding(1320), 41.3, .5)
for i in range(3): add(mix, pop(700 + i * 200), 41.6 + i * .15, .35)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
