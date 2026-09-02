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

  if ((location.pathname === '/' || /\/index\.html$/i.test(location.pathname)) && id) {
    var channels = window.MATCHPRO_CHANNELS || [];
    var item = channels.find(function(x){ return String(x.id) === String(id); });
    if (item && item.file) {
      location.replace('./' + item.file);
      return;
    }
  }

  document.documentElement.classList.add('matchpro-ready');
})();
