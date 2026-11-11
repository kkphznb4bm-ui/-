"""Звук для part3.html: эффекты и музыка отдельно.
python3 tools/part3_audio.py <sfx.wav> <music.wav>"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from sfx import *

L = [0, 5.07, 8.11, 13.17, 15.11, 17.24, 19.08, 21.77]; DUR = 24.8
SNOW, TF0, TF1 = 6.18, 10.4, 12.5
fx = Track(DUR); mu = Track(DUR)

# ---------- ЭФФЕКТЫ ----------
fx.add(0, sweep(300, 1200, .3), .25); fx.add(.3, kick(), .8)                       # «PART 3»
w = T(L[5] - SNOW); wind = lp(noise(L[5] - SNOW), .03) * (0.6 + 0.4 * np.sin(w * 1.3)) * env(len(w), 1.0, 1.0)
fx.add(SNOW, wind, 1.6)                                                              # вой ветра
for k in np.arange(SNOW + .6, L[2], .08):                                            # «бррр» — стук зубов
    fx.add(k, tone(rng.uniform(1800, 2400), .02, 'square', .001, .01), .05)
eng = T(TF0 - (L[2] - .3)); f = 45 + 20 * np.sin(eng * 8)
fx.add(L[2] - .3, lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), .1) * env(len(eng), .4, .3), .5)  # дизель
fx.add(L[2] + 1.4, (tone(220, .5, 'square', .02, .1) + tone(277, .5, 'square', .02, .1)) * .4, .25)    # гудок трака
for k in np.arange(TF0 + .1, TF1 - .1, .2):
    fx.add(k, lp(noise(.06), .6) * np.exp(-T(.06) * 50), .6)
    fx.add(k + .05, tone(rng.uniform(700, 1200), .05, 'square', .001, .03), .12)
fx.add(TF1 - .5, sweep(120, 800, .5, 'saw') * .5, .3)
fx.add(TF1, kick(), 1.0); fx.add(TF1, lp(noise(.7), .05) * np.exp(-T(.7) * 5), 1.5)
for k in range(2):                                                                   # тяжёлые шаги
    fx.add(L[3] + k * .95, kick(), 1.0); fx.add(L[3] + k * .95, lp(noise(.4), .04) * np.exp(-T(.4) * 8), 1.4)
fx.add(L[3] + .3, sweep(900, 500, .5) * .5, .1)                                      # испуганное «ой»
for i in range(6):                                                                   # летящие шапки: вжух + «пуф»
    a = L[5] + i * .18
    fx.add(a, lp(noise(.4), .25) * env(int(.4 * SR), .1, .2), .35)
    fx.add(a + .55, lp(noise(.08), .15) * np.exp(-T(.08) * 30), .7); fx.add(a + .55, tone(midi(72 + i * 2), .1, 'sine', .002, .08), .15)

# ---------- МУЗЫКА ----------
def beat(t0, t1, bpm, bass, lead, g=1.0, drums=True, wave='square'):
    b = 60 / bpm; n = int((t1 - t0) / b)
    for i in range(n):
        tt = t0 + i * b
        if drums:
            mu.add(tt, kick(), .8 * g); mu.add(tt + b / 2, hat(), .25 * g)
            if i % 2 == 1: mu.add(tt, clap(), .45 * g)
        mu.add(tt, lp(tone(midi(bass[i % len(bass)]), b * .9, 'saw', .005, .08), .08), .45 * g)
        for k in range(2):
            mu.add(tt + k * b / 2, tone(midi(lead[(i * 2 + k) % len(lead)]), b * .4, wave, .003, .06), .06 * g)
beat(0, L[1], 124, [48, 48, 53, 55], [72, 76, 79, 76, 74, 77, 81, 77], .8)           # дружба
for i, n in enumerate([76, 74, 72, 71, 69, 67]):                                     # «но потом…» — сползающая нота
    mu.add(L[1] + i * .18, tone(midi(n), .2, 'tri', .005, .15), .12)
for k in np.arange(SNOW, L[2], .5):                                                  # зимние колокольчики
    mu.add(k, tone(midi(88 + [0, 3, 7, 5][int(k * 2) % 4]), .4, 'sine', .002, .35), .06)
beat(L[2], L[3], 110, [40, 40, 43, 41], [64, 67, 64, 70], .7, wave='tri')            # въезд трака
for k in np.arange(L[3], L[4], .95):                                                 # напряжение: низкие удары
    mu.add(k, tone(midi(28), .8, 'saw', .01, .6), .25)
mu.add(L[4], sweep(200, 600, 2.0, 'sine') * .3, .3)
for i, n in enumerate([72, 76, 79, 84]):                                             # «тёплые шапки» — мажорное арпеджио
    mu.add(L[5] + i * .2, tone(midi(n), .5, 'tri', .005, .4), .14)
# зимнее караоке: минорный «казачок»-бит
beat(L[6], DUR, 132, [45, 52, 45, 52, 43, 50, 40, 47], [69, 71, 72, 74, 76, 74, 72, 71, 69, 72, 76, 81, 79, 76, 72, 71], 1.1)
fx.save(sys.argv[1], peak=.8); mu.save(sys.argv[2], peak=.8)
print('ok')
