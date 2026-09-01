(function(){
  'use strict';

  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var supported = ['ru','en'];

  function detectLanguage(){
    var list = [];
    if (Array.isArray(navigator.languages)) list = navigator.languages.slice();
    if (navigator.language) list.push(navigator.language);

    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || '').toLowerCase().split('-')[0].split('_')[0];
      if (supported.indexOf(code) !== -1) return code;
    }

    return 'en';
  }

  /* URL language is intentionally ignored so public links stay ?id=7012 only. */
  var lang = detectLanguage();
  localStorage.setItem('matchpro-language', lang);
  document.documentElement.lang = lang;

  /*
   * Public channel URL:
   *   /?id=7012
   * Never redirect to eurosport-2.html and never add &lang=ru/en.
   * The ID router loads the channel document into the current page.
   */
  if ((location.pathname === '/' || /\/index\.html$/i.test(location.pathname)) && id) {
    var channels = window.MATCHPRO_CHANNELS || [];
    var item = channels.find(function(x){ return String(x.id) === String(id); });

    if (item) {
      fetch('./' + item.file, { credentials: 'same-origin' })
        .then(function(response){
          if (!response.ok) throw new Error('Channel page not found');
          return response.text();
        })
        .then(function(html){
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var sourceBody = doc.body;
          if (!sourceBody) throw new Error('Invalid channel page');

          document.body.innerHTML = sourceBody.innerHTML;
          document.body.setAttribute('data-matchpro-channel-id', String(item.id));
          document.documentElement.lang = lang;
          document.title = lang === 'en' ? (item.titleEn || item.nameEn) : (item.titleRu || item.nameRu);

          document.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
          window.dispatchEvent(new CustomEvent('matchpro-content-loaded'));
        })
        .catch(function(){
          location.replace('./');
        });
      return;
    }
  }

  if (lang === 'en') {
    var info = document.querySelector('.info-text');
    if (info) {
      info.textContent = 'Welcome to the world of sports! Here you can find live broadcasts of exciting tournaments, sports interviews and analytical coverage. From football and tennis to basketball and motorsport, follow the events and teams you love in high quality. Our sports pages are available around the clock with fresh highlights and live action from the world of sports.';
    }
  }

  document.documentElement.classList.add('matchpro-ready');
})();
