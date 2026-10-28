(function () {
  'use strict';

  if (window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED) return;
  window.MATCHPRO_PLAYER_CLICK_REDIRECT_LOADED = true;

  var PREFIX = 'matchpro_player_ad_done_v5_';
  var NAV = 'matchpro_player_ad_navigation_v5';
  var INTERNAL = 'matchpro_internal_navigation_v5';
  var CLS = 'matchpro-player-click-overlay';

  function channel() {
    var id = (document.body && document.body.getAttribute('data-matchpro-channel-id')) ||
      new URLSearchParams(location.search).get('id');
    var list = Array.isArray(window.MATCHPRO_CHANNELS) ? window.MATCHPRO_CHANNELS : [];
    return id ? list.find(function (item) { return String(item.id) === String(id); }) : null;
  }

  function channelId() {
    var current = channel();
    return current ? String(current.id) : 'site';
  }

  function key() { return PREFIX + channelId(); }
  function read(name) { try { return sessionStorage.getItem(name); } catch (_) { return null; } }
  function write(name, value) { try { sessionStorage.setItem(name, value); } catch (_) {} }
  function remove(name) { try { sessionStorage.removeItem(name); } catch (_) {} }

  function mode() {
    var current = channel();
    return current && ['redirect', 'video', 'none'].indexOf(current.adMode) >= 0
      ? current.adMode : 'redirect';
  }

  function httpUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    try {
      var parsed = new URL(raw, location.href);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    } catch (_) {}
    return '';
  }

  function redirectUrl() {
    var current = channel();
    var settings = window.MATCHPRO_SITE_SETTINGS || {};
    var config = window.MATCHPRO_PLAYER_CONFIG || {};
    return httpUrl((current && current.redirectUrl) || settings.defaultRedirectUrl || config.redirectUrl || '');
  }

  function videoUrl() {
    var current = channel();
    return current ? httpUrl(current.videoAdUrl) : '';
  }

  function styles() {
    if (document.getElementById('matchpro-player-ad-style')) return;
    var style = document.createElement('style');
    style.id = 'matchpro-player-ad-style';
    style.textContent =
      '.' + CLS + '{position:absolute;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;width:100%;height:100%;margin:0;padding:0;border:0;background:rgba(0,0,0,.06);cursor:pointer}' +
      '.' + CLS + '[hidden]{display:none!important}' +
      '.' + CLS + ' video{width:100%;height:100%;object-fit:contain;background:#000}' +
      '.' + CLS + ' .mp-ad-fallback-panel{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;max-width:min(520px,90%);padding:22px;border:1px solid #52657c;border-radius:14px;background:#101923;color:#fff;text-align:center;font:500 14px/1.6 system-ui,sans-serif;box-shadow:0 14px 50px #0009}' +
      '.' + CLS + ' .mp-ad-fallback-message{margin:0}' +
      '.' + CLS + ' .mp-ad-fallback{min-height:44px;padding:10px 18px;border-radius:10px;border:1px solid #6c8bb0;background:#1d3450;color:#fff;font:700 14px system-ui,sans-serif;cursor:pointer}' +
      '.' + CLS + ' .mp-ad-fallback:focus-visible{outline:3px solid #fff;outline-offset:3px}';
    document.head.appendChild(style);
  }

  function releaseOverlay(overlay) {
    if (!overlay) return;
    if (typeof overlay._matchproRestoreFrame === 'function') overlay._matchproRestoreFrame();
    overlay.remove();
  }

  function markDone(overlay) {
    write(key(), '1');
    if (overlay && overlay.parentNode) releaseOverlay(overlay);
  }

  function openAdInNewTab(url, overlay) {
    var opened = null;
    try {
      // Keep window.open directly inside the trusted click handler so popup blockers
      // can distinguish a user action from a programmatic anchor.click().
      opened = window.open(url, '_blank');
      if (opened) {
        try { opened.opener = null; } catch (_) {}
        markDone(overlay);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function showPopupFallback(overlay, url) {
    overlay.replaceChildren();
    overlay.style.cursor = 'default';
    overlay.style.background = 'rgba(0,0,0,.82)';
    overlay.removeAttribute('role');
    overlay.removeAttribute('tabindex');
    overlay.removeAttribute('aria-label');

    var panel = document.createElement('div');
    panel.className = 'mp-ad-fallback-panel';
    var message = document.createElement('p');
    message.className = 'mp-ad-fallback-message';
    message.textContent = 'Բրաուզերը արգելափակել է նոր ներդիրի բացումը։ Գովազդը բացելու համար սեղմեք կոճակը։';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'mp-ad-fallback';
    button.textContent = 'Բացել գովազդը նոր ներդիրում';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (!openAdInNewTab(url, overlay)) {
        message.textContent = 'Նոր ներդիրը կրկին արգելափակվեց։ Թույլատրեք pop-up-երը այս կայքի համար և կրկին փորձեք։';
      }
    });
    panel.append(message, button);
    overlay.appendChild(panel);
    button.focus();
  }

  function showVideo(overlay) {
    overlay.replaceChildren();
    overlay.style.background = '#000';
    overlay.style.cursor = 'default';
    var video = document.createElement('video');
    video.src = videoUrl();
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('ended', function () { releaseOverlay(overlay); });
    video.addEventListener('error', function () {
      if (overlay.querySelector('.mp-ad-fallback')) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-ad-fallback';
      button.textContent = 'Շարունակել դեպի ալիք';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        releaseOverlay(overlay);
      });
      overlay.appendChild(button);
    });
    overlay.appendChild(video);
    var playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () {});
  }

  function addOverlay(container) {
    var selectedMode = mode();
    var destination = selectedMode === 'video' ? videoUrl() : redirectUrl();
    if (!container || selectedMode === 'none' || !destination ||
        read(key()) === '1' || !container.querySelector('iframe') ||
        container.querySelector('.' + CLS)) return;

    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    var frame = container.querySelector('iframe');
    var previousTabIndex = frame.getAttribute('tabindex');
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    var overlay = document.createElement('div');
    overlay._matchproRestoreFrame = function () {
      if (previousTabIndex === null) frame.removeAttribute('tabindex');
      else frame.setAttribute('tabindex', previousTabIndex);
      frame.removeAttribute('aria-hidden');
    };
    overlay.className = CLS;
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', selectedMode === 'video'
      ? 'Գործարկել գովազդային տեսանյութը'
      : 'Բացել գովազդը նոր ներդիրում');

    overlay.addEventListener('click', function (event) {
      if (event.target && event.target.closest &&
          event.target.closest('a[href],video,.mp-ad-fallback')) return;
      event.preventDefault();
      event.stopPropagation();
      if (read(key()) === '1') {
        releaseOverlay(overlay);
        return;
      }

      if (selectedMode === 'video') {
        write(key(), '1');
        showVideo(overlay);
        return;
      }

      var url = redirectUrl();
      if (!url) return;
      if (!openAdInNewTab(url, overlay)) showPopupFallback(overlay, url);
    });

    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        overlay.click();
      }
    });
    container.appendChild(overlay);
  }

  function scan() {
    if (read(key()) === '1') {
      document.querySelectorAll('.' + CLS).forEach(function (overlay) {
        if (!overlay.querySelector('video')) releaseOverlay(overlay);
      });
      return;
    }
    styles();
    document.querySelectorAll('.player-container').forEach(addOverlay);
  }

  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    try {
      var target = new URL(anchor.href, location.href);
      if (target.origin === location.origin) write(INTERNAL, String(Date.now()));
    } catch (_) {}
  }, true);

  window.addEventListener('pagehide', function () {
    if (read(NAV) === '1') {
      remove(NAV);
      return;
    }
    var mark = Number(read(INTERNAL) || 0);
    remove(INTERNAL);
    if (mark && Date.now() - mark < 2500) return;
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var name = sessionStorage.key(i);
        if (name && name.indexOf(PREFIX) === 0) sessionStorage.removeItem(name);
      }
    } catch (_) {}
  });

  var observer = new MutationObserver(scan);
  function start() {
    scan();
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-matchpro-channel-id']
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  window.addEventListener('pageshow', scan);
})();