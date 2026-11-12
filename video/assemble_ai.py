#!/usr/bin/env python3
"""Собирает итоговое видео из ИИ-клипов ElevenLabs (clips/c1..c4.mp4)
и английской озвучки (voice_en/l1..l10.wav).

Формат 1080x1920: каждый горизонтальный клип ставится по центру на
размытый и затемнённый фон из него же, клипы замедляются под длину
озвучки, сверху — английские субтитры, внизу — эмбиент и озвучка.
Запуск: python3 assemble_ai.py
"""
import os
import subprocess
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, "clips")
VOICE = os.path.join(HERE, "voice_en")
OUT = os.path.join(HERE, "regeneration_ai_en.mp4")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

LINES = [
    "What if humans could regrow their limbs, just like lizards and axolotls?",
    "Meet an ordinary human. 206 bones — and not a single one grows back.",
    "But one day, there's an accident in the lab…",
    "…and he loses his arm below the elbow!",
    "In our world, that's forever. But with regeneration, the wound turns into a blastema — the seed of a new limb.",
    "Week after week, bones, muscles and nerves grow back. Months later, the arm is as good as new!",
    "And what if it's a leg?",
    "No problem. It grows back too.",
    "A world without prosthetics or wheelchairs. But the price: huge energy costs and a higher risk of tumors.",
    "Would you want this ability? Tell us in the comments!",
]
# какие фразы идут поверх какого клипа
SCENES = [("c1.mp4", [0, 1, 2, 3]), ("c2.mp4", [4, 5]), ("c3.mp4", [6, 7]), ("c4.mp4", [8, 9])]
GAP = 0.35


def wav_len(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def clip_len(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", p])
    return float(out)


def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace(",", "\\,")


def wrap(text, n=30):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    lines.append(cur)
    return "\n".join(lines)


def main():
    seg_files, voice_inputs, t = [], [], 0.0
    subs = []
    for k, (clip, idx) in enumerate(SCENES):
        cp = os.path.join(CLIPS, clip)
        start = t
        for i in idx:
            d = wav_len(os.path.join(VOICE, f"l{i + 1}.wav"))
            voice_inputs.append((i, t + 0.2))
            subs.append((t + 0.2, t + 0.2 + d, LINES[i]))
            t += d + GAP
        dur = max(t - start + 0.4, 7.0)
        t = start + dur
        speed = clip_len(cp) / dur          # <1 — замедление клипа
        seg = os.path.join(CLIPS, f"seg{k}.mp4")
        textfile = []
        draws = []
        for j, (a, b, txt) in enumerate(s for s in subs if start <= s[0] < start + dur):
            tf = os.path.join(CLIPS, f"sub{k}_{j}.txt")
            with open(tf, "w") as f:
                f.write(wrap(txt))
            textfile.append(tf)
            draws.append(
                f"drawtext=fontfile={FONT}:textfile={tf}:fontsize=58:fontcolor=white:line_spacing=14:"
                f"box=1:boxcolor=0x0a1423@0.72:boxborderw=28:x=(w-text_w)/2:y=1400:"
                f"enable='between(t,{a - start:.2f},{b - start:.2f})'"
            )
        title = ""
        if k == 0:
            title = (f",drawtext=fontfile={FONT}:text='WHAT IF…':fontsize=110:fontcolor=0x82ffdc:"
                     f"x=(w-text_w)/2:y=1260:enable='lt(t,4)':alpha='min(1,t/0.6)'")
        vf = (
            f"[0:v]setpts={1 / speed:.4f}*PTS,fps=30,split[a][b];"
            "[a]scale=-2:1920,crop=1080:1920,boxblur=30:3,eq=brightness=-0.18[bg];"
            "[b]scale=-2:1240,crop=1080:1240,eq=contrast=1.08:saturation=1.15[fg];"
            "[bg][fg]overlay=(W-w)/2:110,"
            + ",".join(draws) + title
            + f",trim=duration={dur:.3f},fade=t=in:d=0.35,fade=t=out:st={dur - 0.35:.3f}:d=0.35[v]"
        )
        subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", cp,
                        "-filter_complex", vf, "-map", "[v]", "-an", "-c:v", "libx264",
                        "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", seg], check=True)
        seg_files.append(seg)
        print(f"сцена {k + 1}: {dur:.1f} c, скорость клипа x{speed:.2f}")
    total = t
    lst = os.path.join(CLIPS, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in seg_files)
    # аудио: эмбиент-аккорд + озвучка с задержками
    joined = os.path.join(CLIPS, "joined.mp4")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error"] + sum([["-i", x] for x in seg_files], [])
                   + ["-filter_complex", "".join(f"[{i}:v]" for i in range(len(seg_files)))
                      + f"concat=n={len(seg_files)}:v=1:a=0[v]", "-map", "[v]", "-c:v", "libx264",
                      "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", joined], check=True)
    seg_files.append(joined)
    args = ["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", joined,
            "-f", "lavfi", "-i",
            f"aevalsrc='0.05*sin(2*PI*55*t)+0.035*sin(2*PI*82.4*t)+0.03*sin(2*PI*110*t)"
            f"+0.02*sin(2*PI*164.8*t)*(0.6+0.4*sin(2*PI*0.2*t))':s=44100:d={total:.2f}"]
    for i, _ in voice_inputs:
        args += ["-i", os.path.join(VOICE, f"l{i + 1}.wav")]
    parts, labels = [], []
    for n, (i, at) in enumerate(voice_inputs):
        ms = int(at * 1000)
        parts.append(f"[{n + 2}:a]adelay={ms}|{ms},volume=1.6[v{n}]")
        labels.append(f"[v{n}]")
    parts.append(f"[1:a]volume=0.8[amb]")
    parts.append("[amb]" + "".join(labels) +
                 f"amix=inputs={len(labels) + 1}:normalize=0,afade=t=out:st={total - 1.2:.2f}:d=1.2,"
                 "alimiter=limit=0.95[a]")
    args += ["-filter_complex", ";".join(parts), "-map", "0:v", "-map", "[a]", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
    subprocess.run(args, check=True)
    for s in seg_files:
        os.remove(s)
    for f in os.listdir(CLIPS):
        if f.startswith("sub") or f == "list.txt":
            os.remove(os.path.join(CLIPS, f))
    print("готово:", OUT, f"{total:.1f} c")


if __name__ == "__main__":
    main()
