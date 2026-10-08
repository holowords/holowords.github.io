/* ----------------------------------------------------------------------
 * Community word field — shared backend.
 *
 * This file is NOT run by GitHub Pages — it's not deployed from this repo
 * at all. Copy its contents into a Google Apps Script project bound to a
 * Google Sheet, deploy that as a Web App, and paste the resulting URL into
 * js/community-config.js's COMMUNITY_CONFIG.scriptUrl. Kept here just so
 * the backend's source lives next to the frontend it serves.
 *
 * Setup:
 *   1. https://sheets.google.com → Blank spreadsheet. Rename it (e.g.
 *      "holoworld community words"). In row 1, put these headers exactly:
 *      timestamp | id | nickname | word | story | logo | x | y | size
 *   2. Extensions → Apps Script. Delete the placeholder code and paste
 *      everything below. Save.
 *   3. Deploy → New deployment → gear icon → "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Deploy, authorize when prompted, then copy the Web app URL.
 *   4. Paste that URL into js/community-config.js as scriptUrl.
 *
 * Requests are plain GET so the browser never needs a CORS preflight:
 *   GET  ?                                    → JSON array of all words
 *   GET  ?action=submit&word=...&story=...    → appends one row
 * ---------------------------------------------------------------------- */

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const params = e.parameter || {};

  if (params.action === "submit") {
    return jsonOutput(handleSubmit(sheet, params));
  }

  return jsonOutput(listWords(sheet));
}

function handleSubmit(sheet, params) {
  const word = String(params.word || "").trim().slice(0, 20);
  const story = String(params.story || "").trim().slice(0, 300);
  if (!word || !story) {
    return { ok: false, error: "word and story are required" };
  }

  const nickname = String(params.nickname || "").trim().slice(0, 20);
  const id = String(params.id || "").trim().slice(0, 60) || Utilities.getUuid();
  const logo = String(params.logo || "").trim();
  const x = clampNumber(params.x, 0, 100, 50);
  const y = clampNumber(params.y, 0, 100, 50);
  const size = clampNumber(params.size, 30, 90, 56);

  sheet.appendRow([new Date().toISOString(), id, nickname, word, story, logo, x, y, size]);
  return { ok: true };
}

function listWords(sheet) {
  const rows = sheet.getDataRange().getValues();
  const words = [];
  // rows[0] is the header row.
  for (let i = 1; i < rows.length; i++) {
    const [, id, nickname, word, story, logo, x, y, size] = rows[i];
    if (!word || !story) continue;
    words.push({
      id: String(id || ""),
      nickname: String(nickname || ""),
      word: String(word),
      story: String(story),
      logo: String(logo || ""),
      x: Number(x),
      y: Number(y),
      size: Number(size),
    });
  }
  return words;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
