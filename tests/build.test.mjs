import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('build exposes content in HTML and escapes unsafe text',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-build-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({company:{description:'Company',file:'/uploads/profile.pdf'},business:[{title:'Supply <verified>',description:'Example service',link:'javascript:alert(1)'}],capabilities:[{title:'Analytical review',description:'Scope subject to confirmation'}],news:[{title:'News <script>alert(1)</script>',summary:'Summary'}],products:[{name:'Example molecule',cas:'123-45-6',formula:'C15H17NO2',category:'API',image:'/uploads/example.png'}]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const news=await readFile(join(dir,'dist/news.html'),'utf8'),products=await readFile(join(dir,'dist/products.html'),'utf8');
  assert.match(news,/News &lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(products,/Example molecule/);assert.match(products,/123-45-6/);assert.match(products,/data-search="[^"]*c15h17no2/);assert.doesNotMatch(news,/<script defer src="content.js">/);
  assert.match(products,/<link rel="canonical" href="https:\/\/lentotech\.com\/products">/);
  assert.match(products,/src="\/uploads\/example\.png"/);const services=await readFile(join(dir,'dist/services.html'),'utf8'),home=await readFile(join(dir,'dist/index.html'),'utf8');assert.match(services,/Supply &lt;verified&gt;/);assert.doesNotMatch(services,/javascript:alert/);assert.match(home,/Analytical review/);assert.match(home,/data-managed-company-file href="\/uploads\/profile\.pdf"/);
});
test('publishes product detail and removes offline legacy products from catalog and sitemap',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-visibility-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml','product-agomelatine.html'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({products:[{id:'item-123',name:'Sample & Co',specification:'Grade A',file:'/uploads/example.pdf'},{id:'product-1',name:'Agomelatine',detail:'product-agomelatine.html',publication:'offline'}],news:[]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const catalog=await readFile(join(dir,'dist/products.html'),'utf8'),detail=await readFile(join(dir,'dist/catalog-item-123.html'),'utf8'),home=await readFile(join(dir,'dist/index.html'),'utf8'),sitemap=await readFile(join(dir,'dist/sitemap.xml'),'utf8');
  assert.match(catalog,/Sample &amp; Co/);assert.doesNotMatch(catalog,/Agomelatine/);assert.match(detail,/Grade A/);assert.match(detail,/contact\?product=Sample%20%26%20Co/);assert.doesNotMatch(home,/href="\/product-agomelatine"/);assert.doesNotMatch(sitemap,/product-agomelatine/);await assert.rejects(access(join(dir,'dist/product-agomelatine.html')));
});
test('legacy product address uses current managed data and unified inquiry',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-legacy-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml','product-agomelatine.html'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({products:[{id:'product-1',name:'Updated product',cas:'123-45-6',alias:'Updated alias',detail:'product-agomelatine.html',specification:'Verified grade'}],news:[]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const detail=await readFile(join(dir,'dist/product-agomelatine.html'),'utf8'),home=await readFile(join(dir,'dist/index.html'),'utf8');
  assert.match(detail,/Updated product/);assert.match(detail,/Updated alias/);assert.match(detail,/Verified grade/);assert.match(detail,/contact\?product=Updated%20product/);assert.match(home,/Updated product/);
});

test('news article pages are searchable and escape unsafe content',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-news-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({news:[{id:'item-123',title:'A & B',summary:'Summary',body:'## Details\\n\\n<script>alert(1)</script>\\n\\n[bad](javascript:alert(1))',related:'123'}],products:[]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const page=await readFile(join(dir,'dist/news-item-123.html'),'utf8'),list=await readFile(join(dir,'dist/news.html'),'utf8'),map=await readFile(join(dir,'dist/sitemap.xml'),'utf8');
  assert.match(page,/A &amp; B/);assert.match(page,/&lt;script&gt;/);assert.doesNotMatch(page,/<script>alert/);assert.doesNotMatch(page,/href="javascript:/);assert.match(list,/href="\/news-item-123"/);assert.match(map,/lentotech.com\/news-item-123/);
});
test('published summary news is discoverable and directs visitors to products and inquiry',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-journey-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({site:{theme:'teal',heroTitle:'Your <API> partner',heroImage:'/uploads/hero.png'},news:[{id:'alpha',title:'Source story',summary:'Summary',url:'https://example.com',related:'A&B'}],products:[]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const page=await readFile(join(dir,'dist/news-alpha.html'),'utf8'),home=await readFile(join(dir,'dist/index.html'),'utf8'),map=await readFile(join(dir,'dist/sitemap.xml'),'utf8');
  assert.match(page,/products\?q=A%26B&amp;source=news-alpha/);assert.match(page,/contact\?source=news-alpha/);assert.doesNotMatch(page,/noindex/);assert.match(map,/news-alpha/);assert.match(home,/src="\/uploads\/hero.png" alt=""/);assert.match(home,/name="q"/);assert.match(home,/data-site-theme="teal"/);assert.match(home,/data-managed-english="Your &lt;API&gt; partner"/);
});
test('featured products and product details use managed data without inventing supply information',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-featured-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  const products=[{id:'a',name:'Alpha',cas:'123-45-6',featured:'yes',specification:'98%',documentation:'COA'},{id:'b',name:'Beta',featured:'yes'},{id:'c',name:'Gamma',featured:'yes'},{id:'d',name:'Delta'}];
  await writeFile(join(dir,'content.json'),JSON.stringify({products,news:[]}));await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const home=await readFile(join(dir,'dist/index.html'),'utf8'),detail=await readFile(join(dir,'dist/catalog-a.html'),'utf8'),service=await readFile(join(dir,'dist/services.html'),'utf8');
  const featured=home.match(/<div class="product-spotlight"[^>]*>(.*?)<\/div>/s)[1];assert.match(featured,/Alpha/);assert.match(featured,/Beta/);assert.match(featured,/Gamma/);assert.match(featured,/Delta/);
  assert.match(detail,/CAS number/);assert.match(detail,/Specification \/ purity/);assert.match(detail,/98%/);assert.match(detail,/Available documentation/);assert.match(detail,/COA/);assert.match(detail,/Packaging/);assert.match(detail,/Supply availability/);assert.match(detail,/To be confirmed for your project/);assert.doesNotMatch(service,/Zhejiang Shanyuan|East Asia Pharmaceutical/i);
});

test('published product and news terms are visible and discoverable while offline products stay excluded',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-seo-'));
  for(const f of ['build.mjs','news-content.js','index.html','news.html','products.html','services.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({news:[{id:'full',title:'Article title',body:'Unique article content',keywords:'CMC, process transfer'},{id:'brief',title:'Brief title',summary:'Brief summary',keywords:'market intelligence'}],products:[{id:'published',name:'Example molecule',cas:'123-45-6',alias:'示例别名',category:'API',keywords:'synonym one, 特殊词, <script>alert(1)</script>'},{id:'offline',name:'Offline item',publication:'offline'}]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const page=await readFile(join(dir,'dist/catalog-published.html'),'utf8'),list=await readFile(join(dir,'dist/products.html'),'utf8'),full=await readFile(join(dir,'dist/news-full.html'),'utf8'),brief=await readFile(join(dir,'dist/news-brief.html'),'utf8'),map=await readFile(join(dir,'dist/sitemap.xml'),'utf8');
  assert.match(page,/<title>Example molecule \| CAS 123-45-6 \| API \| LentoTech<\/title>/);assert.match(page,/示例别名/);assert.match(page,/synonym one/);assert.match(page,/&lt;script&gt;/);assert.doesNotMatch(page,/<script>alert/);assert.match(list,/data-search="[^"]*特殊词/);assert.match(full,/Unique article content/);assert.match(full,/CMC · process transfer/);assert.match(brief,/market intelligence/);assert.doesNotMatch(brief,/noindex/);assert.match(map,/catalog-published/);assert.match(map,/news-full/);assert.match(map,/news-brief/);assert.doesNotMatch(map,/catalog-offline/);
});
