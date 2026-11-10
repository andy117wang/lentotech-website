import {mkdir,copyFile,readFile,writeFile,readdir,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('.',import.meta.url)),dist=join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const item of await readdir(root,{withFileTypes:true})){
  if(item.isFile()&&/\.(html|css|js|json|jpe?g|png|svg|xml|txt)$/i.test(item.name)&&!['package-lock.json'].includes(item.name))await copyFile(join(root,item.name),join(dist,item.name));
  if(item.isDirectory()&&item.name==='uploads')await cp(join(root,'uploads'),join(dist,'uploads'),{recursive:true});
}
const content=JSON.parse(await readFile(join(root,'content.json'),'utf8'));
const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>{try{const u=new URL(value,'https://www.lentotech.com/');if(!['http:','https:'].includes(u.protocol))return '';return u.origin==='https://www.lentotech.com'?u.pathname+u.search+u.hash:u.href}catch{return ''}};
const activeProducts=(content.products||[]).filter(x=>x.name&&x.publication!=='offline');
const offlineProducts=(content.products||[]).filter(x=>x.publication==='offline');
for(const x of offlineProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))await rm(join(dist,x.detail),{force:true})}
const productPath=x=>/^product-[a-z0-9-]+\.html$/.test(x.detail||'')?x.detail:'catalog-'+(x.id||createHash('sha256').update(x.name).digest('hex').slice(0,16)).replace(/[^a-z0-9-]/gi,'').toLowerCase()+'.html';
const articles=(content.news||[]).filter(x=>x.title).sort((a,b)=>(b.pinned==='yes')-(a.pinned==='yes')||String(b.date||'').localeCompare(String(a.date||''))).slice(0,20).map(x=>{const link=x.url?url(x.url):'';const related=x.related?`<a href="products.html?q=${encodeURIComponent(x.related)}">Explore related products ↗</a>`:'';return `<article><div class="story-meta">${esc([x.category,x.date].filter(Boolean).join(' · '))}</div><h3>${link?`<a href="${esc(link)}">${esc(x.title)}</a>`:esc(x.title)}</h3><p>${esc(x.summary)}</p>${related}</article>`}).join('');
const products=activeProducts.map(x=>{const image=x.image?url(x.image):'';const detail=productPath(x);const id=/^product-\d+$/.test(x.id||'')?x.id:'';const search=[x.name,x.alias,x.cas,x.description,x.category,x.specification,x.search].join(' ').toLocaleLowerCase();return `<article class="catalog-card" ${id?`id="${esc(id)}"`:''} data-kind="${esc(x.category||'Other')}" data-search="${esc(search)}">${image?`<img src="${esc(image)}" alt="${esc(x.name)}" loading="lazy" style="width:100%;max-height:180px;object-fit:cover">`:''}<span class="kind">${esc(x.category||'Product')}</span><h2><a href="${esc(detail)}">${esc(x.name)}</a></h2>${x.alias?`<p class="other-name">${esc(x.alias)}</p>`:''}${x.cas?`<p class="cas"><strong>CAS</strong> ${esc(x.cas)}</p>`:''}${x.specification?`<p>${esc(x.specification)}</p>`:''}<p>${esc(x.description)}</p><a class="inquire" href="contact.html?product=${encodeURIComponent(x.name)}">Request information ↗</a></article>`}).join('');
for(const x of activeProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))continue;const file=productPath(x),image=x.image?url(x.image):'',download=x.file?url(x.file):'';const description=x.description||`Request specifications, availability and documentation for ${x.name}.`;const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.name)} | LentoTech</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://www.lentotech.com/${esc(file.replace(/\.html$/, ''))}"><link rel="stylesheet" href="services.css"><link rel="icon" href="favicon.svg"></head><body><header class="header"><a class="brand" href="index.html"><span>L</span> LentoTech</a><nav><a href="products.html">Products</a><a href="services.html">Services</a><a href="news.html">News</a><a href="contact.html">Contact</a></nav></header><main class="wrap product-detail"><p><a href="products.html">← All products</a></p><p class="eyebrow">${esc(x.category||'PRODUCT')}</p><h1>${esc(x.name)}</h1>${x.alias?`<p>${esc(x.alias)}</p>`:''}${image?`<img src="${esc(image)}" alt="${esc(x.name)}" style="max-width:100%;max-height:360px">`:''}<dl>${x.cas?`<dt>CAS</dt><dd>${esc(x.cas)}</dd>`:''}${x.specification?`<dt>Specification</dt><dd>${esc(x.specification)}</dd>`:''}</dl><p>${esc(description)}</p><p>Availability, specifications and documentation are subject to confirmation for your project.</p>${download?`<p><a href="${esc(download)}" download>Download product information ↗</a></p>`:''}<p><a class="button" href="contact.html?product=${encodeURIComponent(x.name)}">Ask about this product ↗</a></p></main></body></html>`;await writeFile(join(dist,file),html)}
for(const file of ['index.html','news.html','products.html']){
  let html=await readFile(join(dist,file),'utf8');
  html=html.replace('<script defer src="content.js"></script>','');
  if(file!=='products.html')html=html.replace('<div class="news-list">','<div class="news-list">'+articles);
  if(file==='products.html')html=html.replace('<div class="catalog-grid">','<div class="catalog-grid">'+products);
  if(file==='index.html'){
    for(const x of offlineProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))html=html.replace(new RegExp('<a href="'+x.detail.replace(/\./g,'\\.')+'">[\\s\\S]*?<\/a>','g'),'')}
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
  html=html.replace(/href="index\.html(?=["#?])/g,'href="/');
  html=html.replace(/href="([a-z0-9-]+)\.html(?=["#?])/g,'href="/$1');
  html=html.replace(/(https:\/\/www\.lentotech\.com\/[a-z0-9-]+)\.html(?=["?#])/g,'$1');
  await writeFile(file,html);
}
const sitemapPath=join(dist,'sitemap.xml');
const sitemap=await readFile(sitemapPath,'utf8');
const cleanSitemap=offlineProducts.reduce((text,x)=>{if(!/^product-[a-z0-9-]+\.html$/.test(x.detail||''))return text;return text.replace(new RegExp('<url><loc>https://www\\.lentotech\\.com/'+x.detail.replace(/\./g,'\\.')+'</loc></url>','g'),'')},sitemap);
const generated=activeProducts.filter(x=>!/^product-[a-z0-9-]+\.html$/.test(x.detail||'')).map(x=>'<url><loc>https://www.lentotech.com/'+esc(productPath(x).replace(/\.html$/,''))+'</loc></url>').join('');
await writeFile(sitemapPath,cleanSitemap.replace(/(https:\/\/www\.lentotech\.com\/[a-z0-9-]+)\.html(?=<)/g,'$1').replace('</urlset>',generated+'</urlset>'));
const previewHeader=process.env.CF_PAGES_BRANCH&&process.env.CF_PAGES_BRANCH!=='main'?'/*\n  X-Robots-Tag: noindex, nofollow\n\n':'';
const downloadHeaders='/uploads/html/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.html"\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: sandbox; default-src \'none\'\n\n/uploads/markdown/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.md"\n  X-Content-Type-Options: nosniff\n';
await writeFile(join(dist,'_headers'),previewHeader+downloadHeaders);
