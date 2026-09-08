window.MATCHPRO_PLAYER_CONFIG = {
  redirectUrl: "https://t.me/skyxcoding",
  oncePerDay: true,
  openInNewTab: true
};

(function () {
  'use strict';
  if (window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADER) return;
  window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADER = true;

  var s = document.createElement('script');
  s.src = '/main/js/player-click-redirect.js';
  s.defer = true;
  document.head.appendChild(s);
})();
