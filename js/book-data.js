/* Book page images — rendered from image/Book/책 내지.pdf (136 pages, spreads
   split into individual left/right pages) and cropped from
   image/Book/책 표지_펼친것.jpg (front/back cover).
   Sequence: front cover → 270 interior pages → back cover. */
const BOOK_COVER_CLOSED = "image/Book/책커버_2.png";

const BOOK_PAGES = [
  "image/Book/cover-front.jpg",
  ...Array.from({ length: 270 }, (_, i) => `image/Book/pages-single/${String(i + 1).padStart(4, "0")}.jpg`),
  "image/Book/cover-back.jpg",
];

/* Maps each "오늘의 단어" entry number to its plain gray intro page in
   BOOK_PAGES (number + title only, e.g. "13 하늘") — NOT just "the first
   page with that number", since every entry is actually 4 pages: that
   gray intro page, then one drawing page per collaborator (title suffixed
   "-R"/"-S"/"-J"). The intro page always comes first and sits noticeably
   lower on the sheet than the drawing pages' number, so picking each
   entry's first-in-file-order digit match (extracted from the PDF's text
   layer, not OCR) lands on it correctly. Covers entries 1–80. */
const BOOK_ENTRY_PAGES = {
  1: 5, 2: 9, 3: 13, 4: 17, 5: 21, 6: 25, 7: 29, 8: 33, 9: 37, 10: 41,
  11: 45, 12: 49, 13: 53, 14: 57, 15: 61, 16: 64, 17: 68, 18: 72, 19: 75, 20: 79,
  21: 83, 22: 86, 23: 90, 24: 94, 25: 97, 26: 101, 27: 104, 28: 108, 29: 111, 30: 114,
  31: 117, 32: 121, 33: 124, 34: 128, 35: 132, 36: 136, 37: 140, 38: 144, 39: 148, 40: 151,
  41: 155, 42: 157, 43: 160, 44: 164, 45: 168, 46: 172, 47: 175, 48: 179, 49: 183, 50: 186,
  51: 189, 52: 192, 53: 196, 54: 199, 55: 202, 56: 206, 57: 208, 58: 211, 59: 214, 60: 216,
  61: 218, 62: 220, 63: 222, 64: 225, 65: 227, 66: 229, 67: 232, 68: 235, 69: 239, 70: 243,
  71: 245, 72: 247, 73: 249, 74: 251, 75: 253, 76: 255, 77: 257, 78: 259, 79: 262, 80: 266,
};

/* Each entry's word itself, read straight off its BOOK_ENTRY_PAGES intro
   page (they're not extractable from the image any other way — no OCR/text
   layer for these, unlike the page numbers above). Used for the sitewide
   word count and for exact-title search fallback (see js/words.js) so a
   search for e.g. "고래" can land here even though it's not in the Drive
   word list. */
const BOOK_ENTRY_TITLES = {
  1: "기록", 2: "눈동자", 3: "손", 4: "잠", 5: "먹다", 6: "여행", 7: "결핍", 8: "소리", 9: "커피", 10: "장마",
  11: "문", 12: "멋", 13: "하늘", 14: "맥주", 15: "습기", 16: "기분", 17: "시간", 18: "우연히 코너에서 마주친 것", 19: "습관", 20: "나무",
  21: "부서짐", 22: "여름", 23: "옷", 24: "지하철", 25: "운동", 26: "말", 27: "달", 28: "꽃", 29: "이야기", 30: "어둠",
  31: "비누", 32: "조명", 33: "표정", 34: "우산", 35: "가방", 36: "숫자", 37: "케이크", 38: "환상", 39: "엄마", 40: "화",
  41: "기대다", 42: "양말", 43: "오렌지", 44: "이불", 45: "바람", 46: "밤", 47: "이상함", 48: "무기력", 49: "다정함", 50: "한숨",
  51: "산책", 52: "떨림", 53: "운명", 54: "청소", 55: "새", 56: "말투", 57: "거짓말", 58: "파란색", 59: "종이", 60: "이끼",
  61: "비밀", 62: "밴드", 63: "고래", 64: "지구", 65: "행운", 66: "낙엽", 67: "속눈썹", 68: "귀뚜라미", 69: "차가움", 70: "빵",
  71: "세수", 72: "반짝이는", 73: "소금", 74: "손잡이", 75: "김밥", 76: "김치", 77: "무해하다", 78: "연필", 79: "무지개", 80: "향",
};
