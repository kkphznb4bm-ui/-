"""Звуковая дорожка «2 типа игроков»: озвучка + бит + эффекты (синтез локально).
Использование: python3 audio.py <папка с репликами|-> <out.wav>"""
import sys, wave, os, numpy as np
SR = 44100; DUR = 43.5
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
bpm = 120; beat = 60 / bpm; music = np.zeros_like(mix)
roots = [65.4, 82.4, 73.4, 55.0]; b = 0; t = 0.0
while t < 41.5:
    quiet = 7.75 < t < 9.6 or 38.4 < t < 39.0
    if not quiet:
        if b % 2 == 0: add(music, kick(), t, .9)
        if b % 4 == 2: add(music, snare(), t, .5)
        add(music, hat(), t + beat / 2, .5)
        add(music, bass_note(roots[(b // 8) % 4], beat * .9), t, .5)
    b += 1; t += beat

VO = [('n1', .3), ('g1', 6.6), ('a1', 10.8), ('g2', 14.5), ('a2', 16.4), ('f1', 20.0), ('a3', 22.8),
      ('g1', 26.4), ('b1', 27.7), ('f2', 30.2), ('b2', 32.0), ('g3', 35.3), ('n2', 38.9)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int((st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .3
        add(mix, a / (np.abs(a).max() + 1e-9), st, .95)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

# эффекты
add(mix, whoosh(), .05, .5); add(mix, pop(500), .7, .4); add(mix, pop(700), .95, .4); add(mix, stamp(), 1.2, .5)
add(mix, whoosh(.4), 6.0, .6); add(mix, join(), 6.3, .5)
add(mix, scratch(), 7.7, .6); add(mix, cricket(1.8), 7.9, .8)
add(mix, whoosh(.4), 9.4, .7); add(mix, stamp(), 9.65, .8); add(mix, pop(400), 9.9, .4)
add(mix, harp(), 10.8, .5)
add(mix, whoosh(.3), 14.3, .4); add(mix, whoosh(.3), 16.2, .4)
add(mix, pop(900), 17.15, .5); add(mix, cash(), 17.25, .6); add(mix, pop(1200), 18.4, .3)
add(mix, whoosh(.3), 19.8, .4)
add(mix, whoosh(.3), 22.6, .4); add(mix, stamp(), 22.75, .5); add(mix, harp(), 24.95, .4)
add(mix, whoosh(.4), 25.0, .7); add(mix, stamp(), 25.25, .8)
add(mix, join(), 26.3, .5); add(mix, scratch(), 27.65, .5); add(mix, harp(), 28.3, .3)
add(mix, ding(660), 29.3, .5); add(mix, whoosh(.3), 29.5, .5); add(mix, thud(), 29.75, 1.0)
add(mix, stamp(), 30.15, .5)
for i in range(14): add(mix, thud(), 32.0 + i * .143, .45)
add(mix, ding(990), 34.4, .5)
add(mix, whoosh(.4), 35.0, .6); add(mix, join(), 37.3, .5)
add(mix, scratch(), 38.35, .7); add(mix, cricket(1.5), 38.5, .8); add(mix, pop(500), 38.9, .5)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
