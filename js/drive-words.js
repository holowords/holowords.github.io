/* Fetches the live word list from the shared Google Drive folder (js/drive-config.js).
   Shared by words.html (full list) and index.html/work.html (card titles), so both
   stay in sync with whatever is in the Drive folder. */
async function fetchDriveWords() {
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
