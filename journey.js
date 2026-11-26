/* Preserve public bookmarks for topics that moved off the landing page. */
if (location.pathname === '/' || location.pathname === '/index.html') {
  const destinations = {
    '#products': ['/products', '#featured'],
    '#capabilities': ['/services', '#capabilities'],
    '#intelligence': ['/news', ''],
    '#inquiry': ['/contact', '#inquiry']
  };
  const destination = destinations[location.hash];
  if (destination) location.replace(destination[0] + location.search + destination[1]);
}

if (location.hash === '#featured') {
  const featured = document.getElementById('featured');
  if (featured) featured.open = true;
}

/* Carry the public article identifier through the product and inquiry journey. */
(()=>{
  const source=new URLSearchParams(location.search).get('source')||'';
  if(!/^news-[a-z0-9-]{1,100}$/.test(source))return;
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    const target=new URL(link.href,location.href);
    if(target.origin!==location.origin||!/^\/(products|catalog-[a-z0-9-]+|product-[a-z0-9-]+|contact)(?:\.html)?\/?$/.test(target.pathname))return;
    target.searchParams.set('source',source);link.href=target.pathname+target.search+target.hash;
  });
})();
