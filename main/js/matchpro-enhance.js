(function(){
  'use strict';
  var qs=location.search||'';
  var idMatch=qs.match(/[?&]id=([^&]+)/);
  var id=idMatch?decodeURIComponent(idMatch[1]):null;
  var langMatch=qs.match(/[?&]lang=([^&]+)/);
  var explicit=langMatch?decodeURIComponent(langMatch[1]).toLowerCase():'';
  var channels=window.MATCHPRO_CHANNELS||[];
  var COMMON_SCRIPTS=['/main/js/player-config.js','/main/js/channels.js','/main/js/ads-loader.js','/main/js/matchpro.js','/main/js/matchpro-enhance.js'];
  function getLang(){
    if(explicit==='ru'||explicit==='en')return explicit;
    try{var s=localStorage.getItem('matchpro-language');if(s==='ru'||s==='en')return s}catch(_){}
    var list=navigator.languages||[navigator.language||''];
    for(var i=0;i<list.length;i++){var c=String(list[i]||'').toLowerCase().split(/[-_]/)[0];if(c==='ru')return'ru';if(c==='en')return'en'}
    return'en';
  }
  var lang=getLang();
  try{localStorage.setItem('matchpro-language',lang)}catch(_){}
  document.documentElement.lang=lang;
  function currentChannel(){
    for(var i=0;i<channels.length;i++)if(String(channels[i].id)===String(id))return channels[i];
    return null;
  }
  function channelUrl(channelId,next){return location.origin+'/?id='+encodeURIComponent(channelId)+'&lang='+next}
  function homeUrl(next){return location.origin+'/?lang='+next}
  function switchLanguage(next){try{localStorage.setItem('matchpro-language',next)}catch(_){}var current=currentChannel();location.href=current?channelUrl(current.id,next):homeUrl(next)}
  function localizeFooter(){document.querySelectorAll('footer').forEach(function(f){var powered=f.querySelector('.matchpro-powered');if(powered){var link=powered.querySelector('a');powered.textContent=lang==='ru'?'Работает на ':'Powered by ';if(link)powered.appendChild(link)}})}
  function addFooterSwitcher(){document.querySelectorAll('footer').forEach(function(footer){var old=footer.querySelector('.matchpro-language-switcher');if(old)old.remove();var box=document.createElement('div');box.className='matchpro-language-switcher';box.setAttribute('role','group');box.setAttribute('aria-label',lang==='ru'?'Язык':'Language');box.innerHTML='<span class="matchpro-language-label">'+(lang==='ru'?'Язык':'Language')+'</span><button type="button" data-lang="ru">RU</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="en">EN</button>';var buttons=box.querySelectorAll('button');for(var i=0;i<buttons.length;i++){var btn=buttons[i];if(btn.getAttribute('data-lang')===lang)btn.className='active';btn.addEventListener('click',function(){if(this.getAttribute('data-lang')!==lang)switchLanguage(this.getAttribute('data-lang'))})}footer.insertBefore(box,footer.firstChild)});localizeFooter()}
  function absoluteResource(href,file){try{return new URL(href,location.origin+'/'+(file||'')).href}catch(_){return null}}
  function addStylesheets(doc){var file=currentChannel()&&currentChannel().file;var links=doc.querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<links.length;i++){var href=links[i].getAttribute('href');var absolute=absoluteResource(href,file);if(!absolute)continue;var exists=false;var current=document.querySelectorAll('link[rel="stylesheet"]');for(var j=0;j<current.length;j++){if(current[j].href===absolute){exists=true;break}}if(!exists){var s=document.createElement('link');s.rel='stylesheet';s.href=absolute;s.setAttribute('data-matchpro-dynamic','1');document.head.appendChild(s)}}}
  function scriptAlreadyLoaded(src){var normalized;try{normalized=new URL(src,location.href).href}catch(_){normalized=src}var scripts=document.scripts;for(var i=0;i<scripts.length;i++){try{if(new URL(scripts[i].src,location.href).href===normalized)return true}catch(_){if(scripts[i].src===src)return true}}return false}
  function copyScripts(doc){var file=currentChannel()&&currentChannel().file;var scripts=doc.querySelectorAll('script[src]');for(var i=0;i<scripts.length;i++){var raw=scripts[i].getAttribute('src');var src=absoluteResource(raw,file);if(!src||scriptAlreadyLoaded(src))continue;var skip=false;for(var j=0;j<COMMON_SCRIPTS.length;j++){if(absoluteResource(COMMON_SCRIPTS[j],'')===src){skip=true;break}}if(skip)continue;var s=document.createElement('script');s.src=src;s.setAttribute('data-matchpro-dynamic','1');s.async=false;document.body.appendChild(s)}}
  function setMeta(name,content){if(!content)return;var meta=document.querySelector('meta[name="'+name+'"]');if(!meta){meta=document.createElement('meta');meta.name=name;document.head.appendChild(meta)}meta.content=content}
  function setProperty(property,content){if(!content)return;var meta=document.querySelector('meta[property="'+property+'"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('property',property);document.head.appendChild(meta)}meta.content=content}
  function upsertLink(rel,href){var link=document.querySelector('link[rel="'+rel+'"]');if(!link){link=document.createElement('link');link.rel=rel;document.head.appendChild(link)}link.href=href}
  function applySeo(){
    var current=currentChannel();
    if(!current)return;
    var title=lang==='ru'?current.titleRu:current.titleEn;
    var description=lang==='ru'?current.descriptionRu:current.descriptionEn;
    var keywords=lang==='ru'?current.keywordsRu:current.keywordsEn;
    var name=lang==='ru'?current.nameRu:current.nameEn;
    var canonical=location.origin+'/?id='+encodeURIComponent(current.id)+'&lang='+lang;
    document.title=title||((name||'Sports channel')+' | MatchPro');
    setMeta('description',description);
    setMeta('keywords',keywords);
    setMeta('robots','index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('googlebot','index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setProperty('og:title',title);
    setProperty('og:description',description);
    setProperty('og:type','website');
    setProperty('og:url',canonical);
    setProperty('og:image',location.origin+current.logo);
    setMeta('twitter:card','summary_large_image');
    setMeta('twitter:title',title);
    setMeta('twitter:description',description);
    setMeta('twitter:image',location.origin+current.logo);
    upsertLink('canonical',canonical);
    var alts=document.querySelectorAll('link[rel="alternate"][hreflang]');
    for(var i=0;i<alts.length;i++){
      var h=alts[i].getAttribute('hreflang');
      if(h==='ru'||h==='en')alts[i].href=location.origin+'/?id='+encodeURIComponent(current.id)+'&lang='+h;
    }
    var schema=document.getElementById('matchpro-channel-schema');
    if(!schema){schema=document.createElement('script');schema.type='application/ld+json';schema.id='matchpro-channel-schema';document.head.appendChild(schema)}
    schema.textContent=JSON.stringify({
      '@context':'https://schema.org',
      '@type':'WebPage',
      name:title,
      description:description,
      url:canonical,
      inLanguage:lang,
      isPartOf:{'@type':'WebSite',name:'MatchPro',url:location.origin+'/'},
      primaryImageOfPage:{'@type':'ImageObject',url:location.origin+current.logo}
    });
    var heading=document.querySelector('.channel-name span');
    if(heading)heading.textContent=name;
    var related=document.querySelectorAll('a.channel[href*="id=7030"] img');
    for(var r=0;r<related.length;r++){related[r].src='/media/logo/vital-sport-drive.png';related[r].alt='Vital Drive';related[r].loading='lazy';related[r].decoding='async'}
  }
  function normalizeShareButtons(){
    var buttons=document.querySelectorAll('.share-button');
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true"><path d="M23 3a4 4 0 0 0-4 4c0 .29.03.57.09.84l-9.08 4.54A4 4 0 1 0 7 19c1.11 0 2.12-.45 2.85-1.18l9.08 4.54A4 4 0 1 0 23 19c-1.11 0-2.12.45-2.85 1.18l-9.08-4.54c.06-.27.09-.55.09-.84s-.03-.57-.09-.84l9.08-4.54A4 4 0 1 0 23 3z"/></svg>';
    for(var i=0;i<buttons.length;i++){
      var icon=buttons[i].querySelector('.circle-icon');
      if(icon){icon.innerHTML=svg;icon.setAttribute('aria-hidden','true')}
      buttons[i].setAttribute('role','button');
      buttons[i].setAttribute('tabindex','0');
      if(!buttons[i].getAttribute('data-copy-fixed')){
        buttons[i].setAttribute('data-copy-fixed','1');
        buttons[i].addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();window.copyLink()}})
      }
    }
  }
  async function loadChannelFromQuery(){
    var current=currentChannel();
    if(!current||!id||document.documentElement.getAttribute('data-matchpro-channel-loaded')==='1')return;
    try{
      document.documentElement.className+=' matchpro-channel-loading';
      if(typeof fetch!=='function')throw new Error('fetch unsupported');
      var controller=typeof AbortController!=='undefined'?new AbortController():null;
      var timer=controller?setTimeout(function(){controller.abort()},10000):null;
      var response=await fetch('/'+current.file,{cache:'default',credentials:'same-origin',signal:controller?controller.signal:undefined});
      if(timer)clearTimeout(timer);
      if(!response.ok)throw new Error('channel fetch failed');
      var html=await response.text();
      var parsed=new DOMParser().parseFromString(html,'text/html');
      addStylesheets(parsed);
      document.body.innerHTML=parsed.body.innerHTML;
      document.body.setAttribute('data-matchpro-channel-id',String(current.id));
      document.documentElement.lang=lang;
      document.documentElement.setAttribute('data-matchpro-channel-loaded','1');
      copyScripts(parsed);
      if(window.MATCHPRO_BOOT)window.MATCHPRO_BOOT();
      applySeo();
      normalizeShareButtons();
      addFooterSwitcher();
      document.documentElement.className=document.documentElement.className.replace(/\bmatchpro-channel-loading\b/g,'').replace(/\s+/g,' ').replace(/^\s|\s$/g,'');
    }catch(error){
      document.documentElement.className=document.documentElement.className.replace(/\bmatchpro-channel-loading\b/g,'');
      document.body.innerHTML='<main style="max-width:900px;margin:80px auto;padding:24px;text-align:center;font-family:Arial,sans-serif"><h1>'+(lang==='ru'?'Не удалось загрузить канал':'Unable to load channel')+'</h1><p>'+(lang==='ru'?'Попробуйте ещё раз.':'Please try again.')+'</p><p><a href="/?lang='+lang+'">'+(lang==='ru'?'К каналам':'Back to channels')+'</a></p></main>'
    }
  }
  window.copyLink=function(){
    var url=location.href;
    var done=function(){var btn=document.querySelector('.share-button');if(!btn)return;var old=btn.innerHTML;btn.innerHTML='<div class="circle-icon">✔</div> '+(lang==='en'?'Copied':'Скопировано');setTimeout(function(){btn.innerHTML=old;normalizeShareButtons()},2000)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done).catch(function(){fallbackCopy(url,done)})}
    else fallbackCopy(url,done);
  };
  function fallbackCopy(url,done){var t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy')}catch(_){}document.body.removeChild(t);if(ok)done()}
  function optimizeImages(){var imgs=document.images;for(var i=0;i<imgs.length;i++){if(!imgs[i].getAttribute('loading')&&imgs[i].closest('.related-section'))imgs[i].loading='lazy';if(!imgs[i].getAttribute('decoding'))imgs[i].decoding='async'}}
  function ready(){applySeo();normalizeShareButtons();optimizeImages();addFooterSwitcher();loadChannelFromQuery()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
