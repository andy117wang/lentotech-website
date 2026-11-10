import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,readFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('build exposes content in HTML and escapes unsafe text',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-build-'));
  for(const f of ['build.mjs','index.html','news.html','products.html','manage.html','sitemap.xml'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({company:{description:'Company'},news:[{title:'News <script>alert(1)</script>',summary:'Summary'}],products:[{name:'Example molecule',cas:'123-45-6',category:'API',image:'/uploads/example.png'}]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const news=await readFile(join(dir,'dist/news.html'),'utf8'),products=await readFile(join(dir,'dist/products.html'),'utf8');
  assert.match(news,/News &lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.match(products,/Example molecule/);assert.match(products,/123-45-6/);assert.doesNotMatch(news,/<script defer src="content.js">/);
  assert.match(products,/<link rel="canonical" href="https:\/\/www\.lentotech\.com\/products">/);
  assert.match(products,/src="\/uploads\/example\.png"/);
});
test('publishes product detail and removes offline legacy products from catalog and sitemap',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lento-visibility-'));
  for(const f of ['build.mjs','index.html','news.html','products.html','manage.html','sitemap.xml','product-agomelatine.html'])await copyFile(new URL('../'+f,import.meta.url),join(dir,f));
  await writeFile(join(dir,'content.json'),JSON.stringify({products:[{id:'item-123',name:'Sample & Co',specification:'Grade A',file:'/uploads/example.pdf'},{id:'product-1',name:'Agomelatine',detail:'product-agomelatine.html',publication:'offline'}],news:[]}));
  await promisify(execFile)(process.execPath,[join(dir,'build.mjs')]);
  const catalog=await readFile(join(dir,'dist/products.html'),'utf8'),detail=await readFile(join(dir,'dist/catalog-item-123.html'),'utf8'),home=await readFile(join(dir,'dist/index.html'),'utf8'),sitemap=await readFile(join(dir,'dist/sitemap.xml'),'utf8');
  assert.match(catalog,/Sample &amp; Co/);assert.doesNotMatch(catalog,/Agomelatine/);assert.match(detail,/Grade A/);assert.match(detail,/contact\?product=Sample%20%26%20Co/);assert.doesNotMatch(home,/href="\/product-agomelatine"/);assert.doesNotMatch(sitemap,/product-agomelatine/);await assert.rejects(access(join(dir,'dist/product-agomelatine.html')));
});
