(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  var id=params.get('id');
  var explicit=(params.get('lang')||'').toLowerCase();
  var channels=window.MATCHPRO_CHANNELS||[];
  var COMMON_SCRIPTS=['/main/js/player-config.js','/main/js/channels.js','/main/js/ads-loader.js','/main/js/matchpro.js','/main/js/matchpro-enhance.js'];
  function getLang(){
    if(explicit==='ru'||explicit==='en')return explicit;
    try{var s=localStorage.getItem('matchpro-language');if(s==='ru'||s==='en')return s}catch(_){}
    var list=[].concat(navigator.languages||[],navigator.language||[]);
    for(var i=0;i<list.length;i++){var c=String(list[i]||'').toLowerCase().split(/[-_]/)[0];if(c==='ru')return'ru';if(c==='en')return'en'}
    return'en';
  }
  var lang=getLang();
  try{localStorage.setItem('matchpro-language',lang)}catch(_){}
  document.documentElement.lang=lang;
  function currentChannel(){return channels.find(function(x){return String(x.id)===String(id)})}
  function channelUrl(channelId,next){return location.origin+'/?id='+encodeURIComponent(channelId)+'&lang='+next}
  function homeUrl(next){return location.origin+'/?lang='+next}
  function switchLanguage(next){try{localStorage.setItem('matchpro-language',next)}catch(_){}var current=currentChannel();location.href=current?channelUrl(current.id,next):homeUrl(next)}
  function localizeFooter(){document.querySelectorAll('footer').forEach(function(f){var powered=f.querySelector('.matchpro-powered');if(powered){var link=powered.querySelector('a');powered.textContent=lang==='ru'?'Работает на ':'Powered by ';if(link)powered.appendChild(link)}})}
  function addFooterSwitcher(){document.querySelectorAll('footer').forEach(function(footer){var old=footer.querySelector('.matchpro-language-switcher');if(old)old.remove();var box=document.createElement('div');box.className='matchpro-language-switcher';box.setAttribute('role','group');box.setAttribute('aria-label',lang==='ru'?'Язык':'Language');box.innerHTML='<span class="matchpro-language-label">'+(lang==='ru'?'Язык':'Language')+'</span><button type="button" data-lang="ru">RU</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="en">EN</button>';box.querySelectorAll('button').forEach(function(btn){if(btn.dataset.lang===lang)btn.classList.add('active');btn.addEventListener('click',function(){if(btn.dataset.lang!==lang)switchLanguage(btn.dataset.lang)})});footer.insertBefore(box,footer.firstChild)});localizeFooter()}
  function absoluteResource(href,file){try{return new URL(href,location.origin+'/'+(file||'')).href}catch(_){return null}}
  function addStylesheets(doc){var file=currentChannel()&&currentChannel().file;doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){var href=link.getAttribute('href');var absolute=absoluteResource(href,file);if(!absolute)return;if(!document.querySelector('link[href="'+CSS.escape(absolute)+'"]')){var s=document.createElement('link');s.rel='stylesheet';s.href=absolute;s.dataset.matchproDynamic='1';document.head.appendChild(s)}})}
  function scriptAlreadyLoaded(src){var normalized;try{normalized=new URL(src,location.href).href}catch(_){normalized=src}return Array.prototype.some.call(document.scripts,function(s){try{return new URL(s.src,location.href).href===normalized}catch(_){return s.src===src}})}
  function copyScripts(doc){var file=currentChannel()&&currentChannel().file;doc.querySelectorAll('script[src]').forEach(function(script){var raw=script.getAttribute('src');var src=absoluteResource(raw,file);if(!src||scriptAlreadyLoaded(src)||COMMON_SCRIPTS.some(function(x){return absoluteResource(x,'')===src}))return;var s=document.createElement('script');s.src=src;s.dataset.matchproDynamic='1';s.async=false;document.body.appendChild(s)})}
  async function loadChannelFromQuery(){var current=currentChannel();if(!current||!params.has('id')||document.documentElement.dataset.matchproChannelLoaded==='1')return;try{document.documentElement.classList.add('matchpro-channel-loading');var controller=typeof AbortController!=='undefined'?new AbortController():null;var timer=controller?setTimeout(function(){controller.abort()},15000):null;var response=await fetch('/'+current.file,{cache:'default',credentials:'same-origin',signal:controller?controller.signal:undefined});if(timer)clearTimeout(timer);if(!response.ok)throw new Error('channel fetch failed');var html=await response.text();var parsed=new DOMParser().parseFromString(html,'text/html');addStylesheets(parsed);document.body.innerHTML=parsed.body.innerHTML;document.body.dataset.matchproChannelId=String(current.id);document.documentElement.lang=lang;document.documentElement.dataset.matchproChannelLoaded='1';copyScripts(parsed);if(window.MATCHPRO_BOOT)window.MATCHPRO_BOOT();addFooterSwitcher();document.documentElement.classList.remove('matchpro-channel-loading')}catch(error){document.documentElement.classList.remove('matchpro-channel-loading');document.body.innerHTML='<main style="max-width:900px;margin:80px auto;padding:24px;text-align:center;font-family:Arial,sans-serif"><h1>'+(lang==='ru'?'Не удалось загрузить канал':'Unable to load channel')+'</h1><p>'+(lang==='ru'?'Попробуйте ещё раз.':'Please try again.')+'</p><p><a href="/?lang='+lang+'">'+(lang==='ru'?'К каналам':'Back to channels')+'</a></p></main>'}}
  window.copyLink=function(){var url=location.href;var done=function(){var btn=document.querySelector('.share-button');if(!btn)return;var old=btn.innerHTML;btn.innerHTML='<div class="circle-icon">✔</div> '+(lang==='en'?'Copied':'Скопировано');setTimeout(function(){btn.innerHTML=old},2000)};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done).catch(function(){});else{var t=document.createElement('textarea');t.value=url;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(_){}t.remove()}};
  function ready(){addFooterSwitcher();loadChannelFromQuery()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
