(function(){
  'use strict';
  var params = new URLSearchParams(location.search);
  var id = params.get('id');

  function detectLanguage(){
    var list = [];
    if (Array.isArray(navigator.languages)) list = navigator.languages.slice();
    if (navigator.language) list.push(navigator.language);
    for (var i=0;i<list.length;i++) {
      var code = String(list[i]||'').toLowerCase().split('-')[0].split('_')[0];
      if (code === 'ru') return 'ru';
      if (code === 'en') return 'en';
    }
    return 'en';
  }

  var lang = detectLanguage();
  localStorage.setItem('matchpro-language', lang);
  document.documentElement.lang = lang;

  function loadChannel(item){
    fetch('./' + item.file, {credentials:'same-origin',cache:'no-store'})
      .then(function(response){
        if (!response.ok) throw new Error('Channel page not found');
        return response.text();
      })
      .then(function(html){
        var doc = new DOMParser().parseFromString(html,'text/html');
        if (!doc.body) throw new Error('Invalid channel page');

        /* The index styles must not override the original channel page design. */
        Array.prototype.forEach.call(document.head.querySelectorAll('link[rel="stylesheet"]'),function(link){
          var href = link.getAttribute('href') || '';
          if (href.indexOf('/main/720-css/main.css') !== -1 || href.indexOf('/main/900-css/matchpro.css') !== -1) link.remove();
        });

        Array.prototype.forEach.call(doc.head.querySelectorAll('link[rel="stylesheet"]'),function(link){
          var href = link.getAttribute('href') || '';
          if (!href || href.indexOf('/main/900-css/matchpro.css') !== -1) return;
          var absolute = new URL(href,location.href).href;
          var exists = false;
          Array.prototype.forEach.call(document.head.querySelectorAll('link[rel="stylesheet"]'),function(x){
            if (new URL(x.href,location.href).href === absolute) exists = true;
          });
          if (!exists) {
            var style = document.createElement('link');
            style.rel='stylesheet';
            style.href=absolute;
            style.dataset.matchproChannelStyle='1';
            document.head.appendChild(style);
          }
        });

        document.body.innerHTML = doc.body.innerHTML;
        document.body.setAttribute('data-matchpro-channel-id',String(item.id));
        document.documentElement.lang=lang;
        document.title=lang==='en'?(item.titleEn||item.nameEn):(item.titleRu||item.nameRu);
        window.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
      })
      .catch(function(error){
        console.error('MatchPro channel loader:',error);
        location.replace('./');
      });
  }

  if ((location.pathname==='/' || /\/index\.html$/i.test(location.pathname)) && id) {
    var channels=window.MATCHPRO_CHANNELS||[];
    var item=channels.find(function(x){return String(x.id)===String(id);});
    if (item) { loadChannel(item); return; }
  }
})();
