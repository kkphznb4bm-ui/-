"""Procedural nebula textures (domain-warped fractal noise) for the star video."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1]
W, H = 1600, 2840
rng = np.random.default_rng(7)

def octave(cells_x, seed):
    r = np.random.default_rng(seed)
    cells_y = max(2, int(cells_x * H / W))
    small = (r.random((cells_y, cells_x)) * 255).astype(np.uint8)
    return np.asarray(Image.fromarray(small).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255

def fbm(seed, base=3, octaves=7, gain=0.55):
    acc, amp, tot = np.zeros((H, W), np.float32), 1.0, 0.0
    for o in range(octaves):
        acc += amp * octave(base * 2 ** o, seed * 100 + o)
        tot += amp
        amp *= gain
    return acc / tot

def warp(field, wx, wy, strength):
    yy, xx = np.mgrid[0:H, 0:W]
    x = np.clip((xx + (wx - 0.5) * strength).astype(int), 0, W - 1)
    y = np.clip((yy + (wy - 0.5) * strength).astype(int), 0, H - 1)
    return field[y, x]

def nebula(seed, palette, density=1.0, name="n"):
    wx, wy = fbm(seed + 1, 2, 5), fbm(seed + 2, 2, 5)
    base = warp(fbm(seed, 3, 7), wx, wy, 900)
    detail = warp(fbm(seed + 3, 6, 6), wx, wy, 400)
    f = np.clip((base - 0.38) * 2.6, 0, 1) ** 1.6
    f = f * (0.65 + 0.7 * detail) * density
    # dark dust lanes
    lanes = np.clip((warp(fbm(seed + 5, 4, 6), wy, wx, 700) - 0.55) * 4, 0, 1)
    f = f * (1 - 0.8 * lanes)
    hue = warp(fbm(seed + 4, 2, 4), wx, wy, 600)
    c0, c1, c2 = (np.array(c, np.float32) for c in palette)
    t = np.clip(hue * 1.6 - 0.3, 0, 1)[..., None]
    col = np.where(t < 0.5, c0 + (c1 - c0) * (t * 2), c1 + (c2 - c1) * ((t - 0.5) * 2))
    rgb = col * f[..., None]
    # bright cores bloom
    core = np.clip(f - 0.6, 0, 1)[..., None] * 1.2
    rgb = rgb + core * 255 * np.array([1, 0.92, 0.85])
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))
    glow = img.filter(ImageFilter.GaussianBlur(30))
    lin = (np.asarray(img, np.float32) + np.asarray(glow, np.float32) * 0.7) / 255
    tone = 1 - np.exp(-lin * 1.25)  # filmic-ish roll-off, no clipped white blobs
    out = Image.fromarray((tone * 255).astype(np.uint8))
    out.save(os.path.join(OUT, f"{name}.jpg"), quality=92)
    print(name, out.size)

nebula(11, [(40, 70, 210), (150, 60, 200), (255, 110, 160)], 1.0, "nebula_cool")
nebula(23, [(255, 90, 40), (230, 60, 120), (60, 200, 220)], 1.1, "nebula_remnant")
nebula(37, [(20, 40, 120), (60, 30, 110), (110, 60, 160)], 0.55, "nebula_faint")
