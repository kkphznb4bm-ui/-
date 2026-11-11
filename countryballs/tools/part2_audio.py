"""Звук для part2.html: два отдельных трека — эффекты (sfx) и музыка (music).
python3 tools/part2_audio.py <sfx.wav> <music.wav>"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from sfx import *

L = [0, 3.86, 7.37, 11.24, 13.08, 15.90, 17.63, 21.47, 23.49]; DUR = 27.3
TF0, TF1 = L[2] + 1.7, L[3] - .15
fx = Track(DUR); mu = Track(DUR)

# ---------- ЭФФЕКТЫ ----------
fx.add(0, sweep(300, 1200, .3), .25); fx.add(.3, kick(), .8)                     # «PART 2» вылет
fx.add(L[1] + .3, lp(noise(.5), .1) * env(int(.5 * SR), .05, .3), .5)            # пыхтит от злости
eng = T(TF0 - (L[2] - .2)); f = 50 + 25 * np.sin(eng * 11) + 30 * (eng / eng[-1])
fx.add(L[2] - .2, lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), .12) * env(len(eng), .3, .3), .45)  # мотор V8
fx.add(L[2] + 1.2, kick(), .6)
for k in np.arange(TF0 + .1, TF1 - .1, .2):                                        # трансформация
    fx.add(k, lp(noise(.06), .6) * np.exp(-T(.06) * 50), .6)
    fx.add(k + .05, tone(rng.uniform(800, 1300), .05, 'square', .001, .03), .12)
fx.add(TF1 - .5, sweep(150, 900, .5, 'saw') * .5, .3)
fx.add(TF1, kick(), 1.0); fx.add(TF1, lp(noise(.7), .05) * np.exp(-T(.7) * 5), 1.5)
for k in np.arange(L[3], L[4] - .2, .45):                                         # битва: удары и лязг
    fx.add(k, kick(), .7); fx.add(k + .05, tone(rng.uniform(1800, 2600), .12, 'tri', .001, .1) * np.exp(-T(.12) * 25), .25)
fx.add(L[4] + 1, sweep(400, 1600, .25), .2)                                        # достаёт микрофон: «дзынь»
fx.add(L[4] + 1.25, tone(1568, .4, 'sine', .001, .35) * np.exp(-T(.4) * 6), .3)
fx.add(L[5], lp(noise(.3), .3) * env(int(.3 * SR), .001, .2), .4)                  # фидбэк микрофона
fx.add(L[5] + .05, tone(2200, .3, 'sine', .01, .1), .08)
for k in np.arange(L[6] + .9, L[7], .35):                                          # скрип шарниров в танце
    fx.add(k, sweep(500, 900, .1, 'saw') * .3, .07)
for k in np.arange(L[7], L[7] + 1.2, .25):                                         # «дзинь» дружбы
    fx.add(k, tone(midi(84 + (int(k * 4) % 3) * 4), .2, 'sine', .002, .15), .12)

# ---------- МУЗЫКА ----------
def beat(t0, t1, bpm, bass, lead, g=1.0, drums=True):
    b = 60 / bpm; n = int((t1 - t0) / b)
    for i in range(n):
        tt = t0 + i * b
        if drums:
            mu.add(tt, kick(), .8 * g); mu.add(tt + b / 2, hat(), .25 * g)
            if i % 2 == 1: mu.add(tt, clap(), .45 * g)
        mu.add(tt, lp(tone(midi(bass[i % len(bass)]), b * .9, 'saw', .005, .08), .08), .45 * g)
        for k in range(2):
            mu.add(tt + k * b / 2, tone(midi(lead[(i * 2 + k) % len(lead)]), b * .4, 'square', .003, .06), .06 * g)
beat(0, L[1], 124, [48, 48, 53, 55], [72, 76, 79, 76, 74, 77, 81, 77], .8)          # весёлое интро
beat(L[1], L[2] - .2, 124, [45, 45, 44, 44], [69, 68, 69, 68], .6, drums=False)      # «ревность»
beat(L[2], L[3], 124, [40, 40, 43, 40, 46, 45, 43, 40], [64, 67, 70, 67], .7)       # тяжёлый вход трака
beat(L[3], L[4], 140, [40, 40, 40, 43], [76, 79, 76, 82, 76, 79, 84, 82], 1.0)      # битва
for i, n in enumerate([60, 63, 60, 66, 60, 63, 67, 66, 60, 63]):                   # хитрое пиццикато
    tt = L[4] + i * .27
    if tt < L[5] - .1: mu.add(tt, tone(midi(n), .12, 'tri', .002, .1), .25)
beat(L[5], DUR, 124, [45, 45, 52, 50, 45, 45, 48, 50], [69, 72, 76, 72, 74, 77, 81, 77], 1.1)  # караоке-диско
fx.save(sys.argv[1], peak=.8); mu.save(sys.argv[2], peak=.8)
print('ok')
