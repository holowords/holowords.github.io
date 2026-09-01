/* The nav's actual links, injected here instead of duplicated as static
   HTML in index.html/words.html/book.html — three copies had already
   drifted out of sync with each other more than once (a stale label, a
   missing hash) over the course of small nav tweaks. Runs synchronously,
   before DOMContentLoaded, since this <script> tag sits at the end of
   <body> (after the empty <nav id="site-nav">) — the DOM is already
   parsed and nothing has painted yet, so this replaces "static markup"
   with "identical markup from one source" rather than causing a visible
   flash. Every href points at index.html explicitly (even the panel links,
   which nav.js below always intercepts with preventDefault() anyway) so
   the same string is correct regardless of which page it's mounted on. */
(() => {
  const mount = document.getElementById("site-nav");
  if (!mount) return;
  mount.innerHTML = `
    <div class="site-nav__links">
      <a href="index.html#about" data-nav="about" id="nav-holo-words" aria-label="holo words">
        <img class="site-nav__logo" src="image/Logo/로고_2.png" alt="holo words" />
      </a>
      <a href="index.html#about-intro" data-nav="about" id="nav-about">about</a>
      <a href="words.html" data-nav="words">words</a>
      <a href="index.html#work" data-nav="work">work</a>
      <a href="book.html" data-nav="book">book</a>
      <a href="index.html#bookcase" data-nav="bookcase">book case</a>
    </div>
  `;
})();

/* Shared nav behavior: highlight the active menu item. */
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".site-nav a");
  const page = document.body.dataset.page;

  /* The menubar "holo words" mark is a random planet from image/Logo/
     (every file except 0_로고_메뉴바.png) — a fresh one on every page load
     and on every nav click, on every page. The next image is prefetched so
     the swap never flashes a half-loaded frame. */
  (() => {
    const logo = document.querySelector("#nav-holo-words .site-nav__logo");
    if (!logo) return;
    const MARKS = [
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
    let currentMark = null;
    let nextMark = null;

    function pickMark() {
      if (MARKS.length < 2) return MARKS[0];
      let src;
      do {
        src = MARKS[Math.floor(Math.random() * MARKS.length)];
      } while (src === currentMark);
      return src;
    }

    function primeMark() {
      const cand = pickMark();
      const img = new Image();
      img.onload = img.onerror = () => { nextMark = cand; };
      img.src = cand;
    }

    function rollMark() {
      const src = nextMark || pickMark();
      logo.src = src;
      currentMark = src;
      nextMark = null;
      primeMark();
    }

    primeMark();
    rollMark();
    navLinks.forEach((link) => link.addEventListener("click", rollMark));
  })();

  if (page === "words" || page === "book") {
    navLinks.forEach((link) => {
      if (link.dataset.nav === page) link.classList.add("active");
    });
    return;
  }

  /* Home page: About / Work / bookcase are tabs, not scroll-stacked
     sections — only one is ever visible, switched by clicking nav links
     (or landing on a #hash), never by scrolling past one into the next. */
  const panelIds = ["about", "work", "bookcase"];
  const panels = panelIds.map((id) => document.getElementById(id)).filter(Boolean);

  if (!panels.length) return;

  const homeLink = document.getElementById("nav-holo-words");
  const aboutLink = document.getElementById("nav-about");
  const aboutPanel = document.getElementById("about");
  const aboutIntro = document.getElementById("about-intro");

  /* "holo words" and "About" both point at the #about panel, so it alone
     being active doesn't say which of the two should look pressed —
     aboutSubId picks between them. Defaults to "holo words" (the hero,
     About's actual first screen) whenever the panel becomes active by any
     route other than explicitly clicking "About" itself: initial load,
     a #hash landing, back/forward — none of those should leave "About"
     looking pressed when the hero is what's actually on screen. */
  function showPanel(id, aboutSubId) {
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
    navLinks.forEach((link) => {
      if (link === homeLink || link === aboutLink) return; // handled below instead
      link.classList.toggle("active", link.dataset.nav === id);
    });
    if (homeLink) homeLink.classList.toggle("active", id === "about" && aboutSubId !== "nav-about");
    if (aboutLink) aboutLink.classList.toggle("active", id === "about" && aboutSubId === "nav-about");
    // Mobile-only (see .nav-search-wrap's media query): the search bar only
    // makes sense next to holo words/About, Words, Work — bookcase has its
    // own dark full-bleed layout with no room for it.
    document.body.classList.toggle("mobile-search-hidden", id === "bookcase");
  }

  /* "About" links to #about-intro (not #about) specifically so that
     intent survives a real page load — clicking it from words.html or
     book.html is a full navigation to index.html#about-intro, not a JS
     click handler, so whatever showPanel(panelFromHash()) decides on load
     is the only thing that determines which of "holo words" / "About"
     ends up looking pressed. Without a distinct hash, that click and a
     plain #about landing (holo words, or any bare link into the page)
     would be indistinguishable, and always fell back to "holo words". */
  function routeFromHash() {
    const hash = location.hash.slice(1);
    if (hash === "about-intro") return { panel: "about", aboutSub: "nav-about" };
    if (panelIds.includes(hash)) return { panel: hash, aboutSub: "nav-holo-words" };
    return { panel: "about", aboutSub: "nav-holo-words" };
  }

  function showRoute(route) {
    showPanel(route.panel, route.aboutSub);
    if (route.panel === "about" && aboutPanel && aboutIntro) {
      aboutPanel.scrollTop = route.aboutSub === "nav-about" ? aboutIntro.offsetTop : 0;
    }
  }

  showRoute(routeFromHash());

  navLinks.forEach((link) => {
    const id = link.dataset.nav;
    if (!panelIds.includes(id)) return; // Words/Book links navigate to another page as-is.
    if (link === homeLink || link === aboutLink) return; // each drives showPanel itself, below.
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
      showPanel(id);
      // Left focused, the just-clicked link shows a stray browser focus
      // ring across the panel that just appeared — drop focus once the
      // click is handled, same as the Book index links.
      link.blur();
    });
  });

  window.addEventListener("popstate", () => showRoute(routeFromHash()));

  /* Always jumps back to the hero at the top of #about's own internal
     scroll — unlike "About" (below), which jumps to .about-intro instead,
     since that's the same persistent element either way, not reloaded on
     every tab switch. */
  if (homeLink && aboutPanel) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (location.hash !== "#about") history.pushState(null, "", "#about");
      showPanel("about", "nav-holo-words");
      aboutPanel.scrollTop = 0;
      homeLink.blur();
    });
  }

  /* Jumps straight to .about-intro (the welcome/body copy screen) instead
     of the hero — that's what "holo words" is for (see above). offsetTop
     is relative to #about itself (its position:relative makes it the
     offsetParent for direct children like .about-intro), so this is
     exactly the scroll distance from the hero down to it. Pushes
     #about-intro, not #about — see routeFromHash for why that distinction
     has to survive a real page navigation. */
  if (aboutLink && aboutPanel && aboutIntro) {
    aboutLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (location.hash !== "#about-intro") history.pushState(null, "", "#about-intro");
      showPanel("about", "nav-about");
      aboutPanel.scrollTop = aboutIntro.offsetTop;
      aboutLink.blur();
    });
  }

  /* Plain wheel/trackpad scrolling past the hero (no click at all) should
     hand the underline over to "About" too, the same way clicking it
     would — otherwise "holo words" stays highlighted after the user has
     already scrolled themselves onto .about-intro. Watches .about-intro's
     own visibility within #about's scroll area rather than reading
     scrollTop on every scroll event. */
  if (homeLink && aboutLink && aboutPanel && aboutIntro) {
    const heroScrollObserver = new IntersectionObserver(
      (entries) => {
        // Switching to Work/bookcase hides #about (display:none) rather
        // than disconnecting the observer — its root going invisible still
        // fires a callback (isIntersecting:false), which without this guard
        // reads as "scrolled past the hero" and wrongly re-bolds "holo
        // words" over whatever tab is actually showing.
        if (!aboutPanel.classList.contains("active")) return;
        entries.forEach((entry) => {
          homeLink.classList.toggle("active", !entry.isIntersecting);
          aboutLink.classList.toggle("active", entry.isIntersecting);
        });
      },
      { root: aboutPanel, threshold: 0.5 }
    );
    heroScrollObserver.observe(aboutIntro);
  }
});
