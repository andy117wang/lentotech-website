import {mkdir,copyFile,readFile,writeFile,readdir,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url)),dist=join(root,'dist');
await mkdir(dist,{recursive:true});
for(const item of await readdir(root,{withFileTypes:true})){
  if(item.isFile()&&/\.(html|css|js|json|jpe?g|png|svg|xml|txt)$/i.test(item.name)&&!['package-lock.json'].includes(item.name))await copyFile(join(root,item.name),join(dist,item.name));
  if(item.isDirectory()&&item.name==='uploads')await cp(join(root,'uploads'),join(dist,'uploads'),{recursive:true});
}
const content=JSON.parse(await readFile(join(root,'content.json'),'utf8'));
const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>{try{const u=new URL(value,'https://www.lentotech.com/');return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
const articles=(content.news||[]).slice(0,20).filter(x=>x.title).map(x=>{const link=x.url?url(x.url):'';return `<article><div class="story-meta">${esc([x.category,x.date].filter(Boolean).join(' · '))}</div><h3>${link?`<a href="${esc(link)}">${esc(x.title)}</a>`:esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`}).join('');
const products=(content.products||[]).filter(x=>x.name).map(x=>{const image=x.image?url(x.image):'';const detail=/^product-[a-z0-9-]+\.html$/.test(x.detail||'')?x.detail:'';const id=/^product-\d+$/.test(x.id||'')?x.id:'';const search=[x.name,x.alias,x.cas,x.description,x.category,x.search].join(' ').toLocaleLowerCase();return `<article class="catalog-card" ${id?`id="${esc(id)}"`:''} data-kind="${esc(x.category||'Other')}" data-search="${esc(search)}">${image?`<img src="${esc(image)}" alt="${esc(x.name)}" loading="lazy" style="width:100%;max-height:180px;object-fit:cover">`:''}<span class="kind">${esc(x.category||'Product')}</span><h2>${detail?`<a href="${esc(detail)}">${esc(x.name)}</a>`:esc(x.name)}</h2>${x.alias?`<p class="other-name">${esc(x.alias)}</p>`:''}${x.cas?`<p class="cas"><strong>CAS</strong> ${esc(x.cas)}</p>`:''}<p>${esc(x.description)}</p>${x.cas?`<a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(x.cas)}" target="_blank" rel="noopener noreferrer">Search PubChem ↗</a>`:''}<a class="inquire" href="mailto:info@lentotech.com?subject=${encodeURIComponent('Product inquiry: '+x.name)}">Request information ↗</a></article>`}).join('');
for(const file of ['index.html','news.html','products.html']){
  let html=await readFile(join(dist,file),'utf8');
  html=html.replace('<script defer src="content.js"></script>','');
  if(file!=='products.html')html=html.replace('<div class="news-list">','<div class="news-list">'+articles);
  if(file==='products.html')html=html.replace('<div class="catalog-grid">','<div class="catalog-grid">'+products);
  if(file==='index.html'){
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
await writeFile(sitemapPath,sitemap.replace(/(https:\/\/www\.lentotech\.com\/[a-z0-9-]+)\.html(?=<)/g,'$1'));
if(process.env.CF_PAGES_BRANCH&&process.env.CF_PAGES_BRANCH!=='main')await writeFile(join(dist,'_headers'),'/*\n  X-Robots-Tag: noindex, nofollow\n');
