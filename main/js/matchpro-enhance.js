(function(){
  'use strict';
  var channels=window.MATCHPRO_CHANNELS||[];
  var p=new URLSearchParams(location.search);
  var id=p.get('id');
  var lang=p.get('lang')||localStorage.getItem('matchpro-language')||'ru';
  document.documentElement.lang=lang==='en'?'en':'ru';

  if((location.pathname==='/'||/\/index\.html$/i.test(location.pathname))&&id){
    var item=channels.find(function(x){return String(x.id)===String(id)});
    if(item){
      location.replace(item.file+'?id='+encodeURIComponent(item.id)+'&lang='+lang);
      return;
    }
  }

  if(lang==='en'){
    var info=document.querySelector('.info-text');
    if(info){
      info.textContent='Welcome to the world of sports! Here you can find live broadcasts of exciting tournaments, sports interviews and analytical coverage. From football and tennis to basketball and motorsport, follow the events and teams you love in high quality. Our sports pages are available around the clock with fresh highlights and live action from the world of sports.';
    }
  }

  document.documentElement.classList.add('matchpro-ready');
})();
