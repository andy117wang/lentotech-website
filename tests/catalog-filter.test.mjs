import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('catalog retains filters in shareable URL and filters products',async()=>{
  const source=await readFile(new URL('../catalog.js',import.meta.url),'utf8');
  const handlers={},control=(id)=>({value:'',focus(){},options:[{value:''}],addEventListener:(event,fn)=>handlers[id+event]=fn,append(option){this.options.push(option)}});
  const items={'product-search':control('search'),'product-type':control('type'),'product-area':control('area'),'product-stage':control('stage'),'product-count':{},'no-results':{},'area-filter':{},'stage-filter':{},'clear-product-filters':control('clear')};
  const cards=[{dataset:{kind:'API',search:'agomelatine 138112-76-2'},hidden:false},{dataset:{kind:'Intermediate',search:'example'},hidden:false}];
  const location={search:'?q=agomelatine',href:'https://example.test/products?q=agomelatine'},history={replaceState(_a,_b,url){location.href=url.href;location.search=url.search}};
  const document={addEventListener(){},getElementById:id=>items[id],querySelectorAll:()=>cards,createElement:()=>({})};
  vm.runInNewContext(source,{document,location,history,URL,URLSearchParams,window:{addEventListener(){}}});
  assert.equal(items['product-count'].textContent,'1 product');assert.equal(cards[1].hidden,true);
  items['product-search'].value='';items['product-type'].value='Intermediate';handlers.typechange();
  assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);assert.equal(new URL(location.href).searchParams.get('type'),'Intermediate');assert.equal(new URL(location.href).searchParams.has('q'),false);
  handlers.clearclick();assert.equal(cards[0].hidden,false);assert.equal(cards[1].hidden,false);assert.equal(new URL(location.href).searchParams.has('type'),false);
});
