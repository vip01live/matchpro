/*
 * MATCHPRO PLAYER CLICK REDIRECT
 *
 * Put your advertising / destination URL in REDIRECT_URL below.
 * The redirect is attached ONLY to .player-container elements.
 * It opens on the first player click, then becomes available again
 * after the configured cooldown. Each page has its own cooldown key.
 */
(function () {
  'use strict';

  var REDIRECT_URL = 'https://example.com/';
  var COOLDOWN_MS = 20 * 60 * 1000;
  var STORAGE_PREFIX = 'matchpro_player_redirect_v1:';
  var OVERLAY_CLASS = 'matchpro-player-click-overlay';

  if (!REDIRECT_URL || REDIRECT_URL === 'https://example.com/') return;
  if (window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED) return;
  window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED = true;

  function storageKey() {
    return STORAGE_PREFIX + location.pathname + location.search;
  }

  function canOpen() {
    try {
      var last = parseInt(localStorage.getItem(storageKey()) || '0', 10);
      return !last || (Date.now() - last >= COOLDOWN_MS);
    } catch (e) {
      return true;
    }
  }

  function markOpened() {
    try {
      localStorage.setItem(storageKey(), String(Date.now()));
    } catch (e) {}
  }

  function openRedirect() {
    var opened = null;
    try {
      opened = window.open(REDIRECT_URL, '_blank', 'noopener,noreferrer');
    } catch (e) {}

    if (opened) {
      markOpened();
      return true;
    }

    return false;
  }

  function addOverlay(container) {
    if (!container || container.querySelector('.' + OVERLAY_CLASS)) return;

    var overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-label', 'Open player');
    overlay.setAttribute('title', 'Open player');

    overlay.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!canOpen()) {
        overlay.remove();
        return;
      }

      openRedirect();
      overlay.remove();
    }, { once: true });

    container.appendChild(overlay);
  }

  function addStyle() {
    if (document.getElementById('matchpro-player-click-redirect-style')) return;

    var style = document.createElement('style');
    style.id = 'matchpro-player-click-redirect-style';
    style.textContent =
      '.' + OVERLAY_CLASS + '{' +
        'position:absolute;' +
        'inset:0;' +
        'z-index:9999;' +
        'display:block;' +
        'width:100%;' +
        'height:100%;' +
        'margin:0;' +
        'padding:0;' +
        'border:0;' +
        'background:transparent;' +
        'cursor:pointer;' +
        'appearance:none;' +
        '-webkit-appearance:none;' +
      '}' +
      '.' + OVERLAY_CLASS + ':focus{outline:none;}';

    (document.head || document.documentElement).appendChild(style);
  }

  function init() {
    var players = document.querySelectorAll('.player-container');
    if (!players.length || !canOpen()) return;

    addStyle();
    players.forEach(addOverlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
