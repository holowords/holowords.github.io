/* Shared "© Hyeran Lee · @holo_words" credit line, dropped at the bottom
   of every tab so it reads identically everywhere instead of being
   re-typed per page. The home tabs (#about / #work / #bookcase) each
   scroll inside their own panel; words.html and book.html scroll their
   own .words-page / .book-page — a copy goes into whichever of those
   exist on the current page. Styling (and the small/faint look, plus the
   dark-background variant for #bookcase and the Book page) lives in
   .site-footer in css/base.css.

   Runs synchronously from the end of <body>, same as nav.js — the DOM is
   already parsed, nothing has painted. */
(() => {
  const TARGETS = ["#about", "#work", "#bookcase", "#community", ".words-page", ".book-page"];

  function build() {
    const footer = document.createElement("footer");
    footer.className = "site-footer";

    const name = document.createElement("span");
    name.textContent = "© Hyeran Lee";

    const sep = document.createElement("span");
    sep.className = "site-footer__sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "·";

    const link = document.createElement("a");
    link.href = "https://www.instagram.com/holo_words/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "@holo_words";

    footer.append(name, sep, link);
    return footer;
  }

  TARGETS.forEach((selector) => {
    const host = document.querySelector(selector);
    if (host) host.appendChild(build());
  });
})();
