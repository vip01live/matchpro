(function(){
  'use strict';

  var params = new URLSearchParams(location.search);
  var id = params.get('id');

  function detectLanguage(){
    var list = [];
    if (Array.isArray(navigator.languages)) list = navigator.languages.slice();
    if (navigator.language) list.push(navigator.language);
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || '').toLowerCase().split('-')[0].split('_')[0];
      if (code === 'ru') return 'ru';
      if (code === 'en') return 'en';
    }
    return 'en';
  }

  var lang = detectLanguage();
  localStorage.setItem('matchpro-language', lang);
  document.documentElement.lang = lang;

  function loadStylesheets(doc){
    /* A channel page must use its own original CSS, not the homepage CSS. */
    Array.prototype.forEach.call(document.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
      link.parentNode.removeChild(link);
    });

    Array.prototype.forEach.call(doc.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
      var href = link.getAttribute('href');
      if (!href) return;
      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL(href, location.href).href;
      document.head.appendChild(style);
    });
  }

  function runBodyScripts(sourceBody){
    /* innerHTML does not execute scripts, so explicitly recreate the channel's
       original body scripts after the body has been inserted. */
    Array.prototype.forEach.call(sourceBody.querySelectorAll('script'), function(oldScript){
      var script = document.createElement('script');
      Array.prototype.forEach.call(oldScript.attributes, function(attr){
        script.setAttribute(attr.name, attr.value);
      });
      script.text = oldScript.text || oldScript.textContent || '';
      oldScript.parentNode.replaceChild(script, oldScript);
    });
  }

  function loadChannel(item){
    fetch('./' + item.file, { credentials: 'same-origin', cache: 'no-store' })
      .then(function(response){
        if (!response.ok) throw new Error('Channel page not found');
        return response.text();
      })
      .then(function(html){
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var sourceBody = doc.body;
        if (!sourceBody) throw new Error('Invalid channel page');

        loadStylesheets(doc);

        document.body.innerHTML = sourceBody.innerHTML;
        document.body.setAttribute('data-matchpro-channel-id', String(item.id));
        document.documentElement.lang = lang;
        document.title = lang === 'en' ? (item.titleEn || item.nameEn) : (item.titleRu || item.nameRu);

        runBodyScripts(document.body);
        window.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
      })
      .catch(function(){ location.replace('./'); });
  }

  if ((location.pathname === '/' || /\/index\.html$/i.test(location.pathname)) && id) {
    var channels = window.MATCHPRO_CHANNELS || [];
    var item = channels.find(function(x){ return String(x.id) === String(id); });
    if (item) {
      loadChannel(item);
      return;
    }
  }

  document.documentElement.classList.add('matchpro-ready');
})();
