(function(){
  'use strict';
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var langParam = (params.get('lang') || '').toLowerCase();
  var lang = langParam === 'ru' || langParam === 'en' ? langParam : null;
  var channels = window.MATCHPRO_CHANNELS || [];

  function getLanguage(){
    try {
      var saved = localStorage.getItem('matchpro-language');
      if (saved === 'ru' || saved === 'en') return saved;
    } catch (_) {}
    var list = [];
    if (Array.isArray(navigator.languages)) list = navigator.languages.slice();
    if (navigator.language) list.push(navigator.language);
    for (var i=0;i<list.length;i++) {
      var code=String(list[i]||'').toLowerCase().split('-')[0].split('_')[0];
      if(code==='ru') return 'ru';
      if(code==='en') return 'en';
    }
    return 'en';
  }
  if(!lang) lang=getLanguage();
  try { localStorage.setItem('matchpro-language',lang); } catch (_) {}
  document.documentElement.lang=lang;

  var isHome = location.pathname === '/' || /\/index\.html$/i.test(location.pathname);
  if(isHome && id){
    var item=channels.find(function(x){return String(x.id)===String(id);});
    if(item&&item.file){
      var target='./'+item.file+'?id='+encodeURIComponent(item.id)+'&lang='+encodeURIComponent(lang);
      location.replace(target);
      return;
    }
    location.replace('./404.html?error=invalid-id&lang='+encodeURIComponent(lang));
    return;
  }

  function addLanguageSwitcher(){
    if(document.querySelector('.matchpro-language-switcher')) return;
    var header=document.querySelector('header');
    if(!header) return;
    var box=document.createElement('div');
    box.className='matchpro-language-switcher';
    box.setAttribute('aria-label','Language');
    box.innerHTML='<button type="button" data-lang="ru">RU</button><button type="button" data-lang="en">EN</button>';
    box.querySelectorAll('button').forEach(function(btn){
      if(btn.dataset.lang===lang) btn.classList.add('active');
      btn.addEventListener('click',function(){
        var next=btn.dataset.lang;
        try{localStorage.setItem('matchpro-language',next);}catch(_){}
        var u=new URL(location.href);u.searchParams.set('lang',next);location.href=u.toString();
      });
    });
    header.appendChild(box);
  }
  addLanguageSwitcher();
  document.documentElement.classList.add('matchpro-ready');
})();
