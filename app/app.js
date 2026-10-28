(function () {
  'use strict';

  var channels = Array.isArray(window.MATCHPRO_CHANNELS) ? window.MATCHPRO_CHANNELS : [];
  var params = new URLSearchParams(location.search);
  var validLangs = ['hy', 'ru', 'en'];
  function readSavedLang() {
    try { var s = localStorage.getItem('matchpro-app-lang'); if (validLangs.indexOf(s) >= 0) return s; } catch (_) {}
    return 'hy';
  }
  var requested = (params.get('lang') || '').toLowerCase();
  var currentLang = validLangs.indexOf(requested) >= 0 ? requested : readSavedLang();
  var root = './';
  var grid = document.getElementById('channels');
  var playerSection = document.getElementById('player-section');
  var player = document.getElementById('player');
  var title = document.getElementById('player-title');
  var loadController = null;
  var loadToken = 0;
  var text = {
    hy: {
      intro: 'Լավագույն մարզական իրադարձությունները՝ ուղիղ եթերում',
      info: 'Դիտեք ֆուտբոլի, հոկեյի, բասկետբոլի և այլ մարզաձևերի ուղիղ հեռարձակումները մեկ վայրում։ Ընտրեք ալիքը և հետևեք սիրելի թիմերին ու մրցաշարերին։',
      back: '← Վերադառնալ', loading: 'Բեռնվում է նվագարկիչը…', error: 'Չհաջողվեց բեռնել նվագարկիչը։', home: 'Գլխավոր էջ'
    },
    ru: {
      intro: 'Лучшие матчи — в прямом эфире',
      info: 'Смотрите прямые трансляции футбола, хоккея, баскетбола и других видов спорта в одном месте. Выберите канал и следите за любимыми командами и турнирами.',
      back: '← Назад', loading: 'Загрузка плеера…', error: 'Не удалось загрузить плеер.', home: 'Главная'
    },
    en: {
      intro: 'The best matches — live',
      info: 'Watch live football, hockey, basketball and other sports in one place. Choose a channel and follow your favorite teams and tournaments.',
      back: '← Back', loading: 'Loading player…', error: 'The player could not be loaded.', home: 'Home'
    }
  };
  function localeField(c, name) {
    var suffix = currentLang === 'hy' ? 'Hy' : currentLang === 'ru' ? 'Ru' : 'En';
    return (c && (c[name + suffix] || c[name + 'Hy'] || c[name + 'Ru'] || c[name + 'En'])) || '';
  }
  function saveLang(value) {
    try { localStorage.setItem('matchpro-app-lang', value); } catch (_) {}
  }
  function route(id) { return '?id=' + encodeURIComponent(id) + '&lang=' + currentLang; }
  function updateStaticText() {
    var copy = text[currentLang];
    var intro = document.getElementById('intro');
    var info = document.getElementById('info');
    var back = document.getElementById('close-player');
    if (intro) intro.textContent = copy.intro;
    if (info) info.textContent = copy.info;
    if (back) back.textContent = copy.back;
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.lang === currentLang);
      button.setAttribute('aria-pressed', button.dataset.lang === currentLang ? 'true' : 'false');
    });
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }
  function render() {
    if (!grid) return;
    grid.innerHTML = '';
    channels.filter(function(channel){return channel.published!==false;}).forEach(function (channel) {
      var link = document.createElement('a');
      link.className = 'channel';
      link.href = route(channel.id);
      link.dataset.id = channel.id;
      var img = document.createElement('img');
      img.src = channel.logo;
      img.alt = localeField(channel, 'name');
      img.loading = 'lazy';
      img.decoding = 'async';
      link.appendChild(img);
      link.addEventListener('click', function (event) {
        event.preventDefault();
        openChannel(channel.id);
      });
      grid.appendChild(link);
    });
    updateStaticText();
  }
  function resetPlayer() {
    if (loadController) {
      loadController.abort();
      loadController = null;
    }
    loadToken++;
    if (player) {
      player.querySelectorAll('iframe').forEach(function (frame) {
        frame.src = 'about:blank';
        frame.remove();
      });
      player.innerHTML = '';
    }
  }
  async function openChannel(id) {
    var channel = channels.find(function (x) { return String(x.id) === String(id); });
    if (!channel || channel.published===false || !player || !playerSection) return;
    var token = ++loadToken;
    if (loadController) loadController.abort();
    loadController = new AbortController();
    var controller = loadController;
    history.replaceState(null, '', route(channel.id));
    title.textContent = localeField(channel, 'name');
    playerSection.hidden = false;
    grid.hidden = true;
    player.setAttribute('aria-busy', 'true');
    player.innerHTML = '<div class="app-loading">' + text[currentLang].loading + '</div>';
    try {
      var response = await fetch(root + channel.file, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var html = await response.text();
      if (token !== loadToken) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var source = doc.querySelector('.player-container iframe');
      if (!source || !source.getAttribute('src')) throw new Error('Player iframe URL is missing');
      var src = new URL(source.getAttribute('src'), location.href).href;
      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.allow = source.getAttribute('allow') || 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute('referrerpolicy', source.getAttribute('referrerpolicy') || 'no-referrer-when-downgrade');
      iframe.setAttribute('title', localeField(channel, 'name'));
      if (token !== loadToken) return;
      player.replaceChildren(iframe);
      player.setAttribute('aria-busy', 'false');
      loadController = null;
    } catch (error) {
      if (error.name === 'AbortError' || token !== loadToken) return;
      player.innerHTML = '<div class="app-loading">' + text[currentLang].error + '</div>';
      player.setAttribute('aria-busy', 'false');
      loadController = null;
    }
  }
  function closePlayer() {
    resetPlayer();
    playerSection.hidden = true;
    grid.hidden = false;
    history.replaceState(null, '', '?lang=' + currentLang);
  }
  var closeButton = document.getElementById('close-player');
  if (closeButton) closeButton.addEventListener('click', closePlayer);
  document.querySelectorAll('[data-lang]').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = new URLSearchParams(location.search).get('id');
      currentLang = button.dataset.lang;
      saveLang(currentLang);
      render();
      if (id && channels.some(function (x) { return String(x.id) === String(id); })) {
        openChannel(id);
      } else {
        history.replaceState(null, '', '?lang=' + currentLang);
      }
    });
  });
  render();
  var id = new URLSearchParams(location.search).get('id');
  if (channels.some(function (x) { return String(x.id) === String(id); })) openChannel(id);
})();