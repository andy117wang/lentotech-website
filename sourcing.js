/* LentoTech's public catalog matcher. Deterministic local search; never supplier qualification or AI predictions. */
(function(root){
  'use strict';
  const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ');
  const compact=value=>normalize(value).replace(/[^\p{L}\p{N}]/gu,'');
  const casKey=value=>String(value||'').normalize('NFKC').replace(/\s|-/g,'');
  function rankProducts(index,raw){
    const q=normalize(raw),key=compact(raw);if(key.length<2)return [];
    const numericCAS=/^\d{5,10}$/.test(casKey(raw));
    return index.map(item=>{
      const name=normalize(item.name),aliases=String(item.alias||'').split(/[,;，；\n]+/).map(normalize).filter(Boolean),formula=normalize(item.formula),cas=casKey(item.cas);
      let score=0,reason='';
      if(numericCAS){if(cas&&cas===casKey(raw)){score=110;reason='matchCAS'}}
      else if(name===q||compact(name)===key){score=100;reason='matchName'}
      else if(aliases.some(x=>x===q||compact(x)===key)){score=95;reason='matchAlias'}
      else if(formula&&compact(formula)===key){score=90;reason='matchFormula'}
      else if(name.startsWith(q)||aliases.some(x=>x.startsWith(q))){score=70;reason='matchPartial'}
      else if(name.includes(q)||aliases.some(x=>x.includes(q))){score=55;reason='matchPartial'}
      return {item,score,reason};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name,'en'));
  }
  const requestURL=query=>'/contact?'+new URLSearchParams({product:String(query||'').trim().slice(0,180),topic:'Supplier search'}).toString();
  root.LentoSourcing={rankProducts,requestURL};
  if(typeof document==='undefined')return;
  const form=document.querySelector('.hero-search-form'),input=document.querySelector('#catalog-query'),panel=document.querySelector('#sourcing-results'),data=document.querySelector('#sourcing-index');if(!form||!input||!panel||!data)return;
  let index;try{index=JSON.parse(data.textContent);if(!Array.isArray(index))return}catch{return}
  const tr=(key,fallback)=>typeof root.lentoTranslate==='function'?root.lentoTranslate(key,fallback):fallback;
  const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
  const link=(label,href,cls)=>{const a=el('a',cls,label);a.href=href;return a};
  const validDetail=item=>/^\/(catalog|product)-[a-z0-9-]+$/.test(item.path||'')?item.path:'/products';
  const validInquiry=item=>String(item.inquiry||'').startsWith('/contact?')?item.inquiry:requestURL(item.name);
  function render(){
    const query=input.value.trim(),key=compact(query);panel.replaceChildren();
    if(key.length<2){const row=el('div','matcher-idle');row.append(el('span','matcher-idle-mark','◎'),el('span','',tr('matcherIdle','Search the published catalog. No external AI or live supplier availability is implied.')));panel.append(row);return}
    const matches=rankProducts(index,query);const status=el('div','matcher-status');status.append(el('strong','',String(matches.length)),el('span','',tr('matcherResults','catalog matches')));panel.append(status);
    if(!matches.length){const empty=el('div','matcher-empty');empty.append(el('p','',tr('matcherNoMatch','No catalog match found. We can review your requirement without claiming supply.')),link(tr('matcherRequest','Send a sourcing request ↗'),requestURL(query),'matcher-request'));panel.append(empty);return}
    const grid=el('div','matcher-results-list');
    for(const {item,reason} of matches.slice(0,3)){
      const row=el('article','matcher-result');const main=el('div','matcher-result-main');const label=el('span','matcher-match-label',tr(reason,({matchCAS:'Exact CAS',matchName:'Exact product name',matchAlias:'Exact synonym',matchFormula:'Exact formula',matchPartial:'Name / synonym match'})[reason]));
      main.append(label,link(item.name,validDetail(item),'matcher-product'),el('span','matcher-result-meta',[item.category,item.cas?'CAS '+item.cas:''].filter(Boolean).join(' · ')));
      const evidence=el('div','matcher-result-evidence');evidence.append(el('span',item.specification?'ev-present':'ev-request',item.specification?tr('specListed','Specification listed'):tr('specRequest','Specification on request')),el('span',item.documentation?'ev-present':'ev-request',item.documentation?tr('docsListed','Documentation listed'):tr('docsRequest','Documentation on request')));
      const actions=el('div','matcher-result-actions');actions.append(link(tr('matcherDetails','Details ↗'),validDetail(item),'matcher-detail'),link(tr('matcherInquiry','Request info ↗'),validInquiry(item),'matcher-request'));
      row.append(main,evidence,actions);grid.append(row);
    }
    panel.append(grid,link(tr('matcherAll','Full catalog ↗'),'/products?q='+encodeURIComponent(query),'matcher-all-results'));
  }
  const examples=document.querySelector('[data-sourcing-examples]');if(examples){examples.replaceChildren();const first=index[0];if(first){for(const value of [...new Set([first.name,first.cas,index[1]?.name].filter(Boolean))].slice(0,3)){const b=el('button','matcher-example',value);b.type='button';b.addEventListener('click',()=>{input.value=value;render();input.focus()});examples.append(b)}}}
  input.addEventListener('input',render);form.addEventListener('submit',event=>{event.preventDefault();render()});document.addEventListener('lento:language',render);render();
})(typeof window!=='undefined'?window:globalThis);
