"""Звук для 5-секундных шортсов (short5.html?clip=N): музыка+эффекты, ровно 5 с для бесшовного цикла.
python3 tools/short5_audio.py <clip 1|2|3> <out.wav>"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from sfx import *
clip = int(sys.argv[1]); DUR = 5.0
tr = Track(DUR); add = tr.add
B = 60 / 96  # 96 BPM: 8 долей = ровно 5 с -> музыка зацикливается
def beat(t0, t1, bass, lead, g=1.0, drums=True):
    n = int(round((t1 - t0) / B))
    for i in range(n):
        tt = t0 + i * B
        if drums:
            add(tt, kick(), .8 * g); add(tt + B / 2, hat(), .3 * g)
            if i % 2 == 1: add(tt, clap(), .5 * g)
        add(tt, lp(tone(midi(bass[i % len(bass)]), B * .9, 'saw', .005, .08), .08), .5 * g)
        for k in range(2): add(tt + k * B / 2, tone(midi(lead[(i * 2 + k) % len(lead)]), B * .4, 'square', .003, .06), .07 * g)
def kachunk(t0, t1):
    for k in np.arange(t0, t1, .18):
        add(k, lp(noise(.06), .6) * np.exp(-T(.06) * 50), .6); add(k + .05, tone(rng.uniform(800, 1300), .05, 'square', .001, .03), .12)
def boom(t): add(t, kick(), 1.0); add(t, lp(noise(.6), .05) * np.exp(-T(.6) * 6), 1.4)
def horn(t): add(t, (tone(415, .15, 'square', .01, .03) + tone(523, .15, 'square', .01, .03)) * .5, .3)

if clip == 1:
    eng = T(1.0); add(0, lp(np.sign(np.sin(2 * np.pi * np.cumsum(60 + 10 * np.sin(eng * 30)) / SR)), .15), .25)  # мотор
    horn(.3); horn(.55)
    add(.8, sweep(200, 1500, .3), .3); kachunk(1.0, 2.0); boom(2.1)
    beat(2.1, 3.9 + B * 0, [45, 45, 52, 50], [69, 72, 76, 72, 74, 77, 81, 77], 1.0)
    add(3.9, sweep(1500, 200, .4), .3); kachunk(3.95, 4.8)
    add(4.8, kick(), .5)
elif clip == 2:
    beat(0, 2.0, [40, 40, 43, 40], [76, 79, 76, 82], 1.0)       # боевой бит
    for k in np.arange(0, 2.0, .35): add(k + .05, tone(rng.uniform(1800, 2600), .1, 'tri', .001, .08) * np.exp(-T(.1) * 25), .25)
    add(2.0, lp(noise(.3), .3) * env(int(.3 * SR), .001, .2), .4); add(2.02, tone(2200, .3, 'sine', .01, .1), .08)  # фидбэк
    for i, n in enumerate([67, 69, 71, 74, 72]): add(2.1 + i * .18, tone(midi(n), .18, 'tri', .02, .05, vib=.012), .25)  # «ла-ла-ла»
    beat(3.0, 5.0, [45, 45, 52, 50], [69, 72, 76, 72, 74, 77, 81, 77], 1.1)
else:
    for k in (0, .9, 1.8): boom(k)                               # тяжёлые шаги
    add(0, lp(noise(2.0), .03) * env(int(2.0 * SR), .2, .3), 1.2)    # ветер
    for k in np.arange(0, 2.0, .08): add(k, tone(rng.uniform(1800, 2400), .02, 'square', .001, .01), .04)  # дрожь
    for i in range(4):
        a = 2.15 + i * .15; add(a, lp(noise(.35), .25) * env(int(.35 * SR), .08, .2), .35)
        add(a + .5, lp(noise(.08), .15) * np.exp(-T(.08) * 30), .7); add(a + .5, tone(midi(72 + i * 3), .1, 'sine', .002, .08), .2)
    beat(3.2 - B * 0, 5.0, [45, 52, 45, 52], [69, 71, 72, 74, 76, 74, 72, 71], 1.1)
tr.save(sys.argv[2], peak=.85, fade=.02)
print('ok')
