(function(){
  'use strict';
  var params=new URLSearchParams(location.search);
  var id=params.get('id');
  var explicit=(params.get('lang')||'').toLowerCase();
  var channels=window.MATCHPRO_CHANNELS||[];
  function getLang(){
    if(explicit==='ru'||explicit==='en') return explicit;
    try{var s=localStorage.getItem('matchpro-language');if(s==='ru'||s==='en')return s;}catch(_){}
    var list=[].concat(navigator.languages||[],navigator.language||[]);
    for(var i=0;i<list.length;i++){var c=String(list[i]||'').toLowerCase().split('-')[0].split('_')[0];if(c==='ru')return'ru';if(c==='en')return'en';}
    return'en';
  }
  var lang=getLang();
  try{localStorage.setItem('matchpro-language',lang);}catch(_){}
  document.documentElement.lang=lang;
  var isHome=location.pathname==='/'||/\/index\.html$/i.test(location.pathname);
  if(isHome&&id){
    var item=channels.find(function(x){return String(x.id)===String(id);});
    if(item&&item.file){
      location.replace('./'+item.file+'?id='+encodeURIComponent(item.id));
      return;
    }
    location.replace('./404.html?error=invalid-id');
    return;
  }
  function switchLanguage(next){
    try{localStorage.setItem('matchpro-language',next);}catch(_){}
    var u=new URL(location.href);
    u.searchParams.delete('lang');
    if(id) u.searchParams.set('id',id);
    location.href=u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash;
  }
  function addFooterSwitcher(){
    var footer=document.querySelector('footer');
    if(!footer||footer.querySelector('.matchpro-language-switcher'))return;
    var box=document.createElement('div');
    box.className='matchpro-language-switcher';
    box.setAttribute('role','group');
    box.setAttribute('aria-label','Language');
    box.innerHTML='<span class="matchpro-language-label">Language</span><button type="button" data-lang="ru">RU</button><span class="matchpro-language-sep">|</span><button type="button" data-lang="en">EN</button>';
    box.querySelectorAll('button').forEach(function(btn){
      if(btn.dataset.lang===lang)btn.classList.add('active');
      btn.addEventListener('click',function(){if(btn.dataset.lang!==lang)switchLanguage(btn.dataset.lang);});
    });
    footer.insertBefore(box,footer.firstChild);
  }
  addFooterSwitcher();
  document.documentElement.classList.add('matchpro-ready');
})();
