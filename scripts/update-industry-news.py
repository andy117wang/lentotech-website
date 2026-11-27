"""Publish a dated link digest from public, allowlisted sources."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from email.utils import parsedate_to_datetime
from html import unescape
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urljoin, urlsplit, urlunsplit
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "FDA": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drugs/rss.xml",
    "EMA": "https://www.ema.europa.eu/en/news.xml",
    "NMPA": "https://english.nmpa.gov.cn/news.html",
    "BioSpace": "https://www.biospace.com/all-news.rss",
}
NMPA_ROW = re.compile(
    r'<h3\s+class="list-tit">\s*<a\s+href="([^"]+)">([^<]+)</a>\s*</h3>'
    r'\s*<p\s+class="list-date">\s*(\d{4}-\d{2}-\d{2})\s*</p>'
)


def article(source, title, link, day):
    base = SOURCES[source]
    target = urlsplit(urljoin(base, link.strip()))
    title = " ".join(unescape(re.sub(r"<[^>]+>", "", title)).split())
    if (
        target.scheme not in ("https", "http")
        or target.netloc.lower() != urlsplit(base).netloc
        or not target.path.strip("/")
        or not title
    ):
        return None
    clean_link = urlunsplit(("https", target.netloc.lower(), target.path.rstrip("/"), "", ""))
    return dict(source=source, title=title, url=clean_link, date=day.isoformat())


def parse(source, payload):
    if source == "NMPA":
        return [
            item for link, title, day in NMPA_ROW.findall(payload.decode("utf-8"))
            if (item := article(source, title, link, date.fromisoformat(day)))
        ]
    # The publisher feeds use RSS 2.0. Reject DTDs and entity declarations.
    if re.search(rb"<!\s*(DOCTYPE|ENTITY)", payload, re.I):
        raise ValueError("unexpected XML declaration")
    items = []
    for row in ET.fromstring(payload).findall("./channel/item"):
        title, link, stamp = [row.findtext(field, "") for field in ("title", "link", "pubDate")]
        if not all((title, link, stamp)):
            continue
        try:
            day = parsedate_to_datetime(stamp).date()
        except ValueError:
            continue
        item = article(source, title, link, day)
        if item:
            items.append(item)
    return items


def collect(source):
    payload = subprocess.check_output([
        "curl", "--fail", "--silent", "--show-error",
        "--proto", "=https", "--max-time", "25", "--max-filesize", "2000000",
        "--user-agent", "LentoTech-News/1.0 (+https://lentotech.com/news)",
        SOURCES[source],
    ])
    items = parse(source, payload)
    if not items:
        raise ValueError("no dated records parsed")
    return items


def select(edition, archive, batches):
    used = {item["url"] for issue in archive for item in issue["stories"]}
    selected = []
    for source, items in batches.items():
        earliest = edition - timedelta(days=7 if source == "BioSpace" else 30)
        count = 0
        for item in sorted(items, key=lambda row: row["date"], reverse=True):
            if item["url"] in used or not earliest <= date.fromisoformat(item["date"]) <= edition:
                continue
            selected.append(item)
            used.add(item["url"])
            count += 1
            if count == 2:
                break
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", type=date.fromisoformat, default=datetime.now(ZoneInfo("Asia/Shanghai")).date())
    args = parser.parse_args()
    path = ROOT / "industry-news.json"
    archive = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
    if any(issue["date"] == args.date.isoformat() for issue in archive):
        print("The edition already exists.")
        return
    batches = {}
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:
        pending = {source: pool.submit(collect, source) for source in SOURCES}
        for source, future in pending.items():
            try:
                batches[source] = future.result()
                print(f"{source}: {len(batches[source])} dated records")
            except (OSError, ValueError, ET.ParseError, subprocess.CalledProcessError) as exc:
                print(f"Warning: {source}: {exc}", file=sys.stderr)
    if not batches:
        sys.exit("All news sources failed.")
    stories = select(args.date, archive, batches)
    if not stories:
        print("No eligible unpublished stories.")
        return
    archive.append(dict(date=args.date.isoformat(), stories=stories))
    archive.sort(key=lambda issue: issue["date"], reverse=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    print(f"Prepared {args.date} edition with {len(stories)} stories.")


if __name__ == "__main__":
    main()
