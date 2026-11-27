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

test('www sends readers to the same canonical path and query in one response',async()=>{
  for(const method of ['GET','HEAD']){
    const response=await onRequest({
      request:new Request('https://www.lentotech.com/contact?source=news-alpha', {method}),
      next:async()=>assert.fail('a duplicate page must not be served'),
    });
    assert.equal(response.status,301);
    assert.equal(response.headers.get('location'),'https://lentotech.com/contact?source=news-alpha');
  }
  const post=await onRequest({
    request:new Request('https://www.lentotech.com/api/feedback',{method:'POST'}),
    next:async()=>new Response(null,{status:202}),
  });
  assert.equal(post.status,202);
});
test('a missing page retains its 404 status and explicit noindex',async()=>{
  const response=await onRequest({
    request:new Request('https://lentotech.com/missing'),
    next:async()=>new Response('Missing',{status:404}),
  });
  assert.equal(response.status,404);
  assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
});
