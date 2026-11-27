export async function onRequest(context){
  const url=new URL(context.request.url);
  const method=context.request.method;
  // Preserve the path and query, including inquiry and catalog context.
  if(url.hostname==='www.lentotech.com'&&(method==='GET'||method==='HEAD')){
    url.hostname='lentotech.com';
    url.protocol='https:';
    return Response.redirect(url,301);
  }
  const response=await context.next();
  const headers=new Headers(response.headers);
  if(url.hostname.endsWith('.pages.dev')||url.pathname.startsWith('/manage')||response.status===404){
    headers.set('X-Robots-Tag','noindex, nofollow');
  }else if(url.hostname==='lentotech.com'||url.hostname==='www.lentotech.com'){
    // Cloudflare may supply the preview-wide header before this middleware.
    if(headers.get('X-Robots-Tag')==='noindex, nofollow')headers.delete('X-Robots-Tag');
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
