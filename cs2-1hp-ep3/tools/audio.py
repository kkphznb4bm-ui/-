"""Звуковая дорожка «1 HP» · Серия 3 (мягкий звук, без сирен): озвучка + бит + эффекты (синтез локально).
Использование: python3 audio.py <папка с репликами|-> <out.wav>"""
import sys, wave, os, numpy as np
SR = 44100; DUR = 38.6
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

def lp(x, k=40): return np.convolve(x, np.ones(k) / k, 'same')
def soft_ping(f=1400): t = T(.35); return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 9) * .35
def soft_shot(): d = .25; n = lp(rng.standard_normal(int(SR * d)), 12); return n * np.exp(-T(d) * 22) * 1.2 + kick()[:int(SR * d)] * .5
def crowd_murmur(d, level=1.0):
    n = lp(rng.standard_normal(int(SR * d)), 300) * 8; t = T(d)
    return n * (.6 + .4 * np.sin(2 * np.pi * .3 * t)) * np.minimum(1, t / .8) * np.minimum(1, (d - t) / .8) * level
def soft_heart(): return np.concatenate([kick()[:int(SR * .12)] * .5, np.zeros(int(SR * .08)), kick()[:int(SR * .12)] * .35])
def chime():
    out = np.zeros(int(SR * 1.2))
    for i, f in enumerate([523, 659, 784, 1047]): add(out, ding(f) * .5, i * .09)
    return out
def typing(d):
    out = np.zeros(int(SR * d))
    for i in range(int(d * 9)): add(out, pop(2500 + rng.random() * 800)[:int(SR * .03)] * .3, i / 9 + rng.random() * .03)
    return out

# мягкий лоу-фай бит; к финальному раунду — без барабанов; на выстрелах — тишина
music = np.zeros_like(mix); beat = 60 / 92; b = 0; t = 0.0
chords = [(220, 277, 330), (196, 247, 294), (175, 220, 262), (196, 247, 294)]
while t < 38.0:
    drums = t < 23.8 or t > 34.6
    silent = 32.3 < t < 34.6
    if drums and not silent:
        if b % 2 == 0: add(music, kick() * .6, t, .7)
        if b % 4 == 2: add(music, snare() * .3, t, .5)
        add(music, hat() * .5, t + beat / 2, .4)
    if b % 4 == 0 and not silent:
        ch = chords[(b // 4) % 4]; d = beat * 4
        for f in ch: add(music, np.sin(2 * np.pi * f * (0.5 if 23.8 <= t < 32.3 else 1) * T(d)) * np.minimum(1, T(d) / .3) * np.exp(-T(d) * .6) * .06, t, 1.0)
    b += 1; t += beat

VO = [('n1', .05), ('p1', 7.35), ('mom1', 10.45), ('n2', 14.65), ('n3', 23.95), ('p2', 27.35), ('mom2', 30.0), ('n4', 31.5)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int(max(0, st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .4
        add(mix, a / (np.abs(a).max() + 1e-9), st, .9)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .45

def crackle(d):
    out = lp(rng.standard_normal(int(SR * d)), 60) * .6
    for i in range(int(d * 14)): add(out, pop(3000)[:int(SR * .01)] * .5, rng.random() * d)
    return out * .25
def bonk(): t = T(.3); return np.sin(2 * np.pi * (520 - 200 * t) * t) * np.exp(-t * 14) * .6

add(mix, soft_ping(1320), 0.0, .5)
add(mix, chime(), 6.05, .4)
add(mix, whoosh(.3), 7.0, .2)
add(mix, whoosh(.4), 10.3, .25); add(mix, chime(), 10.6, .4)
add(mix, crackle(4.8), 14.5, 1.0)
add(mix, whoosh(.3), 19.2, .2)
add(mix, bonk(), 20.3, .8); add(mix, soft_shot(), 21.7, .6)
for i in range(7): add(mix, pop(800 + i * 80)[:int(SR * .05)], 22.4 + i * .2, .25)
for i in range(10): add(mix, soft_heart(), 24.0 + i * .75, .45)
add(mix, soft_ping(1760), 29.95, .5)
add(mix, soft_shot(), 32.4, .7); add(mix, soft_shot(), 32.41, .7)
add(mix, chime(), 34.65, .4)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
