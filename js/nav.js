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

  // Home page: highlight based on which section is in view.
  const sections = ["about", "work", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-50% 0px -49% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
});
