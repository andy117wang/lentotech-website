import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../product-import.js',import.meta.url),'utf8'),context);
const parse=text=>JSON.parse(JSON.stringify(context.ProductImport.parse(text)));
test('extracts labelled Chinese and English product details and Markdown image',()=>{
  assert.deepEqual(parse('# Agomelatine\n中文名：阿戈美拉汀\nCAS No.: 138112-76-2\nCategory: API\nDescription: Example\n![image](https://example.com/a.png)'),{name:'Agomelatine',alias:'阿戈美拉汀',cas:'138112-76-2',category:'API',description:'Example',image:'https://example.com/a.png'});
});
test('does not invent fields from arbitrary text and recognizes a CAS number',()=>{
  assert.deepEqual(parse('A reference: 123-45-6'),{cas:'123-45-6'});
});
test('extracts explicitly labelled product keywords',()=>{assert.deepEqual(parse('Product name: Example\n关键词: API, CAS 123-45-6'),{name:'Example',keywords:'API, CAS 123-45-6',cas:'123-45-6'})});
