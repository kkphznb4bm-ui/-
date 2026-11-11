#!/usr/bin/env python3
"""Мультфильм «Что, если бы люди могли отращивать конечности?»

Персонаж с картинки skeleton.jpg разрезается на части (голова, туловище,
плечи, предплечья, бёдра, голени) и анимируется как кукла на шарнирах
в фоне научной лаборатории. Сюжет: персонаж машет рукой, лазер отрезает
ему предплечье, рука отрастает; затем ящик ломает голень, нога отрастает.
Озвучка — фразы voice/l1.wav … l10.wav (RHVoice, голос aleksandr-hq),
плюс синтезированные звуковые эффекты и фоновый эмбиент.

Запуск:  python3 puppet_video.py [--preview]
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "skeleton.jpg")
VOICE = os.path.join(HERE, "voice")
OUT = os.path.join(HERE, "regeneration_cartoon.mp4")
W, H, FPS, SR = 1080, 1920, 30, 44100
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
rng = np.random.default_rng(3)

# =================================================================== parts
src = np.asarray(Image.open(SRC).convert("RGB").resize((1024, 1024))).astype(np.float32)
BG0 = src[5:40, 5:40].reshape(-1, 3).mean(0)


def extract_rgba(region):
    """Отделяет персонажа от светлого фона: альфа = отличие от фона."""
    d = np.abs(region - BG0).max(2)
    a = np.clip((d - 5) / 38.0, 0, 1)
    a = np.where(a > 0, np.maximum(a, 0.18), 0) * (d > 5)
    col = (region - BG0 * (1 - a[..., None])) / np.maximum(a[..., None], 1e-3)
    col = np.clip(col, 0, 255)
    # стеклянная оболочка тела — слегка голубоватая
    glass = (a < 0.3)[..., None]
    col = np.where(glass, col * 0.6 + np.array([170, 210, 255]) * 0.4, col)
    return np.dstack([col, a * 255]).astype(np.uint8)


FIG = extract_rgba(src[:, :336])          # фронтальная фигура
SIDE = extract_rgba(src[:, 350:678])      # вид сбоку (для голограмм)
BACK = extract_rgba(src[:, 690:1020])         # вид сзади

PH, PW = FIG.shape[:2]

POLYS = {
    "head": [(105, 55), (240, 55), (240, 232), (105, 232)],
    "uR": [(28, 250), (108, 250), (106, 408), (26, 408)],
    "fR": [(0, 402), (106, 402), (90, 440), (90, 660), (0, 660)],
    "uL": [(236, 250), (314, 250), (320, 408), (240, 408)],
    "fL": [(240, 402), (345, 402), (345, 660), (262, 660), (262, 440)],
    "tR": [(82, 548), (150, 548), (166, 600), (168, 736), (80, 736)],
    "tL": [(196, 548), (264, 548), (262, 736), (174, 736), (178, 600)],
    "sR": [(70, 728), (170, 728), (170, 1010), (70, 1010)],
    "sL": [(172, 728), (272, 728), (272, 1010), (172, 1010)],
}
PIVOT = {  # шарниры в координатах исходника
    "body": (170, 545), "head": (170, 228),
    "uR": (88, 282), "fR": (62, 410), "uL": (256, 282), "fL": (277, 410),
    "tR": (122, 550), "sR": (122, 732), "tL": (220, 550), "sL": (215, 732),
}
PARENT = {"head": "body", "uR": "body", "uL": "body", "tR": "body", "tL": "body",
          "fR": "uR", "fL": "uL", "sR": "tR", "sL": "tL"}
DRAW_ORDER = ["tR", "tL", "sR", "sL", "body", "head", "uR", "uL", "fR", "fL"]

masks = {}
union = np.zeros((PH, PW), np.float32)
for k, poly in POLYS.items():
    m = Image.new("L", (PW, PH), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    m = np.asarray(m).astype(np.float32) / 255 * (1 - union)
    masks[k] = m
    union = np.clip(union + m, 0, 1)
masks["body"] = 1 - union

PARTS = {}
for k, m in masks.items():
    rgba = FIG.copy()
    rgba[..., 3] = (rgba[..., 3] * m).astype(np.uint8)
    ys, xs = np.where(rgba[..., 3] > 0)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    PARTS[k] = (Image.fromarray(rgba[y0:y1, x0:x1]), (x0, y0))


# ================================================================== affine
def T(dx, dy):
    return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1]], float)


def R(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)


def S(k):
    return np.array([[k, 0, 0], [0, k, 0], [0, 0, 1]], float)


def about(p, M):
    return T(*p) @ M @ T(-p[0], -p[1])


def paste(canvas, img, offset, M):
    """Рисует RGBA-кусок img (лежащий в исходнике по offset) с матрицей M."""
    M = M @ T(*offset)
    # bbox на холсте
    w, h = img.size
    pts = M @ np.array([[0, w, 0, w], [0, 0, h, h], [1, 1, 1, 1]], float)
    bx0, by0 = int(max(0, pts[0].min() - 2)), int(max(0, pts[1].min() - 2))
    bx1, by1 = int(min(canvas.width, pts[0].max() + 2)), int(min(canvas.height, pts[1].max() + 2))
    if bx1 <= bx0 or by1 <= by0:
        return
    inv = np.linalg.inv(T(bx0, by0) @ np.eye(3))
    inv = np.linalg.inv(M) @ T(bx0, by0)
    piece = img.transform((bx1 - bx0, by1 - by0), Image.AFFINE,
                          tuple(inv[:2].flatten()), resample=Image.BICUBIC)
    canvas.alpha_composite(piece, (bx0, by0))


# ============================================================== background
def make_background():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    top = np.array([8, 14, 30], np.float32)
    bot = np.array([18, 40, 70], np.float32)
    k = (y / H)[..., None]
    bg = top * (1 - k) + bot * k
    # пол с перспективной сеткой
    horizon = 1180
    floor = y > horizon
    depth = np.where(floor, (y - horizon) / (H - horizon), 0)
    bg = np.where(floor[..., None], bg * 0.7 + np.array([10, 30, 50]) * 0.3, bg)
    im = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(im, "RGBA")
    for i in range(1, 14):
        yy = horizon + (H - horizon) * (i / 13) ** 1.8
        d.line([(0, yy), (W, yy)], fill=(60, 160, 220, 60), width=2)
    for i in range(-12, 13):
        d.line([(W / 2 + i * 22, horizon), (W / 2 + i * 260, H)], fill=(60, 160, 220, 55), width=2)
    # стена: панели и световые полосы
    for i, xp in enumerate(range(-40, W, 270)):
        d.rounded_rectangle([xp + 10, 120, xp + 250, horizon - 30], 18,
                            fill=(20, 40, 70, 120), outline=(70, 140, 200, 90), width=3)
        d.rectangle([xp + 30, horizon - 70, xp + 230, horizon - 62], fill=(80, 220, 255, 140))
    d.line([(0, horizon), (W, horizon)], fill=(90, 210, 255, 160), width=4)
    # голографические мониторы с видом сбоку и сзади
    for (img, x0) in ((SIDE, 50), (BACK, W - 300)):
        holo = img.astype(np.float32)
        a = holo[..., 3:4] / 255
        lum = holo[..., :3].mean(2, keepdims=True) / 255
        col = np.concatenate([lum * 80, lum * 230, lum * 255], 2)
        h_img = Image.fromarray(np.dstack([col, a * 200]).astype(np.uint8))
        h_img = h_img.crop((0, 60, h_img.width, 1010)).resize((250, 700))
        d.rounded_rectangle([x0 - 10, 250, x0 + 260, 970], 16, fill=(10, 40, 70, 170),
                            outline=(90, 220, 255, 200), width=3)
        im.alpha_composite(h_img, (x0, 260))
        for sy in range(255, 965, 6):
            d.line([(x0 - 8, sy), (x0 + 258, sy)], fill=(0, 0, 0, 40))
    glow = im.filter(ImageFilter.GaussianBlur(8))
    return Image.blend(im, glow, 0.25)


BACKGROUND = make_background()

# ====================================================================== text
_fonts = {}


def font(sz):
    if sz not in _fonts:
        _fonts[sz] = ImageFont.truetype(FONT_B, sz)
    return _fonts[sz]


def wrap(d, text, f, maxw):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            out.append(cur)
            cur = w
    out.append(cur)
    return out


def caption(frame, text, alpha, y, size=50, color=(255, 255, 255), box=(10, 20, 35)):
    if alpha <= 0 or not text:
        return
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(size)
    lines = wrap(d, text, f, W - 170)
    lh = int(size * 1.28)
    tw = max(d.textlength(l, font=f) for l in lines)
    pad = 30
    d.rounded_rectangle([W / 2 - tw / 2 - pad, y - pad * 0.7, W / 2 + tw / 2 + pad,
                         y + lh * len(lines) + pad * 0.5], 26, fill=box + (int(190 * alpha),))
    for i, l in enumerate(lines):
        d.text((W / 2 - d.textlength(l, font=f) / 2, y + i * lh), l, font=f,
               fill=color + (int(255 * alpha),))
    frame.alpha_composite(layer)


# ================================================================= timeline
def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


LINES = [
    "Что, если бы люди могли отращивать конечности, как ящерицы и аксолотли?",
    "Знакомьтесь. Это обычный человек. 206 костей — и ни одна не отрастает заново.",
    "Но однажды в лаборатории происходит авария…",
    "…и он теряет руку ниже локтя!",
    "В нашем мире это навсегда. Но в мире регенерации клетки раны превращаются в бластему — зародыш новой конечности.",
    "Неделя за неделей растут кости, мышцы и нервы. Через пару месяцев рука снова как новая!",
    "А если пострадает нога?",
    "Не беда. Она тоже отрастёт.",
    "Мир без протезов и инвалидных колясок. Но у суперсилы есть цена: огромные затраты энергии и риск опухолей.",
    "А вы бы хотели такую способность? Пишите в комментариях!",
]
VL = [wav_len(os.path.join(VOICE, f"l{i + 1}.wav")) for i in range(10)]
MIN = [0, 0, 3.6, 2.8, 0, 7.0, 3.0, 5.0, 0, 0]
NAMES = ["intro", "meet", "laser", "lost", "blastema", "regrow", "crate", "legrow", "world", "end"]
SCENES = []
t = 0.4
for i, n in enumerate(NAMES):
    dur = max(VL[i] + 0.5, MIN[i]) + (1.2 if n == "end" else 0)
    SCENES.append((n, t, dur, i))
    t += dur
DURATION = t + 0.3


def scene_at(t):
    for n, s, d, i in SCENES:
        if s <= t < s + d:
            return n, t - s, d
    return ("intro", 0, 1) if t < SCENES[0][1] else ("end", SCENES[-1][2], SCENES[-1][2])


def start(name):
    return next(s for n, s, d, i in SCENES if n == name)


def dur(name):
    return next(d for n, s, d, i in SCENES if n == name)


def sm(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    return sm((t - a) / (b - a)) if b > a else float(t >= a)


# ========================================================== world state
T_CUT = start("lost")                         # лазер режет руку
T_ARM0 = start("regrow")                       # начало роста руки
T_ARM1 = T_ARM0 + dur("regrow") * 0.75
T_HIT = start("crate") + 1.3                    # ящик бьёт по голени
T_LEG0 = start("legrow") + 0.2
T_LEG1 = start("legrow") + dur("legrow") * 0.85


def pose(t):
    """Углы шарниров (градусы), смещение и наклон тела."""
    p = dict(bx=0.0, by=0.0, body=0.0, head=0.0, uR=0.0, fR=0.0, uL=0.0, fL=0.0,
             tR=0.0, sR=0.0, tL=0.0, sL=0.0, squash=0.0)
    breath = math.sin(t * 2 * math.pi / 3.0)
    p["by"] = 3 * breath
    p["uR"] = 2 * breath
    p["uL"] = -2 * breath
    n, lt, d = scene_at(t)
    if n == "meet":            # машет правой (на экране) рукой
        up = ramp(lt, 0.3, 1.0) * (1 - ramp(lt, d - 1.0, d - 0.3))
        p["uL"] += -140 * up
        p["fL"] += (-25 + 25 * math.sin(lt * 9)) * up
        p["head"] = 6 * up
    elif n == "laser":         # настороженно оглядывается
        p["head"] = 10 * math.sin(lt * 2.0) * ramp(lt, 0.2, 0.8)
        p["uL"] += -35 * ramp(lt, 1.5, 2.2)
        p["fL"] += -40 * ramp(lt, 1.5, 2.2)
    elif n == "lost":          # отшатывается и смотрит на руку
        k = ramp(lt, 0, 0.25)
        shake = math.exp(-lt * 3) * math.sin(lt * 40) * 6
        p["body"] = -4 * k + shake
        p["bx"] = -18 * k
        p["uL"] += -35 + -25 * k
        p["head"] = 14 * k
        p["uR"] += 12 * k
    elif n in ("blastema", "regrow"):
        k = 1.0
        p["uL"] += -60
        p["head"] = 14
        p["bx"] = -18
        p["body"] = -4
        if n == "regrow":
            fin = ramp(lt, d * 0.78, d * 0.9)
            p["uL"] += (-80 + 18 * math.sin(lt * 6)) * fin
            p["fL"] += -70 * fin * (0.6 + 0.4 * math.sin(lt * 5))
            p["head"] = 14 - 20 * fin
            p["bx"] = -18 * (1 - fin)
            p["body"] = -4 * (1 - fin)
    elif n == "crate":
        look = ramp(lt, 0.2, 0.8)
        p["head"] = -8 * look
        hit = ramp(t, T_HIT, T_HIT + 0.2)
        p["body"] = 6 * hit + math.exp(-max(0, t - T_HIT) * 3) * math.sin(max(0, t - T_HIT) * 35) * 5 * hit
        p["bx"] = 25 * hit
        p["tL"] = -6 * hit
        p["uR"] += 25 * hit
        p["uL"] += -25 * hit
        p["head"] += -10 * hit
    elif n == "legrow":
        g = ramp(t, T_LEG0, T_LEG1)
        p["body"] = 6 * (1 - g)
        p["bx"] = 25 * (1 - g)
        p["tL"] = -6 * (1 - g)
        p["uR"] += 25 * (1 - g)
        p["uL"] += -25 * (1 - g)
        p["head"] = -12 * (1 - g)
    elif n == "world":         # радостно шагает на месте
        k = ramp(lt, 0.3, 1.0) * (1 - ramp(lt, d - 0.8, d))
        s = math.sin(lt * 5.5)
        p["tR"] = 18 * max(0, s) * k
        p["sR"] = -30 * max(0, s) * k
        p["tL"] = -18 * max(0, -s) * k
        p["sL"] = 30 * max(0, -s) * k
        p["uR"] += -18 * s * k
        p["uL"] += -18 * s * k
        p["by"] += -10 * abs(s) * k
    elif n == "end":
        up = ramp(lt, 0.2, 0.8)
        p["uR"] += 150 * up
        p["uL"] += -150 * up
        p["fR"] += 20 * math.sin(lt * 8) * up
        p["fL"] += -20 * math.sin(lt * 8) * up
    return p


SIGN = {"uR": 1, "fR": 1, "tR": 1, "sR": 1, "uL": 1, "fL": 1, "tL": 1, "sL": 1, "head": 1}


def limb_reveal(part, prog, glow_t):
    """Маска роста: показывает часть кости от шарнира до фронта роста."""
    img, off = PARTS[part]
    a = np.asarray(img).astype(np.float32)
    h = a.shape[0]
    py = PIVOT["fL" if part == "fL" else "sL"][1] - off[1]
    front = py + prog * (h - py + 20)
    ys = np.arange(h, dtype=np.float32)[:, None]
    m = np.clip((front - ys) / 12, 0, 1)
    out = a.copy()
    out[..., 3] *= m
    if glow_t > 0:
        band = np.exp(-((ys - front) / 10) ** 2)
        fresh = np.clip((front - ys) / 160, 0, 1)
        g = np.clip(band * 1.2 + (1 - fresh) * 0.5, 0, 1) * glow_t
        cyan = np.array([80, 255, 220], np.float32)
        out[..., :3] = out[..., :3] * (1 - g[..., None] * 0.7) + cyan * g[..., None] * 0.7
        out[..., 3] = np.maximum(out[..., 3], 160 * band[:, 0][:, None] * m * glow_t
                                 * (np.asarray(img)[..., 3] > 0))
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), front + off[1]


def limb_status(t, kind):
    if kind == "arm":
        t_cut, g0, g1 = T_CUT, T_ARM0, T_ARM1
    else:
        t_cut, g0, g1 = T_HIT, T_LEG0, T_LEG1
    if t < t_cut:
        return "intact", 1.0
    if t < g0:
        return "lost", 0.0
    if t < g1:
        return "growing", ramp(t, g0, g1)
    return "grown", 1.0


CHAR_SCALE = 1.42
CHAR_ORIGIN = (W / 2, 1690)    # куда ставится точка (170, 990) — между стоп


def joint_matrices(p):
    base = T(CHAR_ORIGIN[0] + p["bx"], CHAR_ORIGIN[1] + p["by"]) @ S(CHAR_SCALE) @ T(-170, -990)
    M = {"body": base @ about(PIVOT["body"], R(p["body"]))}
    for k in ["head", "uR", "uL", "tR", "tL", "fR", "fL", "sR", "sL"]:
        M[k] = M[PARENT[k]] @ about(PIVOT[k], R(p[k] * SIGN[k]))
    return M


def to_screen(M, pt):
    v = M @ np.array([pt[0], pt[1], 1.0])
    return v[0], v[1]


# ============================================================= render
def render_character(canvas, t, p, M):
    arm_state, arm_p = limb_status(t, "arm")
    leg_state, leg_p = limb_status(t, "leg")
    for k in DRAW_ORDER:
        img, off = PARTS[k]
        if k == "fL" and arm_state != "intact":
            if arm_state == "lost":
                continue
            gt = 1.0 if arm_state == "growing" else max(0, 1 - (t - T_ARM1) / 1.5)
            img, _ = limb_reveal("fL", arm_p, gt)
        if k == "sL" and leg_state != "intact":
            if leg_state == "lost":
                continue
            gt = 1.0 if leg_state == "growing" else max(0, 1 - (t - T_LEG1) / 1.5)
            img, _ = limb_reveal("sL", leg_p, gt)
        paste(canvas, img, off, M[k])


def falling_piece(canvas, t, part, t0, M0, floor_y, spin):
    """Отрубленная часть падает, кувыркается и рассыпается в пыль."""
    if t < t0:
        return
    dt = t - t0
    img, off = PARTS[part]
    M0 = M0[part]
    cx, cy = to_screen(M0, PIVOT[part])
    fall = min(dt, 0.9)
    yy = 0.5 * 2600 * fall ** 2
    xx = 160 * fall * spin
    M = T(xx, min(yy, floor_y - cy)) @ about((cx, cy), R(spin * 260 * fall)) @ M0
    fade = 1 - ramp(dt, 1.0, 1.8)
    if fade <= 0:
        return
    a = np.asarray(img).copy()
    a[..., 3] = (a[..., 3] * fade).astype(np.uint8)
    paste(canvas, Image.fromarray(a), off, M)


def sparks(canvas, center, t, n=40, color=(120, 255, 230), radius=90, seed=0):
    d = ImageDraw.Draw(canvas, "RGBA")
    r = np.random.default_rng(seed)
    for i in range(n):
        ang = r.random() * 2 * math.pi
        sp = 0.5 + r.random()
        ph = r.random()
        life = (t * sp + ph) % 1.0
        dist = radius * life
        x = center[0] + math.cos(ang) * dist
        y = center[1] + math.sin(ang) * dist - 30 * life
        rr = 2 + 5 * (1 - life)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color + (int(230 * (1 - life)),))


def glow_dot(canvas, c, r, color, alpha):
    if alpha <= 0:
        return
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(6, 0, -1):
        rr = r * i / 6 * 1.8
        d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr],
                  fill=color + (int(alpha * 255 * (1 - i / 7) * 0.6),))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r / 3)))


def draw_laser(canvas, t, M):
    s = start("laser")
    if not (s + 0.8 <= t < T_CUT + 0.35):
        return
    d = ImageDraw.Draw(canvas, "RGBA")
    # излучатель на стене справа
    ex, ey = W - 40, 760
    d.rounded_rectangle([ex - 70, ey - 40, ex + 40, ey + 40], 12, fill=(50, 60, 80, 255),
                        outline=(255, 80, 80, 255), width=4)
    charge = ramp(t, s + 0.8, T_CUT - 0.3)
    glow_dot(canvas, (ex - 70, ey), 30 + 20 * charge, (255, 60, 60), 0.4 + 0.6 * charge)
    if t >= T_CUT - 0.3:
        target = to_screen(M["fL"], (282, 445))
        k = ramp(t, T_CUT - 0.3, T_CUT)
        tx = ex - 70 + (target[0] - 80 - (ex - 70)) * 1.0
        ty = ey + (target[1] - ey) * k
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.line([(ex - 70, ey), (tx, ty)], fill=(255, 40, 40, 255), width=10)
        ld.line([(ex - 70, ey), (tx, ty)], fill=(255, 220, 220, 255), width=3)
        canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(3)))
        canvas.alpha_composite(layer)


def draw_crate(canvas, t, M):
    s = start("crate")
    if not (s <= t < start("legrow") + 1.5):
        return
    knee = to_screen(M["sL"], (215, 800))
    tgt_y = knee[1] - 40
    x = knee[0] - 150
    if t < T_HIT:
        k = (t - s) / (T_HIT - s)
        y = -300 + (tgt_y + 300) * k ** 2
        ang = 0
    else:
        dt = t - T_HIT
        x -= 260 * min(dt, 0.6)
        y = min(tgt_y + 1800 * dt ** 2 - 500 * dt, 1650)
        ang = -40 * min(dt, 0.6)
    fade = 1 - ramp(t, start("legrow") + 0.5, start("legrow") + 1.4)
    box = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    bd.rectangle([10, 10, 210, 210], fill=(150, 105, 55, 255), outline=(80, 50, 20, 255), width=8)
    bd.line([(10, 10), (210, 210)], fill=(95, 60, 25, 255), width=10)
    bd.line([(210, 10), (10, 210)], fill=(95, 60, 25, 255), width=10)
    bd.rectangle([60, 85, 160, 135], fill=(230, 200, 40, 255))
    bd.text((72, 93), "!", fill=(0, 0, 0, 255), font=font(36))
    box = box.rotate(ang, resample=Image.BICUBIC, expand=True)
    if fade < 1:
        a = np.asarray(box).copy()
        a[..., 3] = (a[..., 3] * fade).astype(np.uint8)
        box = Image.fromarray(a)
    canvas.alpha_composite(box, (int(x - box.width / 2), int(y - box.height / 2)))


# одна «замороженная» поза в момент травмы — для падающих кусков
M_CUT = joint_matrices(pose(T_CUT - 1e-3))
M_HIT = joint_matrices(pose(T_HIT - 1e-3))


def camera(t):
    keys = [(0.0, (W / 2, H / 2 + 60, 1.0)), (start("meet"), (W / 2, H / 2, 1.0)),
            (start("laser") + 0.5, (W / 2, H / 2, 1.0)), (T_CUT - 0.2, (W / 2 + 80, 900, 1.35)),
            (start("regrow") + dur("regrow") * 0.8, (W / 2 + 90, 880, 1.45)),
            (start("crate"), (W / 2, H / 2 + 100, 1.0)), (T_HIT, (W / 2, 1250, 1.3)),
            (start("legrow") + dur("legrow"), (W / 2, 1250, 1.35)),
            (start("world") + 1.0, (W / 2, H / 2, 1.0)), (DURATION, (W / 2, H / 2, 1.0))]
    for (ta, a), (tb, b) in zip(keys, keys[1:]):
        if ta <= t <= tb:
            k = sm((t - ta) / (tb - ta))
            return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))
    return keys[-1][1]


def shake(t):
    a = 0.0
    for t0, amp in ((T_CUT, 14), (T_HIT, 22)):
        if t >= t0:
            a += amp * math.exp(-(t - t0) * 5)
    return a * math.sin(t * 70), a * math.cos(t * 55)


def day_badge(frame, t, g0, g1, label):
    a = min(ramp(t, g0 - 0.4, g0), 1 - ramp(t, g1 + 1.0, g1 + 1.4))
    if a <= 0:
        return
    p = ramp(t, g0, g1)
    caption(frame, f"{label}: день {max(1, round(1 + p * 59))}", a, 110, size=62,
            color=(130, 255, 220))
    d = ImageDraw.Draw(frame, "RGBA")
    d.rounded_rectangle([200, 225, W - 200, 241], 8, fill=(20, 30, 45, int(170 * a)))
    d.rounded_rectangle([200, 225, 200 + (W - 400) * p + 1, 241], 8, fill=(70, 235, 200, int(255 * a)))


def frame_at(t):
    p = pose(t)
    M = joint_matrices(p)
    world = BACKGROUND.copy()
    # тень под ногами
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([W / 2 - 230 + p["bx"], 1660, W / 2 + 230 + p["bx"], 1730],
                               fill=(0, 0, 0, 120))
    world.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    draw_crate(world, t, M) if t >= T_HIT else None
    render_character(world, t, p, M)
    if t < T_HIT:
        draw_crate(world, t, M)
    falling_piece(world, t, "fL", T_CUT, M_CUT, 1700, 1)
    falling_piece(world, t, "sL", T_HIT, M_HIT, 1720, -1)
    draw_laser(world, t, M)
    # вспышка разреза / удара
    for t0, part, pt, col in ((T_CUT, "fL", (277, 440), (255, 90, 90)),
                              (T_HIT, "sL", (215, 745), (255, 200, 120))):
        if t0 <= t < t0 + 0.6:
            c = to_screen(M[part], pt)
            glow_dot(world, c, 60, col, 1 - (t - t0) / 0.6)
            sparks(world, c, t * 2, n=30, color=col, radius=140, seed=int(t0))
    # бластема и рост
    arm_state, arm_p = limb_status(t, "arm")
    if start("blastema") <= t < T_ARM1:
        c = to_screen(M["fL"], (277, 415 + arm_p * 230))
        pulse = 0.6 + 0.4 * math.sin(t * 6)
        glow_dot(world, c, 45 + 15 * pulse, (80, 255, 220), ramp(t, start("blastema"), start("blastema") + 1.0))
        sparks(world, c, t, n=36, seed=11)
    leg_state, leg_p = limb_status(t, "leg")
    if T_HIT + 0.8 <= t < T_LEG1:
        c = to_screen(M["sL"], (215, 735 + leg_p * 260))
        glow_dot(world, c, 45 + 12 * math.sin(t * 6), (80, 255, 220), ramp(t, T_HIT + 0.8, T_HIT + 1.6))
        sparks(world, c, t, n=36, seed=12)

    # камера
    cx, cy, z = camera(t)
    sx, sy = shake(t)
    data = (1 / z, 0, cx - W / 2 / z + sx, 0, 1 / z, cy - H / 2 / z + sy)
    frame = world.transform((W, H), Image.AFFINE, data, resample=Image.BICUBIC,
                            fillcolor=(8, 14, 30, 255))
    # красная вспышка экрана при травме
    for t0 in (T_CUT, T_HIT):
        if t0 <= t < t0 + 0.4:
            fl = Image.new("RGBA", (W, H), (255, 40, 40, int(90 * (1 - (t - t0) / 0.4))))
            frame.alpha_composite(fl)

    n, lt, d = scene_at(t)
    i = NAMES.index(n)
    a = min(1.0, lt / 0.3, (d - lt) / 0.3) if t >= SCENES[0][1] else 0
    caption(frame, LINES[i], max(0, a), 1560 if n != "end" else 1450, size=48 if n != "end" else 60)
    if n == "intro":
        caption(frame, "ЧТО, ЕСЛИ БЫ…", ramp(t, 0.3, 0.9), 150, size=80, color=(130, 255, 220))
    day_badge(frame, t, T_ARM0, T_ARM1, "Рука")
    day_badge(frame, t, T_LEG0, T_LEG1, "Нога")
    fade = min(1.0, t / 0.5, (DURATION - t) / 0.7)
    if fade < 1:
        frame.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * (1 - max(fade, 0))))))
    return frame.convert("RGB")


# ===================================================================== audio
def build_audio():
    n = int(DURATION * SR) + SR
    tt = np.arange(n) / SR
    mix = np.zeros(n, np.float32)
    # эмбиент: мягкий аккорд с медленной пульсацией
    chord = sum(np.sin(2 * np.pi * f * tt) for f in (55, 82.4, 110, 164.8))
    mix += 0.025 * chord * (0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * tt))

    def at(t0):
        return int(t0 * SR)

    def add(sig, t0, gain=1.0):
        i = at(t0)
        j = min(n, i + len(sig))
        if i < n:
            mix[i:j] += gain * sig[: j - i]

    # озвучка
    for (name, s, d, i) in SCENES:
        with wave.open(os.path.join(VOICE, f"l{i + 1}.wav")) as w:
            raw = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
            fr = w.getframerate()
        res = np.interp(np.arange(int(len(raw) * SR / fr)) * fr / SR, np.arange(len(raw)), raw)
        add(res.astype(np.float32), s + 0.15, 0.95)
    # лазер: зарядка и выстрел
    s = start("laser")
    q = np.arange(int((T_CUT - s - 0.8) * SR)) / SR
    add(0.08 * np.sin(2 * np.pi * (200 * q + 300 * q ** 2)) * (q / q[-1]), s + 0.8)
    q = np.arange(int(0.6 * SR)) / SR
    add(0.25 * np.sin(2 * np.pi * (1800 * q - 1200 * q ** 2)) * np.exp(-q * 6), T_CUT - 0.3)
    # удары
    for t0, g in ((T_CUT, 0.35), (T_HIT, 0.6), (T_HIT + 0.9, 0.25), (T_CUT + 0.9, 0.2)):
        q = np.arange(int(0.5 * SR)) / SR
        boom = (rng.normal(0, 1, len(q)) * 0.5 + np.sin(2 * np.pi * 70 * q)) * np.exp(-q * 9)
        add(boom.astype(np.float32), t0, g)
    # мерцание регенерации
    for g0, g1 in ((T_ARM0, T_ARM1), (T_LEG0, T_LEG1)):
        q = np.arange(int((g1 - g0) * SR)) / SR
        f = 500 + 500 * q / q[-1]
        shimmer = sum(np.sin(2 * np.pi * f * m * q) / m for m in (1, 1.5, 2))
        add((0.04 * shimmer * (0.6 + 0.4 * np.sin(2 * np.pi * 8 * q))).astype(np.float32), g0)
    mix = mix[: int(DURATION * SR)]
    fade = np.minimum(1, np.minimum(np.arange(len(mix)) / SR / 0.5, (len(mix) / SR - np.arange(len(mix)) / SR) / 1.0))
    mix *= np.clip(fade, 0, 1)
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    path = os.path.join(HERE, "voice", "mix.wav")
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    return path


def main():
    if "--preview" in sys.argv:
        for name in NAMES:
            tt = start(name) + dur(name) * 0.6
            frame_at(tt).resize((360, 640)).save(os.path.join(HERE, f"pv_{NAMES.index(name)}_{name}.png"))
        for tt in (T_CUT + 0.3, T_HIT + 0.3):
            frame_at(tt).resize((360, 640)).save(os.path.join(HERE, f"pv_hit_{tt:.1f}.png"))
        print("duration", DURATION)
        return
    total = int(DURATION * FPS)
    if "--part" in sys.argv:          # рендер куска кадров: --part i n
        i0 = sys.argv.index("--part")
        k, n = int(sys.argv[i0 + 1]), int(sys.argv[i0 + 2])
        a, b = total * k // n, total * (k + 1) // n
        seg = os.path.join(HERE, f"seg_{k}.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", seg]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for i in range(a, b):
            proc.stdin.write(frame_at(i / FPS).tobytes())
            if (i - a) % 150 == 0:
                print(f"[{k}] кадр {i - a}/{b - a}", flush=True)
        proc.stdin.close()
        proc.wait()
        return
    # полная сборка: 4 процесса параллельно, затем склейка со звуком
    n = int(os.environ.get("JOBS", os.cpu_count() or 1))
    procs = [subprocess.Popen([sys.executable, __file__, "--part", str(k), str(n)]) for k in range(n)]
    for pr in procs:
        pr.wait()
    audio = build_audio()
    lst = os.path.join(HERE, "segs.txt")
    with open(lst, "w") as f:
        f.writelines(f"file 'seg_{k}.mp4'\n" for k in range(n))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-i", audio, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", OUT], check=True)
    for k in range(n):
        os.remove(os.path.join(HERE, f"seg_{k}.mp4"))
    os.remove(lst)
    print("готово:", OUT)


if __name__ == "__main__":
    main()
