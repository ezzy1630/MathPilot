#!/usr/bin/env python3
"""Generate docs/assets/readme-loop.png — learning loop strip for README."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/assets/readme-loop.png"

W, H = 920, 100
STEPS = [
    ("Diagnose", "Find your level"),
    ("Practice", "Work the skill"),
    ("Master", "Evidence builds"),
    ("Review", "FSRS schedules"),
    ("Continue", "One next action"),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/SFNSDisplay-Bold.otf" if bold else "/System/Library/Fonts/SFNSDisplay-Regular.otf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), "#f6f8fb")
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, W - 1, H - 1], radius=12, outline="#d6e4f7", width=1)

    title = load_font(11, bold=True)
    sub = load_font(10)
    arrow = load_font(14, bold=True)

    n = len(STEPS)
    pad = 16
    gap = 18
    box_w = (W - pad * 2 - gap * (n - 1)) // n
    x = pad

    for i, (label, desc) in enumerate(STEPS):
        draw.rounded_rectangle([x, 14, x + box_w, H - 14], radius=10, fill="#ffffff", outline="#c8daf2")
        draw.text((x + 12, 24), label, fill="#0a4a9e", font=title)
        draw.text((x + 12, 44), desc, fill="#5a708a", font=sub)
        if i < n - 1:
            ax = x + box_w + 4
            draw.text((ax, 38), "→", fill="#1264d8", font=arrow)
        x += box_w + gap

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
