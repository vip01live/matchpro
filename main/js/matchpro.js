(function () {
  'use strict';
  const channels = Array.isArray(window.MATCHPRO_CHANNELS) ? window.MATCHPRO_CHANNELS : [];
  const config = window.MATCHPRO_PLAYER_CONFIG || { redirectUrl: '', oncePerDay: true, openInNewTab: true };
  const origin = window.location.origin;
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  const pageFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const langKey = 'matchpro-language';
  function detectLanguage(){
    const list=[];
    if(Array.isArray(navigator.languages))list.push(...navigator.languages);
    if(navigator.language)list.push(navigator.language);
    for(const value of list){
      const code=String(value||'').toLowerCase().split('-')[0].split('_')[0];
      if(code==='ru')return'ru';
      if(code==='en')return'en';
    }
    return'en';
  }
  function storageGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);}catch(_) {}}
  let lang = detectLanguage();
  storageSet(langKey, lang);
  document.documentElement.lang = lang;
  const channel = requestedId ? channels.find(x => String(x.id) === String(requestedId)) : channels.find(x => x.file.toLowerCase() === pageFile);
  const translations = {ru:{intro:'Лучшие матчи — в прямом эфире',share:'Поделиться',copied:'Скопировано',watch:'Смотреть онлайн – ',related:'Другие спортивные каналы',copyright:'Авторские права'},en:{intro:'The best matches — live',share:'Share',copied:'Copied',watch:'Watch online – ',related:'Other sports channels',copyright:'Copyright'}};
  const t=k=>translations[lang][k]||k;
  function ensureMeta(name,content){if(!content)return;let el=document.head.querySelector('meta[name="'+name+'"]');if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el);}el.content=content;}
  function ensureProperty(property,content){if(!content)return;let el=document.head.querySelector('meta[property="'+property+'"]');if(!el){el=document.createElement('meta');el.property=property;document.head.appendChild(el);}el.content=content;}
  function setCanonical(url){let el=document.head.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
  function setAlternate(code){let el=document.head.querySelector('link[rel="alternate"][hreflang="'+code+'"]');if(!el){el=document.createElement('link');el.rel='alternate';el.hreflang=code;document.head.appendChild(el);}el.href=channel?origin+'/?id='+channel.id:origin+'/';}
  function applySeo(){const item=channel;if(item){const title=lang==='en'?item.titleEn:item.titleRu;const description=lang==='en'?item.descriptionEn:item.descriptionRu;const keywords=lang==='en'?item.keywordsEn:item.keywordsRu;document.title=title;ensureMeta('description',description);ensureMeta('keywords',keywords);ensureMeta('robots','index, follow, max-image-preview:large');ensureMeta('googlebot','index, follow');ensureProperty('og:title',title);ensureProperty('og:description',description);ensureProperty('og:type','website');if(item.logo)ensureProperty('og:image',new URL(item.logo,origin).href);ensureProperty('og:url',origin+'/?id='+item.id);setCanonical(origin+'/?id='+item.id);}else{document.title=lang==='en'?'Sports channels live online':'Спортивные каналы онлайн в прямом эфире';setCanonical(origin+'/');}setAlternate('ru');setAlternate('en');}
  function renderHomepage(){if((pageFile!=='index.html'&&pageFile!=='')||requestedId)return;const grid=document.querySelector('.channel-grid');if(!grid)return;grid.innerHTML='';channels.forEach(item=>{const a=document.createElement('a');a.className='channel';a.href='./?id='+encodeURIComponent(item.id);const img=document.createElement('img');img.src=item.logo;img.loading='lazy';img.decoding='async';img.alt=lang==='en'?item.nameEn:item.nameRu;a.appendChild(img);grid.appendChild(a);});}
  function renderRelated(){document.querySelectorAll('.related-grid').forEach(grid=>{grid.innerHTML='';channels.forEach(item=>{if(channel&&String(item.id)===String(channel.id))return;const a=document.createElement('a');a.className='channel';a.href='./?id='+encodeURIComponent(item.id);const img=document.createElement('img');img.src=item.logo;img.loading='lazy';img.decoding='async';img.alt=lang==='en'?item.nameEn:item.nameRu;a.appendChild(img);grid.appendChild(a);});});}
  function updateText(){const intro=document.querySelector('.intro-text');if(intro)intro.textContent=t('intro');const share=document.querySelector('.share-button');if(share&&!share.dataset.matchproShareBound){share.dataset.matchproShareBound='1';share.onclick=null;share.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(window.location.href);}catch(_){}share.innerHTML='<div class="circle-icon">✓</div> '+t('copied');setTimeout(()=>{share.innerHTML='<div class="circle-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true"><path d="M23 3a4 4 0 0 0-4 4c0 .29.03.57.09.84l-9.08 4.54A4 4 0 0 0 7 11a4 4 0 1 0 3.01 6.63l9.08 4.54A4 4 0 1 0 20 19.99l-9.09-4.53c.06-.27.09-.55.09-.84s-.03-.57-.09-.83l9.08-4.54A4 4 0 1 0 23 3z"/></svg></div> '+t('share');},1500);});}if(share)share.setAttribute('aria-label',t('share'));const name=document.querySelector('.channel-name');if(name&&channel)name.innerHTML=t('watch')+'<span>'+(lang==='en'?channel.nameEn:channel.nameRu)+'</span>';document.querySelectorAll('footer').forEach(footer=>{footer.querySelectorAll('.matchpro-powered,.matchpro-copyright,.matchpro-legal').forEach(el=>el.remove());const copyright=document.createElement('a');copyright.className='matchpro-copyright';copyright.textContent=t('copyright');copyright.href=lang==='en'?'./copyright-en.html':'./copyright-ru.html';copyright.style.cssText='display:block;margin:12px auto 0;color:inherit;text-decoration:none;cursor:pointer;';footer.appendChild(copyright);const powered=document.createElement('p');powered.className='matchpro-powered';powered.style.cssText='margin:10px 0 0;';powered.innerHTML='Powered by <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none">SkyXCode</a>';footer.appendChild(powered);const year=footer.querySelector('#year');if(year)year.textContent=new Date().getFullYear();});}
  function installPlayerGate(){const iframe=document.querySelector('.player-container iframe, iframe');if(!iframe||!config.redirectUrl||iframe.dataset.matchproGate)return;iframe.dataset.matchproGate='1';const parent=iframe.parentElement;if(!parent)return;parent.style.position=parent.style.position||'relative';const overlay=document.createElement('button');overlay.type='button';overlay.setAttribute('aria-label','Open player');overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:pointer;z-index:20;';parent.appendChild(overlay);const key='matchpro-player-redirect:'+(channel?channel.id:pageFile)+':'+new Date().toISOString().slice(0,10);if(config.oncePerDay&&storageGet(key)==='1')overlay.style.pointerEvents='none';overlay.addEventListener('click',()=>{if(config.oncePerDay&&storageGet(key)==='1'){overlay.style.pointerEvents='none';return;}if(config.oncePerDay)storageSet(key,'1');overlay.style.pointerEvents='none';if(config.openInNewTab)window.open(config.redirectUrl,'_blank','noopener,noreferrer');else window.location.href=config.redirectUrl;});}
  function preventCopyAndZoom(){['copy','cut','paste','contextmenu','selectstart','dragstart'].forEach(evt=>document.addEventListener(evt,e=>e.preventDefault(),{passive:false}));document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['c','x','v','u','a','s','p'].includes(e.key.toLowerCase()))e.preventDefault();},{passive:false});document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});}
  function bootstrap(){applySeo();renderHomepage();renderRelated();updateText();installPlayerGate();preventCopyAndZoom();}
  window.addEventListener('matchpro-content-loaded',bootstrap);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap);else bootstrap();
})();
