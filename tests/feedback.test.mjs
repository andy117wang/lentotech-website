import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../functions/api/feedback.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base='https://example.test/api/feedback';
test('fails closed when database and verification are missing',async()=>{
  const r=await api.onRequestPost({request:new Request(base,{method:'POST'}),env:{}});assert.equal(r.status,503);
});
test('rejects inbox access without repository authorization',async()=>{
  const r=await api.onRequestGet({request:new Request(base),env:{FEEDBACK_DB:{}}});assert.equal(r.status,401);
});
test('requires write access to the intended GitHub repository',async()=>{
  const original=globalThis.fetch;const request=()=>new Request(base,{headers:{Authorization:'Bearer '+('x'.repeat(30))}});const db={prepare(){return{async all(){return{results:[]}}}}};
  try{globalThis.fetch=async()=>Response.json({full_name:'andy117wang/lentotech-website',permissions:{push:false}});assert.equal((await api.onRequestGet({request:request(),env:{FEEDBACK_DB:db}})).status,401);globalThis.fetch=async()=>Response.json({full_name:'andy117wang/lentotech-website',permissions:{push:true}});assert.equal((await api.onRequestGet({request:request(),env:{FEEDBACK_DB:db}})).status,200)}finally{globalThis.fetch=original}
});
test('validates Turnstile before storing an inquiry',async()=>{
  const original=globalThis.fetch;let writes=0;
  globalThis.fetch=async()=>Response.json({success:false});
  try{const db={prepare(){return{bind(){return{run(){writes++;}}}}}};const request=new Request(base,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'test@example.com',message:'A question',challenge:'token'})});const r=await api.onRequestPost({request,env:{FEEDBACK_DB:db,TURNSTILE_SECRET:'secret',TURNSTILE_SITE_KEY:'site'}});assert.equal(r.status,403);assert.equal(writes,0)}finally{globalThis.fetch=original}
});
test('accepts a verified inquiry and stores it privately',async()=>{
  const original=globalThis.fetch;let values;
  globalThis.fetch=async()=>Response.json({success:true,hostname:'example.test'});
  try{const db={prepare(){return{bind(...args){values=args;return{async run(){}}}}}};const request=new Request(base,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'test@example.com',type:'Product',message:'A question',challenge:'token'})});const r=await api.onRequestPost({request,env:{FEEDBACK_DB:db,TURNSTILE_SECRET:'secret',TURNSTILE_SITE_KEY:'site'}});assert.equal(r.status,201);assert.equal(values[1],'Test');assert.equal(values[4],'A question')}finally{globalThis.fetch=original}
});
test('stores the guided assistant phone and request in the private inquiry message',async()=>{
  const original=globalThis.fetch;let values;globalThis.fetch=async()=>Response.json({success:true,hostname:'example.test'});
  try{const db={prepare(){return{bind(...args){values=args;return{async run(){}}}}}};const request=new Request(base,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({name:'Visitor',email:'visitor@example.com',type:'CDMO project',message:'Phone / WhatsApp: +123456789\nSource: guided website assistant\nRequirement: API project',challenge:'token'})});const r=await api.onRequestPost({request,env:{FEEDBACK_DB:db,TURNSTILE_SECRET:'secret',TURNSTILE_SITE_KEY:'site'}});assert.equal(r.status,201);assert.match(values[4],/Phone \/ WhatsApp: \+123456789/);assert.match(values[4],/API project/)}finally{globalThis.fetch=original}
});
