(function () {
  'use strict';
  if (window.MATCHPRO_ADS_LOADED) return;
  window.MATCHPRO_ADS_LOADED = true;

  function load(src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.dataset.matchproAd = '1';
    document.head.appendChild(s);
  }

  /*
   * Put your ad JavaScript files in /main/ads/ and name them ad1.js, ad2.js,
   * ad3.js ... ad20.js. Every existing file is loaded automatically on every
   * MatchPro page. Missing files are ignored.
   */
  for (var i = 1; i <= 20; i++) {
    load('/main/ads/ad' + i + '.js');
  }
})();
