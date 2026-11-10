import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,readFile} from 'node:fs/promises';
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
