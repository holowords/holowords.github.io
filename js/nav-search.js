/* Wires the fixed nav's search box + word count — shared by index.html and
   book.html (words.html does its own version of this in words.js, since it
   also has to render results, not just redirect to itself). Requires
   drive-words.js, book-data.js, and bookcase-data.js to already be loaded. */
(async () => {
  const searchForm = document.getElementById("search-box");
  const searchInput = document.getElementById("search-input");
  const wordCount = document.getElementById("word-count");
  // Mobile shows the same total next to the menu-bar magnifier (see nav.js).
  const navCount = document.getElementById("nav-search-count");
  if (!searchForm || !searchInput || !wordCount) return;

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    location.href = q ? `words.html?q=${encodeURIComponent(q)}` : "words.html";
  });

  try {
    const words = await fetchDriveWords();
    // Sitewide total: Drive words + Book's 80 entries + every bookcase
    // title (see js/words.js for the matching count on that page).
    const bookCount = typeof BOOK_ENTRY_TITLES !== "undefined" ? Object.keys(BOOK_ENTRY_TITLES).length : 0;
    const bookcaseCount = typeof BOOKCASE_ITEMS !== "undefined" ? BOOKCASE_ITEMS.length : 0;
    const total = `총 ${words.length + bookCount + bookcaseCount}개`;
    wordCount.textContent = total;
    if (navCount) navCount.textContent = total;
  } catch (err) {
    console.error(err);
  }
})();
