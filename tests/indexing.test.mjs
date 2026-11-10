import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../functions/_middleware.js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('preview is noindex while the public domain can be indexed',async()=>{
  const run=url=>onRequest({request:new Request(url),next:async()=>new Response('ok',{headers:{'X-Robots-Tag':'noindex, nofollow'}})});
  assert.equal((await run('https://lentotech-stage.pages.dev/')).headers.get('X-Robots-Tag'),'noindex, nofollow');
  assert.equal((await run('https://lentotech.com/')).headers.get('X-Robots-Tag'),null);
  assert.equal((await run('https://lentotech.com/manage')).headers.get('X-Robots-Tag'),'noindex, nofollow');
});
