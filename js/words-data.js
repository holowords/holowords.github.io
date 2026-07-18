/* Word items are fetched live from Google Drive at render time (see js/words.js).
   Grouping helpers below turn that flat list into { ㄱ: [...], ㄴ: [...], ... }. */

const CONSONANT_ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const CHO_TABLE = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CHO_TO_GROUP = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };

function getInitialConsonant(text) {
  /* Google Drive returns Korean filenames as NFD (decomposed jamo) rather
     than the precomposed syllables this table expects — normalize first
     or every title silently fails to match and drops out of the list. */
  const ch = text.trim().normalize("NFC").charAt(0);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const cho = CHO_TABLE[Math.floor(code / 588)];
  return CHO_TO_GROUP[cho] || cho;
}

/* Groups WORD_ITEMS into { ㄱ: [...], ㄴ: [...], ... } following CONSONANT_ORDER. */
function groupWordsByConsonant(items) {
  const groups = {};
  items.forEach((item) => {
    const key = getInitialConsonant(item.title);
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}
