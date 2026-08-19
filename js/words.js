/* Renders the word list (ㄱ~ㅎ index on the left, grouped list on the right) and
   drives the slide-in detail panel. Word items come live from a Google Drive folder
   (js/drive-config.js) — each image's filename (minus extension) is a word title. */
document.addEventListener("DOMContentLoaded", async () => {
  const indexView = document.getElementById("words-view-index");
  const indexNav = document.getElementById("words-index");
  const indexContent = document.getElementById("words-index-content");

  const tabs = document.getElementById("words-tabs");
  const tabViews = {
    all: document.getElementById("words-tab-all"),
    search: document.getElementById("words-tab-search"),
  };
  tabs.querySelectorAll(".words-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.querySelectorAll(".words-tab").forEach((b) => b.classList.toggle("active", b === btn));
      Object.entries(tabViews).forEach(([key, view]) => {
        view.hidden = key !== btn.dataset.tab;
      });
    });
  });

  /* Trapezoid tab: left edge vertical (90°), right edge at `angle` from the
     horizontal (so the horizontal run needed is h / tan(angle)), with the
     top-left corner and the top/diagonal join both rounded — a straight-
     line clip-path polygon can't curve those, so (like before) this is an
     SVG path built from each button's own actual rendered size rather
     than hardcoded once in CSS. The top-right curve is a quadratic bezier
     that uses the original sharp corner as its control point, pulled back
     by `bend` along the top edge and along the diagonal on each side. */
  function shapeTabs() {
    const radius = 8;
    const bend = 9;
    const angle = (60 * Math.PI) / 180;
    tabs.querySelectorAll(".words-tab").forEach((btn) => {
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;
      const cornerX = w - h / Math.tan(angle);
      const bendDX = bend * Math.cos(angle);
      const bendDY = bend * Math.sin(angle);
      const d =
        `M ${radius} 0 L ${cornerX - bend} 0 ` +
        `Q ${cornerX} 0, ${cornerX + bendDX} ${bendDY} ` +
        `L ${w} ${h} L 0 ${h} L 0 ${radius} Q 0 0, ${radius} 0 Z`;
      btn.style.clipPath = `path("${d}")`;
    });
  }
  shapeTabs();

  /* Info popup: click the "i" to drop the description down as a card
     (see .page-info__panel), click elsewhere to close it — same pattern
     as the Work page's info popup (see index.html). */
  const info = document.getElementById("words-info");
  const infoToggle = document.getElementById("words-intro-toggle");
  if (info && infoToggle) {
    infoToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = info.classList.toggle("open");
      infoToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (info.classList.contains("open") && !info.contains(e.target)) {
        info.classList.remove("open");
        infoToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const overlay = document.getElementById("word-panel-overlay");
  const panel = document.getElementById("word-panel");
  const panelBody = document.getElementById("word-panel-body");
  const panelTitle = document.getElementById("word-panel-title");
  const panelByline = document.getElementById("word-panel-byline");
  const closeBtn = document.getElementById("word-panel-close");

  const searchForm = document.getElementById("search-box");
  const searchInput = document.getElementById("search-input");
  const wordCount = document.getElementById("word-count");

  const keywordCloud = document.getElementById("keyword-cloud");
  const keywordResults = document.getElementById("keyword-results");
  const keywordIndexNav = document.getElementById("keyword-index");
  const keywordSummary = document.getElementById("keyword-summary");
  let activeConsonant = null;
  let typingTimer = null;

  /* "키워드로 찾기" tab: each word is actually tagged against this fixed set
     by meaning (see js/words-keywords.js's WORD_KEYWORDS, keyed by title).
     Keywords are multi-select — each additional one narrows the result set
     further (a word must carry every active keyword to stay in the list). */
  const DUMMY_KEYWORDS = ["빛", "소리", "어둠", "색채", "감정", "행동", "사물", "자연", "사람", "시간", "기억"];
  const TAG_PALETTE = [
    { bg: "#fec8c8", color: "#1a1a1a" },
    { bg: "#c8dafe", color: "#1a1a1a" },
    { bg: "#c8fed3", color: "#1a1a1a" },
    { bg: "#feebc8", color: "#1a1a1a" },
    { bg: "#e2c8fe", color: "#1a1a1a" },
    { bg: "#fec8f2", color: "#1a1a1a" },
    { bg: "#c8fef4", color: "#1a1a1a" },
    { bg: "#fff0bc", color: "#1a1a1a" },
    { bg: "#c2efcc", color: "#1a1a1a" },
  ];
  const activeKeywords = new Set();

  /* Score of a single title against a single term: an exact substring match
     wins outright, otherwise more shared characters ranks higher. */
  function scoreTitle(title, term) {
    const q = term.toLowerCase();
    const qChars = Array.from(new Set(Array.from(q)));
    const overlap = qChars.filter((ch) => title.includes(ch)).length;
    const exactBonus = title.includes(q) ? qChars.length + 1 : 0;
    return overlap + exactBonus;
  }

  /* Ranks `list` by how much each title overlaps `term` (see scoreTitle),
     so a title sharing two characters with the term outranks one sharing
     only one, independent of which consonant either starts with. */
  function scoreMatches(term, list) {
    return list
      .map((word) => ({ word, score: scoreTitle(word.title.toLowerCase(), term) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.word);
  }

  indexContent.textContent = "불러오는 중...";

  const query = (new URLSearchParams(location.search).get("q") || "").trim();
  if (query) searchInput.value = query;

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    location.href = q ? `words.html?q=${encodeURIComponent(q)}` : "words.html";
  });

  let words;
  try {
    words = await fetchDriveWords();
    wordCount.textContent = `총 ${words.length}개`;
  } catch (err) {
    indexContent.textContent = "구글 드라이브에서 단어를 불러오지 못했습니다.";
    console.error(err);
    return;
  }

  indexContent.textContent = "";
  const allWords = words;
  renderKeywordCloud();
  renderKeywordIndex();
  runKeywordSearch();

  if (query) {
    /* Search results aren't grouped by ㄱ~ㅎ — they're one flat list, ranked
       by character overlap with the query (see scoreMatches), capped to the
       8 closest matches so an exact/near-exact hit isn't buried under a
       long tail of loosely-related words. */
    words = scoreMatches(query, words).slice(0, 8);
    indexNav.hidden = true;

    if (!words.length) {
      indexContent.textContent = "일치하는 단어가 없습니다.";
    } else {
      indexContent.appendChild(buildWordList(words));
    }
    renderSearchBanner(query, words.length);
  } else {
    const summary = document.createElement("p");
    summary.className = "words-search-banner";
    summary.textContent = `전체 단어 ${words.length}개`;
    indexView.parentNode.insertBefore(summary, indexView);
    renderIndexView(groupWordsByConsonant(words));
  }

  /* Deep link from elsewhere on the site (e.g. the Work wall's "책에서
     보기" — see index.html) straight into one word's detail panel, by
     title rather than page position. */
  const wordParam = (new URLSearchParams(location.search).get("word") || "").trim();
  if (wordParam) {
    const match = allWords.find((w) => w.title === wordParam);
    if (match) openPanel(match);
  }

  /* Deterministic per-chip stagger for the hue-shift animation (see
     .keyword-chip in style.css) — same formula used elsewhere on the site
     for tilt/offset, so chips drift out of sync with each other on every
     load instead of all shifting color in lockstep. */
  function seededRandom(seed) {
    const x = Math.sin(seed * 9973) * 43758.5453;
    return x - Math.floor(x);
  }

  function renderKeywordCloud() {
    DUMMY_KEYWORDS.forEach((keyword, i) => {
      const palette = TAG_PALETTE[i % TAG_PALETTE.length];
      const chip = document.createElement("button");
      chip.className = "keyword-chip";
      chip.type = "button";
      chip.textContent = keyword;
      chip.style.background = palette.bg;
      chip.style.color = palette.color;
      const duration = 3 + seededRandom(i + 1) * 3;
      chip.style.animationDuration = `${duration.toFixed(2)}s`;
      chip.style.animationDelay = `-${(seededRandom(i + 50) * duration).toFixed(2)}s`;
      chip.addEventListener("click", () => {
        if (activeKeywords.has(keyword)) {
          activeKeywords.delete(keyword);
          chip.classList.remove("active");
        } else {
          activeKeywords.add(keyword);
          chip.classList.add("active");
        }
        runKeywordSearch();
      });
      keywordCloud.appendChild(chip);
    });
  }

  /* Same ㄱ~ㅎ index as the "전체단어" tab, but here it's a single-select
     filter (click again to clear) that narrows keyword results by initial
     consonant instead of scrolling to a section. */
  function renderKeywordIndex() {
    const grouped = groupWordsByConsonant(allWords);
    const available = CONSONANT_ORDER.filter((c) => grouped[c] && grouped[c].length);

    available.forEach((consonant) => {
      const link = document.createElement("button");
      link.className = "words-index__link";
      link.type = "button";
      link.textContent = consonant;
      link.addEventListener("click", () => {
        activeConsonant = activeConsonant === consonant ? null : consonant;
        keywordIndexNav.querySelectorAll(".words-index__link").forEach((el) => {
          el.classList.toggle("active", el.textContent === activeConsonant);
        });
        runKeywordSearch();
      });
      keywordIndexNav.appendChild(link);
    });
  }

  /* A word must carry every active keyword (per WORD_KEYWORDS, see
     js/words-keywords.js) and match the active consonant filter if one is
     set, to survive — each extra filter can only shrink the result set,
     never grow it. With nothing selected yet, show every word in the same
     grid so the tab isn't empty. */
  function runKeywordSearch() {
    keywordResults.innerHTML = "";
    const keywords = Array.from(activeKeywords);
    const byConsonant = activeConsonant
      ? allWords.filter((w) => getInitialConsonant(w.title) === activeConsonant)
      : allWords;

    if (!keywords.length) {
      keywordSummary.textContent = activeConsonant
        ? `"${activeConsonant}" 단어 ${byConsonant.length}개`
        : `전체 단어 ${byConsonant.length}개`;
      keywordResults.appendChild(buildWordGrid(byConsonant));
      return;
    }

    const matched = byConsonant.filter((word) => {
      const tags = WORD_KEYWORDS[word.title] || [];
      return keywords.every((kw) => tags.includes(kw));
    });

    const label = activeConsonant ? `${keywords.join(" + ")} · ${activeConsonant}` : keywords.join(" + ");
    keywordSummary.textContent = `"${label}" 결과 ${matched.length}개`;

    if (!matched.length) {
      const empty = document.createElement("p");
      empty.className = "words-placeholder";
      empty.textContent = "일치하는 단어가 없습니다.";
      keywordResults.appendChild(empty);
      return;
    }
    keywordResults.appendChild(buildWordGrid(matched));
  }

  function renderSearchBanner(query, count) {
    const banner = document.createElement("div");
    banner.className = "words-search-banner";

    const text = document.createElement("span");
    text.textContent = `"${query}" 검색 결과 ${count}개`;
    banner.appendChild(text);

    const clear = document.createElement("a");
    clear.className = "words-search-banner__clear";
    clear.href = "words.html";
    clear.textContent = "전체 보기";
    banner.appendChild(clear);

    indexView.parentNode.insertBefore(banner, indexView);
  }

  function buildWordList(items) {
    const list = document.createElement("ul");
    list.className = "words-list";

    items.forEach((word) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "word-item";
      btn.type = "button";

      const marker = document.createElement("span");
      marker.className = "word-item__marker";
      marker.textContent = "○";

      const label = document.createElement("span");
      label.className = "word-item__label";
      label.textContent = word.title;

      btn.appendChild(marker);
      btn.appendChild(label);
      btn.addEventListener("click", () => openPanel(word));
      li.appendChild(btn);
      list.appendChild(li);
    });

    return list;
  }

  /* Card grid (4 per row) showing each word's actual Drive image as a
     thumbnail — used for keyword results, where seeing the image up front
     matters more than scanning a plain title list. */
  function buildWordGrid(items) {
    const grid = document.createElement("div");
    grid.className = "words-grid";

    items.forEach((word) => {
      const card = document.createElement("button");
      card.className = "words-grid__card";
      card.type = "button";

      const imageWrap = document.createElement("span");
      imageWrap.className = "words-grid__image-wrap";

      const img = document.createElement("img");
      img.className = "words-grid__image";
      img.src = word.image;
      img.alt = word.title;
      img.loading = "lazy";
      imageWrap.appendChild(img);

      const caption = document.createElement("span");
      caption.className = "words-grid__caption";
      caption.textContent = word.title;

      card.appendChild(imageWrap);
      card.appendChild(caption);
      card.addEventListener("click", () => openPanel(word));
      grid.appendChild(card);
    });

    return grid;
  }

  function renderIndexView(grouped) {
    const available = CONSONANT_ORDER.filter((c) => grouped[c] && grouped[c].length);

    available.forEach((consonant) => {
      const link = document.createElement("button");
      link.className = "words-index__link";
      link.type = "button";
      link.textContent = consonant;
      link.dataset.target = `index-group-${consonant}`;
      link.addEventListener("click", () => {
        document.getElementById(link.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
      });
      indexNav.appendChild(link);

      const group = document.createElement("section");
      group.className = "words-group";
      group.id = `index-group-${consonant}`;

      const header = document.createElement("h2");
      header.className = "words-group__header";
      header.textContent = consonant;
      group.appendChild(header);
      group.appendChild(buildWordList(grouped[consonant]));

      indexContent.appendChild(group);
    });

    const indexLinks = indexNav.querySelectorAll(".words-index__link");
    const setActiveLink = (consonant) => {
      const activeIndex = available.indexOf(consonant);
      indexLinks.forEach((el, i) => {
        el.classList.toggle("active", el.textContent === consonant);
        /* Consonants scrolled past collapse up and out of the list, so the
           active one settles near the top instead of the list just growing. */
        el.classList.toggle("words-index__link--collapsed", activeIndex > -1 && i < activeIndex);
      });
    };
    if (available.length) setActiveLink(available[0]);

    /* Observing whole .words-group sections (header + its full word list)
       caused the wrong consonant to light up: a long group's box can still
       overlap the trigger band even once the *next* group's header has
       already scrolled up into view, so both fire "intersecting" at once
       and whichever entry lands last in the batch wins — sometimes the
       stale one. Observing just the (small, single-line) headers removes
       that ambiguity entirely. The trigger line itself is pinned to the
       same pixel offset .words-index sticks at (header height + 136px, via
       body's padding-top, which reliably resolves --header-offset to a
       real px value) instead of a viewport percentage, so it lines up with
       where content actually clears the sticky bar on any screen size. */
    const triggerTop = (parseFloat(getComputedStyle(document.body).paddingTop) || 0) + 136;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.textContent);
        });
      },
      { rootMargin: `-${triggerTop}px 0px -70% 0px` }
    );
    indexContent.querySelectorAll(".words-group__header").forEach((el) => observer.observe(el));
  }

  function typeTitle(text) {
    clearInterval(typingTimer);
    panelTitle.textContent = "";
    panelTitle.classList.add("typing");

    const chars = Array.from(text);
    let i = 0;
    typingTimer = setInterval(() => {
      panelTitle.textContent += chars[i];
      i++;
      if (i >= chars.length) {
        clearInterval(typingTimer);
        panelTitle.classList.remove("typing");
      }
    }, 90);
  }

  function openPanel(word) {
    panelBody.innerHTML = "";
    const img = document.createElement("img");
    img.className = "word-panel__image";
    img.src = word.image;
    img.alt = word.title;
    img.loading = "lazy";
    panelBody.appendChild(img);

    typeTitle(word.title);
    panelByline.style.display = "none";
    panel.classList.add("open");
    overlay.classList.add("open");
    panel.scrollTop = 0;
  }

  function closePanel() {
    clearInterval(typingTimer);
    panelTitle.classList.remove("typing");
    panel.classList.remove("open");
    overlay.classList.remove("open");
  }

  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
});
