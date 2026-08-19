/* Renders the bookcase shelf (see js/bookcase-data.js for BOOKCASE_ITEMS)
   and drives the click-to-open memo panel. */
document.addEventListener("DOMContentLoaded", () => {
  const shelf = document.getElementById("bookcase-shelf");
  const overlay = document.getElementById("bookcase-panel-overlay");
  const panel = document.getElementById("bookcase-panel");
  const panelBody = document.getElementById("bookcase-panel-body");
  const closeBtn = document.getElementById("bookcase-panel-close");
  const zoomInBtn = document.getElementById("bookcase-zoom-in");
  const zoomOutBtn = document.getElementById("bookcase-zoom-out");

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

  /* Tracked so the zoom controls below can rewrite width/height on the fly
     without re-rendering the spines from scratch. */
  const spineEntries = [];

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
        ? Math.max(22, Math.min(82, 14 + book.pages * 0.11))
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

    spineEntries.push({ el: spine, book, baseWidth: width, baseHeightStyle: `${heightJitter.toFixed(1)}%` });
  });

  /* Compact-mode spine width is picked so a full row lands around 70 books
     on desktop / 30 on a narrow viewport (recomputed on resize while
     compact, since that target is a per-viewport count, not a fixed px). */
  function computeCompactScale() {
    const targetPerRow = window.innerWidth <= 640 ? 30 : 70;
    const gap = 2;
    const avgBaseWidth = spineEntries.reduce((sum, e) => sum + e.baseWidth, 0) / spineEntries.length;
    const containerWidth = shelf.clientWidth || window.innerWidth;
    const raw = (containerWidth / targetPerRow - gap) / avgBaseWidth;
    return Math.max(0.1, Math.min(0.6, raw));
  }

  function applyCompact() {
    const scale = computeCompactScale();
    spineEntries.forEach((entry) => {
      const w = Math.max(4, entry.baseWidth * scale);
      entry.el.style.width = `${w.toFixed(1)}px`;
      entry.el.style.height = `${(w * 1.3).toFixed(1)}px`;
    });
  }

  function applyDefault() {
    spineEntries.forEach((entry) => {
      entry.el.style.width = `${entry.baseWidth.toFixed(0)}px`;
      entry.el.style.height = entry.baseHeightStyle;
    });
  }

  let compact = false;
  let resizeTimer = null;

  function setCompact(next) {
    compact = next;
    shelf.classList.toggle("bookcase-shelf--compact", compact);
    if (compact) applyCompact();
    else applyDefault();
    if (zoomInBtn) zoomInBtn.disabled = !compact;
    if (zoomOutBtn) zoomOutBtn.disabled = compact;
  }

  if (zoomInBtn && zoomOutBtn) {
    zoomInBtn.addEventListener("click", () => setCompact(false));
    zoomOutBtn.addEventListener("click", () => setCompact(true));
  }

  window.addEventListener("resize", () => {
    if (!compact) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyCompact, 150);
  });

  /* Search doesn't replace the shelf with a results list — it dims
     everything that doesn't match and outlines what does, so hits stay in
     their normal spot among the rest of the collection. */
  const searchForm = document.getElementById("bookcase-search-form");
  const searchInput = document.getElementById("bookcase-search-input");
  const countEl = document.getElementById("bookcase-count");

  if (countEl) countEl.textContent = `총 ${BOOKCASE_ITEMS.length}권`;

  function applySearch(query) {
    const q = query.trim().toLowerCase();
    let firstMatch = null;
    spineEntries.forEach((entry) => {
      const isMatch = q.length > 0 && entry.book.title.toLowerCase().includes(q);
      entry.el.classList.toggle("bookcase-spine--match", isMatch);
      entry.el.classList.toggle("bookcase-spine--dim", q.length > 0 && !isMatch);
      if (isMatch && !firstMatch) firstMatch = entry.el;
    });
    return firstMatch;
  }

  function scrollToMatch(entryEl) {
    if (entryEl) entryEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  if (searchForm && searchInput) {
    searchInput.addEventListener("input", () => scrollToMatch(applySearch(searchInput.value)));
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      scrollToMatch(applySearch(searchInput.value));
    });
  }

  function getYear(book) {
    const date = book.startDate || book.endDate;
    return date ? date.slice(0, 4) : null;
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

    if (book.author) {
      const byline = document.createElement("p");
      byline.className = "bookcase-panel__byline";
      byline.textContent = book.author;
      panelBody.appendChild(byline);
    }

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

    /* Sentences copied out of the book itself (Notion's "문장 수집" toggle
       — see scripts/generate_bookcase_data.py), kept visually apart from
       the memo above: smaller and italic, like a handwritten margin note
       next to the reflection rather than more of it. */
    if (book.quotes && book.quotes.length) {
      const quotes = document.createElement("div");
      quotes.className = "bookcase-panel__quotes";
      book.quotes.forEach((line) => {
        const q = document.createElement("p");
        q.className = "bookcase-panel__quote";
        q.textContent = line;
        quotes.appendChild(q);
      });
      panelBody.appendChild(quotes);
    }

    const year = getYear(book);
    if (year) {
      const yearEl = document.createElement("p");
      yearEl.className = "bookcase-panel__year";
      const yearTag = document.createElement("span");
      yearTag.textContent = year;
      yearEl.appendChild(yearTag);
      panelBody.appendChild(yearEl);
    }

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
