(function(){
  'use strict';
  var channels=window.MATCHPRO_CHANNELS||[];
  var p=new URLSearchParams(location.search);
  var id=p.get('id');
  if((location.pathname==='/'||/\/index\.html$/i.test(location.pathname))&&id){
    var item=channels.find(function(x){return String(x.id)===String(id)});
    if(item){
      var u=item.file+'?id='+encodeURIComponent(item.id)+'&lang='+(p.get('lang')||localStorage.getItem('matchpro-language')||'ru');
      location.replace(u);
      return;
    }
  }
  document.documentElement.classList.add('matchpro-ready');
})();
