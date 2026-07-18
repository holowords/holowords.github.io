/* Work grid data — sorted descending by id (latest first).
   Card titles are no longer stored here: they're filled in at render time from
   the live Drive word list (js/drive-words.js), matched to cards by position —
   see the inline scripts in index.html and work.html.
   Card colors are all grayscale, varying only in lightness. */

/* Lightness (%) per card, id 15 down to -16 — alternated so neighboring
   cards contrast rather than forming a plain gradient. */
const GRAY_LIGHTNESS = [
  90, 25, 60, 15, 75, 35, 55, 20,
  45, 85, 30, 70, 18, 50, 80, 40,
  65, 22, 78, 33, 58, 12, 88, 42,
  28, 68, 48, 15, 82, 38, 62, 24,
];

function toGray(lightness) {
  return {
    bg: `hsl(0, 0%, ${lightness}%)`,
    color: lightness >= 55 ? "#1a1a1a" : "#f5f5f5",
  };
}

const WORK_IDS = Array.from({ length: 32 }, (_, i) => 15 - i);

const WORK_ITEMS = WORK_IDS.map((id, i) => ({
  id,
  ...toGray(GRAY_LIGHTNESS[i]),
}));
