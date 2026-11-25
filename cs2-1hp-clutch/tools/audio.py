"""Звуковая дорожка «1 HP против пятерых»: озвучка + бит + эффекты (синтез локально).
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

SH = 2.5                           # основная часть сдвинута после длинного хука
def A(sig, t, g=1.0): add(mix, sig, t + SH, g)
# бит во время клатча
bpm = 140; beat = 60 / bpm; music = np.zeros_like(mix); b = 0; t = 3.3
while t < 19.3:
    if not (13.3 < t < 15.0):
        add(music, kick(), t + SH, .9 if b % 2 == 0 else 0)
        if b % 4 == 2: add(music, snare(), t + SH, .55)
        add(music, hat(), t + SH + beat / 2, .5)
        add(music, bass_note([55, 55, 65.4, 49][(b // 8) % 4], beat * .9), t + SH, .5)
    b += 1; t += beat
# победный бит
b = 0; t = 29.5
while t < 34.2:
    add(music, kick(), t + SH, .8 if b % 2 == 0 else 0); add(music, hat(), t + SH + .21, .45)
    if b % 4 == 2: add(music, snare(), t + SH, .4)
    b += 1; t += .43
def pad(d, f):
    t = T(d); s_ = sum(np.sin(2 * np.pi * f * k * t + k) / k for k in (1, 1.5, 2, 3)); return s_ * np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 1.0) * .15
add(music, pad(6.5, 110), 34.3 + SH, 1.0)

VO = [('n1', .05), ('m1', 6.0), ('m2', 18.4), ('mom', 27.9), ('idu', 32.2), ('m3', 34.1), ('n2', 37.95)]
duck = np.ones_like(mix)
if USE_VO:
    for name, st in VO:
        a = readwav(os.path.join(vo_dir, name + '.wav'))
        duck[int(max(0, st - .1) * SR):int((st + len(a) / SR + .15) * SR)] = .35
        add(mix, a / (np.abs(a).max() + 1e-9), st, 1.0 if name == 'mom' else .95)
duck = np.convolve(duck, np.ones(4410) / 4410, 'same')
mix += music * duck * .35

# хук (время видео): бомба, сердце, сирена с первого кадра; удар на каждом нике
for i in range(17): add(mix, beep(), i * .33, .45)
for i in range(8): add(mix, heartbeat(), i * .7, .65)
add(mix, siren(5.8), 0, 1.0)
add(mix, whoosh(.3), 1.9, .5)
for at in (2.7, 3.2, 3.7, 4.25, 4.9): add(mix, stamp(), at, .45)
# основная часть (время анимации, +SH)
A(whoosh(.4), 3.1, .6); A(stamp(), 3.3, .5)
A(gunshot(), 8.7, 1.0); A(ding(1760), 8.75, .5); A(pop(400), 8.75, .3)
A(pop(900), 10.7, .3); A(pop(1100), 11.15, .3); A(explosion(), 11.6, .8); A(pop(300), 11.7, .4)
A(whoosh(.6), 13.0, .6); A(gunshot(), 13.9, .9); A(gunshot(), 14.5, .9); A(ding(1320), 14.6, .5)
A(stamp(), 15.85, .6)
A(wind(5.8), 19.4, .6)
for i in range(9): A(heartbeat(), 19.6 + i * .62 * (1 - i * .03), .7)
A(riser(1.8), 23.3, .25)
A(door(), 25.2, 1.0); A(scratch(), 25.25, .6)
A(whoosh(.3), 28.35, .5); A(gunshot(), 28.85, 1.1); A(ding(1760), 28.9, .6); A(stamp(), 28.9, .7)
for i, f in enumerate([523, 659, 784, 1047]): A(ding(f), 29.55 + i * .1, .5)
A(stamp(), 31.0, .4)
for i in range(4): A(ding(880)[:int(SR * .15)], 35.5 + i * .3, .4)
A(riser(1.2), 38.0, .3); A(stamp(), 38.4, .7)

mix = np.tanh(mix * 1.1) * .9
mix *= np.clip((DUR - np.arange(len(mix)) / SR) / 1.0, 0, 1)
w = wave.open(out, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print('ok', out)
