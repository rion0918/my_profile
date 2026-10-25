"""python3 scripts/build-landmark-font.py /path/to/ZenMaruGothic-Black.ttf

Requires fonttools. Keeps only the glyphs used by the welcome sculpture and Fuwatto sign.
Source and license: components/world/assets/RIOMARU-FONT.md
"""
import hashlib
import json
from pathlib import Path
import sys

from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont


class ThreePen(BasePen):
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.commands = []
        self.start = (0, 0)

    def command(self, name, *points):
        self.commands.append(name)
        self.commands.extend(str(round(n, 2)) for p in points for n in p)

    def _moveTo(self, p):
        self.start = p
        self.command("m", p)

    def _lineTo(self, p):
        self.command("l", p)

    def _qCurveToOne(self, control, end):
        self.command("q", end, control)

    def _curveToOne(self, first, second, end):
        self.command("b", end, first, second)

    def _closePath(self):
        self.command("l", self.start)


source = Path(sys.argv[1])
font = TTFont(source)
glyph_set = font.getGlyphSet()
glyphs = {}
for char in "りおまるふわっと。":
    name = font.getBestCmap()[ord(char)]
    pen = ThreePen(glyph_set)
    glyph_set[name].draw(pen)
    bounds = BoundsPen(glyph_set)
    glyph_set[name].draw(bounds)
    glyphs[char] = {"ha": glyph_set[name].width,
                    "x_min": bounds.bounds[0], "x_max": bounds.bounds[2],
                    "o": " ".join(pen.commands)}

assets = Path(__file__).resolve().parents[1] / "components/world/assets"
data = {
    "familyName": "Riomaru Landmark",
    "glyphs": glyphs,
    "resolution": font["head"].unitsPerEm,
    "ascender": font["hhea"].ascent,
    "descender": font["hhea"].descent,
    "underlineThickness": font["post"].underlineThickness,
    "underlinePosition": font["post"].underlinePosition,
    "boundingBox": {key: getattr(font["head"], key) for key in
                    ("xMin", "xMax", "yMin", "yMax")},
    "originalFont": "Zen Maru Gothic Black",
    "original_font_information": {
        "copyright": font["name"].getDebugName(0),
        "source": "https://github.com/google/fonts/tree/main/ofl/zenmarugothic",
    },
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "license": (assets / "RIOMARU-FONT-OFL.txt").read_text(),
}
for family, chars, filename in [
    ("Riomaru Landmark", "りおまる", "riomaru.typeface.json"),
    ("Fuwatto Hall", "ふわっと。", "fuwatto.typeface.json"),
]:
    subset = {**data, "familyName": family, "glyphs": {char: glyphs[char] for char in chars}}
    output = assets / filename
    output.write_text(json.dumps(subset, ensure_ascii=False, separators=(",", ":")))
    print(f"Generated {output.name}: {output.stat().st_size} bytes")
