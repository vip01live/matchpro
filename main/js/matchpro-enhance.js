(function(){
  'use strict';

  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  if (!id) return;

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

  var channels = window.MATCHPRO_CHANNELS || [];
  var item = channels.find(function(x){ return String(x.id) === String(id); });
  if (!item) return;

  function copyAttributes(source, target){
    Array.prototype.forEach.call(source.attributes || [], function(attr){
      target.setAttribute(attr.name, attr.value);
    });
  }

  function executeScript(oldScript){
    var script = document.createElement('script');
    copyAttributes(oldScript, script);
    if (oldScript.src) {
      script.src = new URL(oldScript.getAttribute('src'), location.href).href;
    } else {
      script.textContent = oldScript.textContent || '';
    }
    document.body.appendChild(script);
  }

  function loadChannel(){
    fetch('./' + item.file, {credentials:'same-origin', cache:'no-store'})
      .then(function(response){
        if (!response.ok) throw new Error('Channel page not found: ' + item.file);
        return response.text();
      })
      .then(function(html){
        var doc = new DOMParser().parseFromString(html, 'text/html');
        if (!doc.body) throw new Error('Invalid channel page');

        /* Remove ONLY homepage/shared CSS. The channel keeps its original pg.css. */
        Array.prototype.forEach.call(document.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
          var href = link.getAttribute('href') || '';
          if (/\/main\/720-css\/main\.css(?:\?|#|$)/i.test(href) || /\/main\/900-css\/matchpro\.css(?:\?|#|$)/i.test(href)) {
            link.remove();
          }
        });

        /* Remove any previously injected channel styles before adding the exact styles from the source page. */
        Array.prototype.forEach.call(document.head.querySelectorAll('link[data-matchpro-channel-style="1"]'), function(link){
          link.remove();
        });

        Array.prototype.forEach.call(doc.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
          var href = link.getAttribute('href') || '';
          if (!href || /\/main\/720-css\/main\.css(?:\?|#|$)/i.test(href) || /\/main\/900-css\/matchpro\.css(?:\?|#|$)/i.test(href)) return;
          var style = document.createElement('link');
          copyAttributes(link, style);
          style.href = new URL(href, location.href).href;
          style.dataset.matchproChannelStyle = '1';
          document.head.appendChild(style);
        });

        /* Replace only the page content, then explicitly execute source-page scripts.
           This is necessary because innerHTML does not execute <script> elements. */
        document.body.innerHTML = doc.body.innerHTML;
        document.body.setAttribute('data-matchpro-channel-id', String(item.id));

        document.title = lang === 'en' ? (item.titleEn || item.nameEn) : (item.titleRu || item.nameRu);
        document.documentElement.lang = lang;

        var scripts = Array.prototype.slice.call(doc.body.querySelectorAll('script'));
        scripts.forEach(function(script){
          var src = script.getAttribute('src') || '';
          /* Do not run the router again; it would recursively fetch this page. */
          if (/matchpro-enhance\.js(?:\?|#|$)/i.test(src)) return;
          executeScript(script);
        });

        window.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
      })
      .catch(function(error){
        console.error('MatchPro channel loader:', error);
        location.replace('./');
      });
  }

  if ((location.pathname === '/' || /\/index\.html$/i.test(location.pathname))) {
    loadChannel();
  }
})();
