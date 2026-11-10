import {mkdir,copyFile,readFile,writeFile,readdir,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import NewsContent from './news-content.js';

const root=fileURLToPath(new URL('.',import.meta.url)),dist=join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const item of await readdir(root,{withFileTypes:true})){
  if(item.isFile()&&/\.(html|css|js|json|jpe?g|png|svg|xml|txt)$/i.test(item.name)&&!['package-lock.json'].includes(item.name))await copyFile(join(root,item.name),join(dist,item.name));
  if(item.isDirectory()&&item.name==='uploads')await cp(join(root,'uploads'),join(dist,'uploads'),{recursive:true});
}
const content=JSON.parse(await readFile(join(root,'content.json'),'utf8'));
const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>{try{const u=new URL(value,'https://lentotech.com/');if(!['http:','https:'].includes(u.protocol))return '';return u.origin==='https://lentotech.com'?u.pathname+u.search+u.hash:u.href}catch{return ''}};
const activeProducts=(content.products||[]).filter(x=>x.name&&x.publication!=='offline');
const offlineProducts=(content.products||[]).filter(x=>x.publication==='offline');
for(const x of offlineProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))await rm(join(dist,x.detail),{force:true})}
const productPath=x=>/^product-[a-z0-9-]+\.html$/.test(x.detail||'')?x.detail:'catalog-'+(x.id||createHash('sha256').update(x.name).digest('hex').slice(0,16)).replace(/[^a-z0-9-]/gi,'').toLowerCase()+'.html';
const newsItems=(content.news||[]).filter(x=>x.title).sort((a,b)=>(b.pinned==='yes')-(a.pinned==='yes')||String(b.date||'').localeCompare(String(a.date||'')));
const newsPath=x=>'news-'+String(x.id||createHash('sha256').update(x.title).digest('hex').slice(0,16)).replace(/[^a-z0-9-]/gi,'').toLowerCase()+'.html';
const renderArticles=items=>items.map(x=>{const link=newsPath(x);const related=x.related?`<a href="products.html?q=${encodeURIComponent(x.related)}&amp;source=${encodeURIComponent(newsPath(x).replace(/\.html$/,''))}">Explore related products ↗</a>`:'';return `<article><div class="story-meta">${esc([x.category,x.date].filter(Boolean).join(' · '))}</div><h3>${link?`<a href="${esc(link)}">${esc(x.title)}</a>`:esc(x.title)}</h3><p>${esc(x.summary)}</p><a class="story-link" href="${esc(link)}">Read insight ↗</a>${related}</article>`}).join('');
for(const x of newsItems){const file=newsPath(x),source=x.url?url(x.url):'',ref=encodeURIComponent(file.replace(/\.html$/,'')),related=x.related?`<a class="button" href="products.html?q=${encodeURIComponent(x.related)}&amp;source=${ref}">Find ${esc(x.related)} in the catalog ↗</a>`:`<a class="button" href="products.html?source=${ref}">Search the product catalog ↗</a>`;const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.title)} | LentoTech</title>${x.body?'':'<meta name="robots" content="noindex,follow">'}<meta name="description" content="${esc(x.summary)}"><link rel="canonical" href="https://lentotech.com/${esc(file.replace(/\.html$/, ''))}"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="design.css"><link rel="stylesheet" href="news-article.css"><link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script><link rel="icon" href="favicon.svg"></head><body><header class="catalog-header"><a class="brand" href="index.html"><span class="brand-mark">L</span><span>Lento<span class="brand-light">Tech</span></span></a><nav aria-label="Primary navigation"><a href="news.html">News &amp; insights</a><a href="products.html">Products</a><a href="services.html">CDMO services</a><a href="contact.html">Contact</a></nav></header><main class="news-article"><a href="news.html">← All news</a><div class="story-meta">${esc([x.category,x.date].filter(Boolean).join(' · '))}</div><h1>${esc(x.title)}</h1>${x.summary?`<p class="article-lead">${esc(x.summary)}</p>`:''}<article class="article-body">${NewsContent.render(x.body)}</article><div class="article-next">${source?`<a href="${esc(source)}" rel="noopener noreferrer">Original source ↗</a>`:''}${related}<a href="contact.html?source=${ref}">Discuss sourcing or a CDMO project ↗</a></div></main></body></html>`;await writeFile(join(dist,file),page)}

const products=activeProducts.map(x=>{const image=x.image?url(x.image):'';const detail=productPath(x);const id=/^product-\d+$/.test(x.id||'')?x.id:'';const search=[x.name,x.alias,x.cas,x.description,x.category,x.specification,x.therapeuticArea,x.developmentStage,x.search].join(' ').toLocaleLowerCase();return `<article class="catalog-card" ${id?`id="${esc(id)}"`:''} data-kind="${esc(x.category||'Other')}" data-area="${esc(x.therapeuticArea||'')}" data-stage="${esc(x.developmentStage||'')}" data-search="${esc(search)}">${image?`<img src="${esc(image)}" alt="${esc(x.name)}" loading="lazy" style="width:100%;max-height:180px;object-fit:cover">`:''}<span class="kind">${esc(x.category||'Product')}</span><h2><a href="${esc(detail)}">${esc(x.name)}</a></h2>${x.alias?`<p class="other-name">${esc(x.alias)}</p>`:''}${x.cas?`<p class="cas"><strong>CAS</strong> ${esc(x.cas)}</p>`:''}${x.specification?`<p>${esc(x.specification)}</p>`:''}${x.therapeuticArea?`<p>${esc(x.therapeuticArea)}</p>`:''}<p>${esc(x.description)}</p><a class="inquire" href="contact.html?product=${encodeURIComponent(x.name)}">Request information ↗</a></article>`}).join('');
for(const x of activeProducts){const file=productPath(x),image=x.image?url(x.image):'',download=x.file?url(x.file):'';const description=x.description||`Request specifications, availability and documentation for ${x.name}.`;const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.name)} | LentoTech</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://lentotech.com/${esc(file.replace(/\.html$/, ''))}"><link rel="stylesheet" href="services.css"><link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script><link rel="icon" href="favicon.svg"></head><body><header class="header"><a class="brand" href="index.html"><span>L</span> LentoTech</a><nav><a href="products.html">Products</a><a href="services.html">Services</a><a href="news.html">News</a><a href="contact.html">Contact</a></nav></header><main class="wrap product-detail"><p><a href="products.html">← All products</a></p><p class="eyebrow">${esc(x.category||'PRODUCT')}</p><h1>${esc(x.name)}</h1>${x.alias?`<p>${esc(x.alias)}</p>`:''}${image?`<img src="${esc(image)}" alt="${esc(x.name)}" style="max-width:100%;max-height:360px">`:''}<dl>${x.cas?`<dt>CAS</dt><dd>${esc(x.cas)}</dd>`:''}${x.specification?`<dt>Specification</dt><dd>${esc(x.specification)}</dd>`:''}${x.therapeuticArea?`<dt>Therapeutic area</dt><dd>${esc(x.therapeuticArea)}</dd>`:''}${x.developmentStage?`<dt>Development stage</dt><dd>${esc(x.developmentStage)}</dd>`:''}</dl><p>${esc(description)}</p>${/^\d{2,7}-\d{2}-\d$/.test(x.cas||'')?`<p><a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(x.cas)}">Search PubChem by CAS ↗</a></p>`:''}<p>Availability, specifications and documentation are subject to confirmation for your project.</p>${download?`<p><a href="${esc(download)}" download>Download product information ↗</a></p>`:''}<p><a class="button" href="contact.html?product=${encodeURIComponent(x.name)}">Ask about this product ↗</a></p><p><a href="cdmo-guide.html">Read the manufacturing guide ↗</a></p></main></body></html>`;await writeFile(join(dist,file),html)}
const moduleSection=(items,heading)=>{const entries=(Array.isArray(items)?items:[]).filter(x=>x.title&&x.description);if(!entries.length)return '';return `<section class="managed-modules"><div class="managed-inner"><p class="managed-eyebrow">LENTOTECH / SERVICES</p><h2>${esc(heading)}</h2><div class="managed-list">${entries.map(x=>{const image=x.image?url(x.image):'',link=x.link?url(x.link):'';return `<article>${image?`<img src="${esc(image)}" alt="" loading="lazy">`:''}<div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${link?`<a href="${esc(link)}">Learn more ↗</a>`:''}</div></article>`}).join('')}</div></div></section>`};
for(const file of ['index.html','news.html','products.html','services.html']){
  let html=await readFile(join(dist,file),'utf8');
  html=html.replace('<script defer src="content.js"></script>','');
  if(file==='index.html'||file==='news.html')html=html.replace('<div class="news-list">','<div class="news-list">'+renderArticles(file==='index.html'?newsItems.slice(0,3):newsItems));
  if(file==='services.html')html=html.replace('<div data-business-modules></div>',moduleSection(content.business,'Business areas'));
  if(file==='index.html')html=html.replace('<div data-capability-modules></div>',moduleSection(content.capabilities,'Our capabilities'));
  if(file==='products.html')html=html.replace('<div class="catalog-grid">','<div class="catalog-grid">'+products);
  if(file==='index.html'){
    const site=content.site||{},heroTitle=String(site.heroTitle||'').trim(),heroLead=String(site.heroLead||'').trim(),heroImage=site.heroImage?url(site.heroImage):'';
    if(heroTitle)html=html.replace(/(<h1 data-i18n="editorialTitle")>/, '$1 data-managed-english="'+esc(heroTitle)+'">').replace(/(<h1 data-i18n="editorialTitle"[^>]*>)[\s\S]*?<\/h1>/,'$1'+esc(heroTitle)+'</h1>');
    if(heroLead)html=html.replace(/(<p data-i18n="editorialLead")>/, '$1 data-managed-english="'+esc(heroLead)+'">').replace(/(<p data-i18n="editorialLead"[^>]*>)[\s\S]*?<\/p>/,'$1'+esc(heroLead)+'</p>');
    if(heroImage)html=html.replace('src="lab-illustrative.jpg" alt="Illustrative pharmaceutical laboratory"','src="'+esc(heroImage)+'" alt="'+esc(site.heroImageAlt||'Pharmaceutical laboratory illustration')+'"');
    for(const x of offlineProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))html=html.replace(new RegExp('<a href="'+x.detail.replace(/\./g,'\\.')+'">[\\s\\S]*?<\/a>','g'),'')}
    for(const x of activeProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||'')){const re=new RegExp('<a href="'+x.detail.replace(/\./g,'\\.')+'"><strong>[^<]*</strong><span>[^<]*</span></a>','g');html=html.replace(re,`<a href="${esc(x.detail)}"><strong>${esc(x.name)}</strong><span>${x.cas?'CAS '+esc(x.cas):''}</span></a>`)}}
    html=html.replace(/<p data-managed-company>.*?<\/p>/,`<p data-managed-company>${esc(content.company?.description)}</p>`);
    const link=content.company?.file?url(content.company.file):'';
    if(link)html=html.replace('<a data-managed-company-file hidden>','<a data-managed-company-file href="'+esc(link)+'">');
  }
  await writeFile(join(dist,file),html);
}
console.log('Built static site with searchable published content.');
const adminPath=join(dist,'manage.html');
const admin=await readFile(adminPath,'utf8');
await writeFile(adminPath,admin.replace('</head>',`<meta name="content-branch" content="${esc(process.env.CF_PAGES_BRANCH||'main')}"></head>`));
// Pages serves clean URLs and redirects *.html. Point links and canonical metadata
// at the final URLs so crawlers and visitors do not first encounter redirects.
for(const item of await readdir(dist,{withFileTypes:true})){
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const file=join(dist,item.name);let html=await readFile(file,'utf8');
  const theme=content.site?.theme==='teal'?'teal':'navy';
  html=html.replace('<html lang="en">','<html lang="en" data-site-theme="'+theme+'">');
  if(!html.includes('site-refresh.css')&&!item.name.startsWith('manage'))html=html.replace('</head>','<link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script></head>');
  html=html.replaceAll('https://www.lentotech.com/','https://lentotech.com/');
  html=html.replace(/href="index\.html(?=["#?])/g,'href="/');
  html=html.replace(/href="([a-z0-9-]+)\.html(?=["#?])/g,'href="/$1');
  html=html.replace(/(https:\/\/lentotech\.com\/[a-z0-9-]+)\.html(?=["?#])/g,'$1');
  await writeFile(file,html);
}
const sitemapPath=join(dist,'sitemap.xml');
const sitemap=(await readFile(sitemapPath,'utf8')).replaceAll('https://www.lentotech.com/','https://lentotech.com/');
const robotsPath=join(dist,'robots.txt');try{const robots=await readFile(robotsPath,'utf8');await writeFile(robotsPath,robots.replaceAll('https://www.lentotech.com/','https://lentotech.com/'))}catch(e){if(e.code!=='ENOENT')throw e}
const cleanSitemap=offlineProducts.reduce((text,x)=>{if(!/^product-[a-z0-9-]+\.html$/.test(x.detail||''))return text;return text.replace(new RegExp('<url><loc>https://lentotech\\.com/'+x.detail.replace(/\./g,'\\.')+'</loc></url>','g'),'')},sitemap);
const newsSitemap=newsItems.filter(x=>x.body).map(x=>'<url><loc>https://lentotech.com/'+esc(newsPath(x).replace(/\.html$/,''))+'</loc></url>').join('');
const generated=activeProducts.filter(x=>!/^product-[a-z0-9-]+\.html$/.test(x.detail||'')).map(x=>'<url><loc>https://lentotech.com/'+esc(productPath(x).replace(/\.html$/,''))+'</loc></url>').join('');
await writeFile(sitemapPath,cleanSitemap.replace(/(https:\/\/lentotech\.com\/[a-z0-9-]+)\.html(?=<)/g,'$1').replace('</urlset>',generated+newsSitemap+'</urlset>'));
const previewHeader=process.env.CF_PAGES_BRANCH&&process.env.CF_PAGES_BRANCH!=='main'?'/*\n  X-Robots-Tag: noindex, nofollow\n\n':'';
const downloadHeaders='/uploads/html/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.html"\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: sandbox; default-src \'none\'\n\n/uploads/markdown/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.md"\n  X-Content-Type-Options: nosniff\n';
await writeFile(join(dist,'_headers'),previewHeader+downloadHeaders);
