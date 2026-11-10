/* Small, consistent scientific line icons for website actions. */
(()=>{
  const NS='http://www.w3.org/2000/svg';
  const shapes={
    tube:['M7 3h10','M8 3v12a4 4 0 0 0 8 0V3','M8 11h8'],
    flask:['M9 3h6','M10 3v6l-5.5 8.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.5L14 9V3','M7.5 16h9'],
    pipette:['M15.5 3.5l5 5-2 2-5-5z','M14 5l-8.5 8.5','M5.5 13.5l3 3','M5.5 13.5l-2 5 5-2','M16.5 13.5c0 1.5-1 2.5-1 3.2a1.5 1.5 0 0 0 3 0c0-.7-1-1.7-1-3.2'],
    microscope:['M8 3l5 5-2 2-5-5z','M11 10l2 2','M13 12a5.5 5.5 0 0 1-5.5 5.5H6','M7 20h12','M15 17.5h3','M5 20h2'],
    tablet:['M7.2 5.2a5 5 0 0 1 7.1 0l4.5 4.5a5 5 0 0 1-7.1 7.1l-4.5-4.5a5 5 0 0 1 0-7.1z','M9.5 7.5l7 7'],
    syringe:['M4 20l5-5','M7 12l5 5','M9 10l5 5 5-5-5-5z','M13 4l5 5','M18 4l2 2','M17 5l2-2'],
    inhaler:['M7 3h7v7H7z','M6 10h10v5H9v6H6z','M16 11h3v3h-3','M9 6h3'],
    vial:['M8 3h8','M9 3v3l-2 2v10a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V8l-2-2V3','M8 12h8','M8 17h8'],
    notebook:['M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z','M9 3v18','M12 8h4','M12 12h4','M12 16h3']
  };
  function category(control){
    const href=(control.getAttribute('href')||'').toLowerCase(),text=(control.textContent||'').toLowerCase(),group=control.closest('.capability-group')?.querySelector('h3')?.textContent.toLowerCase()||'';
    if(/bioprocess|enzyme|ferment|biocatal|cell culture/.test(href+' '+text+' '+group))return 'pipette';
    if(/news|insight|research|intelligence/.test(href+' '+text))return 'microscope';
    if(/chemical|synthesis|reaction|microreactor|scale-up|formulation|cdmo|manufactur|services|capabilit/.test(href+' '+text+' '+group))return 'flask';
    if(/profile|download|documentation|guide|source/.test(href+' '+text))return 'notebook';
    if(/contact|inquir|discuss|send|consult/.test(href+' '+text))return 'pipette';
    return 'tube';
  }
  function createIcon(kind,className){
    const holder=document.createElement('span');holder.className=className;holder.setAttribute('aria-hidden','true');
    const svg=document.createElementNS(NS,'svg');for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
    for(const d of shapes[kind]||shapes.tube){const path=document.createElementNS(NS,'path');path.setAttribute('d',d);svg.append(path)}holder.append(svg);return holder;
  }
  function iconFor(control){return createIcon(category(control),'action-icon')}
  function addMedicalIcons(){for(const target of document.querySelectorAll('[data-medical-icon]'))if(!target.querySelector('.medical-icon'))target.prepend(createIcon(target.dataset.medicalIcon,'medical-icon'))}
  function convert(){
    for(const control of document.querySelectorAll('a,button')){
      const walker=document.createTreeWalker(control,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode()){const node=walker.currentNode;if(node.nodeValue.trim()&&!node.parentElement.closest('.action-icon,.action-label'))nodes.push(node)}
      let added=false;
      for(const node of nodes){const fragment=document.createDocumentFragment();for(const piece of node.nodeValue.split(/([↗→←])/)){if(!piece)continue;if(/^[↗→←]$/.test(piece)){fragment.append(iconFor(control));added=true}else if(piece.trim()){const label=document.createElement('span');label.className='action-label';label.textContent=piece;fragment.append(label)}else fragment.append(document.createTextNode(piece))}node.replaceWith(fragment)}
      if(!added&&!control.querySelector('.action-icon')&&control.matches('.capability-chip,.button,.text-link,.story-link,.inquire'))control.append(iconFor(control));
    }
  }
  function start(){convert();addMedicalIcons();document.querySelector('#language')?.addEventListener('change',()=>queueMicrotask(convert))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
