(()=>{
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
  const safeUrl=value=>{if(!value||!value.trim())return '';try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}};
  fetch('content.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
    const about=document.querySelector('[data-managed-company]');
    if(about&&data.company?.description)about.textContent=data.company.description;
    const file=document.querySelector('[data-managed-company-file]');
    if(file&&safeUrl(data.company?.file)){file.href=safeUrl(data.company.file);file.hidden=false}
    const news=document.querySelector('.news-list');
    if(news&&Array.isArray(data.news))for(const item of data.news.slice(0,20).reverse()){
      if(!item.title)continue;const article=el('article');article.append(el('div',[item.category,item.date].filter(Boolean).join(' · '),'story-meta'));
      const h=el('h3'),url=safeUrl(item.url);if(url){const a=el('a',item.title);a.href=url;h.append(a)}else h.textContent=item.title;article.append(h,el('p',item.summary||''));news.prepend(article)
    }
    const grid=document.querySelector('.catalog-grid');
    const products=[...(Array.isArray(data.products)?data.products:[]),...(Array.isArray(data.news)?data.news.filter(item=>item&&item.category==='Intermediate'&&item.name):[])];
    if(grid)for(const item of products){
      if(!item.name)continue;const card=el('article','','catalog-card');if(/^product-\d+$/.test(item.id||''))card.id=item.id;card.dataset.kind=item.category||'Other';card.dataset.search=[item.name,item.alias,item.cas,item.description,item.category,item.search].join(' ').toLocaleLowerCase();
      const heading=el('h2');if(/^product-[a-z0-9-]+\.html$/.test(item.detail||'')){const link=el('a',item.name);link.href=item.detail;heading.append(link)}else heading.textContent=item.name;
      card.append(el('span',item.category||'Product','kind'),heading);if(item.alias)card.append(el('p',item.alias,'other-name'));if(item.cas)card.append(el('p','CAS '+item.cas,'cas'));if(item.description)card.append(el('p',item.description));
      const image=safeUrl(item.image);if(image){const img=el('img');img.src=image;img.alt=item.name;img.loading='lazy';img.style.cssText='width:100%;max-height:180px;object-fit:cover';card.prepend(img)}
      const a=el('a','Request information ↗','inquire');a.href='mailto:info@lentotech.com?subject='+encodeURIComponent('Product inquiry: '+item.name);card.append(a);grid.prepend(card)
    }
    if(grid)document.dispatchEvent(new Event('catalog:updated'));
  }).catch(()=>{});
})();
