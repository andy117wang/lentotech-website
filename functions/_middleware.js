export async function onRequest(context){
  const response=await context.next();
  const headers=new Headers(response.headers);
  const host=new URL(context.request.url).hostname.toLowerCase();
  if(host==='lentotech.com'||host==='www.lentotech.com'){
    if(!new URL(context.request.url).pathname.startsWith('/manage'))headers.delete('X-Robots-Tag');
  }else if(host.endsWith('.pages.dev'))headers.set('X-Robots-Tag','noindex, nofollow');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
