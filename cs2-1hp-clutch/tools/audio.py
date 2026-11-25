"""Звуковая дорожка «1 HP против пятерых»: озвучка + бит + эффекты (синтез локально).
Использование: python3 audio.py <папка с репликами|-> <out.wav>"""
import sys, wave, os, numpy as np
SR = 44100; DUR = 37.0
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

def gunshot(): d = .3; n = rng.standard_normal(int(SR * d)); return np.tanh(3 * (n * np.exp(-T(d) * 14) + kick()[:int(SR * d)] * 1.2))
def heartbeat(): return np.concatenate([kick()[:int(SR * .15)] * .9, np.zeros(int(SR * .08)), kick()[:int(SR * .15)] * .6])
def beep(): t = T(.12); return np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 10) * .6
def siren(d):
    t = T(d); f = 600 + 300 * np.sin(2 * np.pi * 1.2 * t); return np.sin(2 * np.pi * np.cumsum(f) / SR) * .12
def explosion(): d = 1.0; n = np.convolve(rng.standard_normal(int(SR * d)), np.ones(60) / 60, 'same'); return np.tanh(4 * (n * np.exp(-T(d) * 3) * 4 + np.pad(kick(), (0, int(SR * d) - len(kick()))) * 1.5))
def wind(d): n = np.convolve(rng.standard_normal(int(SR * d)), np.ones(200) / 200, 'same'); t = T(d); return n * 6 * (.6 + .4 * np.sin(2 * np.pi * .4 * t)) * np.minimum(1, t / .5)
def door(): return np.tanh(5 * (kick() * 1.5 + np.pad(snare(), (0, int(SR * .15)))[:int(SR * .35)]))
def riser(d=1.0): t = T(d); return np.sin(2 * np.pi * (200 * t + 600 * t * t / d)) * (t / d) * .5
def sad():
    out = []
    for f, d in [(392, .3), (370, .3), (349, .3), (330, .9)]:
        t = T(d); out.append(sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 5)) * np.minimum(1, t / .02) * np.minimum(1, (d - t) / .05) * .3)
    return np.concatenate(out)

# бит во время клатча
bpm = 140; beat = 60 / bpm; music = np.zeros_like(mix); b = 0; t = 3.3
while t < 19.3:
    if not (13.3 < t < 15.0):
        add(music, kick(), t, .9 if b % 2 == 0 else 0)
        if b % 4 == 2: add(music, snare(), t, .55)
        add(music, hat(), t + beat / 2, .5)
        add(music, bass_note([55, 55, 65.4, 49][(b // 8) % 4], beat * .9), t, .5)
    b += 1; t += beat
# весёлый финальный бит
b = 0; t = 33.9
while t < 36.5:
    add(music, kick(), t, .7 if b % 2 == 0 else 0); add(music, hat(), t + .2, .4); b += 1; t += .43

VO = [('n1', .05), ('m1', 3.5), ('m2', 15.9), ('mom', 25.4), ('m3', 31.0)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int(max(0, st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .35
        add(mix, a / (np.abs(a).max() + 1e-9), st, 1.0 if name == 'mom' else .95)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

# 0–3.3: бомба, сердце, сирена — с первого кадра
for i in range(10): add(mix, beep(), i * .33, .5)
for i in range(5): add(mix, heartbeat(), i * .7, .7)
add(mix, siren(3.3), 0, 1.0)
add(mix, whoosh(.4), 3.1, .6); add(mix, stamp(), 3.3, .5)
# убийства
add(mix, gunshot(), 8.7, 1.0); add(mix, ding(1760), 8.75, .5); add(mix, pop(400), 8.75, .3)
add(mix, pop(900), 10.7, .3); add(mix, pop(1100), 11.15, .3); add(mix, explosion(), 11.6, .8); add(mix, pop(300), 11.7, .4)
add(mix, whoosh(.6), 13.0, .6); add(mix, gunshot(), 13.9, .9); add(mix, gunshot(), 14.5, .9); add(mix, ding(1320), 14.6, .5)
add(mix, stamp(), 15.85, .6)
# дуэль: ветер и сердце
add(mix, wind(5.8), 19.4, .6)
for i in range(9): add(mix, heartbeat(), 19.6 + i * .62 * (1 - i * .03), .7)
add(mix, riser(1.8), 23.3, .25)
# мама
add(mix, door(), 25.2, 1.0); add(mix, scratch(), 25.25, .6)
add(mix, whoosh(.3), 27.95, .5)
add(mix, gunshot(), 28.6, 1.0); add(mix, sad(), 28.8, .6)
add(mix, cricket(1.2), 29.8, .6)
add(mix, stamp(), 33.9, .6); add(mix, ding(1320), 34.0, .5)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
