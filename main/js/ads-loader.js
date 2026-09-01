(function () {
  'use strict';
  if (window.MATCHPRO_ADS_LOADED) return;
  window.MATCHPRO_ADS_LOADED = true;

  /*
   * Universal MatchPro advertising slot.
   * Put your advertising JavaScript code in:
   *   /main/ads/ad.js
   *
   * This file is loaded automatically on every MatchPro page.
   * You can paste normal JavaScript here or the JavaScript part of an
   * advertising provider's <script> code.
   */
  var s = document.createElement('script');
  s.src = '/main/ads/ad.js';
  s.async = true;
  s.defer = true;
  s.dataset.matchproAd = '1';
  document.head.appendChild(s);
})();
