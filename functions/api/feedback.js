const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const limit=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
async function authorized(request){
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9_]{20,255}$/.test(auth))return false;
  const response=await fetch('https://api.github.com/repos/andy117wang/lentotech-website',{headers:{Authorization:auth,'User-Agent':'LentoTech-feedback','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
  if(!response.ok)return false;
  const repo=await response.json();return repo.full_name==='andy117wang/lentotech-website'&&repo.permissions?.push===true;
}
export async function onRequestGet({request,env}){
  if(new URL(request.url).searchParams.get('config')==='1')return json({available:!!(env.FEEDBACK_DB&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET),siteKey:env.TURNSTILE_SITE_KEY||''});
  if(!env.FEEDBACK_DB)return json({error:'Feedback service unavailable'},503);
  if(!await authorized(request))return json({error:'Unauthorized'},401);
  const {results}=await env.FEEDBACK_DB.prepare('SELECT id, created_at, name, email, type, message, status FROM feedback ORDER BY created_at DESC LIMIT 200').all();
  return json({items:results});
}
export async function onRequestPost({request,env}){
  if(!env.FEEDBACK_DB||!env.TURNSTILE_SECRET||!env.TURNSTILE_SITE_KEY)return json({error:'Feedback service unavailable'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
  if(Number(request.headers.get('Content-Length')||0)>8000)return json({error:'Request too large'},413);
  let input;try{const body=await request.text();if(body.length>8000)return json({error:'Request too large'},413);input=JSON.parse(body)}catch{return json({error:'Invalid request'},400)}
  if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request'},400);
  const name=limit(input.name,120),email=limit(input.email,254),type=limit(input.type,80),message=limit(input.message,1200),challenge=limit(input.challenge,2048);
  if(!name||!email||!message||!challenge||!/^\S+@\S+\.\S+$/.test(email))return json({error:'Please complete the required fields'},400);
  const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:challenge})});
  if(!result.ok)return json({error:'Verification unavailable'},503);
  const verdict=await result.json();if(!verdict.success||verdict.hostname!==new URL(request.url).hostname)return json({error:'Verification failed'},403);
  const id=crypto.randomUUID();await env.FEEDBACK_DB.prepare("INSERT INTO feedback (id,name,email,type,message,status) VALUES (?,?,?,?,?,'new')").bind(id,name,email,type,message).run();return json({ok:true},201);
}
export async function onRequestPatch({request,env}){
  if(!env.FEEDBACK_DB)return json({error:'Feedback service unavailable'},503);
  if(request.headers.get('Origin')!==new URL(request.url).origin||!await authorized(request))return json({error:'Unauthorized'},401);
  let input;try{input=await request.json()}catch{return json({error:'Invalid request'},400)}
  if(!/^[0-9a-f-]{36}$/.test(input.id||'')||!['new','reviewed'].includes(input.status))return json({error:'Invalid request'},400);
  await env.FEEDBACK_DB.prepare('UPDATE feedback SET status=? WHERE id=?').bind(input.status,input.id).run();return json({ok:true});
}
