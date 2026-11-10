/* Keep link labels readable and give arrow actions a consistent visual treatment. */
(()=>{
  function convert(){
    for(const control of document.querySelectorAll('a,button')){
      const walker=document.createTreeWalker(control,NodeFilter.SHOW_TEXT),nodes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(node.nodeValue.trim()&&!node.parentElement.closest('.action-icon,.action-label'))nodes.push(node);
      }
      for(const node of nodes){
        const fragment=document.createDocumentFragment();
        for(const piece of node.nodeValue.split(/([↗→←])/)){
          if(!piece)continue;
          if(/^[↗→←]$/.test(piece)){
            const icon=document.createElement('span');icon.className='action-icon';icon.setAttribute('aria-hidden','true');icon.textContent=piece;fragment.append(icon);
          }else if(piece.trim()){
            const label=document.createElement('span');label.className='action-label';label.textContent=piece;fragment.append(label);
          }else fragment.append(document.createTextNode(piece));
        }
        node.replaceWith(fragment);
      }
    }
  }
  function start(){convert();document.querySelector('#language')?.addEventListener('change',()=>queueMicrotask(convert))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
