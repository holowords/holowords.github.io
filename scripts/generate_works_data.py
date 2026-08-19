#!/usr/bin/env python3
"""Regenerates js/works-data.js from whatever's actually in image/works/.

Run manually after dropping a new note image in:
    python3 scripts/generate_works_data.py

Also run automatically by .github/workflows/update-works-data.yml on every
push that touches image/works/, so committing an image is normally the only
step needed — no manual JS edit. Filenames must still follow the existing
"메모지_[제목].ext" pattern, and [제목] must exactly match that word's title
on the Words page for the "책에서 보기" link to find it (see index.html).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "image" / "works"
DATA_FILE = ROOT / "js" / "works-data.js"
EXTENSION_RE = re.compile(r"\.(jpg|jpeg|png|webp)$", re.IGNORECASE)

HEADER = """/* Work section — each image in image/works/ IS a sticky note (the note
   design, including its own background color, is baked into the image
   itself), displayed as-is pinned to the wall.

   This file is generated — do not hand-edit the array below. Drop a new
   "메모지_[제목].ext" file into image/works/, commit/push it, and
   .github/workflows/update-works-data.yml regenerates and commits this
   file automatically (or run scripts/generate_works_data.py yourself for
   an immediate local update). Everything past the array is still automatic
   per entry (see index.html): the note's display, its tilt, the lightbox,
   and the "책에서 보기" link to that same word's panel on the Words page
   all derive straight from the filename ("메모지_[제목].ext" → 제목), so a
   new file just needs a matching word to already exist on the Words page. */
"""


def main():
    if not IMAGES_DIR.is_dir():
        print(f"error: {IMAGES_DIR} does not exist", file=sys.stderr)
        return 1

    filenames = sorted(
        (f.name for f in IMAGES_DIR.iterdir() if f.is_file() and EXTENSION_RE.search(f.name)),
        key=lambda name: name.casefold(),
    )

    if not filenames:
        print(f"error: no images found in {IMAGES_DIR}", file=sys.stderr)
        return 1

    lines = [HEADER, "const WORKS_ITEMS = ["]
    for name in filenames:
        escaped = name.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{escaped}",')
    lines.append("];")
    lines.append("")
    content = "\n".join(lines)

    if DATA_FILE.exists() and DATA_FILE.read_text(encoding="utf-8") == content:
        print("js/works-data.js already up to date")
        return 0

    DATA_FILE.write_text(content, encoding="utf-8")
    print(f"wrote {len(filenames)} entries to {DATA_FILE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
