#!/usr/bin/env python3
"""Regenerates js/bookcase-data.js from the "책장" Notion database.

Run manually after adding a book in Notion:
    python3 scripts/generate_bookcase_data.py

Also run automatically on a schedule by
.github/workflows/update-bookcase-data.yml, so adding a book in Notion is
normally the only step needed.

Notion has no public read API a static site could call at runtime, so this
script uses the same *unauthenticated* internal endpoints Notion's own web
client uses to render a page that's been shared "publish to web" —
no token needed, but also nothing to configure if the workspace ever
changes: the four IDs below just come from that one specific view.

Cheap fields (author/genre/dates/memo) are re-read from Notion on every
run. Expensive per-book work — downloading the cover, sampling its accent
color, and looking up the real page count on Aladin — only runs for books
this script hasn't seen before (matched by title against the existing
js/bookcase-data.js), so a scheduled run without any new books is fast and
doesn't re-hit Aladin for books already resolved.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "js" / "bookcase-data.js"
COVERS_DIR = ROOT / "image" / "bookcase"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# Identifies the specific Notion database + view this reads (the "1년
# 책장" unfiltered list view of the "책장" database) — found once by
# inspecting the real requests the Notion web client makes for that page,
# and stable as long as that view isn't deleted/recreated in Notion.
SPACE_ID = "4906ea2a-944b-44a9-a8a1-efa413ab1610"
COLLECTION_ID = "2b3498ea-6754-83f7-a09f-079b11a2ac4e"
COLLECTION_VIEW_ID = "ffc498ea-6754-8360-a4c1-88d731472075"
COLLECTION_VIEW_BLOCK_ID = "a74498ea-6754-83b1-828b-013a6d13ca62"

# Notion property IDs (schema keys) for the "월별 아카이브" database's columns.
PROP_DATE_RANGE = ":pQ<"
PROP_AUTHOR = "qgDK"
PROP_GENRE = "{ayx"

TARGET_ASPECT = 612 / 919  # matches the interior book page box (see js/bookcase.js)


def fetch(url, body=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8") if body is not None else None,
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def rich_text(arr):
    if not arr:
        return ""
    parts = []
    for item in arr:
        if isinstance(item, list) and item and isinstance(item[0], str):
            parts.append(item[0])
    return "".join(parts)


def query_collection():
    data = fetch(
        "https://app.notion.com/api/v3/queryCollection?src=initial_load",
        {
            "collectionView": {"id": COLLECTION_VIEW_ID, "spaceId": SPACE_ID},
            "collectionViewBlock": {"id": COLLECTION_VIEW_BLOCK_ID, "spaceId": SPACE_ID},
            "clientType": "notion_app",
            "userTimeZone": "Asia/Seoul",
            "isFullScreen": False,
            "isMobile": False,
        },
    )
    ids = data["result"]["reducerResults"]["collection_group_results"]["blockIds"]
    block_map = data["recordMap"]["block"]

    books = []
    for bid in ids:
        b = block_map.get(bid)
        if not b:
            continue
        val = b["value"]["value"]
        props = val.get("properties", {})
        title = rich_text(props.get("title"))
        if not title.strip():
            continue
        author = rich_text(props.get(PROP_AUTHOR)) or None
        genre_raw = rich_text(props.get(PROP_GENRE)) or ""
        genre = [g.strip() for g in genre_raw.split(",") if g.strip()]
        start_date = end_date = None
        daterange = props.get(PROP_DATE_RANGE)
        if daterange:
            try:
                dd = daterange[0][1][0][1]
                start_date = dd.get("start_date")
                end_date = dd.get("end_date")
            except Exception:
                pass
        books.append(
            {
                "id": bid,
                "title": title.strip(),
                "author": author.strip() if author else None,
                "genre": genre,
                "startDate": start_date,
                "endDate": end_date,
                "content": val.get("content", []) or [],
            }
        )
    return books


def sync_record_values(ids):
    if not ids:
        return {}
    reqs = [{"id": i, "table": "block", "version": -1} for i in ids]
    data = fetch("https://app.notion.com/api/v3/syncRecordValues", {"requests": reqs})
    return data.get("recordMap", {}).get("block", {})


def crawl_blocks(seed_ids):
    all_blocks = {}
    seen = set()
    frontier = set(seed_ids)
    for _ in range(8):
        frontier -= seen
        if not frontier:
            break
        fetched = sync_record_values(list(frontier))
        seen |= frontier
        next_frontier = set()
        for bid, b in fetched.items():
            all_blocks[bid] = b
            if not b:
                continue
            val = b.get("value", {}).get("value", {})
            for cid in val.get("content", []) or []:
                if cid not in seen:
                    next_frontier.add(cid)
        frontier = next_frontier
    return all_blocks


def find_image_and_memo(content_ids, blocks):
    """Each book page has two tiers of text: the personal reflection (a
    "quote"-type block sitting next to the cover image) and, separately, a
    toggle block — titled "문장 수집" on most books, "줄거리" on a few —
    whose children are individual sentences copied out of the book itself.
    Rendered differently (see .bookcase-panel__quote), so they're kept as
    two separate lists rather than one flattened memo string. Which toggle
    label doesn't matter; anything inside *any* toggle here is a collected
    sentence, anything outside one is the reflection. """
    images, reflection, quotes = [], [], []

    def clean(strings):
        # A handful of Notion blocks have a stray lone "\" left over from
        # some past edit (an escape character with nothing after it) — drop
        # those, they're not meant to be visible content.
        return [s.strip() for s in strings if s.strip() and s.strip() != "\\"]

    def walk(ids, in_toggle):
        for cid in ids:
            blk = blocks.get(cid)
            if not blk:
                continue
            val = blk["value"]["value"]
            t = val.get("type")
            props = val.get("properties", {})
            if t == "image":
                src = rich_text(props.get("source"))
                file_ids = val.get("file_ids", [])
                if src:
                    images.append({"url": src, "blockId": cid, "fileIds": file_ids})
            still_in_toggle = in_toggle or t == "toggle"
            title_text = rich_text(props.get("title"))
            if t in ("quote", "text", "paragraph", "callout") and title_text.strip():
                (quotes if in_toggle else reflection).append(title_text)
            walk(val.get("content", []) or [], still_in_toggle)

    walk(content_ids, False)
    memo = "\n\n".join(clean(reflection)) or None
    quote_list = clean(quotes) or None
    return (images[0] if images else None), memo, quote_list


def resolve_signed_urls(pending):
    """pending: list of {url, blockId} using the 'attachment:...' scheme."""
    if not pending:
        return {}
    body = {
        "urls": [
            {"url": p["url"], "permissionRecord": {"table": "block", "id": p["blockId"]}}
            for p in pending
        ]
    }
    data = fetch("https://app.notion.com/api/v3/getSignedFileUrls", body)
    signed = data.get("signedUrls", [])
    return {p["blockId"]: url for p, url in zip(pending, signed)}


def slugify(title):
    s = re.sub(r"[^0-9A-Za-z가-힣]+", "-", title).strip("-")
    return s[:80] or "book"


def download_image(url, dest_path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    dest_path.write_bytes(data)


def extract_spine_color(path):
    from PIL import Image
    import colorsys
    from collections import Counter as _Counter

    im = Image.open(path).convert("RGB")
    im.thumbnail((120, 200))
    w, h = im.size
    counter = _Counter()
    for y in range(h):
        for x in range(w):
            r, g, b = im.getpixel((x, y))
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if ll > 0.92 or ll < 0.08 or ss < 0.18:
                continue
            key = (r // 16 * 16, g // 16 * 16, b // 16 * 16)
            counter[key] += 1
    if not counter:
        return None
    best, best_score = None, -1
    for (r, g, b), cnt in counter.items():
        _, _, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        score = cnt * (0.5 + ss)
        if score > best_score:
            best_score, best = score, (r, g, b)
    return "#%02x%02x%02x" % best


def normalize(s):
    return re.sub(r"[^0-9A-Za-z가-힣]", "", s or "")


def lookup_page_count(title, author):
    first_author = re.split(r"[ ,·외]", (author or "").strip())[0]
    norm_title = normalize(title)
    norm_author = normalize(first_author)
    url = "https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=" + urllib.parse.quote(
        title
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return None
    ids = []
    for m in re.finditer(r"ItemId=(\d+)", html):
        if m.group(1) not in ids:
            ids.append(m.group(1))
    for item_id in ids[:8]:
        try:
            req = urllib.request.Request(
                f"https://www.aladin.co.kr/shop/wproduct.aspx?ItemId={item_id}",
                headers={"User-Agent": UA},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                phtml = resp.read().decode("utf-8", errors="ignore")
        except Exception:
            continue
        mt = re.search(r'"og:title" content="([^"]*)"', phtml)
        og_title = mt.group(1) if mt else ""
        norm_og = normalize(og_title)
        if norm_title not in norm_og:
            continue
        if norm_author and norm_author not in norm_og:
            continue
        m = re.search(r"([0-9]{2,4})쪽", phtml)
        if m:
            return int(m.group(1))
    return None


def load_existing():
    if not DATA_FILE.exists():
        return {}
    src = DATA_FILE.read_text(encoding="utf-8")
    m = re.search(r"const BOOKCASE_ITEMS = (\[.*\]);", src, re.S)
    if not m:
        return {}
    items = json.loads(m.group(1))
    return {b["title"]: b for b in items}


def process_book(book, existing_by_title, blocks):
    title = book["title"]
    prior = existing_by_title.get(title)

    image_block, memo, quotes = find_image_and_memo(book["content"], blocks)

    cover_path = prior.get("cover") if prior else None
    spine_color = prior.get("spineColor") if prior else None
    pages = prior.get("pages") if prior else None

    if not prior:
        # New book — run the expensive one-time pipeline.
        if image_block:
            url = image_block["url"]
            if url.startswith("attachment:") and image_block["fileIds"]:
                signed = resolve_signed_urls([{"url": url, "blockId": image_block["blockId"]}])
                url = signed.get(image_block["blockId"], url)
            if not url.startswith("attachment:"):
                ext = ".png" if ".png" in url.split("?")[0].lower() else ".jpg"
                slug = slugify(title)
                COVERS_DIR.mkdir(parents=True, exist_ok=True)
                dest = COVERS_DIR / f"{slug}{ext}"
                try:
                    download_image(url, dest)
                    cover_path = f"image/bookcase/{slug}{ext}"
                except Exception as e:
                    print(f"  ! cover download failed for {title}: {e}", file=sys.stderr)

        if cover_path:
            # Pad to the interior-page aspect ratio (mirror-extend, not a
            # flat edge-color fill — see the book.js cover-letterboxing fix
            # this was cloned from) so the shelf never letterboxes it.
            try:
                from PIL import Image
                import numpy as np

                full_path = ROOT / cover_path
                im = Image.open(full_path).convert("RGB")
                w, h = im.size
                target_w = round(h * TARGET_ASPECT)
                if target_w > w:
                    arr = np.array(im)
                    pad_total = target_w - w
                    pad_left = pad_total // 2
                    pad_right = pad_total - pad_left
                    padded = np.pad(arr, ((0, 0), (pad_left, pad_right), (0, 0)), mode="reflect")
                    Image.fromarray(padded).save(full_path, quality=95)
            except Exception as e:
                print(f"  ! aspect padding failed for {title}: {e}", file=sys.stderr)

            spine_color = extract_spine_color(ROOT / cover_path)

        pages = lookup_page_count(title, book["author"])
        time.sleep(0.4)  # be polite to Aladin
        print(f"  + new book: {title} (pages={pages}, spineColor={spine_color})")

    return {
        "title": title,
        "author": book["author"],
        "genre": book["genre"],
        "startDate": book["startDate"],
        "endDate": book["endDate"],
        "cover": cover_path,
        "pages": pages,
        "memo": memo,
        "quotes": quotes,
        "spineColor": spine_color,
    }


HEADER = """/* Books read, sourced from a private "책장" Notion database (notion.so —
   one page per book: title/author/genre/dates as properties, cover image
   + a personal memo as the page body).

   This file is generated — do not hand-edit it. Add a book in Notion and
   .github/workflows/update-bookcase-data.yml regenerates and commits this
   file automatically on its schedule (or run
   scripts/generate_bookcase_data.py yourself for an immediate local
   update). Cover images are downloaded into image/bookcase/ rather than
   hotlinked, since Notion's own file URLs are signed and expire. `memo`
   is the personal reflection text; `quotes` is a separate array of
   sentences copied out of the book itself (Notion's own "문장 수집"
   toggle) — kept apart since js/bookcase.js renders them in a distinct
   style. Both are null when Notion has nothing written yet for that part.
   `spineColor` is sampled from each book's own cover art (no real spine
   photos exist for these editions) and `pages` is that edition's real
   page count scraped from a title+author-validated Aladin listing — both
   are only looked up once per book (see the script) and then carried
   forward, so re-running this doesn't keep re-hitting Aladin for books it
   already resolved. */
const BOOKCASE_ITEMS = """


def main():
    print("Fetching book list from Notion...")
    books = query_collection()
    print(f"  {len(books)} books in the database")

    existing_by_title = load_existing()

    print("Crawling page content (covers + memos)...")
    seed_ids = []
    for b in books:
        seed_ids.extend(b["content"])
    blocks = crawl_blocks(seed_ids)

    results = []
    for book in books:
        results.append(process_book(book, existing_by_title, blocks))

    content = HEADER + json.dumps(results, ensure_ascii=False, indent=2) + ";\n"

    if DATA_FILE.exists() and DATA_FILE.read_text(encoding="utf-8") == content:
        print("js/bookcase-data.js already up to date")
        return 0

    DATA_FILE.write_text(content, encoding="utf-8")
    print(f"wrote {len(results)} books to {DATA_FILE.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
