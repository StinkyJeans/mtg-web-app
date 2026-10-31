"""
Cuts the dragon's head out of the first frame of the dragon-breath video (frame_001.png of the exported frames: one transparent picture per
frame, made from the video), without the flames around it, and saves it as public/finisher-animation/dragon-breath/dragon-head.png.

The head is dark red; the flames and the glow around it are bright (a lot of green in them). So: keep what is dark/red, keep the biggest pieces,
fill the small gaps inside it (the lava cracks) but not the big gaps (the glow seen between the horns), and soften the edge by a pixel.

    pip install pillow numpy scipy
    python scripts/cut-dragon-head.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
FRAME = ROOT / "finisher-animation-frames" / "dragon-breath" / "frame_001.png"
OUT = ROOT / "public" / "finisher-animation" / "dragon-breath" / "dragon-head.png"
TIP_ROW_PX = 380  # only the part of the frame below this row (the head and what is under it)

a = np.asarray(Image.open(FRAME).convert("RGBA")).astype(np.float32) / 255.0
sub = a[TIP_ROW_PX:, :, :]
g, al = sub[..., 1], sub[..., 3]

dark = (al > 0.5) & (g < 0.40)
dark = ndi.binary_opening(dark, structure=np.ones((3, 3)))
lab, n = ndi.label(dark)
sizes = ndi.sum(dark, lab, range(1, n + 1))
keep = np.zeros_like(dark)
for i, sz in enumerate(sizes):
    if sz > 400:
        keep |= lab == (i + 1)
keep = ndi.binary_closing(keep, structure=np.ones((5, 5)), iterations=2)

# fill only the small gaps (the glowing cracks inside the scales): the big ones are the glow seen between the horns
holes = ndi.binary_fill_holes(keep) & ~keep
hl, hn = ndi.label(holes)
hs = ndi.sum(holes, hl, range(1, hn + 1))
for i, sz in enumerate(hs):
    if sz < 900:
        keep |= hl == (i + 1)
keep = ndi.binary_dilation(keep, structure=np.ones((3, 3)))
mask = ndi.gaussian_filter(keep.astype(np.float32), 0.9)

res = np.zeros_like(sub)
res[..., :3] = sub[..., :3]
res[..., 3] = np.clip(mask * np.clip(al, 0, 1), 0, 1)
ys, xs = np.where(res[..., 3] > 0.05)
img = Image.fromarray((res * 255).astype(np.uint8), "RGBA").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, optimize=True)
print("saved", OUT, img.size, "box", (int(xs.min()), int(ys.min() + TIP_ROW_PX), int(xs.max() + 1), int(ys.max() + 1 + TIP_ROW_PX)))
