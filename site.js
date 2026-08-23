/* DropLane — www.droplane.co.uk
   Six small jobs, no framework:
     · the light/dark switch (and remembering it)
     · the language panel, and offering the visitor their own language
     · the menu sheet on phones
     · country names in the reader's own language, via Intl
     · putting the visitor's own country at the top of the price list
     · the clips: only the ones on screen, and only in the theme on show   */

(function () {
  'use strict';

  var root = document.documentElement;
  var pageLanguage = root.getAttribute('data-lang') || 'en';
  var pageLocale = root.getAttribute('lang') || 'en-GB';

  /* ---- theme -------------------------------------------------------- */

  var KEY = 'dl-theme';

  function apply(theme, remember) {
    root.setAttribute('data-theme', theme);
    if (remember) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#05070A' : '#EEF1F6');
    document.querySelectorAll('.theme button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === theme));
    });
  }

  apply(root.getAttribute('data-theme') || 'light', false);

  document.querySelectorAll('.theme button').forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.theme, true); settleAll(); });
  });

  // Follow the phone until someone states a preference of their own.
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var onSchemeChange = function (e) {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) {}
    if (!saved) { apply(e.matches ? 'dark' : 'light', false); settleAll(); }
  };
  if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
  else if (mq.addListener) mq.addListener(onSchemeChange);

  /* ---- the clips ------------------------------------------------------ */

  // Muted screen recordings, no sound to miss. They cost bandwidth, so none
  // of them is fetched until it is both on screen and in the theme on show:
  // the light and dark hero clips sit in the same slot, and only one of the
  // pair is ever displayed.

  var films = Array.prototype.slice.call(document.querySelectorAll('video[data-film], .film video'));
  var stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
  var onScreen = new WeakSet();

  function showing(video) {
    return video.offsetParent !== null || video.getClientRects().length > 0;
  }

  function settle(video) {
    var wanted = onScreen.has(video) && showing(video) && !stillness.matches && !video.dataset.held;
    if (wanted) {
      if (video.paused) { var playing = video.play(); if (playing && playing.catch) playing.catch(function () {}); }
    } else if (!video.paused) {
      video.pause();
    }
  }

  function settleAll() { films.forEach(settle); }

  if (films.length && 'IntersectionObserver' in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) onScreen.add(entry.target); else onScreen.delete(entry.target);
        settle(entry.target);
      });
    }, { threshold: 0.25 });
    films.forEach(function (video) {
      watcher.observe(video);
      // Tapping one holds it still, so a screen can be read properly.
      video.addEventListener('click', function () {
        if (video.dataset.held) delete video.dataset.held; else video.dataset.held = '1';
        settle(video);
      });
    });
  } else {
    // No observer: the posters stand on their own.
    films.forEach(function (video) { video.setAttribute('controls', ''); });
  }

  if (stillness.addEventListener) stillness.addEventListener('change', settleAll);

  // Chrome stops muted, silent video while the tab is in the background;
  // nothing restarts it on the way back unless we ask.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) settleAll();
  });

  /* ---- the two panels in the header ---------------------------------- */

  function panel(button, element) {
    if (!button || !element) return null;
    var toggle = function (open) {
      button.setAttribute('aria-expanded', String(open));
      element.setAttribute('data-open', String(open));
    };
    button.addEventListener('click', function () {
      toggle(button.getAttribute('aria-expanded') !== 'true');
    });
    element.addEventListener('click', function (e) {
      if (e.target.closest('a')) toggle(false);
    });
    return toggle;
  }

  var closeSheet = panel(document.querySelector('.burger'), document.getElementById('sheet'));
  var closeLanguages = panel(document.querySelector('.lang-button'), document.getElementById('lang-panel'));

  // Only one of them open at a time.
  document.querySelector('.burger') && document.querySelector('.burger')
    .addEventListener('click', function () { closeLanguages && closeLanguages(false); });
  document.querySelector('.lang-button') && document.querySelector('.lang-button')
    .addEventListener('click', function () { closeSheet && closeSheet(false); });

  /* ---- country names, in the reader's language ----------------------- */

  // Written once in English in the HTML so the page still reads without
  // JavaScript, then replaced with the proper name for this page's language.
  try {
    if (window.Intl && Intl.DisplayNames) {
      var names = new Intl.DisplayNames([pageLocale], { type: 'region' });
      document.querySelectorAll('[data-region]').forEach(function (element) {
        var name = names.of(element.getAttribute('data-region'));
        if (name) element.textContent = name;
      });
    }
  } catch (e) {}

  /* ---- offering the visitor their own language ----------------------- */

  var translated = {};
  document.querySelectorAll('.lang-list a[hreflang]').forEach(function (link) {
    translated[link.getAttribute('hreflang')] = {
      href: link.getAttribute('href'),
      name: link.textContent.trim(),
      flag: link.dataset.flag || '',
      // Written in the language being offered — "Read this in English" beside
      // Spanish text explains itself; a bare flag looks like a mistake.
      prompt: link.dataset.suggest || link.textContent.trim()
    };
  });

  var suggestion = document.getElementById('lang-suggest');
  if (suggestion) {
    var tag = (navigator.language || 'en').toLowerCase();
    var code = tag.split('-')[0];
    var match = translated[tag] || translated[code];
    if (match && code !== pageLanguage) {
      suggestion.innerHTML = '<span class="flag">' + match.flag + '</span>' +
        '<span></span> →';
      suggestion.querySelectorAll('span')[1].textContent = match.prompt;
      suggestion.setAttribute('lang', code);
      suggestion.href = match.href;
      suggestion.hidden = false;
      suggestion.classList.add('show');
    }
  }

  /* ---- a nav bar that fits in every language --------------------------- */

  // "Soporte" is longer than "Support" and Polish is longer still, so instead
  // of guessing breakpoints per language, drop links from the end until the
  // row fits. Everything stays reachable in the menu sheet.
  var headRow = document.querySelector('.head-row');
  var menu = document.querySelector('.menu');

  if (headRow && menu) {
    var menuLinks = Array.prototype.slice.call(menu.children);

    var fitMenu = function () {
      menuLinks.forEach(function (link) { link.hidden = false; });
      if (getComputedStyle(menu).display === 'none') return;   // the sheet has it

      for (var i = menuLinks.length - 1; i >= 0; i--) {
        if (menu.scrollWidth <= menu.clientWidth + 1) break;
        menuLinks[i].hidden = true;
      }
    };

    fitMenu();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitMenu, 150);
    });
  }

  /* ---- the report pages, full size ------------------------------------ */

  // The pages are shown small so they sit beside the switches that make them;
  // anyone who wants to read the small print taps one.
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightbox-image');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var lastZoomed = null;

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImage.removeAttribute('src');
    if (lastZoomed) { lastZoomed.focus(); lastZoomed = null; }
  }

  if (lightbox) {
    document.querySelectorAll('[data-zoom]').forEach(function (button) {
      button.addEventListener('click', function () {
        lastZoomed = button;
        lightboxImage.src = button.dataset.zoom;
        var image = button.querySelector('img');
        lightboxImage.alt = image ? image.alt : '';
        lightboxCaption.textContent = button.dataset.zoomLabel || '';
        lightbox.hidden = false;
        lightbox.querySelector('.lightbox-close').focus();
      });
    });

    lightbox.addEventListener('click', function (event) {
      // Anywhere but the page itself closes it.
      if (event.target === lightboxImage) return;
      closeLightbox();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeLightbox();
    });
  }

  /* ---- the price list, starting where the visitor is ------------------ */

  function region() {
    try {
      if (window.Intl && Intl.Locale) {
        var locale = new Intl.Locale(navigator.language);
        var found = locale.region || (locale.maximize && locale.maximize().region);
        if (found) return found.toUpperCase();
      }
    } catch (e) {}
    var parts = (navigator.language || '').split('-');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  }

  var cc = region();
  var body = document.getElementById('price-rows');

  if (body && cc) {
    var mine = body.querySelector('tr[data-cc="' + cc + '"]');
    if (mine) {
      mine.classList.add('you');
      var nameCell = mine.querySelector('td');
      if (nameCell && !nameCell.querySelector('.you-tag')) {
        var tagElement = document.createElement('span');
        tagElement.className = 'you-tag';
        tagElement.textContent = body.dataset.you || 'You';
        nameCell.appendChild(tagElement);
      }
      body.insertBefore(mine, body.firstChild);

      // The badge deliberately stays on the page's own country. Someone
      // reading the Spanish page wants the Spanish price next to the Spanish
      // words; their own storefront is still marked "You" in the table below.
    }
  }

  var search = document.getElementById('price-search');
  if (search && body) {
    search.addEventListener('input', function () {
      var query = search.value.trim().toLowerCase();
      body.querySelectorAll('tr').forEach(function (row) {
        row.hidden = query ? row.textContent.toLowerCase().indexOf(query) === -1 : false;
      });
    });
  }
})();
