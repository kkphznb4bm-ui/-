"""Звук для 5-секундных шортсов (short5.html?clip=N): музыка+эффекты, ровно 5 с для бесшовного цикла.
python3 tools/short5_audio.py <clip 1|2|3> <out.wav>"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from sfx import *
clip = int(sys.argv[1]); DUR = 5.5 if clip >= 7 else 5.0
tr = Track(DUR); add = tr.add
B = DUR / 8  # 8 долей = ровно длина ролика -> музыка зацикливается
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
elif clip == 4:
    add(0, sweep(2500, 300, .55, 'saw') * .4 + lp(noise(.55), .3) * .5, .5)          # пролёт поезда
    add(.6, sweep(800, 4000, .25), .35); add(.62, tone(3000, .4, 'sine', .001, .35) * np.exp(-T(.4) * 8), .25)  # SHING
    boom(.9)
    beat(.9, 2.6, [38, 38, 41, 43], [74, 77, 79, 81, 79, 77], .9)                     # «ниндзя»-бит
    for i, n in enumerate([72, 76, 79]): add(2.65 + i * .25, tone(midi(n), .4, 'sine', .002, .35), .2)   # поклон: колокольчик
    add(3.75, sweep(600, 3000, .25), .3)
    add(4.0, sweep(300, 2500, .5, 'saw') * .4 + lp(noise(.5), .3) * .5, .5)          # «вжух» прочь
elif clip == 5:
    beat(0, 1.8, [45, 45, 52, 50], [69, 72, 76, 72], .7)
    for i in range(3): add(.3 + i * .3, tone(midi(60 + i * 2), .15, 'tri', .005, .1), .2)  # разбег
    add(1.45, lp(noise(.08), .3) * np.exp(-T(.08) * 30), 1.0); add(1.45, kick(), .7)      # удар по мячу
    add(1.5, sweep(400, 1200, .3), .15)
    add(1.8, tone(1100, .12, 'sine', .001, .1) * np.exp(-T(.12) * 20), .7); add(1.8, tone(180, .3, 'sine', .001, .25) * np.exp(-T(.3) * 10), .7)  # БОНК
    for k in np.arange(1.9, 2.3, .1): add(k, tone(rng.uniform(1500, 2500), .08, 'sine', .002, .06), .1)  # звёздочки
    kachunk(2.3, 3.0); boom(3.0)
    for i, n in enumerate([58, 57, 56, 55]): add(3.1 + i * .28, lp(tone(midi(n), .27, 'saw', .02, .05, vib=.02 if i == 3 else .004), .12), .35)  # тромбон
    add(4.2, sweep(1200, 1600, .15) * .5, .15); add(4.38, sweep(1200, 1600, .15) * .5, .15)  # «сорри» свисток
    kachunk(4.3, 4.9)
elif clip == 6:
    beat(0, 5.0, [45, 45, 52, 50, 43, 43, 50, 48], [69, 72, 76, 72, 74, 77, 81, 77], 1.1)
    for a in (1.5, 3.0, 4.5): add(a, sweep(300, 1500, .2), .2)
elif clip == 7:
    for i, n in enumerate([60, 64, 67]): add(i * .15, tone(midi(n), .14, 'square', .005, .05), .12)   # «кто лучше?»
    kachunk(.5, 1.5); boom(1.5)
    for q in range(3): add(1.5 + q * .12, tone(midi(84 + q * 4), .12, 'sine', .002, .1), .25)          # ✅ дзинь
    kachunk(2.0, 3.0)
    s_ = T(.5); add(3.0, np.sign(np.sin(2 * np.pi * 60 * s_)) * lp(noise(.5), .5) * env(len(s_), .01, .1), .4)  # BRZZT
    for i, n in enumerate([58, 57, 56, 55]): add(3.3 + i * .25, lp(tone(midi(n), .24, 'saw', .02, .05, vib=.02 if i == 3 else .004), .12), .3)
    beat(4.3, 5.5, [45, 45], [69, 72, 76, 72], .8)
elif clip == 8:
    horn(.2); horn(.4)
    add(0, lp(np.sign(np.sin(2 * np.pi * np.cumsum(90 + 20 * np.sin(T(1.0) * 40)) / SR)), .2) * env(int(SR), .05, .2), .2)  # мопедный мотор
    kachunk(1.1, 1.8); add(1.8, tone(1800, .15, 'sine', .002, .1), .2)       # «пиу» — маленький
    for k in np.arange(1.85, 2.55, .15): add(k, tone(rng.uniform(150, 220), .1, 'square', .005, .05), .12)   # низкий «ха-ха»
    add(2.6, sweep(200, 900, .7, 'saw') * .4, .35)                             # подъём
    boom(3.3)
    beat(3.3, 5.5, [40, 40, 47, 45], [64, 67, 71, 74, 71, 67], 1.0)
elif clip == 9:
    for k in range(3):                                                         # отсчёт 3-2-1
        add(k, tone(880, .15, 'sine', .002, .1), .3); add(k, kick(), .4)
    add(0, lp(noise(3.0), .02) * .5, .6)                                       # напряжённый гул
    add(2.6, sweep(300, 2500, .4), .3)
    boom(3.0); add(3.0, tone(midi(72), .5, 'tri', .005, .4) + tone(midi(76), .5, 'tri', .005, .4), .2)
    beat(3.5 - B * 0, 5.5, [45, 45, 50, 52], [69, 71, 72, 74, 76, 74, 72, 71], 1.0)
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
