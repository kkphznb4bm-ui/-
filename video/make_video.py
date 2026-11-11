#!/usr/bin/env python3
"""Анимация «Что, если бы люди могли отращивать конечности?»

Берёт исходную иллюстрацию скелета (3 ракурса), анимирует персонажа
(дыхание, потеря и регенерация руки и ноги, сканирование) и собирает
вертикальное видео 1080x1920 с титрами и фоновым звуком через ffmpeg.

Запуск:  python3 make_video.py [путь_к_картинке] [выходной.mp4]
"""
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SRC = ARGS[0] if len(ARGS) > 0 else os.path.join(HERE, "skeleton.jpg")
OUT = ARGS[1] if len(ARGS) > 1 else os.path.join(HERE, "regeneration.mp4")

W, H, FPS = 1080, 1920, 30
DURATION = 34.0
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

rng = np.random.default_rng(7)

# ---------------------------------------------------------------- source
src = Image.open(SRC).convert("RGB").resize((1024, 1024), Image.LANCZOS)
img = np.asarray(src).astype(np.float32)
SH, SW = img.shape[:2]
BG = img[5:40, 5:40].reshape(-1, 3).mean(0)
yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)


def feather(mask, r=3):
    m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(m).astype(np.float32) / 255.0


# Конечности, которые «теряются» и отрастают (координаты фронтального вида).
# Левая рука персонажа (справа на картинке): от локтя до кончиков пальцев.
arm_raw = ((xx >= 263) & (xx <= 332) & (yy >= 395) & (yy <= 648)).astype(np.float32)
# Правая нога персонажа (слева на картинке): от колена до стопы.
leg_raw = ((xx >= 84) & (xx <= 163) & (yy >= 742) & (yy <= 990)).astype(np.float32)
ARM = feather(arm_raw, 4)
LEG = feather(leg_raw, 4)
LIMBS = {"arm": (ARM, 395, 648), "leg": (LEG, 742, 990)}

# «Чистая» подложка: на месте конечности — фон (цвет берём из той же строки).
plate = img.copy()
for mask, col in ((ARM, 336), (LEG, 40)):
    row_bg = img[:, col:col + 1, :]
    noise = rng.normal(0, 0.8, img.shape).astype(np.float32)
    plate = plate * (1 - mask[..., None]) + (row_bg + noise) * mask[..., None]

# Светимость кости (для подсветки при сканировании и регенерации)
lum = img.mean(2)
bone = np.clip((235 - lum) / 60.0, 0, 1)  # чем темнее фона — тем больше «вещества»


def smooth(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def seg(t, a, b):
    return smooth((t - a) / (b - a))


# ------------------------------------------------------------- particles
class Particles:
    def __init__(self, n):
        self.n = n
        self.seed = rng.random((n, 4)).astype(np.float32)


PART = Particles(60)


def limb_state(t, lost_at, regrow_from, regrow_to):
    """Возвращает (видимость конечности 0..1, прогресс роста 0..1, фаза)."""
    if t < lost_at:
        return 1.0, 1.0, "intact"
    if t < lost_at + 0.6:
        return 1 - seg(t, lost_at, lost_at + 0.6), 1.0, "losing"
    if t < regrow_from:
        return 0.0, 0.0, "lost"
    if t < regrow_to:
        return 1.0, seg(t, regrow_from, regrow_to), "growing"
    return 1.0, 1.0, "grown"


def compose(t):
    """Собирает исходное 1024x1024 полотно с текущим состоянием конечностей."""
    out = img.copy()
    glow = np.zeros((SH, SW), np.float32)
    flash = np.zeros((SH, SW), np.float32)
    timeline = {"arm": (7.0, 9.0, 14.0), "leg": (15.5, 17.0, 22.0)}
    for name, (lost_at, g0, g1) in timeline.items():
        mask, y0, y1 = LIMBS[name]
        vis, prog, phase = limb_state(t, lost_at, g0, g1)
        if phase == "intact" or (phase == "grown" and t > g1 + 2.5):
            continue
        if phase == "losing":
            m = mask * vis
            flash += mask * math.sin(math.pi * seg(t, lost_at, lost_at + 0.6)) * bone
        elif phase == "lost":
            m = mask * 0.0
        else:
            front = y0 + prog * (y1 - y0 + 20)
            reveal = np.clip((front - yy) / 14.0, 0, 1)
            m = mask * reveal
            band = np.exp(-((yy - front) / 9.0) ** 2) * mask
            fade = 1.0 if phase == "growing" else max(0.0, 1 - (t - g1) / 2.5)
            glow += band * (0.6 + 0.4 * math.sin(t * 20)) * fade
            # свежая ткань слегка светится бирюзой и остывает
            fresh = np.clip((front - yy) / 140.0, 0, 1)
            glow += m * (1 - fresh) * 0.35 * bone * fade
            if phase == "grown":
                glow += m * bone * 0.25 * fade
        limb = plate * (1 - m[..., None]) + img * m[..., None]
        out = out * (1 - mask[..., None]) + limb * mask[..., None]
    if glow.any():
        cyan = np.array([60, 255, 210], np.float32)
        g = np.clip(glow, 0, 1)[..., None]
        out = out * (1 - 0.65 * g) + cyan * 0.65 * g
        halo = np.asarray(Image.fromarray((np.clip(glow, 0, 1) * 255).astype(np.uint8))
                          .filter(ImageFilter.GaussianBlur(10))).astype(np.float32)[..., None] / 255
        out = out * (1 - 0.5 * halo) + cyan * 0.5 * halo
    if flash.any():
        red = np.array([255, 60, 60], np.float32)
        f = np.clip(flash, 0, 1)[..., None]
        out = out * (1 - f) + red * f
    return np.clip(out, 0, 255)


def scan_overlay(arr, t, t0, t1):
    """Горизонтальная линия сканера по фронтальной фигуре."""
    if not (t0 <= t <= t1):
        return arr
    p = (t - t0) / (t1 - t0)
    y = 70 + (1000 - 70) * (0.5 - 0.5 * math.cos(p * 2 * math.pi))
    band = np.exp(-((yy - y) / 6.0) ** 2)
    trail = np.exp(-np.abs(yy - y) / 60.0) * 0.25
    region = (xx < 340).astype(np.float32)
    a = (band + trail * bone) * region
    a = np.clip(a, 0, 1)[..., None] * 0.7
    blue = np.array([70, 170, 255], np.float32)
    return arr * (1 - a) + blue * a


# ----------------------------------------------------------------- camera
def camera(t):
    """(центр x, центр y, масштаб) в координатах исходника."""
    full = (512, 512, W / 1024)                   # все три ракурса
    front = (170, 535, 1540 / 1024)               # фронтальная фигура крупно
    arm = (262, 520, 2.4)                          # рука
    leg = (160, 820, 2.4)                          # нога
    keys = [
        (0.0, full), (3.2, full), (5.0, front), (6.6, front), (7.6, arm),
        (13.8, arm), (15.0, leg), (21.8, leg), (23.2, front), (29.5, front),
        (31.0, full), (DURATION, full),
    ]
    for (ta, a), (tb, b) in zip(keys, keys[1:]):
        if ta <= t <= tb:
            k = smooth((t - ta) / (tb - ta)) if tb > ta else 1
            # масштаб интерполируем логарифмически — приятнее для глаза
            s = math.exp(math.log(a[2]) * (1 - k) + math.log(b[2]) * k)
            return a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, s
    return full


def render_view(arr, t):
    cx, cy, s = camera(t)
    # при наезде на фронтальную фигуру соседние ракурсы растворяются в фоне
    iso = min(max((s - W / 1024) / 0.45, 0.0), 1.0)
    if iso > 0:
        arr = arr.copy()
        arr[:, 336:] = arr[:, 336:] * (1 - iso) + BG * iso
    # «дыхание» персонажа: лёгкое покачивание камеры/масштаба
    s *= 1 + 0.006 * math.sin(t * 2 * math.pi / 3.2)
    cy += 2.0 * math.sin(t * 2 * math.pi / 3.2 + 0.7)
    im = Image.fromarray(arr.astype(np.uint8))
    # аффинное преобразование: выходной (X,Y) -> исходный (x,y)
    data = (1 / s, 0, cx - W / 2 / s, 0, 1 / s, cy - H / 2 / s)
    bg = tuple(int(c) for c in BG)
    return im.transform((W, H), Image.AFFINE, data, resample=Image.BICUBIC, fillcolor=bg)


# ------------------------------------------------------------------ text
_font_cache = {}


def font(path, size):
    key = (path, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


def wrap(draw, text, f, maxw):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split():
            test = (cur + " " + word).strip()
            if draw.textlength(test, font=f) <= maxw:
                cur = test
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def caption(frame, text, alpha, y, size=58, bold=True, box=True, color=(255, 255, 255)):
    if alpha <= 0:
        return
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(FONT_B if bold else FONT_R, size)
    lines = wrap(d, text, f, W - 160)
    lh = int(size * 1.25)
    th = lh * len(lines)
    tw = max(d.textlength(l, font=f) for l in lines)
    if box:
        pad = 34
        d.rounded_rectangle(
            [W / 2 - tw / 2 - pad, y - pad * 0.8, W / 2 + tw / 2 + pad, y + th + pad * 0.6],
            radius=28, fill=(15, 22, 35, int(200 * alpha)))
    for i, l in enumerate(lines):
        lw = d.textlength(l, font=f)
        d.text((W / 2 - lw / 2, y + i * lh), l, font=f,
               fill=color + (int(255 * alpha),))
    frame.alpha_composite(layer)


def window(t, a, b, fade=0.45):
    if t < a or t > b:
        return 0.0
    return min(1.0, (t - a) / fade, (b - t) / fade)


CAPTIONS = [
    # (начало, конец, текст, y, размер)
    (0.3, 4.6, "Что, если бы люди могли\nотращивать конечности?", 150, 66),
    (5.0, 7.0, "Обычный человек.\n206 костей.", 1600, 56),
    (7.0, 9.0, "Несчастный случай —\nи часть руки потеряна…", 1600, 56),
    (9.0, 14.0, "…но клетки «вспоминают» чертёж\nи кость растёт заново", 1600, 54),
    (15.2, 17.0, "Даже нога ниже колена", 1640, 56),
    (17.0, 22.0, "Аксолотли умеют это уже сегодня.\nУ людей — только кончики пальцев в детстве", 1590, 48),
    (23.2, 25.8, "Не было бы протезов\nи инвалидных колясок", 1600, 56),
    (25.8, 28.0, "Хирургия стала бы смелее,\nа спорт — опаснее", 1600, 56),
    (28.0, 30.4, "Но рост требует энергии\nи несёт риск опухолей", 1600, 56),
    (30.6, 34.0, "А вы бы хотели\nтакую способность?", 1540, 64),
]


def day_counter(frame, t):
    for g0, g1 in ((9.0, 14.0), (17.0, 22.0)):
        a = window(t, g0 - 0.3, g1 + 1.2, 0.3)
        if a > 0:
            p = smooth((t - g0) / (g1 - g0))
            day = max(1, int(round(1 + p * 59)))
            caption(frame, f"День {day}", a, 150, size=72, color=(120, 255, 215))
            # прогресс-бар
            d = ImageDraw.Draw(frame)
            x0, x1, y = 240, W - 240, 290
            d.rounded_rectangle([x0, y, x1, y + 14], 7, fill=(20, 30, 45, int(160 * a)))
            d.rounded_rectangle([x0, y, x0 + (x1 - x0) * p + 1, y + 14], 7,
                                fill=(60, 230, 190, int(255 * a)))


def particles(frame, t):
    """Искры вокруг фронта роста — рисуются в экранных координатах."""
    cx, cy, s = camera(t)
    d = ImageDraw.Draw(frame)
    for name, (g0, g1) in (("arm", (9.0, 14.0)), ("leg", (17.0, 22.0))):
        if not (g0 <= t <= g1):
            continue
        mask, y0, y1 = LIMBS[name]
        p = smooth((t - g0) / (g1 - g0))
        front = y0 + p * (y1 - y0 + 20)
        cols = np.where(mask[int(min(front, y1)), :] > 0.5)[0]
        if len(cols) == 0:
            continue
        xa, xb = cols.min(), cols.max()
        for i, (u, v, w_, ph) in enumerate(PART.seed):
            life = (t * (0.8 + w_) + ph) % 1.0
            sx = xa + u * (xb - xa) + math.sin(t * 3 + i) * 6
            sy = front - life * 40 * (0.5 + v)
            X = (sx - cx) * s + W / 2
            Y = (sy - cy) * s + H / 2
            r = 2 + 4 * (1 - life)
            a = int(255 * (1 - life))
            d.ellipse([X - r, Y - r, X + r, Y + r], fill=(150, 255, 230, a))


def vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((x - W / 2) / (W * 0.75)) ** 2 + ((y - H / 2) / (H * 0.75)) ** 2)
    return np.clip(1 - 0.35 * r ** 2, 0, 1)[..., None]


VIG = vignette()


def frame_at(t):
    arr = compose(t)
    arr = scan_overlay(arr, t, 23.2, 26.2)
    view = render_view(arr, t)
    v = np.asarray(view).astype(np.float32) * VIG
    # затемнение в начале и в конце
    fade = min(1.0, t / 0.6, (DURATION - t) / 0.8)
    v *= max(0.0, fade)
    frame = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8)).convert("RGBA")
    particles(frame, t)
    for a, b, text, y, size in CAPTIONS:
        caption(frame, text, window(t, a, b) * max(0.0, fade), y, size=size)
    day_counter(frame, t)
    return frame.convert("RGB")


def main():
    n = int(DURATION * FPS)
    if "--preview" in sys.argv:
        for t in (1.0, 6.0, 7.3, 8.5, 11.0, 13.5, 16.0, 19.5, 24.5, 32.0):
            frame_at(t).save(os.path.join(HERE, f"preview_{t:04.1f}.png"))
        return
    # фоновый звук: мягкий эмбиент-аккорд + «звон» в моменты регенерации
    audio = (
        "aevalsrc='0.06*sin(2*PI*110*t)+0.04*sin(2*PI*164.8*t)+0.03*sin(2*PI*220*t)"
        "+0.05*sin(2*PI*(440+200*mod(t,1))*t)*(between(t,9,14)+between(t,17,22))*0.4"
        f"+0.12*sin(2*PI*90*t)*exp(-6*(t-7))*gte(t,7)*0.8"
        f"+0.12*sin(2*PI*90*t)*exp(-6*(t-15.5))*gte(t,15.5)*0.8':s=44100:d={DURATION}"
    )
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-f", "lavfi", "-i", audio,
        "-af", f"afade=t=in:d=1,afade=t=out:st={DURATION - 1.5}:d=1.5,volume=0.8",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", OUT,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        proc.stdin.write(frame_at(i / FPS).tobytes())
        if i % 90 == 0:
            print(f"кадр {i}/{n}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("готово:", OUT)


if __name__ == "__main__":
    main()
