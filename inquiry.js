(()=>{
  const form=document.querySelector('#inquiry-form');if(!form)return;
  const product=new URLSearchParams(location.search).get('product');if(product){const requirement=form.querySelector('[name=requirement]');if(requirement)requirement.value='Product: '+product+'\n';}
  const note=document.querySelector('#form-note'),button=form.querySelector('button[type=submit]');let enabled=false,widget;
  const say=text=>{note.textContent=text};
  fetch('/api/feedback?config=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(config=>{
    if(!config?.available||!config.siteKey)return;
    const box=document.createElement('div');box.id='turnstile-widget';form.insertBefore(box,button);
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
    script.onload=()=>{widget=window.turnstile.render(box,{sitekey:config.siteKey});enabled=true;const update=()=>{const zh=document.documentElement.lang.startsWith('zh');button.querySelector('span').textContent=zh?'发送询盘':'Send inquiry';const intro=document.querySelector('[data-i18n="inquiryText"]');if(intro)intro.textContent=zh?'请填写基本信息，提交后由 LentoTech 团队跟进。':'Share a few details and our team will follow up.';say(zh?'信息将提交至 LentoTech 团队。':'Your message will be sent to the LentoTech team.')};update();document.querySelector('#language')?.addEventListener('change',update)};
    script.onerror=()=>say('Online submission is unavailable. You can still prepare an email.');document.head.append(script);
  }).catch(()=>{});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);
    const name=String(data.get('name')||'').trim(),email=String(data.get('email')||'').trim(),type=String(data.get('type')||''),message=String(data.get('requirement')||'').trim();
    if(!enabled){const body=['Name: '+name,'Work email: '+email,'Inquiry type: '+type,'','Requirement:',message].join('\n');location.href='mailto:info@lentotech.com?subject='+encodeURIComponent(type+' inquiry — '+name)+'&body='+encodeURIComponent(body);return}
    const challenge=window.turnstile.getResponse(widget);if(!challenge){say('Please complete the verification before sending.');return}
    button.disabled=true;try{const res=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,type,message,challenge})});if(!res.ok)throw Error();form.reset();window.turnstile.reset(widget);say('Thank you. Your inquiry has been received.');}catch{window.turnstile.reset(widget);say('We could not send your message. Please try again or email info@lentotech.com.')}finally{button.disabled=false}
  });
})();
