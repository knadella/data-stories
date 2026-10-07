"""
Build the "same pitch, different result" side-by-side loop from the MLB clips
downloaded to scripts/output/clips/ (see vlad-clips.json for the play IDs).

Two pairs, each synced at the moment of contact:
  2025-06-17 home run on a fastball at 3.29 ft  vs  2026-06-03 ground out on a fastball at 3.27 ft
  2025-09-03 home run on a sinker at 2.83 ft    vs  2026-09-25 ground out on a cutter at 3.13 ft

Writes public/media/vlad-same-pitch.gif, .mp4 and a poster .jpg.
Usage: python3 scripts/jays-run-differential/build_gif.py
"""
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLIPS = ROOT / "scripts" / "output" / "clips"
MEDIA = ROOT / "public" / "media"
# The Homebrew ffmpeg is built without drawtext; the imageio-ffmpeg wheel has it.
try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG = shutil.which("ffmpeg")
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
W, H = 480, 270  # each panel
TITLE_H = 48

# (file, seconds before contact to start, panel label, detail line)
PAIRS = [
    [
        ("2025-06-17_hr_ff_3.29ft.mp4", 2.5, "2025  ·  448-foot home run", "Fastball at 3.29 ft  ·  112 mph off the bat at 28°"),
        ("2026-06-03_go_ff99_3.27ft.mp4", 1.7, "2026  ·  ground out to second", "Fastball at 3.27 ft  ·  107 mph off the bat at 2°"),
    ],
    [
        ("2025-09-03_hr_si_2.83ft.mp4", 2.0, "2025  ·  398-foot home run", "Sinker at 2.83 ft  ·  111 mph off the bat at 15°"),
        ("2026-09-25_go_fc_3.13ft.mp4", 1.5, "2026  ·  ground out to short", "Cutter at 3.13 ft  ·  112 mph off the bat at -11°"),
    ],
]
DUR = 6.0


def panel(idx, start, label, detail):
    return (
        f"[{idx}:v]trim=start={start}:duration={DUR},setpts=PTS-STARTPTS,scale={W}:{H},"
        f"drawbox=y=ih-62:h=62:color=black@0.55:t=fill,"
        f"drawtext=fontfile='{BOLD}':text='{label}':x=12:y=h-54:fontsize=19:fontcolor=white,"
        f"drawtext=fontfile='{REG}':text='{detail}':x=12:y=h-28:fontsize=14:fontcolor=white[p{idx}]"
    )


def build():
    MEDIA.mkdir(parents=True, exist_ok=True)
    inputs = []
    parts = []
    i = 0
    stacks = []
    for pair in PAIRS:
        ids = []
        for file, start, label, detail in pair:
            inputs += ["-i", str(CLIPS / file)]
            parts.append(panel(i, start, label, detail))
            ids.append(f"[p{i}]")
            i += 1
        parts.append(f"{''.join(ids)}hstack=inputs=2[s{len(stacks)}]")
        stacks.append(f"[s{len(stacks)}]")
    parts.append(f"{''.join(stacks)}concat=n={len(stacks)}:v=1:a=0,pad=iw:ih+{TITLE_H}:0:{TITLE_H}:color=#faf8f4,"
                 f"drawtext=fontfile='{BOLD}':text='Same pitch height. Same bat speed. Different angle off the bat.':x=(w-tw)/2:y=14:fontsize=22:fontcolor=#1c1a17[v]")
    graph = ";".join(parts)
    script = CLIPS / "graph.txt"
    script.write_text(graph)

    mp4 = MEDIA / "vlad-same-pitch.mp4"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[v]",
                    "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", str(mp4)], check=True)
    gif = MEDIA / "vlad-same-pitch.gif"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp4), "-vf",
                    "fps=12,scale=720:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
                    "-loop", "0", str(gif)], check=True)
    poster = MEDIA / "vlad-same-pitch.jpg"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", "2.2", "-i", str(mp4), "-frames:v", "1", "-q:v", "4", str(poster)], check=True)
    for f in (mp4, gif, poster):
        print(f"{f.stat().st_size / 1e6:5.1f} MB  {f.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
