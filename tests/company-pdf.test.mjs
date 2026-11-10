import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../manage.js',import.meta.url),'utf8');
const start=source.indexOf("$('company-pdf-upload').onclick=async()=>"),end=source.indexOf("  $('upload-button').onclick",start);
const handler=source.slice(start,end).replace("$('company-pdf-upload').onclick=",'globalThis.run=');
function setup(bytes,name='profile.pdf'){
  let calls=[],dirty=0;const file={name,size:bytes.length,async arrayBuffer(){return Uint8Array.from(bytes).buffer}};
  const elements={'company-pdf':{files:[file]},'company-pdf-status':{textContent:''},'company-pdf-upload':{disabled:false},'company-file':{value:''}};
  const context={Uint8Array,Date,String,Error,crypto:{randomUUID:()=> 'test-id'},btoa:s=>Buffer.from(s,'binary').toString('base64'),$:id=>elements[id],api:'https://api.example/',branch:'preview',markDirty:()=>dirty++,request:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {}}};
  vm.runInNewContext(handler,context);return {context,elements,get calls(){return calls},get dirty(){return dirty}};
}
test('company PDF is uploaded and associated with the profile',async()=>{
  const state=setup(Buffer.from('%PDF-1.4\n%%EOF'));
  await state.context.run();assert.equal(state.calls.length,1);assert.match(state.calls[0].url,/uploads\/.*-test-id\.pdf$/);assert.equal(state.calls[0].body.branch,'preview');assert.match(state.elements['company-file'].value,/^\/uploads\/.*\.pdf$/);assert.equal(state.dirty,1);assert.match(state.elements['company-pdf-status'].textContent,/保存并发布/);
});
test('non-PDF file content is rejected without uploading',async()=>{
  const state=setup(Buffer.from('not a pdf'));
  await state.context.run();assert.equal(state.calls.length,0);assert.equal(state.elements['company-file'].value,'');assert.match(state.elements['company-pdf-status'].textContent,/不是有效的 PDF/);
});
