# LentoTech website

## Unified publishing and feedback workflow (staging)

`manage.html` is the shared operating screen. GitHub stores public content and public uploads with version history. Cloudflare Pages Functions and a private D1 database store customer inquiries; inquiries are never committed to the public GitHub repository. An administrator enters a fine-grained GitHub token restricted to this repository with Contents read/write permission; the feedback endpoint verifies that token against GitHub and checks repository push permission on every administrative request. Verify this permission check with the actual token before use. The token is held only in page memory, so page refresh or closure disconnects the manager.

Deployment requires a Cloudflare Pages project connected to this repository, build command `node build.mjs`, output directory `dist`, and the Functions directory at the repository root. The build renders managed news and products into HTML so they are available without client-side JavaScript. `dist/` is generated and is not committed. Run `node --test tests/*.test.mjs` before deploying. Bind a D1 database as `FEEDBACK_DB`, apply `schema.sql`, create a Turnstile widget for the actual hostnames, and set `TURNSTILE_SITE_KEY` and the secret `TURNSTILE_SECRET` as Pages environment variables. Configure both production and preview deliberately; do not put secrets in the repository. Test a real submission, inbox read and status change in a private staging environment before routing the production domain.

The existing domain currently uses GitHub Pages. Pages Functions do not run there: until the domain is routed to the configured Cloudflare Pages project, the form falls back to composing an email and the inbox is unavailable. Routing or DNS changes should happen only after a complete staging test. The form uses Turnstile server verification; it fails closed if storage or verification is not configured. The inbox displays the newest 200 inquiries, does not send email notifications, and does not automatically delete records. Set an operational retention and backup policy before accepting production data. Protect the GitHub account using two-factor authentication, keep tokens short-lived, and limit who may use the management screen.

Product and news content is search-readable in the built HTML, but ranking and indexing are not guaranteed. Language switching currently occurs client-side and is not a set of independently indexable translations; hreflang declarations were removed until separate translated pages with their own canonical URLs exist. Review actual ownership and authorization before publishing the Shanyuan partner information. The original catalog is migrated into `content.json` so it can be edited in the management screen. The three legacy product detail URLs are generated from the same managed product records, preserving their existing addresses while keeping product information consistent.

## Content management (draft, requires deployment and GitHub token)

The management page can add, edit, remove and reorder extra business areas (rendered on the services page) and capabilities (rendered on the home page). These are additional sections; the pre-existing hard-coded services are not editable in this editor. Module titles and descriptions are currently entered in English and are not automatically translated. Uploaded assets and published content are public. Changes publish through the GitHub build and are not immediate; local drafts remain in the current browser only.

`manage.html` edits `content.json` through the GitHub Contents API. Create a fine-grained token restricted to this repository with Contents read/write permission; enter it directly in the management page. The token remains in page memory only. Manage this token like a password, set an expiry, and revoke it if exposed. The management page is public but publishing requires a valid token. Protect the GitHub account with two-factor authentication.

The editor can manage news and products, update the company introduction, and upload JPG, PNG, WebP, PDF, Markdown and HTML files (up to 5 MB each). Uploads and saved content are public. HTML files are saved as text and served as downloads with script execution disabled; they do not create executable site pages. Markdown files are also served as downloads. Review factual claims, rights and documents before publishing. Uploaded files receive a generated link; paste it into a product image or company profile field and save the content. The upload and content save are separate commits.

GitHub Pages builds take time. An editing conflict requires reconnecting and re-entering unsaved changes. A successful API response confirms the commit, not that the Pages build has succeeded; check Actions and the public site. The browser needs connectivity to api.github.com. GitHub's authorization, quota and Pages settings determine whether saving and deployment work.

Without the configured Cloudflare service, the inquiry form prepares an email in the visitor's email application. It never sends email automatically.

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
