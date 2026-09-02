(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  var path=location.pathname.replace(/\/+$/,'');
  var pathMatch=path.match(/\/([0-9]{4})(?:&lang=(ru|en))?$/i);
  var id=params.get('id')||(pathMatch&&pathMatch[1]);
  var pathLang=(pathMatch&&pathMatch[2]||'').toLowerCase();
  var explicit=(params.get('lang')||pathLang||'').toLowerCase();
  var channels=window.MATCHPRO_CHANNELS||[];
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
  function switchLanguage(next){
    try{localStorage.setItem('matchpro-language',next)}catch(_){}
    var current=currentChannel();
    if(current){location.href=channelUrl(current.id,next)}else{location.href=location.origin+'/?lang='+next}
  }
  function localizeFooter(){
    document.querySelectorAll('footer').forEach(function(f){
      var powered=f.querySelector('.matchpro-powered');
      if(powered){var link=powered.querySelector('a');powered.textContent=lang==='ru'?'Работает на ':'Powered by ';if(link)powered.appendChild(link)}
    });
  }
  function addFooterSwitcher(){
    var footer=document.querySelector('footer');
    if(!footer||footer.querySelector('.matchpro-language-switcher')){localizeFooter();return}
    var box=document.createElement('div');
    box.className='matchpro-language-switcher';
    box.setAttribute('role','group');
    box.setAttribute('aria-label',lang==='ru'?'Язык':'Language');
    box.innerHTML='<span class="matchpro-language-label">'+(lang==='ru'?'Язык':'Language')+'</span><button type="button" data-lang="ru">RU</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="en">EN</button>';
    box.querySelectorAll('button').forEach(function(btn){
      if(btn.dataset.lang===lang)btn.classList.add('active');
      btn.addEventListener('click',function(){if(btn.dataset.lang!==lang)switchLanguage(btn.dataset.lang)})
    });
    footer.insertBefore(box,footer.firstChild);
    localizeFooter();
  }
  function addStylesheets(doc){
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){
      var href=link.getAttribute('href');if(!href)return;
      var absolute=new URL(href,location.origin+'/'+(currentChannel()?currentChannel().file:'' )).href;
      if(!document.querySelector('link[data-matchpro-dynamic="'+absolute+'"]')){
        var s=document.createElement('link');s.rel='stylesheet';s.href=absolute;s.dataset.matchproDynamic=absolute;document.head.appendChild(s)
      }
    });
  }
  async function loadChannelFromQuery(){
    var current=currentChannel();
    if(!current||!params.get('id'))return;
    try{
      document.documentElement.classList.add('matchpro-channel-loading');
      var response=await fetch('/'+current.file,{cache:'no-store'});
      if(!response.ok)throw new Error('channel fetch failed');
      var html=await response.text();
      var parsed=new DOMParser().parseFromString(html,'text/html');
      addStylesheets(parsed);
      document.body.innerHTML=parsed.body.innerHTML;
      document.body.dataset.matchproChannelId=String(current.id);
      document.documentElement.lang=lang;
      if(window.MATCHPRO_BOOT)window.MATCHPRO_BOOT();
      addFooterSwitcher();
      document.documentElement.classList.remove('matchpro-channel-loading');
    }catch(error){
      document.documentElement.classList.remove('matchpro-channel-loading');
      document.body.innerHTML='<main style="max-width:900px;margin:80px auto;padding:24px;text-align:center;font-family:Arial,sans-serif"><h1>'+ (lang==='ru'?'Не удалось загрузить канал':'Unable to load channel') +'</h1><p>'+ (lang==='ru'?'Попробуйте ещё раз.':'Please try again.') +'</p><p><a href="/?lang='+lang+'">'+(lang==='ru'?'К каналам':'Back to channels')+'</a></p></main>';
    }
  }
  window.copyLink=function(){
    var url=location.href;
    var done=function(){var btn=document.querySelector('.share-button');if(!btn)return;var old=btn.innerHTML;btn.innerHTML='<div class="circle-icon">✔</div> '+(lang==='en'?'Copied':'Скопировано');setTimeout(function(){btn.innerHTML=old},2000)};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done).catch(function(){});else{var t=document.createElement('textarea');t.value=url;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(_){}t.remove()}
  };
  function ready(){addFooterSwitcher();loadChannelFromQuery()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
