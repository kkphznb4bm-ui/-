"""Музыка и звуки для jeepney.html (без голоса). Тайминги = L из jeepney.html."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from sfx import *

L = [0, 5.45, 9.37, 12.44, 15.65, 18.38, 21.61, 24.17]; DUR = 26.6
TF0, TF1 = L[3] + .9, L[4] - .2
tr = Track(DUR); add = tr.add

# 1) грустное пианино (ля минор) + дождь
prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 55, 59]]
t = 0.0; i = 0
while t < L[2] - .1:
    ch = prog[(i // 4) % 4]; n = ch[i % 3] + 12 * (i % 4 == 3)
    add(t, tone(midi(n), .9, 'tri', .01, .6), .16)
    if i % 4 == 0: add(t, tone(midi(ch[0] - 12), .9, 'sine', .01, .6), .12)
    t += .42; i += 1
add(0, lp(noise(L[2]), .08), .05)
# смешки «ха-ха-ха»
for k in np.arange(L[1] + 2.1, L[2] - .3, .17):
    add(k, tone(rng.uniform(300, 480), .09, 'square', .005, .04), .07)

# 2) рокот и мотор джипни, гудок
r = L[3] - L[2]; add(L[2], lp(noise(r), .02) * np.linspace(.2, 1, int(r * SR)), 1.4)
eng = T(L[3] - .2 - (L[2] + 1.0)); f = 55 + 30 * np.sin(eng * 9) + 20 * (1 - eng / eng[-1])
add(L[2] + 1.0, lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), .15) * env(len(eng), .3, .4), .35)
for k in (L[3] - .6, L[3] - .35):
    add(k, (tone(415, .18, 'square', .01, .03) + tone(523, .18, 'square', .01, .03)) * .5, .25)

# 3) трансформация
add(TF0 - .3, sweep(200, 1500, .4) + lp(noise(.4), .3) * .4, .25)
for k in np.arange(TF0 + .1, TF1 - .1, .22):
    add(k, lp(noise(.06), .6) * np.exp(-T(.06) * 50), .6)
    add(k + .05, tone(rng.uniform(900, 1400), .05, 'square', .001, .03), .12)
add(TF0 + .3, clap(), .5); add(TF0 + .9, kick(), .8); add(TF0 + .9, clap(), .5)
add(TF1 - .6, sweep(150, 900, .6, 'saw') * .5, .3)
add(TF1, kick(), 1.0); add(TF1, lp(noise(.8), .05) * np.exp(-T(.8) * 5), 1.6)  # БУМ

def beat(t0, t1, bpm, bass, lead, g=1.0):
    b = 60 / bpm; n = int((t1 - t0) / b)
    for i in range(n):
        tt = t0 + i * b
        add(tt, kick(), .8 * g); add(tt + b / 2, hat(), .25 * g)
        if i % 2 == 1: add(tt, clap(), .45 * g)
        add(tt, lp(tone(midi(bass[i % len(bass)]), b * .9, 'saw', .005, .08), .08), .45 * g)
        for k in range(2):
            add(tt + k * b / 2, tone(midi(lead[(i * 2 + k) % len(lead)]), b * .4, 'square', .003, .06), .06 * g)

# 4) весёлый бит — все хотят дружить
beat(L[4], L[5], 120, [48, 48, 53, 55], [72, 76, 79, 76, 74, 77, 81, 77])
# 5) «хитрая» пауза: пиццикато
for i, n in enumerate([60, 63, 60, 66, 60, 63, 67, 66, 60, 63, 60, 66]):
    tt = L[5] + i * .27
    if tt < L[6] - .1: add(tt, tone(midi(n), .12, 'tri', .002, .1), .25)
add(L[6] - .5, sweep(300, 2000, .5) * .6 + lp(noise(.5), .4) * np.linspace(0, 1, int(.5 * SR)) * .4, .3)
# 6) караоке-диско до конца
beat(L[6], DUR, 128, [45, 45, 52, 50, 45, 45, 48, 50], [69, 72, 76, 72, 74, 77, 81, 77], 1.1)
add(L[6], kick(), 1.0)

tr.save(sys.argv[1] if len(sys.argv) > 1 else 'jeepney-music.wav', peak=.8)
print('ok')
