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
const terms=value=>[...new Set(String(value||'').split(/[,，;；\n]+/).map(x=>x.trim()).filter(Boolean))];
const termsMarkup=value=>{const items=terms(value);return items.length?'<p class="related-terms"><strong>Related terms:</strong> '+items.map(esc).join(' · ')+'</p>':''};
const cleanText=value=>String(value||'').replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[#*_`>]/g,' ').replace(/\s+/g,' ').trim();
const url=value=>{try{const u=new URL(value,'https://lentotech.com/');if(!['http:','https:'].includes(u.protocol))return '';return u.origin==='https://lentotech.com'?u.pathname+u.search+u.hash:u.href}catch{return ''}};
// Only explicitly public fields from the Mac trade workbench enter this feed.
const baseProducts=(content.products||[]).map(x=>({...x}));
let tradeFeed={products:[]};
try{tradeFeed=JSON.parse(await readFile(join(root,'trade-catalog.json'),'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const publicFields=['code','name','category','identifier','description','specification','markets'];
if(!tradeFeed||!Array.isArray(tradeFeed.products)||Object.keys(tradeFeed).some(k=>!['generated_at','products'].includes(k)))throw Error('Invalid public trade catalog feed');
const key=v=>String(v||'').normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const usedCodes=new Set(),acceptedTrade=[];
for(const row of tradeFeed.products){
  if(!row||Object.keys(row).length!==publicFields.length||publicFields.some(k=>typeof row[k]!=='string')||Object.keys(row).some(k=>!publicFields.includes(k))||!/^PRO-[a-f0-9]{12}$/.test(row.code)||!row.name.trim()||usedCodes.has(row.code))throw Error('Invalid or duplicate public trade product');
  usedCodes.add(row.code);
  const cas=/^\d{2,7}-\d{2}-\d$/.test(row.identifier.trim())?row.identifier.trim():'';
  const match=baseProducts.find(x=>key(x.name)===key(row.name)||(cas&&x.cas===cas));
  if(match){if(match.publication!=='offline'&&!match.tradeCode)match.tradeCode=row.code;continue;}
  const dup=acceptedTrade.some(x=>key(x.name)===key(row.name)||(cas&&x.cas===cas));if(dup)continue;
  const categories={'API':'API','Advanced Intermediate':'Intermediate','Intermediate':'Intermediate','Finished Dosage Form':'Finished Dosage Form','Excipient':'Excipient','Equipment':'Equipment','CDMO Services':'CDMO Services','Other':'Other'};
  acceptedTrade.push({id:row.code,name:row.name,category:categories[row.category]||'Other',cas,description:row.description,specification:row.specification,keywords:[row.code,cas?'':row.identifier,row.markets].filter(Boolean).join('; '),tradeCode:row.code});
}
const activeProducts=[...baseProducts,...acceptedTrade].filter(x=>x.name&&x.publication!=='offline');
const inquiryHref=x=>'contact.html?product='+encodeURIComponent(x.name)+(x.tradeCode?'&trade_code='+encodeURIComponent(x.tradeCode):'');
const offlineProducts=(content.products||[]).filter(x=>x.publication==='offline');
for(const x of offlineProducts){if(/^product-[a-z0-9-]+\.html$/.test(x.detail||''))await rm(join(dist,x.detail),{force:true})}
const productPath=x=>/^product-[a-z0-9-]+\.html$/.test(x.detail||'')?x.detail:'catalog-'+(x.id||createHash('sha256').update(x.name).digest('hex').slice(0,16)).replace(/[^a-z0-9-]/gi,'').toLowerCase()+'.html';
const newsItems=(content.news||[]).filter(x=>x.title).sort((a,b)=>(b.pinned==='yes')-(a.pinned==='yes')||String(b.date||'').localeCompare(String(a.date||'')));
const sourcingIndex=activeProducts.map(x=>({name:String(x.name||''),cas:String(x.cas||''),alias:String(x.alias||''),formula:String(x.formula||x.molecularFormula||''),category:String(x.category||'Other'),path:'/'+productPath(x).replace(/\.html$/,''),inquiry:'/contact?product='+encodeURIComponent(x.name)+(x.tradeCode?'&trade_code='+encodeURIComponent(x.tradeCode):''),specification:!!String(x.specification||'').trim(),documentation:!!String(x.documentation||'').trim()}));
const sourcingJSON=JSON.stringify(sourcingIndex).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const newsPath=x=>'news-'+String(x.id||createHash('sha256').update(x.title).digest('hex').slice(0,16)).replace(/[^a-z0-9-]/gi,'').toLowerCase()+'.html';
const selectedFeatured=activeProducts.filter(x=>x.featured==='yes');
const featuredProducts=[...selectedFeatured,...activeProducts.filter(x=>x.featured!=='yes')].slice(0,6);
const featuredMarkup=featuredProducts.map(x=>`<a href="${esc(productPath(x))}"><span class="featured-label" data-medical-icon="tube">${esc(x.category||'Product')}</span><strong>${esc(x.name)}</strong><span>${x.cas?'CAS '+esc(x.cas):'Details on request'}</span><span class="featured-action">View product ↗</span></a>`).join('');
const renderArticles=items=>items.map(x=>{const link=newsPath(x);const related=x.related?`<a href="products.html?q=${encodeURIComponent(x.related)}&amp;source=${encodeURIComponent(newsPath(x).replace(/\.html$/,''))}">Explore related products ↗</a>`:'';return `<article><div class="story-meta">${esc([x.category,x.date].filter(Boolean).join(' · '))}</div><h3>${link?`<a href="${esc(link)}">${esc(x.title)}</a>`:esc(x.title)}</h3><p>${esc(x.summary)}</p><a class="story-link" href="${esc(link)}">Read insight ↗</a>${related}</article>`}).join('');
for(const x of newsItems){const file=newsPath(x),source=x.url?url(x.url):'',ref=encodeURIComponent(file.replace(/\.html$/,'')),related=x.related?`<a class="button" href="products.html?q=${encodeURIComponent(x.related)}&amp;source=${ref}">Find ${esc(x.related)} in the catalog ↗</a>`:`<a class="button" href="products.html?source=${ref}">Search the product catalog ↗</a>`;const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.title)} | LentoTech</title><meta name="description" content="${esc(cleanText(x.summary||x.body||x.title).slice(0,200))}"><link rel="canonical" href="https://lentotech.com/${esc(file.replace(/\.html$/, ''))}"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="design.css"><link rel="stylesheet" href="news-article.css"><link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script><link rel="icon" href="favicon.svg"></head><body><header class="catalog-header"><a class="brand" href="index.html"><span class="brand-mark">L</span><span>Lento<span class="brand-light">Tech</span></span></a><nav aria-label="Primary navigation"><a href="news.html">News &amp; insights</a><a href="products.html">Products</a><a href="services.html">CDMO services</a><a href="contact.html">Contact</a></nav></header><main id="main" class="news-article"><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="news.html">News &amp; insights</a><span>/</span><span>Article</span></nav><div class="story-meta">${esc(x.category||'News')}${x.date?` · <time datetime="${esc(x.date)}">${esc(x.date)}</time>`:''}</div><h1>${esc(x.title)}</h1>${x.summary?`<p class="article-lead">${esc(x.summary)}</p>`:''}<article class="article-body">${NewsContent.render(x.body)}${termsMarkup(x.keywords)}</article><div class="article-next">${source?`<a href="${esc(source)}" rel="noopener noreferrer">Original source ↗</a>`:''}${related}<a href="contact.html?source=${ref}">Discuss sourcing or a CDMO project ↗</a></div></main><footer><a class="brand" href="index.html">LentoTech</a><span>Business inquiries: <a href="mailto:info@lentotech.com">info@lentotech.com</a></span></footer></body></html>`;await writeFile(join(dist,file),page)}

const products=activeProducts.map(x=>{const image=x.image?url(x.image):'';const detail=productPath(x);const id=/^product-\d+$/.test(x.id||'')?x.id:'';const search=[x.name,x.alias,x.cas,x.formula,x.molecularFormula,x.description,x.category,x.specification,x.documentation,x.packaging,x.availability,x.keywords,x.therapeuticArea,x.developmentStage,x.search].join(' ').toLocaleLowerCase();return `<article class="catalog-card" ${id?`id="${esc(id)}"`:''} data-kind="${esc(x.category||'Other')}" data-area="${esc(x.therapeuticArea||'')}" data-stage="${esc(x.developmentStage||'')}" data-search="${esc(search)}">${image?`<img src="${esc(image)}" alt="${esc(x.name)}" loading="lazy" style="width:100%;max-height:180px;object-fit:cover">`:''}<span class="kind" data-medical-icon="tube">${esc(x.category||'Product')}</span><h2><a href="${esc(detail)}">${esc(x.name)}</a></h2>${x.alias?`<p class="other-name">${esc(x.alias)}</p>`:''}${x.cas?`<p class="cas"><strong>CAS</strong> ${esc(x.cas)}</p>`:''}${x.specification?`<p>Specification / purity: ${esc(x.specification)}</p>`:''}${x.therapeuticArea?`<p>${esc(x.therapeuticArea)}</p>`:''}<p>${esc(x.description)}</p><div class="catalog-evidence"><span class="evidence-tag ${String(x.specification||'').trim()?'listed':'request'}" data-i18n="${String(x.specification||'').trim()?'specListed':'specRequest'}">${String(x.specification||'').trim()?'Specification listed':'Specification on request'}</span><span class="evidence-tag ${String(x.documentation||'').trim()?'listed':'request'}" data-i18n="${String(x.documentation||'').trim()?'docsListed':'docsRequest'}">${String(x.documentation||'').trim()?'Documentation listed':'Documentation on request'}</span></div><div class="card-actions"><a class="inquire" href="${esc(inquiryHref(x))}">Request information</a><a class="detail-action" href="${esc(detail)}">Product details</a></div></article>`}).join('');
// Stable product slugs and existing data are retained. The page presents verified fields and a clear inquiry path.
for(const x of activeProducts){
  const file=productPath(x),image=x.image?url(x.image):'',download=x.file?url(x.file):'';
  const description=x.description||[x.name,x.alias,x.cas?'CAS '+x.cas:'',x.category,'Request specifications, availability and documentation.'].filter(Boolean).join(' · ');
  const seoTitle=[x.name,x.cas?'CAS '+x.cas:'',x.category,'LentoTech'].filter(Boolean).join(' | ');
  const related=activeProducts.filter(y=>y!==x&&y.category===x.category).sort((a,b)=>Number(b.therapeuticArea&&b.therapeuticArea===x.therapeuticArea)-Number(a.therapeuticArea&&a.therapeuticArea===x.therapeuticArea)).slice(0,4);
  const facts=[['Product name',x.name],['CAS number',x.cas],['Synonyms',x.alias],['Product category',x.category||'Product'],['Specification / purity',x.specification||'Discuss requirements with our team'],['Available documentation',x.documentation||'To be confirmed for your project'],['Packaging',x.packaging||'To be confirmed for your project'],['Supply availability',x.availability||'To be confirmed for your project'],['Therapeutic area',x.therapeuticArea],['Development stage',x.developmentStage]].filter(([,v])=>v);
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(seoTitle)}</title><meta name="description" content="${esc(cleanText(description).slice(0,220))}"><link rel="canonical" href="https://lentotech.com/${esc(file.replace(/\.html$/, ''))}"><link rel="stylesheet" href="services.css"><link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script><link rel="icon" href="favicon.svg"></head><body><header class="header"><a class="brand" href="index.html" aria-label="LentoTech home"><span class="brand-mark">L</span><span class="wordmark">LentoTech</span></a><nav aria-label="Primary navigation"><a href="products.html">Products</a><a href="services.html">Services</a><a href="news.html">News</a><a href="contact.html">Contact</a></nav></header><main id="main" class="wrap product-detail"><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><a href="products.html">All products</a><span>/</span><span>${esc(x.name)}</span></nav><section class="product-hero"><p class="eyebrow">${esc(x.category||'Product')}</p><h1 data-medical-icon="tube">${esc(x.name)}</h1>${x.alias?`<p>${esc(x.alias)}</p>`:''}<p class="product-summary">${esc(description)}</p>${x.cas?`<p><strong>CAS number:</strong> ${esc(x.cas)}</p>`:''}<div class="product-hero-actions"><a class="button" href="${esc(inquiryHref(x))}">Request information</a><span>Specifications and availability on request</span></div></section><div class="product-detail-layout"><section class="detail-panel"><h2>Product information</h2>${image?`<img class="product-image" src="${esc(image)}" alt="${esc(x.name)}" decoding="async">`:''}<dl>${facts.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${termsMarkup(x.keywords)}${/^\d{2,7}-\d{2}-\d$/.test(x.cas||'')?`<p><a href="https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(x.cas)}">Search PubChem by CAS</a></p>`:''}<p class="trust-note">Availability, specifications and documentation are subject to confirmation for your project. A catalog listing does not establish regulatory approval or inventory.</p>${download?`<p><a href="${esc(download)}" download>Download product information</a></p>`:''}</section><aside class="inquiry-panel"><p class="eyebrow">FOR YOUR PROJECT</p><h2>Request product information</h2><p>Tell us what you need so we can discuss the appropriate sourcing route.</p><ul><li>Required specification and quality documents</li><li>Quantity and target market</li><li>Project stage and delivery requirements</li></ul><a class="button" href="${esc(inquiryHref(x))}">Ask about this product</a><p class="inquiry-small">Information is for initial business discussions only.</p><p><a href="cdmo-guide.html">Read the manufacturing guide</a></p></aside></div>${related.length?`<section class="related-products"><h2>Explore related ${esc(x.category||'catalog')} products</h2><div class="related-product-grid">${related.map(y=>`<a href="${esc(productPath(y))}">${esc(y.name)}<span>${y.cas?'CAS '+esc(y.cas):esc(y.category||'Product')}</span></a>`).join('')}</div></section>`:''}</main><footer><a class="brand" href="index.html">LentoTech</a><span>Business inquiries: <a href="mailto:info@lentotech.com">info@lentotech.com</a></span></footer></body></html>`;
  await writeFile(join(dist,file),html);
}
const moduleSection=(items,heading)=>{const entries=(Array.isArray(items)?items:[]).filter(x=>x.title&&x.description);if(!entries.length)return '';return `<section class="managed-modules"><div class="managed-inner"><p class="managed-eyebrow">LENTOTECH / SERVICES</p><h2>${esc(heading)}</h2><div class="managed-list">${entries.map(x=>{const image=x.image?url(x.image):'',link=x.link?url(x.link):'';return `<article>${image?`<img src="${esc(image)}" alt="" loading="lazy">`:''}<div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${link?`<a href="${esc(link)}">Learn more ↗</a>`:''}</div></article>`}).join('')}</div></div></section>`};
for(const file of ['index.html','news.html','products.html','services.html']){
  let html=await readFile(join(dist,file),'utf8');
  html=html.replace('<script defer src="content.js"></script>','');
  if(file==='news.html')html=html.replace('<div class="news-list">','<div class="news-list">'+renderArticles(newsItems));
  if(file==='services.html'){
    html=html.replace('<div data-business-modules></div>',moduleSection(content.business,'Business areas'));
    html=html.replace('<div data-capability-modules></div>',moduleSection(content.capabilities,'Our capabilities'));
  }
  if(file==='products.html'){
    html=html.replace('<div class="catalog-grid">','<div class="catalog-grid">'+products);
    html=html.replace('<div class="product-spotlight" data-featured-products></div>','<div class="product-spotlight" data-featured-products>'+featuredMarkup+'</div>');
  }
  if(file==='index.html'){
    const site=content.site||{},heroTitle=String(site.heroTitle||'').trim(),heroLead=String(site.heroLead||'').trim(),heroImage=site.heroImage?url(site.heroImage):'';
    if(heroTitle)html=html.replace(/(<h1 id="portal-title" data-i18n="editorialTitle")>/, '$1 data-managed-english="'+esc(heroTitle)+'">').replace(/(<h1 id="portal-title" data-i18n="editorialTitle"[^>]*>)[\s\S]*?<\/h1>/,'$1'+esc(heroTitle)+'</h1>');
    if(heroLead)html=html.replace(/(<p data-i18n="editorialLead")>/, '$1 data-managed-english="'+esc(heroLead)+'">').replace(/(<p data-i18n="editorialLead"[^>]*>)[\s\S]*?<\/p>/,'$1'+esc(heroLead)+'</p>');
    if(heroImage)html=html.replace('src="lab-illustrative.jpg" alt=""','src="'+esc(heroImage)+'" alt=""');
    html=html.replace('<script type="application/json" id="sourcing-index">[]</script>',()=>'<script type="application/json" id="sourcing-index">'+sourcingJSON+'</script>');
  }
  await writeFile(join(dist,file),html);
}
console.log('Built static site with searchable published content.');
const adminPath=join(dist,'manage.html');
const admin=await readFile(adminPath,'utf8');
await writeFile(adminPath,admin.replace('</head>',`<meta name="content-branch" content="${esc(process.env.CF_PAGES_BRANCH||'codex/unified-website')}"></head>`));
// Public metadata is derived only from the existing public catalog/content. No invented prices, ratings or approvals.
const origin='https://lentotech.com';
const canonical=file=>origin+(file==='index.html'?'/':'/'+file.replace(/\.html$/,''));
const org={'@type':'Organization','@id':origin+'/#organization',name:'LentoTech',url:origin+'/',email:'info@lentotech.com',description:'Pharmaceutical product sourcing, industry intelligence and CDMO opportunity matching.'};
const webSite={'@type':'WebSite','@id':origin+'/#website',name:'LentoTech',url:origin+'/',publisher:{'@id':org['@id']},inLanguage:'en'};
const productByFile=new Map(activeProducts.map(x=>[productPath(x),x]));
const newsByFile=new Map(newsItems.map(x=>[newsPath(x),x]));
const publicPages={'index.html':'Home','products.html':'Products','news.html':'News & insights','services.html':'Services','cdmo-guide.html':'Manufacturing guide','contact.html':'Contact','about.html':'About'};
const decodeMeta=v=>String(v||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const metaValue=(html,name)=>decodeMeta(html.match(new RegExp('<meta\\s+name="'+name+'"\\s+content="([^"]*)"','i'))?.[1]||'');
const jsonScript=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const setMeta=(html,attr,name,value)=>{const tag=`<meta ${attr}="${name}" content="${esc(value)}">`,re=new RegExp('<meta\\s+'+attr+'="'+name+'"[^>]*>','i');return re.test(html)?html.replace(re,()=>tag):html.replace('</head>',tag+'</head>')};
const asAbsolute=v=>{const u=url(v);return u?new URL(u,origin+'/').href:''};
function enhancePublicPage(html,file){
  if(file==='about.html'){
    // Publication counts are derived from actual public data, not historic marketing claims.
    for(const [id,value] of [['catalog',activeProducts.length],['cas',activeProducts.filter(x=>String(x.cas||'').trim()).length],['insights',newsItems.length]])html=html.replace(new RegExp('(<strong class="network-number" data-metric="'+id+'">)[^<]*(</strong>)'),(_,open,close)=>open+String(value)+close);
    if(content.company?.description)html=html.replace(/<p data-managed-company>.*?<\/p>/,`<p data-managed-company>${esc(content.company.description)}</p>`);
    const link=content.company?.file?url(content.company.file):'';
    if(link){html=html.replace('<a class="button" data-managed-company-file hidden>','<a class="button" data-managed-company-file href="'+esc(link)+'" download>');html=html.replace('data-company-profile-request href=', 'data-company-profile-request hidden href=');}
  }
  const pageUrl=canonical(file),product=productByFile.get(file),article=newsByFile.get(file),title=decodeMeta(html.match(/<title>(.*?)<\/title>/s)?.[1]||'LentoTech'),description=metaValue(html,'description');
  html=html.replace(/<link\s+rel="canonical"[^>]*>/gi,'').replace('</head>',`<link rel="canonical" href="${esc(pageUrl)}"></head>`);
  const displayName=product?.name||article?.title||publicPages[file]||title;
  const crumbs=[{name:'Home',item:origin+'/'}];
  if(product)crumbs.push({name:'Products',item:origin+'/products'});else if(article)crumbs.push({name:'News & insights',item:origin+'/news'});
  if(file!=='index.html')crumbs.push({name:displayName,item:pageUrl});
  const graph=[org,webSite,{'@type':file==='products.html'||file==='news.html'?'CollectionPage':'WebPage','@id':pageUrl+'#page',url:pageUrl,name:title,description,isPartOf:{'@id':webSite['@id']},inLanguage:'en'}];
  if(crumbs.length>1)graph.push({'@type':'BreadcrumbList','@id':pageUrl+'#breadcrumbs',itemListElement:crumbs.map((x,i)=>({'@type':'ListItem',position:i+1,...x}))});
  if(product){const p={'@type':'Product','@id':pageUrl+'#product',url:pageUrl,name:product.name,description:cleanText(product.description||description),category:product.category||'Product'};if(product.image&&asAbsolute(product.image))p.image=asAbsolute(product.image);if(product.cas)p.additionalProperty=[{'@type':'PropertyValue',name:'CAS number',value:product.cas}];graph.push(p);}
  if(article){const a={'@type':'Article','@id':pageUrl+'#article',headline:article.title,description:cleanText(article.summary||article.title),mainEntityOfPage:pageUrl,publisher:{'@id':org['@id']},inLanguage:'en'};if(/^\d{4}-\d{2}-\d{2}$/.test(article.date||''))a.datePublished=article.date;if(article.url&&asAbsolute(article.url))a.citation=asAbsolute(article.url);graph.push(a);}
  if(file==='products.html'||file==='news.html'){const items=file==='products.html'?activeProducts.map(x=>({name:x.name,url:canonical(productPath(x))})):newsItems.map(x=>({name:x.title,url:canonical(newsPath(x))}));graph.push({'@type':'ItemList','@id':pageUrl+'#list',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,item}))});}
  html=html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi,'').replace('</head>',`<script type="application/ld+json">${jsonScript({'@context':'https://schema.org','@graph':graph})}</script></head>`);
  html=setMeta(html,'property','og:type',article?'article':'website');html=setMeta(html,'property','og:title',title);html=setMeta(html,'property','og:description',description);html=setMeta(html,'property','og:url',pageUrl);html=setMeta(html,'property','og:site_name','LentoTech');
  const socialImage=product?.image&&asAbsolute(product.image)||origin+'/'+(product?'vials-illustrative.jpg':'lab-illustrative.jpg');html=setMeta(html,'property','og:image',socialImage);html=setMeta(html,'property','og:image:alt',product?.image?product.name:'Illustrative pharmaceutical '+(product?'vials':'laboratory'));html=setMeta(html,'name','twitter:card','summary_large_image');
  html=html.replace('</head>','<link rel="stylesheet" href="brand-2026.css"><link rel="stylesheet" href="sourcing-2026.css"><link rel="stylesheet" href="clinical-ui.css"><link rel="stylesheet" href="topic-layout.css"></head>');
  const current=product?'products.html':article?'news.html':file;
  const navItems=[['products.html','navProducts','Products'],['services.html','navCapabilities','Sourcing &amp; CDMO'],['news.html','newsNav','News &amp; insights'],['about.html','aboutNav','About'],['contact.html','navContact','Contact']];
  html=html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,header=>{
    const nav='<nav aria-label="Primary navigation" data-i18n-aria="navPrimaryLabel">'+navItems.map(([href,k,label])=>`<a href="${href}" data-i18n="${k}"${current===href?' aria-current="page"':''}>${label}</a>`).join('')+'</nav>';
    let out=header.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i,nav);
    if(!out.includes('id="language"'))out=out.replace('</header>','<div class="site-language"><label class="sr-only" for="language" data-i18n="languageLabel">Choose language</label><select id="language" aria-label="Choose language"><option value="en">English</option><option value="zh">简体中文</option><option value="ja">日本語</option><option value="es">Español</option><option value="pt">Português</option></select></div></header>');
    return out;
  });
  if(!html.includes('src="app.js"'))html=html.replace('</head>','<script defer src="app.js"></script></head>');
  if(!html.includes('</footer>'))html=html.replace('</body>','<footer><a class="brand" href="index.html">LentoTech</a><span>Business inquiries: <a href="mailto:info@lentotech.com">info@lentotech.com</a></span></footer></body>');
  if(file!=='index.html'&&html.includes('</footer>'))html=html.replace('</footer>','<nav class="site-footer-links" aria-label="Footer navigation"><a href="products.html">Product catalog</a><a href="services.html">Sourcing &amp; CDMO</a><a href="news.html">Industry insights</a><a href="about.html" data-i18n="aboutNav">About</a><a href="contact.html">Business inquiries</a></nav></footer>');
  return html;
}
// Pages serves clean URLs and redirects *.html. Point links and canonical metadata
// at the final URLs so crawlers and visitors do not first encounter redirects.
for(const item of await readdir(dist,{withFileTypes:true})){
  if(!item.isFile()||!item.name.endsWith('.html'))continue;
  const file=join(dist,item.name);let html=await readFile(file,'utf8');
  const theme=content.site?.theme==='teal'?'teal':'navy';
  html=html.replace('<html lang="en">','<html lang="en" data-site-theme="'+theme+'">');
  if(!html.includes('site-refresh.css')&&!item.name.startsWith('manage'))html=html.replace('</head>','<link rel="stylesheet" href="site-refresh.css"><script defer src="journey.js"></script></head>');
  if(!item.name.startsWith('manage'))html=html.replace('</head>','<link rel="stylesheet" href="assistant-widget.css"><script defer src="assistant-widget.js"></script><script defer src="action-icons.js"></script></head>');
  if(!item.name.startsWith('manage'))html=enhancePublicPage(html,item.name);
  for(const asset of new Set([...html.matchAll(/(?:href|src)="([a-z0-9-]+\.(?:css|js))"/g)].map(x=>x[1]))){
    const version=await readFile(join(root,asset)).then(bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,12)).catch(()=>null);
    if(version)html=html.replaceAll('="'+asset+'"','="'+asset+'?v='+version+'"');
  }
  html=html.replaceAll('https://www.lentotech.com/','https://lentotech.com/');
  html=html.replace(/href="index\.html(?=["#?])/g,'href="/');
  html=html.replace(/href="([a-z0-9-]+)\.html(?=["#?])/g,'href="/$1');
  html=html.replace(/(https:\/\/lentotech\.com\/[a-z0-9-]+)\.html(?=["?#])/g,'$1');
  await writeFile(file,html);
}
const sitemapPath=join(dist,'sitemap.xml');
const publicFiles=(await readdir(dist,{withFileTypes:true})).filter(x=>x.isFile()&&x.name.endsWith('.html')&&!x.name.startsWith('manage')).map(x=>x.name);
const sitemapUrls=[...new Set(publicFiles.map(canonical))].sort();
await writeFile(sitemapPath,'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+sitemapUrls.map(v=>'  <url><loc>'+esc(v)+'</loc></url>').join('\n')+'\n</urlset>\n');
const robotsPath=join(dist,'robots.txt');try{const robots=await readFile(robotsPath,'utf8');await writeFile(robotsPath,robots.replaceAll('https://www.lentotech.com/','https://lentotech.com/'))}catch(e){if(e.code!=='ENOENT')throw e}
// Supplemental GEO discovery index; search engines still rely on crawlable pages, links and sitemap.
let llms='';try{llms=await readFile(join(root,'llms.txt'),'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
const intro=llms.split('## Selected product profiles')[0].trim()||'# LentoTech\n\n> Pharmaceutical sourcing, CDMO and technical intelligence.\n\nOfficial website: https://lentotech.com/';
const mdText=v=>cleanText(v).replace(/[\[\]()]/g,' ').replace(/\s+/g,' ').trim();
const productIndex=activeProducts.map(x=>`- [${mdText(x.name)}](${canonical(productPath(x))}): ${[x.category,x.cas?'CAS '+x.cas:''].filter(Boolean).map(mdText).join(' · ')}`).join('\n');
const newsIndex=newsItems.map(x=>`- [${mdText(x.title)}](${canonical(newsPath(x))}): ${mdText(x.date||'')} ${mdText(x.category||'')}`.trim()).join('\n');
await writeFile(join(dist,'llms.txt'),intro+'\n\n## Published product profiles\n\n'+productIndex+'\n\n## Published news and insights\n\n'+newsIndex+'\n\n## Discovery\n\n- [XML sitemap]('+origin+'/sitemap.xml): Current public canonical page URLs.\n');
const previewHeader=process.env.CF_PAGES_BRANCH&&!['codex/unified-website'].includes(process.env.CF_PAGES_BRANCH)?'/*\n  X-Robots-Tag: noindex, nofollow\n\n':'';
const downloadHeaders='/uploads/html/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.html"\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: sandbox; default-src \'none\'\n\n/uploads/markdown/*\n  Content-Type: text/plain; charset=utf-8\n  Content-Disposition: attachment; filename="document.md"\n  X-Content-Type-Options: nosniff\n';
await writeFile(join(dist,'_headers'),previewHeader+'/manage*\n  X-Robots-Tag: noindex, nofollow\n\n'+downloadHeaders);
