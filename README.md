# LentoTech website

**AI maintainers:** [AGENTS.md](AGENTS.md) is mandatory. The verified production source is `codex/unified-website`, not the legacy static `main` branch. Preserve source assets, content records and Git history; never delete records or files arbitrarily.

## Unified publishing and feedback workflow (production)

`manage.html` is the shared operating screen. GitHub stores public content and public uploads with version history. Cloudflare Pages Functions and a private D1 database store customer inquiries; inquiries are never committed to the public GitHub repository. An administrator enters a fine-grained GitHub token restricted to this repository with Contents read/write permission; the feedback endpoint verifies that token against GitHub and checks repository push permission on every administrative request. Verify this permission check with the actual token before use. The token is held only in page memory, so page refresh or closure disconnects the manager.

Deployment requires a Cloudflare Pages project connected to this repository, build command `node build.mjs`, output directory `dist`, and the Functions directory at the repository root. The build renders managed news and products into HTML so they are available without client-side JavaScript. `dist/` is generated and is not committed. Run `node --test tests/*.test.mjs` before deploying. Bind a D1 database as `FEEDBACK_DB`, apply `schema.sql`, create a Turnstile widget for the actual hostnames, and set `TURNSTILE_SITE_KEY` and the secret `TURNSTILE_SECRET` as Pages environment variables. Configure both production and preview deliberately; do not put secrets in the repository. Test a real submission, inbox read and status change in a private staging environment before routing the production domain.

The production domain is routed to Cloudflare Pages project `lentotech-stage`, production branch `codex/unified-website`. Do not change its routing or DNS as part of routine maintenance. The native inquiry service is configured; if it becomes unavailable, the form falls back to preparing an email. The form uses Turnstile server verification; it fails closed if storage or verification is not configured. The inbox displays the newest 200 inquiries, does not send email notifications, and does not automatically delete records. Retain inquiry records and private exports; do not delete them without explicit user authorization. Protect the GitHub account using two-factor authentication, keep tokens short-lived, and limit who may use the management screen.

Product and news content is search-readable in the built HTML, but ranking and indexing are not guaranteed. Language switching currently occurs client-side and is not a set of independently indexable translations; hreflang declarations were removed until separate translated pages with their own canonical URLs exist. Review actual ownership and authorization before publishing the Shanyuan partner information. The original catalog is migrated into `content.json` so it can be edited in the management screen. The three legacy product detail URLs are generated from the same managed product records, preserving their existing addresses while keeping product information consistent.

## Content management (authorized management interface)

The management page can add, edit, remove and reorder extra business areas (rendered on the services page) and capabilities (rendered on the home page). These are additional sections; the pre-existing hard-coded services are not editable in this editor. Module titles and descriptions are currently entered in English and are not automatically translated. Uploaded assets and published content are public. Changes publish through the GitHub build and are not immediate; local drafts remain in the current browser only.

`manage.html` edits `content.json` through the GitHub Contents API. Create a fine-grained token restricted to this repository with Contents read/write permission; enter it directly in the management page. The token remains in page memory only. Manage this token like a password, set an expiry, and revoke it if exposed. The management page is public but publishing requires a valid token. Protect the GitHub account with two-factor authentication.

The editor can manage news and products, update the company introduction, and upload JPG, PNG, WebP, PDF, Markdown and HTML files (up to 5 MB each). Uploads and saved content are public. HTML files are saved as text and served as downloads with script execution disabled; they do not create executable site pages. Markdown files are also served as downloads. Review factual claims, rights and documents before publishing. Company profiles can be uploaded directly from the company panel; the PDF link is filled automatically, but publishing the content remains a separate step. Replacing a profile does not delete the earlier public file. Other uploads receive a generated link to paste into the appropriate field. The upload and content save are separate commits.

Cloudflare Pages builds take time. An editing conflict requires reconnecting and re-entering unsaved changes. A successful API response confirms the commit, not that the Pages build has succeeded; check the Cloudflare production deployment and the actual public site. The browser needs connectivity to api.github.com. GitHub authorization and Cloudflare Pages build configuration determine whether saving and deployment work.

Without the configured Cloudflare service, the inquiry form prepares an email in the visitor's email application. It never sends email automatically.

Production website for lentotech.com, built by `node build.mjs` on Cloudflare Pages. The legacy static `main` branch is not the Cloudflare production source.

## Design and content maintenance

- `design.css` is the shared visual system loaded after the existing `styles.css`.
- The website pages share News & insights, Products, CDMO services and About navigation.
- Home order: introduction, latest news, pathways, catalog/search, capabilities, technical guide, inquiry.
- `catalog.js` accepts `?q=` for product name/CAS searches; preserve the 72 existing catalog entries and IDs.
- Images are existing illustrative assets, not evidence of LentoTech-owned manufacturing facilities.
- The native form submits to private feedback storage after verification when configured; email fallback prepares an email without sending it automatically.

## WorkBuddy news updates

Always fetch current `codex/unified-website` before preparing a news branch. News is managed through the corresponding `content.json` records or authorized management interface; the build renders homepage excerpts and news archive. Preserve existing article IDs, dates, source links, English content, shared visual system, product search, and page structure. Do not overwrite complete pages from older static checkouts or delete historical articles. Publish only within the user-authorized editorial scope.

## Verification — 2026-10-31

JavaScript syntax and local links/assets/anchors checked. Desktop and 400px mobile screenshots visually inspected. Browser-based layout checks cover 320/400/768/1440px across homepage, news, catalog, technical guide and a product detail page. Query search tested with CAS 138112-76-2. No third-party font, animation library or framework added.


## Trade catalog and inquiry integration

PR #3 integrated `trade-catalog.json`, whose seven public product fields are validated before native catalog rendering and product code inquiry linking. Original managed product IDs and assets are preserved. Only explicitly approved public products go into this feed; never copy customer/contact, supplier, price, order, private inquiry, database or workbench data here. The authorized administrator can export private inquiries, which must never be committed. Use publication/offline states for authorized withdrawals, keeping original records and attachments. Read AGENTS.md, test and verify the actual production URL after maintenance.

## Public interface and search discovery (2026 design)

`brand-2026.css` extends the existing visual system across the site; do not delete the earlier shared styles or content. Product detail pages use a responsive facts panel, visible inquiry entry and links to related public products. The homepage sourcing summary remains translated through the existing five-language selector. The indexable base pages are English; client-side translations are not separate indexed-language pages, so no artificial `hreflang` alternate URLs are emitted.

The build derives one clean canonical URL, Open Graph metadata, Schema.org JSON-LD (Organization, WebSite, WebPage, breadcrumbs, Product, Article and catalog/news ItemList where applicable), and a sitemap from actual public generated pages. Product metadata never invents offers, ratings, inventory, approvals or price; article dates and citations come only from published records. `dist/llms.txt` is refreshed from public catalog and published news on every build as a supplemental discovery index. The real production branch `codex/unified-website` is not covered by the preview-wide `X-Robots-Tag: noindex`; management and preview paths remain non-indexable. Search/GEO discovery is not guaranteed by these signals. Check `node --test tests/*.test.mjs`, generate `node build.mjs`, compare the public output, and verify actual deployment.
