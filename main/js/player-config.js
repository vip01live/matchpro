/* Player ad redirect: one click-through per site visit. */
window.MATCHPRO_PLAYER_CONFIG = {
  redirectUrl: "https://lkhq.cc/60dc1304",
  oncePerVisit: true,
  openInNewTab: true
};

(function () {
  'use strict';
  if (window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADER) return;
  window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADER = true;
  var s = document.createElement('script');
  s.src = '/main/js/player-click-redirect.js';
  s.async = true;
  document.head.appendChild(s);
})();