/* ---------------------------------------------------------------------- */
/* Community tab — a pan/zoomable field of planet nodes, one per person's  */
/* word, modeled after interpretationleeum.com/ousssmos/. Each node reuses */
/* one of the site's own logo-planet variants (image/Logo/, star included) */
/* rather than a plain dot, so it reads as "your own little planet" the    */
/* same way the nav mark and About's spinning "o" already do.              */
/*                                                                          */
/* This is a static GitHub Pages site with no backend of its own (the      */
/* Words page's images are the one exception, read-only from Drive). To    */
/* make submissions visible to every visitor rather than just the author's */
/* own browser, "나의 단어 남기기" also writes to a Google Sheet through a */
/* Google Apps Script Web App — see js/community-config.js and            */
/* backend/community-words-apps-script.gs. Until that URL is filled in,    */
/* submissions just save to localStorage as before. The nine seed entries  */
/* below are placeholders standing in for real participation.              */
/* ---------------------------------------------------------------------- */
(() => {
  const section = document.getElementById("community");
  const viewport = document.getElementById("community-viewport");
  const field = document.getElementById("community-field");
  if (!section || !viewport || !field) return;

  const LOGOS = [
    "image/Logo/로고_2.png",
    "image/Logo/Artboard 72x.png",
    "image/Logo/Artboard 7 copy2x.png",
    "image/Logo/Artboard 7 copy 22x.png",
    "image/Logo/Artboard 7 copy 32x.png",
    "image/Logo/Artboard 7 copy 42x.png",
    "image/Logo/Artboard 7 copy 52x.png",
    "image/Logo/Artboard 7 copy 62x.png",
    "image/Logo/Artboard 7 copy 72x.png",
    "image/Logo/Artboard 7 copy 82x.png",
    "image/Logo/Artboard 7 copy 92x.png",
    "image/Logo/Artboard 7 copy 102x.png",
    "image/Logo/Artboard 7 copy 112x.png",
    "image/Logo/Artboard 7 copy 122x.png",
    "image/Logo/Artboard 7 copy 132x.png",
    "image/Logo/Artboard 7 copy 142x.png",
    "image/Logo/Artboard 7 copy 152x.png",
    "image/Logo/Artboard 7 copy 162x.png",
    "image/Logo/Artboard 7 copy 172x.png",
    "image/Logo/Artboard 7 copy 182x.png",
  ];

  /* Placeholder entries — nobody has left a word yet, so these stand in for
     real participation until the form below starts collecting some. Fixed
     (not randomized) positions/sizes so the field looks the same on every
     load; only the size varies per entry, the planets themselves stay put. */
  const SEED_WORDS = [
    { nickname: "holo", word: "나만의 서사", story: "아주 조금씩 무엇이든 쌓아간다면 나만의 서사를 쓸 수 있을까.", x: 50, y: 44, size: 68 },
    { nickname: "", word: "다정", story: "서툴러도 다정하게 건넨 말 한마디가 오늘 하루를 버티게 했다.", x: 76, y: 22, size: 54 },
    { nickname: "모모", word: "괜찮아", story: "괜찮다는 말을 나에게 가장 많이 해주고 싶은 요즘이다.", x: 20, y: 30, size: 58 },
    { nickname: "산책자", word: "쉼표", story: "마침표 대신 쉼표를 찍으며 천천히 걸어가 보기로 했다.", x: 85, y: 52, size: 50 },
    { nickname: "노을", word: "온기", story: "차가운 손을 잡아준 그 온기를 오래도록 기억하고 싶다.", x: 14, y: 66, size: 64 },
    { nickname: "둥이", word: "용기", story: "작은 용기 하나가 어제와는 다른 오늘을 만들어 주었다.", x: 62, y: 74, size: 56 },
    { nickname: "별자리", word: "기다림", story: "기다림의 시간도 결국 나를 채워가는 과정이라 믿는다.", x: 37, y: 86, size: 48 },
    { nickname: "라일락", word: "안녕", story: "안녕이라는 인사가 이렇게 다정할 수 있다는 걸 요즘 배운다.", x: 8, y: 46, size: 60 },
    { nickname: "혼자", word: "그러려니", story: "그러려니, 하고 넘기는 연습이 나를 조금 더 자유롭게 해주었다.", x: 90, y: 84, size: 52 },
  ];

  const STORAGE_KEY = "holoCommunityWords";
  const SHARED_SCRIPT_URL = (typeof COMMUNITY_CONFIG !== "undefined" && COMMUNITY_CONFIG.scriptUrl) || "";
  const renderedIds = new Set(); // dedupes a submitter's own optimistic node against that same entry coming back from the shared sheet

  function loadSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (err) {
      return [];
    }
  }

  function persistSaved(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      // Storage full/unavailable (private browsing, etc.) — the entry still
      // renders for this page view, it just won't survive a reload.
    }
  }

  const placed = []; // { x, y } of every node already on the field, for spacing new ones apart

  function pickLogo(avoid) {
    let src;
    do {
      src = LOGOS[Math.floor(Math.random() * LOGOS.length)];
    } while (LOGOS.length > 1 && src === avoid);
    return src;
  }

  function pickPosition() {
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 24; i++) {
      const x = 8 + Math.random() * 84;
      const y = 14 + Math.random() * 76;
      let minDist = Infinity;
      for (const p of placed) {
        const d = Math.hypot(x - p.x, (y - p.y) * 1.4);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestScore) {
        bestScore = minDist;
        best = { x, y };
      }
    }
    return best || { x: 50, y: 50 };
  }

  let lastLogo = null;

  function buildNode(entry) {
    return {
      id: entry.id || null,
      nickname: entry.nickname || "",
      word: entry.word,
      story: entry.story,
      logo: entry.logo,
      x: entry.x,
      y: entry.y,
      size: entry.size,
    };
  }

  function renderNode(node, { enter } = {}) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "community-node" + (enter ? " community-node--enter" : "");
    btn.style.left = node.x + "%";
    btn.style.top = node.y + "%";
    btn.style.setProperty("--node-size", node.size + "px");
    btn.setAttribute("aria-label", `${node.nickname || "익명"}의 단어: ${node.word}`);

    const img = document.createElement("img");
    img.className = "community-node__img";
    img.src = node.logo;
    img.alt = "";
    img.loading = "lazy";
    btn.appendChild(img);

    btn.__communityNode = node; // read back by the pointerup tap-check below (see the pointerdown listener's comment)
    btn.addEventListener("click", () => {
      // Real pointer-driven clicks are resolved in endPointer instead (see
      // its comment); this only ever fires for keyboard activation
      // (Enter/Space on a focused node), which has no pointer event to
      // intercept.
      if (dragMoved) return;
      openWordModal(node);
    });

    field.appendChild(btn);
    placed.push({ x: node.x, y: node.y });
    if (node.id) renderedIds.add(node.id);
    return btn;
  }

  SEED_WORDS.forEach((entry, i) => {
    const node = buildNode({ ...entry, id: `seed-${i}`, logo: LOGOS[i % LOGOS.length] });
    lastLogo = node.logo;
    renderNode(node);
  });

  const saved = loadSaved();
  saved.forEach((entry) => {
    const node = buildNode(entry);
    renderNode(node);
    lastLogo = node.logo;
  });

  /* Shared words from the Google Sheet, layered on top of the instant
     seed+local render above. Skipped entirely (no request at all) when
     SHARED_SCRIPT_URL is empty, i.e. the backend hasn't been set up yet. */
  async function loadSharedWords() {
    if (!SHARED_SCRIPT_URL) return;
    try {
      const res = await fetch(SHARED_SCRIPT_URL, { cache: "no-store" });
      const list = await res.json();
      if (!Array.isArray(list)) return;
      list.forEach((entry) => {
        if (entry.id && renderedIds.has(entry.id)) return;
        const node = buildNode(entry);
        renderNode(node);
        lastLogo = node.logo;
      });
    } catch (err) {
      // Backend unreachable (offline, URL not deployed yet, etc.) — the
      // field still shows seeds + this browser's own local submissions.
    }
  }
  loadSharedWords();

  /* ---------------------------------------------------------------------- */
  /* Pan + zoom — pointer events cover mouse drag, single-finger touch pan, */
  /* and (via the two-pointer branch) pinch zoom all through one code path. */
  /* The dashed grid lives on #community itself and never moves — only this */
  /* field transforms — so panning/zooming never reveals an edge: emptied   */
  /* space is just more of the same "fixed" background showing through.    */
  /* ---------------------------------------------------------------------- */
  const MIN_SCALE = 0.75;
  const MAX_SCALE = 2.4;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let dragMoved = false;

  function applyTransform() {
    field.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampPan(x, y) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const fw = vw * scale;
    const fh = vh * scale;
    const slackX = vw * 0.45;
    const slackY = vh * 0.45;
    const minX = Math.min(0, vw - fw) - slackX;
    const maxX = Math.max(0, vw - fw) + slackX;
    const minY = Math.min(0, vh - fh) - slackY;
    const maxY = Math.max(0, vh - fh) + slackY;
    return [Math.min(maxX, Math.max(minX, x)), Math.min(maxY, Math.max(minY, y))];
  }

  function zoomAt(px, py, nextScale) {
    nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const fx = (px - tx) / scale;
    const fy = (py - ty) / scale;
    scale = nextScale;
    const [cx, cy] = clampPan(px - fx * scale, py - fy * scale);
    tx = cx;
    ty = cy;
    applyTransform();
  }

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, scale * factor);
    },
    { passive: false }
  );

  const pointers = new Map();
  let dragStart = null; // { x, y, tx, ty } captured in page coordinates at the start of a single-finger pan
  let pinchStart = null; // { dist, scale } captured at the start of a two-finger pinch
  let downNode = null; // the .community-node (if any) under the pointer at pointerdown, for the tap-to-open check below

  function currentPoints() {
    return [...pointers.values()];
  }

  /* setPointerCapture (needed so a fast drag past the viewport's edge keeps
     delivering pointermove/up here instead of going silent) also redirects
     the native "click" that would otherwise follow a mouseup — including on
     a node button — away from its target, straight to the viewport. So a
     real click never reaches a node's own click listener (kept below only
     for keyboard activation via Enter/Space, which involves no pointer
     event at all); tapping a node to open its word has to be resolved here
     instead, from the pointerdown/up pair. */
  viewport.addEventListener("pointerdown", (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = false;
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, tx, ty };
      downNode = e.target.closest(".community-node");
      viewport.classList.add("dragging");
    } else if (pointers.size === 2) {
      dragStart = null;
      const [a, b] = currentPoints();
      pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = viewport.getBoundingClientRect();

    if (pointers.size === 2 && pinchStart) {
      const [a, b] = currentPoints();
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      if (Math.abs(dist - pinchStart.dist) > 4) dragMoved = true;
      zoomAt(midX, midY, pinchStart.scale * (dist / pinchStart.dist));
      return;
    }

    if (pointers.size === 1 && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      const [cx, cy] = clampPan(dragStart.tx + dx, dragStart.ty + dy);
      tx = cx;
      ty = cy;
      applyTransform();
    }
  });

  function endPointer(e) {
    const wasSinglePointer = pointers.size === 1;
    pointers.delete(e.pointerId);
    viewport.classList.remove("dragging");

    if (e.type === "pointerup" && wasSinglePointer && pointers.size === 0 && !dragMoved && downNode) {
      openWordModal(downNode.__communityNode);
    }

    if (pointers.size === 1) {
      const [p] = currentPoints();
      dragStart = { x: p.x, y: p.y, tx, ty };
      pinchStart = null;
      downNode = null;
    } else if (pointers.size === 0) {
      dragStart = null;
      pinchStart = null;
      downNode = null;
    }
  }

  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);

  const zoomInBtn = document.getElementById("community-zoom-in");
  const zoomOutBtn = document.getElementById("community-zoom-out");
  if (zoomInBtn && zoomOutBtn) {
    zoomInBtn.addEventListener("click", () => {
      zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, scale * 1.35);
    });
    zoomOutBtn.addEventListener("click", () => {
      zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, scale / 1.35);
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Info ("i") dropdown — same open/close pattern as .work-info.            */
  /* ---------------------------------------------------------------------- */
  const info = document.getElementById("community-info");
  const infoToggle = document.getElementById("community-info-toggle");
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

  /* ---------------------------------------------------------------------- */
  /* Word-detail modal — opened by clicking a planet node.                   */
  /* ---------------------------------------------------------------------- */
  const wordOverlay = document.getElementById("community-word-overlay");
  const wordModal = document.getElementById("community-word-modal");
  const wordClose = document.getElementById("community-word-close");
  const wordPlanet = document.getElementById("community-word-planet");
  const wordNickname = document.getElementById("community-word-nickname");
  const wordWord = document.getElementById("community-word-word");
  const wordStory = document.getElementById("community-word-story");

  function openWordModal(node) {
    wordPlanet.src = node.logo;
    wordNickname.textContent = node.nickname ? node.nickname : "익명";
    wordWord.textContent = node.word;
    wordStory.textContent = node.story;
    wordOverlay.classList.add("open");
    wordModal.classList.add("open");
  }

  function closeWordModal() {
    wordOverlay.classList.remove("open");
    wordModal.classList.remove("open");
  }

  wordClose.addEventListener("click", closeWordModal);
  wordOverlay.addEventListener("click", closeWordModal);

  /* ---------------------------------------------------------------------- */
  /* "나의 단어 남기기" form modal — submissions save to localStorage only   */
  /* (see file header), so they persist on a reload in this browser but     */
  /* never reach other visitors without a real backend.                     */
  /* ---------------------------------------------------------------------- */
  const cta = document.getElementById("community-cta");
  const formOverlay = document.getElementById("community-form-overlay");
  const formModal = document.getElementById("community-form-modal");
  const formClose = document.getElementById("community-form-close");
  const form = document.getElementById("community-form");
  const nicknameInput = document.getElementById("community-form-nickname");
  const wordInput = document.getElementById("community-form-word");
  const storyInput = document.getElementById("community-form-story");
  const countEl = document.getElementById("community-form-count");
  const statusEl = document.getElementById("community-form-status");

  function openFormModal() {
    statusEl.hidden = true;
    formOverlay.classList.add("open");
    formModal.classList.add("open");
    nicknameInput.focus();
  }

  function closeFormModal() {
    formOverlay.classList.remove("open");
    formModal.classList.remove("open");
  }

  cta.addEventListener("click", openFormModal);
  formClose.addEventListener("click", closeFormModal);
  formOverlay.addEventListener("click", closeFormModal);

  storyInput.addEventListener("input", () => {
    countEl.textContent = `${storyInput.value.length} / 300`;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (wordModal.classList.contains("open")) closeWordModal();
    if (formModal.classList.contains("open")) closeFormModal();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const word = wordInput.value.trim();
    const story = storyInput.value.trim();
    if (!word || !story) return;

    const nickname = nicknameInput.value.trim();
    const logo = pickLogo(lastLogo);
    lastLogo = logo;
    const pos = pickPosition();
    const node = buildNode({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nickname,
      word,
      story,
      logo,
      x: pos.x,
      y: pos.y,
      size: 50 + Math.random() * 18,
    });

    const list = loadSaved();
    list.push(node);
    persistSaved(list);

    renderNode(node, { enter: true });

    if (SHARED_SCRIPT_URL) {
      const query = new URLSearchParams({
        action: "submit",
        id: node.id,
        nickname: node.nickname,
        word: node.word,
        story: node.story,
        logo: node.logo,
        x: node.x,
        y: node.y,
        size: node.size,
      });
      // Fire-and-forget: the node above already rendered for this visitor,
      // so a failed/offline write here just means other visitors won't see
      // it yet — nothing in this browser's own experience depends on it.
      fetch(`${SHARED_SCRIPT_URL}?${query.toString()}`, { cache: "no-store" }).catch(() => {});
    }

    form.reset();
    countEl.textContent = "0 / 300";
    statusEl.hidden = false;
    statusEl.textContent = "당신의 단어가 행성에 남겨졌어요.";
    setTimeout(closeFormModal, 900);
  });
})();
