/*
 * MATCHPRO GLOBAL AD SCRIPT
 *
 * Loads the configured advertising providers once on every MatchPro page.
 */
(function () {
  'use strict';

  if (window.MATCHPRO_GLOBAL_ADS_V1) return;
  window.MATCHPRO_GLOBAL_ADS_V1 = true;

  var ads = [
    {
      zone: '11711828',
      src: 'https://n6wxm.com/vignette.min.js',
      name: 'matchpro-ad-1'
    },
    {
      zone: '11711877',
      src: 'https://nap5k.com/tag.min.js',
      name: 'matchpro-ad-2'
    }
  ];

  function inject() {
    var head = document.head || document.documentElement;
    if (!head) return;

    ads.forEach(function (ad) {
      if (document.querySelector('script[data-matchpro-ad="' + ad.name + '"]')) return;

      var script = document.createElement('script');
      script.setAttribute('data-zone', ad.zone);
      script.setAttribute('data-matchpro-ad', ad.name);
      script.src = ad.src;
      script.async = true;
      head.appendChild(script);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
