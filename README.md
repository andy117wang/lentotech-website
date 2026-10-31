# LentoTech website

Static GitHub Pages site for www.lentotech.com. No paid service or build dependency.

## Design and content maintenance

- `design.css` is the shared visual system loaded after the existing `styles.css`.
- All seven HTML pages share News & insights, Products, CDMO services and About navigation.
- Home order: introduction, latest news, pathways, catalog/search, capabilities, technical guide, inquiry.
- `catalog.js` accepts `?q=` for product name/CAS searches; preserve the 72 existing catalog entries and IDs.
- Images are existing illustrative assets, not evidence of LentoTech-owned manufacturing facilities.
- Inquiry prepares an email; it does not submit or deliver mail automatically.

## WorkBuddy news updates

Always fetch current `main` before preparing a news branch. Preserve the shared header, both stylesheet links, product search and section layout. Update only article content inside `.news-list` in `index.html` and `news.html`. Keep homepage excerpts short (normally three); keep the archive in news.html. Preserve dates, source links and English news. Do not replace complete pages from an older checkout. Reconcile old draft PRs against current main before merging. Human editorial approval remains required for news publication.

## Verification — 2026-10-31

JavaScript syntax and local links/assets/anchors checked. Desktop and 400px mobile screenshots visually inspected. Browser-based layout checks cover 320/400/768/1440px across homepage, news, catalog, technical guide and a product detail page. Query search tested with CAS 138112-76-2. No third-party font, animation library or framework added.
