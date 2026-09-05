/*
 * MATCHPRO GLOBAL AD SCRIPT
 *
 * This single file is loaded by /main/js/ads-loader.js on MatchPro pages.
 * The ad provider scripts are injected into <head> from here, so they do
 * not need to be copied into every HTML page.
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
      zone: '11711828',
      src: 'https://n6wxm.com/vignette.min.js',
      name: 'matchpro-ad-2'
    },
    {
      zone: '11711877',
      src: 'https://nap5k.com/tag.min.js',
      name: 'matchpro-ad-3'
    }
  ];

  function inject() {
    var head = document.head || document.documentElement;
    if (!head) return;

    ads.forEach(function (ad) {
      if (document.querySelector('script[data-matchpro-ad="' + ad.name + '"]')) return;

      var script = document.createElement('script');
      script.dataset.zone = ad.zone;
      script.dataset.matchproAd = ad.name;
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
