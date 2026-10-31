"""
Cuts the dragon's head out of EVERY frame of the dragon-breath video (the exported frames: one transparent 1264x720 picture per frame, with the green screen already taken out, in finisher-animation-frames/dragon-breath/frame_001.png ...) and packs the cut-outs into one
picture (a sprite sheet) that the game plays like a flip book, so the head moves exactly as it does in the video, without the flames around it.

    pip install pillow numpy scipy
    python scripts/cut-dragon-head-frames.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / "finisher-animation-frames" / "dragon-breath"
OUT = ROOT / "public" / "finisher-animation" / "dragon-breath"
TOP = 380      # only the part of the frame below this row
STEP = 2       # every second frame (24 -> 12 pictures a second)
SCALE = 0.72   # the sheet is a little smaller than the video
COLS = 6

def mask_of(path, prior=None):
    a = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)[TOP:] / 255.0
    r, g, al = a[..., 0], a[..., 1], a[..., 3]
    dark = (al > 0.5) & (g < 0.40)
    # Fire in front of or beside the head (the burst's red flames) is bright, saturated and smooth; the head's scales are darker and full of texture.
    mean = ndi.uniform_filter(r, 9)
    spread = np.sqrt(np.maximum(ndi.uniform_filter(r * r, 9) - mean * mean, 0))
    dark &= ~((r > 0.85) & (spread < 0.10))
    if prior is not None:
        dark &= prior                      # (smoke and sparks away from the head are not the head)
    dark = ndi.binary_opening(dark, structure=np.ones((3, 3)))
    lab, n = ndi.label(dark)
    sizes = ndi.sum(dark, lab, range(1, n + 1))
    keep = np.zeros_like(dark)
    for i, sz in enumerate(sizes):
        if sz > 400:
            keep |= lab == (i + 1)
    keep = ndi.binary_closing(keep, structure=np.ones((5, 5)), iterations=2)
    holes = ndi.binary_fill_holes(keep) & ~keep
    hl, hn = ndi.label(holes)
    for i, sz in enumerate(ndi.sum(holes, hl, range(1, hn + 1))):
        if sz < 900:
            keep |= hl == (i + 1)
    keep = ndi.binary_dilation(keep, structure=np.ones((3, 3)))
    return a, keep

# The head is followed from frame to frame: a frame may only use the places where the head was in the one before (a little roomier), so a puff of
# smoke or a spark that appears out of nowhere beside the head is not mistaken for it. The first frame (a clean one) starts it off.
_, first = mask_of(FRAMES / "frame_001.png")
roomy = ndi.binary_dilation(first, structure=np.ones((3, 3)), iterations=60)  # (and the head never gets far from where it started)
prev = first

names = sorted(FRAMES.glob("frame_*.png"))[::STEP]
cuts, boxes, masks, arrays = [], [], [], []
for p in names:
    prior = ndi.binary_dilation(prev, structure=np.ones((3, 3)), iterations=3) & roomy
    a, keep = mask_of(p, prior)
    # only what is joined to the head's body (the biggest piece) stays
    lab, n = ndi.label(keep)
    if n > 1:
        sizes = ndi.sum(keep, lab, range(1, n + 1))
        keep = lab == (1 + int(np.argmax(sizes)))
    prev = keep
    masks.append(keep)
    arrays.append(a)

# While the burst's flames are all around the head (about the middle of the video), a few of them stick to the horn tips. The head can only be
# where it was just before the flames and just after them (a little roomier), so what is outside that is flames.
LO, HI = 50, 66
for i in range(LO + 2, HI - 1):
    envelope = ndi.binary_dilation(masks[LO] | masks[HI], structure=np.ones((3, 3)), iterations=10)
    keep = masks[i] & envelope
    lab, n = ndi.label(keep)
    if n > 1:
        sizes = ndi.sum(keep, lab, range(1, n + 1))
        keep = lab == (1 + int(np.argmax(sizes)))
    masks[i] = keep

for i, keep in enumerate(masks):
    a = arrays[i]
    mask = ndi.gaussian_filter(keep.astype(np.float32), 0.9)
    rgba = np.zeros_like(a)
    rgba[..., :3] = a[..., :3]
    rgba[..., 3] = np.clip(mask * np.clip(a[..., 3], 0, 1), 0, 1)
    ys, xs = np.where(rgba[..., 3] > 0.05)
    boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    cuts.append(rgba)

x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
w, h = int((x1 - x0) * SCALE), int((y1 - y0) * SCALE)
rows = -(-len(cuts) // COLS)
sheet = Image.new("RGBA", (w * COLS, h * rows), (0, 0, 0, 0))
for i, c in enumerate(cuts):
    cell = Image.fromarray((c[y0:y1, x0:x1] * 255).astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
    sheet.paste(cell, ((i % COLS) * w, (i // COLS) * h))
OUT.mkdir(parents=True, exist_ok=True)
sheet.save(OUT / "dragon-head-sheet.webp", "WEBP", quality=82, method=5)
meta = {"cols": COLS, "rows": rows, "frames": len(cuts), "cellW": w, "cellH": h, "fps": 24 / STEP, "scale": SCALE,
        "box": [int(x0), int(y0 + TOP), int(x1), int(y1 + TOP)], "sheetW": w * COLS, "sheetH": h * rows}
(OUT / "dragon-head-sheet.json").write_text(json.dumps(meta))
print(meta, (OUT / "dragon-head-sheet.webp").stat().st_size // 1024, "KB")
