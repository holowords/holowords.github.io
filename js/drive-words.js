/* Fetches the live word list from the shared Google Drive folder (js/drive-config.js).
   Shared by words.html (full list) and index.html/book.html (nav search +
   count), so all three stay in sync with whatever is in the Drive folder —
   which also means all three re-ran this same paginated fetch on every
   single page load. Session-cached below so navigating between them in one
   visit only hits Drive once. */
const DRIVE_WORDS_CACHE_KEY = "driveWordsCache";
const DRIVE_WORDS_CACHE_TTL = 5 * 60 * 1000; // 5 min — long enough to cover browsing between pages, short enough that a word added to the folder shows up again soon.

async function fetchDriveWords() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(DRIVE_WORDS_CACHE_KEY) || "null");
    if (cached && Date.now() - cached.time < DRIVE_WORDS_CACHE_TTL) return cached.words;
  } catch (err) {
    // Corrupt/unavailable sessionStorage (private browsing, etc.) — fall through to a real fetch.
  }

  const words = await fetchDriveWordsUncached();

  try {
    sessionStorage.setItem(DRIVE_WORDS_CACHE_KEY, JSON.stringify({ time: Date.now(), words }));
  } catch (err) {
    // Storage full/unavailable — the fetch itself still succeeded, so just skip caching it.
  }

  return words;
}

async function fetchDriveWordsUncached() {
  const { folderId, apiKey } = DRIVE_CONFIG;
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  let files = [];
  let pageToken = "";

  do {
    const url =
      `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}` +
      `&fields=nextPageToken,files(id,name)&pageSize=1000&orderBy=name` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    const data = await res.json();
    files = files.concat(data.files || []);
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return files
    .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f.name))
    .map((f) => ({
      title: f.name.replace(/\.[^.]+$/, "").normalize("NFC"),
      /* Two sizes off the same file: `image` is for the small grid card
         (~200px column, see .words-grid), `imageLarge` for the much bigger
         detail-panel view (see openPanel in words.js) — requesting w1600
         for every grid thumbnail was the slow part, since dozens load at
         once but only one panel image ever loads at a time. */
      image: `https://drive.google.com/thumbnail?id=${f.id}&sz=w480`,
      imageLarge: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1200`,
    }));
}
