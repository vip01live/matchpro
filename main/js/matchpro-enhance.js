(function(){
  'use strict';
  var qs=location.search||'';
  var idMatch=qs.match(/[?&]id=([^&]+)/);
  var id=idMatch?decodeURIComponent(idMatch[1]):null;
  var langMatch=qs.match(/[?&]lang=([^&]+)/);
  var explicit=langMatch?decodeURIComponent(langMatch[1]).toLowerCase():'';
  var channels=window.MATCHPRO_CHANNELS||[];
  var channelLoadStarted=false;
  var SITE_BASE_URL=(function(){try{var script=document.currentScript;return script&&script.src?new URL("../../",script.src):new URL(".",location.href)}catch(_){return new URL(".",location.href)}})();
  var COMMON_SCRIPTS=['/main/js/player-config.js','/main/js/channels.js','/main/js/ads-loader.js','/main/js/matchpro.js','/main/js/matchpro-enhance.js'];
  function getLang(){
    if(explicit==='hy'||explicit==='ru'||explicit==='en')return explicit;
    try{var s=localStorage.getItem('matchpro-language');if(s==='hy'||s==='ru'||s==='en')return s}catch(_){}
    var browser=(navigator.language||'').toLowerCase();
    if(browser.indexOf('hy')===0)return'hy';
    if(/^(ru|be|kk|ky|uz)(-|$)/.test(browser))return'ru';
    return'en';
  }
  var lang=getLang();
  if(explicit==='hy'||explicit==='ru'||explicit==='en'){try{localStorage.setItem('matchpro-language',lang)}catch(_){}}
  document.documentElement.lang=lang;
  function currentChannel(){
    for(var i=0;i<channels.length;i++){
      if(String(channels[i].id)===String(id)){
        var c=channels[i];
        if(String(id)==='7030'){
          var vital={};
          for(var k in c)if(Object.prototype.hasOwnProperty.call(c,k))vital[k]=c[k];
          vital.nameHy='Vital Drive';vital.nameRu='Vital Drive';vital.nameEn='Vital Drive';vital.logo='/media/logo/vital-sport-drive.png';
          vital.titleHy='Vital Drive — ուղիղ եթեր | MatchPro';vital.titleRu='Vital Drive — прямая трансляция онлайн | MatchPro';vital.titleEn='Vital Drive — Live Stream Online | MatchPro';
          vital.descriptionHy='Դիտեք Vital Drive-ի մարզական հեռարձակումները ուղիղ եթերում MatchPro-ում.';vital.descriptionRu='Смотрите Vital Drive в прямом эфире онлайн на MatchPro. Спортивные трансляции и прямой эфир канала.';vital.descriptionEn='Watch Vital Drive live online on MatchPro. Sports broadcasts and live channel stream.';
          vital.keywordsHy='Vital Drive առցանց, Vital Drive ուղիղ եթեր, սպորտային ալիք';vital.keywordsRu='Vital Drive онлайн, Vital Drive прямой эфир, Vital Drive смотреть онлайн, спорт онлайн, спортивный канал';vital.keywordsEn='Vital Drive live, Vital Drive online, Vital Drive stream, sports live, sports channel';
          return vital;
        }
        return c;
      }
    }
    return null;
  }
  function channelUrl(channelId,next){return location.origin+'/?id='+encodeURIComponent(channelId)+'&lang='+next}
  function homeUrl(next){return location.origin+'/?lang='+next}
  function switchLanguage(next){try{localStorage.setItem('matchpro-language',next)}catch(_){}var current=currentChannel();location.href=current?channelUrl(current.id,next):homeUrl(next)}
  function localizeFooter(){document.querySelectorAll('footer').forEach(function(f){var powered=f.querySelector('.matchpro-powered');if(powered){var link=powered.querySelector('a');powered.textContent=lang==='hy'?'Աշխատում է՝ ':lang==='ru'?'Работает на ':'Powered by ';if(link)powered.appendChild(link)}})}
  function addFooterSwitcher(){document.querySelectorAll('footer').forEach(function(footer){var old=footer.querySelector('.matchpro-language-switcher');if(old)old.remove();var box=document.createElement('div');box.className='matchpro-language-switcher';box.setAttribute('role','group');box.setAttribute('aria-label',lang==='hy'?'Լեզու':lang==='ru'?'Язык':'Language');box.innerHTML='<span class="matchpro-language-label">'+(lang==='hy'?'Լեզու':lang==='ru'?'Язык':'Language')+'</span><button type="button" data-lang="hy">HY</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="ru">RU</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="en">EN</button>';var buttons=box.querySelectorAll('button');for(var i=0;i<buttons.length;i++){var btn=buttons[i];if(btn.getAttribute('data-lang')===lang)btn.className='active';btn.addEventListener('click',function(){if(this.getAttribute('data-lang')!==lang)switchLanguage(this.getAttribute('data-lang'))})}footer.insertBefore(box,footer.firstChild)});localizeFooter()}
  function absoluteResource(href,file){try{var base=file?new URL(file,SITE_BASE_URL.href):SITE_BASE_URL;return new URL(href,base).href}catch(_){return null}}
  function addStylesheets(doc){var file=currentChannel()&&currentChannel().file,links=doc.querySelectorAll('link[rel="stylesheet"]'),pending=[];for(var i=0;i<links.length;i++){var absolute=absoluteResource(links[i].getAttribute('href'),file);if(!absolute)continue;var found=null,current=document.querySelectorAll('link[rel="stylesheet"]');for(var j=0;j<current.length;j++){if(current[j].href===absolute){found=current[j];break}}if(found)continue;found=document.createElement('link');found.rel='stylesheet';found.href=absolute;found.setAttribute('data-matchpro-dynamic','1');pending.push(new Promise(function(resolve,reject){var link=this;link.addEventListener('load',resolve,{once:true});link.addEventListener('error',function(){reject(new Error('channel stylesheet failed to load'))},{once:true});document.head.appendChild(link)}.bind(found)))}return Promise.all(pending)}
  function scriptAlreadyLoaded(src){var normalized;try{normalized=new URL(src,location.href).href}catch(_){normalized=src}var scripts=document.scripts;for(var i=0;i<scripts.length;i++){try{if(new URL(scripts[i].src,location.href).href===normalized)return true}catch(_){if(scripts[i].src===src)return true}}return false}
  function copyScripts(doc){var file=currentChannel()&&currentChannel().file,scripts=doc.querySelectorAll('script[src]'),chain=Promise.resolve();for(var i=0;i<scripts.length;i++){(function(raw){chain=chain.then(function(){var src=absoluteResource(raw,file);if(!src||scriptAlreadyLoaded(src))return;for(var j=0;j<COMMON_SCRIPTS.length;j++)if(absoluteResource(COMMON_SCRIPTS[j],'')===src)return;return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.async=false;s.setAttribute('data-matchpro-dynamic','1');s.addEventListener('load',resolve,{once:true});s.addEventListener('error',function(){reject(new Error('channel script failed to load'))},{once:true});document.body.appendChild(s)})})})(scripts[i].getAttribute('src'))}return chain}
  function setMeta(name,content){if(!content)return;var meta=document.querySelector('meta[name="'+name+'"]');if(!meta){meta=document.createElement('meta');meta.name=name;document.head.appendChild(meta)}meta.content=content}
  function setProperty(property,content){if(!content)return;var meta=document.querySelector('meta[property="'+property+'"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('property',property);document.head.appendChild(meta)}meta.content=content}
  function upsertLink(rel,href){var link=document.querySelector('link[rel="'+rel+'"]');if(!link){link=document.createElement('link');link.rel=rel;document.head.appendChild(link)}link.href=href}
  function applySeo(){
    var current=currentChannel();
    if(!current)return;
    var suffix=lang==='hy'?'Hy':lang==='ru'?'Ru':'En';
    var title=current['title'+suffix]||current.titleHy||current.titleRu||current.titleEn;
    var description=current['description'+suffix]||current.descriptionHy||current.descriptionRu||current.descriptionEn;
    var keywords=current['keywords'+suffix]||current.keywordsHy||current.keywordsRu||current.keywordsEn;
    var name=current['name'+suffix]||current.nameHy||current.nameRu||current.nameEn;
    var canonical=location.origin+'/?id='+encodeURIComponent(current.id)+'&lang='+lang;
    document.title=title||((name||'Sports channel')+' | MatchPro');
    setMeta('description',description);
    setMeta('keywords',keywords);
    var mayIndex=current.published!==false&&current.indexable!==false;
    setMeta('robots',mayIndex?'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1':'noindex,nofollow');
    setMeta('googlebot',mayIndex?'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1':'noindex,nofollow');
    setProperty('og:title',title);setProperty('og:description',description);setProperty('og:type','website');setProperty('og:url',canonical);setProperty('og:image',location.origin+current.logo);
    setMeta('twitter:card','summary_large_image');setMeta('twitter:title',title);setMeta('twitter:description',description);setMeta('twitter:image',location.origin+current.logo);
    upsertLink('canonical',canonical);
    ['hy','ru','en'].forEach(function(h){var alt=document.querySelector('link[rel="alternate"][hreflang="'+h+'"]');if(!alt){alt=document.createElement('link');alt.rel='alternate';alt.hreflang=h;document.head.appendChild(alt)}alt.href=location.origin+'/?id='+encodeURIComponent(current.id)+'&lang='+h})
    var identity=window.MATCHPRO_SITE_SETTINGS&&window.MATCHPRO_SITE_SETTINGS.identity||{},siteName=identity.name||'MatchPro';var schema=document.getElementById('matchpro-channel-schema');if(!schema){schema=document.createElement('script');schema.type='application/ld+json';schema.id='matchpro-channel-schema';document.head.appendChild(schema)}schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title,description:description,url:canonical,inLanguage:lang,isPartOf:{'@type':'WebSite',name:siteName,url:location.origin+'/'},primaryImageOfPage:{'@type':'ImageObject',url:location.origin+current.logo}});
    var heading=document.querySelector('.channel-name span');if(heading)heading.textContent=name;
    var vitalLinks=document.querySelectorAll('a[href*="id=7030"] img');for(var r=0;r<vitalLinks.length;r++){vitalLinks[r].src='/media/logo/vital-sport-drive.png';vitalLinks[r].alt='Vital Drive';vitalLinks[r].loading='lazy';vitalLinks[r].decoding='async'}
  }
  function normalizeShareButtons(){
    var buttons=document.querySelectorAll('.share-button');
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true"><path d="M23 3a4 4 0 0 0-4 4c0 .29.03.57.09.84l-9.08 4.54A4 4 0 1 0 7 19c1.11 0 2.12-.45 2.85-1.18l9.08 4.54A4 4 0 1 0 23 19c-1.11 0-2.12.45-2.85 1.18l-9.08-4.54c.06-.27.09-.55.09-.84s-.03-.57-.09-.84l9.08-4.54A4 4 0 1 0 23 3z"/></svg>';
    for(var i=0;i<buttons.length;i++){var icon=buttons[i].querySelector('.circle-icon');if(icon){icon.innerHTML=svg;icon.setAttribute('aria-hidden','true')}buttons[i].setAttribute('role','button');buttons[i].setAttribute('tabindex','0');if(!buttons[i].getAttribute('data-copy-fixed')){buttons[i].setAttribute('data-copy-fixed','1');buttons[i].addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();window.copyLink()}})}}
  }
  async function loadChannelFromQuery(){
    var current=currentChannel();if(!id)return;if(!current){document.documentElement.classList.remove('matchpro-channel-loading');return}if(channelLoadStarted||document.documentElement.getAttribute('data-matchpro-channel-loaded')==='1')return;channelLoadStarted=true;
    var loader=document.createElement('div');loader.className='matchpro-channel-loader';loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');loader.textContent=lang==='hy'?'Ալիքը բեռնվում է…':lang==='ru'?'Загрузка канала…':'Loading channel…';document.body.appendChild(loader);
    function clearLoading(){document.documentElement.classList.remove('matchpro-channel-loading');if(loader.parentNode)loader.parentNode.removeChild(loader)}
    function showError(){clearLoading();document.documentElement.removeAttribute('data-matchpro-channel-loaded');document.body.innerHTML='';var main=document.createElement('main'),title=document.createElement('h1'),message=document.createElement('p'),actions=document.createElement('div'),retry=document.createElement('a'),back=document.createElement('a');main.className='matchpro-channel-error';title.textContent=lang==='hy'?'Չհաջողվեց բեռնել ալիքը':lang==='ru'?'Не удалось загрузить канал':'Unable to load channel';message.textContent=lang==='hy'?'Ստուգեք կապը և փորձեք կրկին։':lang==='ru'?'Проверьте соединение и попробуйте ещё раз.':'Check your connection and try again.';actions.className='matchpro-channel-error-actions';retry.href=location.href;retry.textContent=lang==='hy'?'Կրկին փորձել':lang==='ru'?'Повторить':'Try again';back.href=absoluteResource('./?lang='+lang,'');back.textContent=lang==='hy'?'Վերադառնալ ալիքներին':lang==='ru'?'К списку каналов':'Back to channels';actions.appendChild(retry);actions.appendChild(back);main.appendChild(title);main.appendChild(message);main.appendChild(actions);document.body.appendChild(main)}
    try{
      document.documentElement.classList.add('matchpro-channel-loading');
      if(window.MATCHPRO_SITE_SETTINGS_READY)await window.MATCHPRO_SITE_SETTINGS_READY;
      if(typeof fetch!=='function')throw new Error('fetch unsupported');
      var controller=typeof AbortController!=='undefined'?new AbortController():null,timer=controller?setTimeout(function(){controller.abort()},10000):null;
      var response=await fetch(absoluteResource(current.file,''),{cache:'default',credentials:'same-origin',signal:controller?controller.signal:undefined});if(timer)clearTimeout(timer);
      if(!response.ok)throw new Error('channel fetch failed');
      var html=await response.text(),parsed=new DOMParser().parseFromString(html,'text/html');
      await addStylesheets(parsed);
      var installChannel=async function(){document.body.innerHTML=parsed.body.innerHTML;document.body.setAttribute('data-matchpro-channel-id',String(current.id));document.documentElement.lang=lang;await copyScripts(parsed);if(window.MATCHPRO_BOOT)window.MATCHPRO_BOOT();applySeo();if(window.MATCHPRO_APPLY_BRANDING)window.MATCHPRO_APPLY_BRANDING();normalizeShareButtons();addFooterSwitcher();document.documentElement.setAttribute('data-matchpro-channel-loaded','1');clearLoading()};
      if(typeof document.startViewTransition==='function'){var pageTransition=document.startViewTransition(installChannel);if(pageTransition&&pageTransition.updateCallbackDone)await pageTransition.updateCallbackDone}else await installChannel();
    }catch(error){if(timer)clearTimeout(timer);showError();console.warn('MatchPro channel load:',error&&error.message||error)}
  }
  window.copyLink=function(){var url=location.href;var done=function(){var btn=document.querySelector('.share-button');if(!btn)return;var old=btn.innerHTML;btn.innerHTML='<div class="circle-icon">✔</div> '+(lang==='hy'?'Պատճենված է':lang==='ru'?'Скопировано':'Copied');setTimeout(function(){btn.innerHTML=old;normalizeShareButtons()},2000)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done).catch(function(){fallbackCopy(url,done)})}else fallbackCopy(url,done)};
  function fallbackCopy(url,done){var t=document.createElement('textarea');t.value=url;t.setAttribute('readonly','');t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy')}catch(_){}document.body.removeChild(t);if(ok)done()}
  function optimizeImages(){var imgs=document.images;for(var i=0;i<imgs.length;i++){if(!imgs[i].getAttribute('loading')&&imgs[i].closest('.related-section'))imgs[i].loading='lazy';if(!imgs[i].getAttribute('decoding'))imgs[i].decoding='async'}}
  function ready(){applySeo();normalizeShareButtons();optimizeImages();addFooterSwitcher();loadChannelFromQuery()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
