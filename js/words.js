/* Renders the word list (two views: flowing "전체" and indexed "목록") and drives
   the slide-in detail panel. Word items come live from a Google Drive folder
   (js/drive-config.js) — each image's filename (minus extension) is a word title. */
document.addEventListener("DOMContentLoaded", async () => {
  const tabs = document.getElementById("words-tabs");
  const flowView = document.getElementById("words-view-flow");
  const indexView = document.getElementById("words-view-index");
  const indexNav = document.getElementById("words-index");
  const indexContent = document.getElementById("words-index-content");

  const overlay = document.getElementById("word-panel-overlay");
  const panel = document.getElementById("word-panel");
  const panelBody = document.getElementById("word-panel-body");
  const panelTitle = document.getElementById("word-panel-title");
  const panelByline = document.getElementById("word-panel-byline");
  const closeBtn = document.getElementById("word-panel-close");

  const searchForm = document.getElementById("search-box");
  const searchInput = document.getElementById("search-input");
  const wordCount = document.getElementById("word-count");

  flowView.textContent = "불러오는 중...";

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
    flowView.textContent = "구글 드라이브에서 단어를 불러오지 못했습니다.";
    console.error(err);
    return;
  }

  if (query) {
    const q = query.toLowerCase();
    words = words.filter((w) => w.title.toLowerCase().includes(q));
    renderSearchBanner(query, words.length);
  }

  const grouped = groupWordsByConsonant(words);

  flowView.textContent = "";
  if (query && !words.length) {
    flowView.textContent = "일치하는 단어가 없습니다.";
  } else {
    renderFlowView(grouped);
    renderIndexView(grouped);
  }
  setupTabs();

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

    tabs.parentNode.insertBefore(banner, tabs);
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

  function renderFlowView(grouped) {
    CONSONANT_ORDER.forEach((consonant) => {
      const items = grouped[consonant];
      if (!items || !items.length) return;

      const group = document.createElement("section");
      group.className = "words-group";

      const header = document.createElement("h2");
      header.className = "words-group__header";
      header.textContent = consonant;
      group.appendChild(header);
      group.appendChild(buildWordList(items));

      flowView.appendChild(group);
    });
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
      indexLinks.forEach((el) => el.classList.toggle("active", el.textContent === consonant));
    };
    if (available.length) setActiveLink(available[0]);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.querySelector("h2").textContent);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    indexContent.querySelectorAll(".words-group").forEach((el) => observer.observe(el));
  }

  function setupTabs() {
    const tabButtons = tabs.querySelectorAll(".words-tab");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
        const showIndex = btn.dataset.view === "index";
        flowView.hidden = showIndex;
        indexView.hidden = !showIndex;
      });
    });
  }

  let typingTimer = null;

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
