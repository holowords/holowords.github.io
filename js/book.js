/* Drives the Book tab: a closed-cover launch state that opens into a real
   page-flip viewer (StPageFlip — drag a corner to turn, like an actual book). */
document.addEventListener("DOMContentLoaded", () => {
  const launch = document.getElementById("book-cover-launch");
  const viewer = document.getElementById("book-viewer");
  const frame = document.getElementById("book-frame");
  const flipEl = document.getElementById("book-flip");
  const prevBtn = document.getElementById("book-prev");
  const nextBtn = document.getElementById("book-next");
  const progress = document.getElementById("book-progress");
  const resetBtn = document.getElementById("book-reset");
  const maskLeft = document.getElementById("book-mask-left");
  const maskRight = document.getElementById("book-mask-right");
  const progressForm = document.getElementById("book-progress-form");
  const progressInput = document.getElementById("book-progress-input");
  const progressTotal = document.getElementById("book-progress-total");

  if (!launch || !viewer || !flipEl) return;

  let pageFlip = null;

  /* In two-page (landscape) mode, StPageFlip renders the front/back cover
     alone on one half of the spread and leaves the other half blank —
     clip that blank half out of the frame (see .book-frame__clip in
     style.css) so only the cover itself shows. Portrait mode already shows
     single pages alone, so this only applies in landscape. */
  function updateCoverMask() {
    const isLandscape = pageFlip.getOrientation() === "landscape";
    const collection = pageFlip.getPageCollection();
    const spread = collection.getSpread()[collection.getCurrentSpreadIndex()];
    const isSinglePage = spread.length === 1;
    frame.classList.toggle("book-frame--cover-front", isLandscape && isSinglePage && spread[0] === 0);
    frame.classList.toggle(
      "book-frame--cover-back",
      isLandscape && isSinglePage && spread[0] === pageFlip.getPageCount() - 1
    );
  }

  function updateControls() {
    const current = pageFlip.getCurrentPageIndex();
    const total = pageFlip.getPageCount();
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current >= total - 1;
    progress.textContent = `${current + 1} / ${total}`;
    progressTotal.textContent = `/ ${total}`;
    progressInput.max = total;
    updateCoverMask();
  }

  /* Clicking the "N / total" label swaps it for a number input so you can
     jump straight to a page instead of stepping through one at a time. */
  function showJumpForm() {
    progressInput.value = pageFlip.getCurrentPageIndex() + 1;
    progress.hidden = true;
    progressForm.hidden = false;
    progressInput.focus();
    progressInput.select();
  }

  function hideJumpForm() {
    progressForm.hidden = true;
    progress.hidden = false;
  }

  progress.addEventListener("click", showJumpForm);

  progressForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const total = pageFlip.getPageCount();
    const target = Math.min(total, Math.max(1, parseInt(progressInput.value, 10) || 1));
    pageFlip.turnToPage(target - 1);
    hideJumpForm();
  });

  progressInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideJumpForm();
  });

  progressInput.addEventListener("blur", hideJumpForm);

  /* StPageFlip sizes its canvas's backing store to its CSS pixel size
     (see the library's resizeCanvas: canvas.width = computed CSS width),
     with no regard for devicePixelRatio — on any Retina/HiDPI screen the
     canvas is then upscaled by the browser and looks soft. Patching the
     canvas's own resizeCanvas to allocate a devicePixelRatio-scaled
     backing store (and scale the 2D context to match) fixes this at the
     source, for the initial render and every later resize alike, since
     the library always calls `this.resizeCanvas()` on itself. */
  function sharpenCanvas() {
    const ui = pageFlip.getUI();
    const canvas = ui.getCanvas();
    ui.resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const style = getComputedStyle(canvas);
      const cssWidth = parseInt(style.getPropertyValue("width"), 10);
      const cssHeight = parseInt(style.getPropertyValue("height"), 10);
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.getContext("2d").scale(dpr, dpr);
    };
    ui.resizeCanvas();
  }

  function initFlipbook() {
    if (pageFlip) return;
    pageFlip = new St.PageFlip(flipEl, {
      width: 500,
      height: 700,
      size: "stretch",
      minWidth: 240,
      maxWidth: 680,
      minHeight: 336,
      maxHeight: 952,
      maxShadowOpacity: 0.5,
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: false,
      flippingTime: 700,
    });
    pageFlip.loadFromImages(BOOK_PAGES);
    sharpenCanvas();
    pageFlip.on("flip", updateControls);
    pageFlip.on("changeOrientation", updateCoverMask);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => pageFlip.turnToPage(pageFlip.getCurrentPageIndex()), 150);
    });
    updateControls();
    pageFlip.turnToPage(0);
  }

  /* flipNext()/flipPrev() drive the same animated page-turn (curl + shadow)
     that dragging a corner does, so the buttons, the cover's blank-area
     click target, and the keyboard all trigger the real gesture instead of
     an instant cut. */
  prevBtn.addEventListener("click", () => pageFlip && pageFlip.flipPrev());
  nextBtn.addEventListener("click", () => pageFlip && pageFlip.flipNext());

  /* The masked blank half of a cover spread (see updateCoverMask) has no
     real page underneath for StPageFlip's own click-to-flip to react to —
     without this it just swallows the click and does nothing. It's only
     interactive while covering the front cover's left side or the back
     cover's right side, and on those spreads there's only one direction
     to go — forward off the front cover, back off the last page — so
     clicking it turns the page the same way clicking the cover itself does. */
  maskLeft.addEventListener("click", () => pageFlip && pageFlip.flipNext());
  maskRight.addEventListener("click", () => pageFlip && pageFlip.flipPrev());

  document.addEventListener("keydown", (e) => {
    if (!viewer.classList.contains("active") || !pageFlip) return;
    if (e.key === "ArrowLeft") pageFlip.flipPrev();
    if (e.key === "ArrowRight") pageFlip.flipNext();
  });

  launch.addEventListener("click", () => {
    launch.hidden = true;
    viewer.classList.add("active");
    initFlipbook();
  });

  resetBtn.addEventListener("click", () => {
    viewer.classList.remove("active");
    launch.hidden = false;
    if (pageFlip) pageFlip.turnToPage(0);
  });
});
