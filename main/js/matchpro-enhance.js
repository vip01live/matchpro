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
  try { localStorage.setItem('matchpro-language', lang); } catch (_) {}
  document.documentElement.lang = lang;

  function removeStylesheetPart(part){
    Array.prototype.forEach.call(document.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
      var href = link.getAttribute('href') || '';
      if (href.indexOf(part) !== -1) link.remove();
    });
  }

  function loadChannelStyles(doc){
    removeStylesheetPart('/main/720-css/main.css');
    removeStylesheetPart('/main/900-css/matchpro.css');
    Array.prototype.forEach.call(document.head.querySelectorAll('link[data-matchpro-channel-style]'), function(link){ link.remove(); });

    Array.prototype.forEach.call(doc.head.querySelectorAll('link[rel="stylesheet"]'), function(link){
      var href = link.getAttribute('href');
      if (!href) return;
      var style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL(href, location.href).href;
      style.dataset.matchproChannelStyle = '1';
      document.head.appendChild(style);
    });
  }

  function normalizeChannelFragment(root){
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('iframe[src]'), function(frame){
      var src = frame.getAttribute('src') || '';
      if (src === '/iframe/upl1.php' || src === 'iframe/upl1.php') frame.setAttribute('src', '/iframe/upl1.html');
      if (src === '/iframe/upl2.php' || src === 'iframe/upl2.php') frame.setAttribute('src', '/iframe/upl2.html');
    });
  }

  function appendNodes(target, nodes){
    nodes.forEach(function(node){
      target.appendChild(document.importNode(node, true));
    });
  }

  function runInlineBodyScripts(sourceBody){
    Array.prototype.forEach.call(sourceBody.querySelectorAll('script'), function(oldScript){
      if (oldScript.src) return;
      var script = document.createElement('script');
      script.text = oldScript.text || oldScript.textContent || '';
      document.body.appendChild(script);
    });
  }

  function loadChannel(item){
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, 15000) : null;

    fetch('./' + item.file, {
      credentials: 'same-origin',
      cache: 'default',
      signal: controller ? controller.signal : undefined
    })
      .then(function(response){
        if (!response.ok) throw new Error('Channel page not found');
        return response.text();
      })
      .then(function(html){
        if (timer) clearTimeout(timer);

        var doc = new DOMParser().parseFromString(html, 'text/html');
        var sourceBody = doc.body;
        if (!sourceBody) throw new Error('Invalid channel page');

        loadChannelStyles(doc);

        var header = doc.querySelector('header');
        var main = doc.querySelector('main');
        var footer = doc.querySelector('footer');
        var fragmentRoot = doc.createElement('div');

        if (header) fragmentRoot.appendChild(header.cloneNode(true));
        if (main) fragmentRoot.appendChild(main.cloneNode(true));
        if (footer) fragmentRoot.appendChild(footer.cloneNode(true));
        if (!main) fragmentRoot.innerHTML = sourceBody.innerHTML;

        normalizeChannelFragment(fragmentRoot);
        document.body.innerHTML = '';
        appendNodes(document.body, Array.prototype.slice.call(fragmentRoot.children));
        document.body.setAttribute('data-matchpro-channel-id', String(item.id));
        document.documentElement.lang = lang;
        document.title = lang === 'en' ? (item.titleEn || item.nameEn) : (item.titleRu || item.nameRu);

        runInlineBodyScripts(document.body);
        window.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
      })
      .catch(function(){
        if (timer) clearTimeout(timer);
        location.replace('./');
      });
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
