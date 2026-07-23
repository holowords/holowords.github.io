/* Book page images — rendered from image/Book/책 내지.pdf (136 pages, spreads
   split into individual left/right pages) and cropped from
   image/Book/책 표지_펼친것.jpg (front/back cover).
   Sequence: front cover → 270 interior pages → back cover. */
const BOOK_COVER_CLOSED = "image/Book/cover-closed.png";

const BOOK_PAGES = [
  "image/Book/cover-front.jpg",
  ...Array.from({ length: 270 }, (_, i) => `image/Book/pages-single/${String(i + 1).padStart(4, "0")}.jpg`),
  "image/Book/cover-back.jpg",
];
