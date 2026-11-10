import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('email fallback includes the optional stage and target market without truncation',async()=>{
  const source=await readFile(new URL('../inquiry.js',import.meta.url),'utf8');
  let submit;const requirement={value:''},button={};
  const form={querySelector:s=>s==='[name=requirement]'?requirement:button,addEventListener:(event,fn)=>{if(event==='submit')submit=fn},reportValidity:()=>true};
  const values={name:'Test',email:'test@example.com',type:'CDMO project',stage:'Clinical (Phase I–III)',market:'US, EU',requirement:'Process transfer'};
  const context={document:{querySelector:s=>s==='#inquiry-form'?form:s==='#form-note'?{textContent:''}:null},location:{search:'',href:''},URLSearchParams,FormData:class{get(key){return values[key]}},fetch:async()=>({ok:false}),window:{}};
  vm.runInNewContext(source,context);await submit({preventDefault(){}});
  const mail=new URL(context.location.href);const body=mail.searchParams.get('body');
  assert.match(body,/Project stage: Clinical/);assert.match(body,/Target markets: US, EU/);assert.match(body,/Process transfer/);
});
test('inquiry includes the article reference while rejecting unrelated sources',async()=>{
  const source=await readFile(new URL('../inquiry.js',import.meta.url),'utf8');let submit;const requirement={value:''},button={};
  const form={querySelector:s=>s==='[name=requirement]'?requirement:button,addEventListener:(event,fn)=>{if(event==='submit')submit=fn},reportValidity:()=>true};
  const values={name:'Test',email:'test@example.com',type:'Product sourcing',stage:'',market:'',requirement:'Specifications'};
  const context={document:{querySelector:s=>s==='#inquiry-form'?form:s==='#form-note'?{textContent:''}:null},location:{search:'?source=news-editorial-fda-insulin',href:''},URLSearchParams,FormData:class{get(k){return values[k]}},fetch:async()=>({ok:false}),window:{}};
  vm.runInNewContext(source,context);await submit({preventDefault(){}});assert.match(new URL(context.location.href).searchParams.get('body'),/Article reference: news-editorial-fda-insulin/);
});
