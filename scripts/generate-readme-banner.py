#!/usr/bin/env python3
"""Generate docs/assets/readme-banner.png for the GitHub README."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / "docs/assets/mathpilot-icon-512.png"
OUT = ROOT / "docs/assets/readme-banner.png"

W, H = 960, 200
PILLS = ["1,080+ problems", "Local-first", "Calc 1 & 2"]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNSDisplay-Bold.otf" if bold else "/System/Library/Fonts/SFNSDisplay-Regular.otf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), "#0a4a9e")
    draw = ImageDraw.Draw(img)

    top, bottom = (6, 42, 92), (18, 100, 216)
    for y in range(H):
        t = y / (H - 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (W, y)], fill=color)

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(12, W, 32):
        for y in range(12, H, 32):
            od.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, 18))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    draw.arc([W - 150, 30, W - 30, 170], start=210, end=330, fill=(126, 184, 255), width=2)

    icon = Image.open(ICON).convert("RGBA").resize((76, 76), Image.Resampling.LANCZOS)
    img.paste(icon, (32, (H - 76) // 2), icon)

    title = load_font(38, bold=True)
    subtitle = load_font(15)
    tagline = load_font(13)
    pill = load_font(11, bold=True)

    x0 = 128
    draw.text((x0, 44), "MathPilot", fill="#ffffff", font=title)
    draw.text((x0, 88), "Private calculus mastery engine for macOS", fill="#c5dbff", font=subtitle)
    draw.text((x0, 112), "Diagnose · practice · review — no cloud account required", fill="#e3eeff", font=tagline)

    px, py = x0, 148
    for label in PILLS:
        tw = draw.textlength(label, font=pill)
        pw, ph = int(tw) + 22, 24
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=12, fill=(8, 58, 120), outline=(140, 185, 255))
        draw.text((px + 11, py + 5), label, fill="#ffffff", font=pill)
        px += pw + 8

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
