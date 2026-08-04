/* Shared nav behavior: highlight the active menu item. */
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".site-nav a");
  const page = document.body.dataset.page;

  if (page === "words" || page === "book") {
    navLinks.forEach((link) => {
      if (link.dataset.nav === page) link.classList.add("active");
    });
    return;
  }

  /* Home page: About / Work / Contact are tabs, not scroll-stacked
     sections — only one is ever visible, switched by clicking nav links
     (or landing on a #hash), never by scrolling past one into the next. */
  const panelIds = ["about", "work", "contact"];
  const panels = panelIds.map((id) => document.getElementById(id)).filter(Boolean);

  if (!panels.length) return;

  function showPanel(id) {
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === id);
    });
  }

  function panelFromHash() {
    const id = location.hash.slice(1);
    return panelIds.includes(id) ? id : "about";
  }

  showPanel(panelFromHash());

  navLinks.forEach((link) => {
    const id = link.dataset.nav;
    if (!panelIds.includes(id)) return; // Words/Book links navigate to another page as-is.
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

  window.addEventListener("popstate", () => showPanel(panelFromHash()));
});
