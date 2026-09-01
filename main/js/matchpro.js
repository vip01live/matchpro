(function () {
  'use strict';
  const channels = Array.isArray(window.MATCHPRO_CHANNELS) ? window.MATCHPRO_CHANNELS : [];
  const config = window.MATCHPRO_PLAYER_CONFIG || { redirectUrl: '', oncePerDay: true, openInNewTab: true };
  const origin = window.location.origin;
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  const pageFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const langKey = 'matchpro-language';
  let lang = params.get('lang') || localStorage.getItem(langKey) || 'ru';
  if (!['ru', 'en'].includes(lang)) lang = 'ru';
  const channel = requestedId ? channels.find(x => String(x.id) === String(requestedId)) : channels.find(x => x.file.toLowerCase() === pageFile);

  const translations = {
    ru: { intro:'Лучшие матчи — в прямом эфире', share:'Поделиться', copied:'Скопировано', watch:'Смотреть онлайн – ', related:'Другие спортивные каналы', copyright:'Авторские права', home:'Главная', language:'Язык' },
    en: { intro:'The best matches — live', share:'Share', copied:'Copied', watch:'Watch online – ', related:'Other sports channels', copyright:'Copyright', home:'Home', language:'Language' }
  };
  const t = k => translations[lang][k] || translations.ru[k] || k;

  function ensureMeta(name, content) { if (!content) return; let el=document.head.querySelector('meta[name="'+name+'"]'); if(!el){el=document.createElement('meta');el.setAttribute('name',name);document.head.appendChild(el);} el.setAttribute('content',content); }
  function ensureProperty(property, content) { if(!content)return;let el=document.head.querySelector('meta[property="'+property+'"]');if(!el){el=document.createElement('meta');el.setAttribute('property',property);document.head.appendChild(el);}el.setAttribute('content',content); }
  function setCanonical(url){let el=document.head.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
  function setAlternate(langCode){let el=document.head.querySelector('link[rel="alternate"][hreflang="'+langCode+'"]');if(!el){el=document.createElement('link');el.rel='alternate';el.hreflang=langCode;document.head.appendChild(el);}const u=new URL(window.location.href);u.searchParams.set('lang',langCode);if(channel){u.searchParams.set('id',channel.id);u.pathname='/'+channel.file;}el.href=u.href;}

  function applySeo(){
    const item=channel;
    if(item){
      const title=lang==='en'?item.titleEn:item.titleRu;
      const description=lang==='en'?item.descriptionEn:item.descriptionRu;
      const keywords=lang==='en'?item.keywordsEn:item.keywordsRu;
      document.title=title;
      ensureMeta('description',description); ensureMeta('keywords',keywords);
      ensureMeta('robots','index, follow, max-image-preview:large'); ensureMeta('googlebot','index, follow');
      ensureProperty('og:title',title); ensureProperty('og:description',description); ensureProperty('og:type','website'); ensureProperty('og:url',window.location.href);
      if(item.logo)ensureProperty('og:image',new URL(item.logo,origin).href);
      ensureMeta('twitter:card','summary_large_image'); ensureMeta('twitter:title',title); ensureMeta('twitter:description',description);
      if(item.logo)ensureMeta('twitter:image',new URL(item.logo,origin).href);
      setCanonical(window.location.href);
    } else {
      document.title=lang==='en'?'Sports channels live online':'Спортивные каналы онлайн в прямом эфире';
      ensureMeta('description',lang==='en'?'Watch sports channels and live broadcasts online on different devices.':'Смотрите спортивные каналы и прямые трансляции онлайн на разных устройствах.');
      ensureMeta('robots','index, follow, max-image-preview:large'); setCanonical(origin+'/');
    }
    setAlternate('ru'); setAlternate('en');
    const ld=document.getElementById('matchpro-jsonld')||document.createElement('script');
    ld.id='matchpro-jsonld'; ld.type='application/ld+json';
    ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:item?(lang==='en'?item.titleEn:item.titleRu):document.title,description:item?(lang==='en'?item.descriptionEn:item.descriptionRu):document.querySelector('meta[name="description"]')?.content,url:window.location.href,isPartOf:{'@type':'WebSite',url:origin+'/'}});
    if(!ld.parentNode)document.head.appendChild(ld);
  }

  function addLanguageSwitcher(){
    let box=document.querySelector('[data-matchpro-language]');
    if(!box){box=document.createElement('div');box.dataset.matchproLanguage='1';box.className='matchpro-language';document.body.appendChild(box);}
    box.innerHTML='';
    ['ru','en'].forEach(code=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=code.toUpperCase(); b.className=lang===code?'active':'';
      b.onclick=()=>{localStorage.setItem(langKey,code);const u=new URL(window.location.href);u.searchParams.set('lang',code);if(channel){u.searchParams.set('id',channel.id);u.pathname='/'+channel.file;}window.location.href=u.href;};
      box.appendChild(b);
    });
  }

  function renderHomepage(){
    if(pageFile!=='index.html'&&pageFile!=='')return;
    const grid=document.querySelector('.channel-grid'); if(!grid)return;
    grid.innerHTML='';
    channels.forEach(item=>{const a=document.createElement('a');a.className='channel';a.href='./'+item.file+'?id='+encodeURIComponent(item.id)+'&lang='+lang;a.dataset.channelId=item.id;const img=document.createElement('img');img.src=item.logo;img.alt=lang==='en'?item.nameEn:item.nameRu;a.appendChild(img);grid.appendChild(a);});
  }

  function renderRelated(){
    document.querySelectorAll('.related-grid').forEach(grid=>{grid.innerHTML='';channels.forEach(item=>{if(channel&&String(item.id)===String(channel.id))return;const a=document.createElement('a');a.className='channel';a.href='./'+item.file+'?id='+encodeURIComponent(item.id)+'&lang='+lang;a.dataset.channelId=item.id;const img=document.createElement('img');img.src=item.logo;img.alt=lang==='en'?item.nameEn:item.nameRu;a.appendChild(img);grid.appendChild(a);});});
  }

  function shareIconSvg(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true" focusable="false"><path d="M23 3a4 4 0 0 0-4 4c0 .29.03.56.09.84l-9.08 4.54A4 4 0 0 0 7 11a4 4 0 1 0 3.01 6.63l9.08 4.54A4 4 0 1 0 23 19a4 4 0 0 0-3.01 1.38l-9.08-4.54c.06-.27.09-.55.09-.84s-.03-.56-.09-.83l9.08-4.54A4 4 0 1 0 23 3z"/></svg>';
  }
  function checkIconSvg(){
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true" focusable="false"><path d="M7 15.5 12.5 21 23 9.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function setShareButton(share, label, copied){
    share.innerHTML='<span class="circle-icon">'+(copied?checkIconSvg():shareIconSvg())+'</span><span class="share-label">'+label+'</span>';
  }
  function updateShare(share){
    share.onclick=null;
    if(!share.dataset.matchproShareBound){
      share.dataset.matchproShareBound='1';
      share.addEventListener('click',async e=>{
        e.preventDefault();
        try { await navigator.clipboard.writeText(window.location.href); }
        catch(_) { try { const ta=document.createElement('textarea');ta.value=window.location.href;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove(); } catch(__){} }
        setShareButton(share,t('copied'),true);
        window.setTimeout(()=>setShareButton(share,t('share'),false),1500);
      });
    }
    setShareButton(share,t('share'),false);
    share.setAttribute('aria-label',t('share'));
    share.setAttribute('role','button');
    share.setAttribute('tabindex','0');
  }

  function updateText(){
    const intro=document.querySelector('.intro-text'); if(intro)intro.textContent=t('intro');
    const share=document.querySelector('.share-button'); if(share)updateShare(share);
    const name=document.querySelector('.channel-name'); if(name&&channel)name.innerHTML=t('watch')+'<span>'+(lang==='en'?channel.nameEn:channel.nameRu)+'</span>';

    document.querySelectorAll('footer').forEach(footer=>{
      footer.querySelectorAll('.matchpro-powered').forEach(el=>el.remove());
      footer.querySelectorAll('a[href*="t.me/skyxcoding"]').forEach(el=>{const p=el.parentElement;if(p&&/Powered by/i.test(p.textContent||''))p.remove();});
      footer.querySelectorAll('.matchpro-copyright,.matchpro-legal').forEach(el=>el.remove());

      // Keep only the year in the original copyright line; remove the site name everywhere.
      const yearNow=new Date().getFullYear();
      let yearLine=footer.querySelector('#year');
      if(yearLine){
        yearLine.textContent=yearNow;
        const p=yearLine.closest('p');
        if(p){p.innerHTML='© <span id="year">'+yearNow+'</span>';p.className='matchpro-year-line';}
      } else {
        const oldYear=footer.querySelector('.matchpro-year-line');
        if(oldYear)oldYear.innerHTML='© <span id="year">'+yearNow+'</span>';
        else { const p=document.createElement('p');p.className='matchpro-year-line';p.innerHTML='© <span id="year">'+yearNow+'</span>';footer.insertBefore(p,footer.firstChild); }
      }

      const copyright=document.createElement('a');
      copyright.className='matchpro-copyright'; copyright.textContent=t('copyright');
      copyright.href=lang==='en'?'./copyright-en.html?lang=en':'./copyright-ru.html?lang=ru';
      copyright.setAttribute('aria-label',t('copyright'));
      footer.appendChild(copyright);

      const powered=document.createElement('p');
      powered.className='matchpro-powered';
      powered.innerHTML='Powered by <a href="https://t.me/skyxcoding" target="_blank" rel="noopener noreferrer">SkyXCode</a>';
      footer.appendChild(powered);
    });
  }

  function installPlayerGate(){
    const iframe=document.querySelector('.player-container iframe, iframe'); if(!iframe||!config.redirectUrl||iframe.dataset.matchproGate)return;
    iframe.dataset.matchproGate='1'; const parent=iframe.parentElement; if(!parent)return; parent.style.position=parent.style.position||'relative';
    const overlay=document.createElement('button'); overlay.type='button'; overlay.setAttribute('aria-label','Open player'); overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:pointer;z-index:20;'; parent.appendChild(overlay);
    const key='matchpro-player-redirect:'+(channel?channel.id:pageFile)+':'+new Date().toISOString().slice(0,10);
    if(config.oncePerDay&&localStorage.getItem(key)==='1')overlay.style.pointerEvents='none';
    overlay.addEventListener('click',()=>{if(config.oncePerDay&&localStorage.getItem(key)==='1'){overlay.style.pointerEvents='none';return;}if(config.oncePerDay)localStorage.setItem(key,'1');overlay.style.pointerEvents='none';if(config.openInNewTab)window.open(config.redirectUrl,'_blank','noopener,noreferrer');else window.location.href=config.redirectUrl;});
  }

  function preventCopyAndZoom(){
    ['copy','cut','paste','contextmenu','selectstart','dragstart'].forEach(evt=>document.addEventListener(evt,e=>e.preventDefault(),{passive:false}));
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['c','x','v','u','a','s','p'].includes(e.key.toLowerCase()))e.preventDefault();},{passive:false});
    document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault();},{passive:false});
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
  }

  function bootstrap(){applySeo();renderHomepage();renderRelated();addLanguageSwitcher();updateText();installPlayerGate();preventCopyAndZoom();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap);else bootstrap();
})();
