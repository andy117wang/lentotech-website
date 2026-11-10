import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('migrated catalog retains original identifiers and product data',async()=>{
  const data=JSON.parse(await readFile(new URL('../content.json',import.meta.url),'utf8'));
  const original=data.products.filter(x=>/^product-\d+$/.test(x.id||''));
  assert.equal(original.length,72);assert.equal(new Set(original.map(x=>x.id)).size,72);
  for(const item of original){assert.ok(item.name);assert.ok(item.cas);assert.ok(item.category)}
  assert.equal(original.find(x=>x.id==='product-1').cas,'138112-76-2');
  assert.ok(original.find(x=>x.id==='product-72').description.includes('Trospium'));
});
