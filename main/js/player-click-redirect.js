/* MatchPro: open the ad once per site visit, then leave player clicks alone. */
(function () {
  'use strict';
  if (window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED) return;
  window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED = true;

  var REDIRECT_URL = (window.MATCHPRO_PLAYER_CONFIG && window.MATCHPRO_PLAYER_CONFIG.redirectUrl) || 'https://lkhq.cc/60dc1304';
  var VISIT_KEY = 'matchpro_player_ad_done_v3';
  var REDIRECT_NAV_KEY = 'matchpro_player_ad_navigation_v3';
  var INTERNAL_NAV_KEY = 'matchpro_internal_navigation_v3';
  var OVERLAY_CLASS = 'matchpro-player-click-overlay';

  function read(key) {
    try { return sessionStorage.getItem(key); } catch (_) { return null; }
  }
  function write(key, value) {
    try { sessionStorage.setItem(key, value); } catch (_) {}
  }
  function remove(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
  }
  function addStyles() {
    if (document.getElementById('matchpro-player-click-redirect-style')) return;
    var style = document.createElement('style');
    style.id = 'matchpro-player-click-redirect-style';
    style.textContent = '.' + OVERLAY_CLASS + '{position:absolute;inset:0;z-index:2147483646;display:block;width:100%;height:100%;margin:0;padding:0;border:0;background:transparent;cursor:pointer;appearance:none;-webkit-appearance:none}' +
      '.' + OVERLAY_CLASS + ':focus{outline:none}' +
      '.' + OVERLAY_CLASS + '[hidden]{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }
  function addOverlay(container) {
    if (!container || read(VISIT_KEY) === '1' || !container.querySelector('iframe')) return;
    if (container.querySelector('.' + OVERLAY_CLASS)) return;
    if (window.getComputedStyle(container).position === 'static') container.style.position = 'relative';

    var overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-label', 'Continue to the player');
    overlay.setAttribute('title', 'Continue to the player');
    overlay.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (read(VISIT_KEY) === '1') {
        overlay.remove();
        return;
      }
      write(VISIT_KEY, '1');

      var opened = null;
      try { opened = window.open(REDIRECT_URL, '_blank'); } catch (_) {}
      if (opened) {
        try { opened.opener = null; } catch (_) {}
        overlay.remove();
        return;
      }

      /* If the browser blocks the new tab, use the same tab as a fallback.
         Preserve the once-per-visit flag when the user returns with Back. */
      write(REDIRECT_NAV_KEY, '1');
      overlay.remove();
      try { location.assign(REDIRECT_URL); } catch (_) {}
    });
    container.appendChild(overlay);
  }
  function scan() {
    if (read(VISIT_KEY) === '1') {
      document.querySelectorAll('.' + OVERLAY_CLASS).forEach(function (item) { item.remove(); });
      return;
    }
    addStyles();
    document.querySelectorAll('.player-container').forEach(addOverlay);
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    try {
      var target = new URL(link.href, location.href);
      if (target.origin === location.origin) write(INTERNAL_NAV_KEY, String(Date.now()));
    } catch (_) {}
  }, true);

  window.addEventListener('pagehide', function () {
    if (read(REDIRECT_NAV_KEY) === '1') {
      remove(REDIRECT_NAV_KEY);
      return;
    }
    var mark = Number(read(INTERNAL_NAV_KEY) || 0);
    remove(INTERNAL_NAV_KEY);
    if (mark && Date.now() - mark < 2500) return;
    remove(VISIT_KEY);
  });

  var observer = new MutationObserver(scan);
  function start() {
    scan();
    if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('pageshow', scan);
})();