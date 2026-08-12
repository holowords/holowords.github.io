/* Renders the bookcase shelf (see js/bookcase-data.js for BOOKCASE_ITEMS)
   and drives the click-to-open memo panel. */
document.addEventListener("DOMContentLoaded", () => {
  const shelf = document.getElementById("bookcase-shelf");
  const overlay = document.getElementById("bookcase-panel-overlay");
  const panel = document.getElementById("bookcase-panel");
  const panelBody = document.getElementById("bookcase-panel-body");
  const closeBtn = document.getElementById("bookcase-panel-close");

  if (!shelf || typeof BOOKCASE_ITEMS === "undefined") return;

  /* Same Math.sin-based pseudo-random used elsewhere on the site (index.html's
     note tilt, words.js's keyword-chip timing) — stable across reloads
     instead of re-rolling every time. */
  function seededRandom(seed) {
    const x = Math.sin(seed * 9973) * 43758.5453;
    return x - Math.floor(x);
  }

  /* spineColor spans everything from near-black to near-white (it's
     sampled straight off each cover), so the title needs a per-spine
     light/dark choice rather than one fixed color. */
  function readableTextColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "rgba(26, 26, 26, 0.85)" : "rgba(255, 255, 255, 0.9)";
  }

  /* One color per genre so the shelf reads as loosely organized by kind,
     the way a real bookcase ends up color-coded by publisher/series. Books
     with more than one genre tag use the first. */
  const GENRE_COLORS = {
    "현대 소설": "#f4c9c9",
    "고전소설": "#f6dfae",
    "에세이": "#cfe6c8",
    "인문/철학": "#c9d9f4",
    "미술 / 디자인": "#e3c9f4",
    "로맨스소설": "#f4c9e3",
    "판타지 / SF": "#c9f4ea",
    "SF소설": "#c9f4ea",
    "독서모임책": "#f4e3a1",
    "소설": "#d9d9d9",
  };
  const DEFAULT_SPINE_COLOR = "#cfcac0";

  BOOKCASE_ITEMS.forEach((book, i) => {
    const spine = document.createElement("button");
    spine.className = "bookcase-spine";
    spine.type = "button";

    /* Spine thickness follows that edition's real page count (scraped
       from Aladin, see js/bookcase-data.js) so it actually tracks how
       thick the physical book is — roughly 200 pages ≈ 14mm of a real
       paperback, scaled up for screen legibility. A handful of editions
       couldn't be confidently matched (`pages` is null there); memo
       length is a reasonable stand-in since a book that earned more
       written reflection tends to be a meatier read anyway. */
    const width =
      book.pages != null
        ? Math.max(22, Math.min(64, 14 + book.pages * 0.11))
        : Math.max(22, Math.min(64, 22 + (book.memo || "").length / 45));
    spine.style.width = `${width.toFixed(0)}px`;

    /* Small per-book height variance so the shelf doesn't look perfectly
       machined — same seeded pattern as the tilt on the Work wall notes. */
    const heightJitter = 78 + (seededRandom(i + 1) - 0.5) * 14;
    spine.style.height = `${heightJitter.toFixed(1)}%`;

    /* Real spine photos aren't available from any bookstore's product
       images (checked) — spineColor (see js/bookcase-data.js) is instead
       sampled from that exact book's own cover art, so the color is at
       least genuinely that book's, not a generic per-genre guess. The
       bevel gradient on top gives the flat color a rounded, printed-spine
       look instead of reading as a solid swatch. */
    const color = book.spineColor || GENRE_COLORS[book.genre[0]] || DEFAULT_SPINE_COLOR;
    spine.style.background =
      "linear-gradient(90deg, rgba(255,255,255,0.32), rgba(255,255,255,0) 12%, " +
      `rgba(0,0,0,0) 88%, rgba(0,0,0,0.28)), ${color}`;

    const title = document.createElement("span");
    title.className = "bookcase-spine__title";
    title.textContent = book.title;
    title.style.color = readableTextColor(color);
    spine.appendChild(title);

    spine.addEventListener("click", () => openPanel(book));
    shelf.appendChild(spine);
  });

  function formatDateRange(book) {
    if (!book.startDate) return "";
    if (!book.endDate || book.endDate === book.startDate) return book.startDate;
    return `${book.startDate} → ${book.endDate}`;
  }

  function openPanel(book) {
    panelBody.innerHTML = "";

    const cover = document.createElement("img");
    cover.className = "bookcase-panel__cover";
    cover.src = book.cover;
    cover.alt = book.title;
    cover.loading = "lazy";
    panelBody.appendChild(cover);

    const title = document.createElement("p");
    title.className = "bookcase-panel__title";
    title.textContent = book.title;
    panelBody.appendChild(title);

    const byline = document.createElement("p");
    byline.className = "bookcase-panel__byline";
    byline.textContent = [book.author, formatDateRange(book)].filter(Boolean).join(" · ");
    panelBody.appendChild(byline);

    const tags = document.createElement("div");
    tags.className = "bookcase-panel__tags";
    book.genre.forEach((g) => {
      const tag = document.createElement("span");
      tag.className = "bookcase-panel__tag";
      tag.textContent = g;
      tags.appendChild(tag);
    });
    panelBody.appendChild(tags);

    const memo = document.createElement("p");
    if (book.memo) {
      memo.className = "bookcase-panel__memo";
      memo.textContent = book.memo;
    } else {
      memo.className = "bookcase-panel__memo bookcase-panel__memo--empty";
      memo.textContent = "아직 남긴 메모가 없어요.";
    }
    panelBody.appendChild(memo);

    panel.classList.add("open");
    overlay.classList.add("open");
    panel.scrollTop = 0;
  }

  function closePanel() {
    panel.classList.remove("open");
    overlay.classList.remove("open");
  }

  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
});
