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

  // Keyed in lower case so an "en-US" link is found by a browser reporting
  // "en-us". The regional pages depend on it: the US and Australian pages
  // differ from the British one by price and tax office, not by language.
  var translated = {};
  document.querySelectorAll('.lang-list a[hreflang]').forEach(function (link) {
    translated[link.getAttribute('hreflang').toLowerCase()] = {
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
    // Full tag first, so "en-au" reaches the Australian page instead of
    // stopping at plain English. Comparing the matched key — not the bare
    // language — against this page is what lets a US reader on the British
    // page be offered dollars: the old check saw "en" on both sides and
    // stayed silent.
    var key = translated[tag] ? tag : (translated[code] ? code : null);
    // A match by bare language must not offer the language the reader is
    // already on: an en-GB browser on the Australian page has no "en-gb"
    // page to reach, fell back to "en", and was told to "Read this in
    // English". Only an exact regional match — en-US on the British page,
    // where the difference is dollars — may cross within a language.
    var pageCode = pageLanguage.toLowerCase().split('-')[0];
    var sameLanguageFallback = key === code && code === pageCode;
    if (key && key !== pageLanguage.toLowerCase() && !sameLanguageFallback) {
      var match = translated[key];
      suggestion.innerHTML = '<span class="flag">' + match.flag + '</span>' +
        '<span></span> →';
      suggestion.querySelectorAll('span')[1].textContent = match.prompt;
      suggestion.setAttribute('lang', key);
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

  /* ---- the bar that follows you down --------------------------------- */
  /* It appears when the hero's own button leaves the screen, which is the
     honest trigger: a fixed scroll distance would sometimes put a second
     "Get DropLane" on screen beside the first, and where that happened would
     depend on how long the headline runs in each of twenty-six languages.

     Shutting it is remembered. Someone who said no should not be asked again
     on the next page, or the next visit. */

  var bar = document.getElementById('cta-bar');
  var heroCta = document.querySelector('.cta-row');
  var SHUT = 'dl-cta-bar-shut';

  /* The page grows by the bar's real height, not a number guessed in the
     stylesheet. Twenty-six languages set "Get DropLane" at twenty-six
     lengths, and the German bar is a line taller than the English one on a
     narrow phone — measure it, or the tallest languages cover the words they
     are sitting on. */
  function measureBar() {
    // Rounded up, never down: offsetHeight truncates a fractional height, and
    // a bar one pixel taller than the padding is a bar sitting on the words.
    var tall = Math.ceil(bar.getBoundingClientRect().height);
    root.style.setProperty('--cta-bar-h', tall + 'px');
  }

  function showBar(show) {
    bar.hidden = false;
    bar.setAttribute('data-shown', show ? 'true' : 'false');
    if (show) { measureBar(); root.setAttribute('data-cta-bar', 'shown'); }
    else { root.removeAttribute('data-cta-bar'); }
  }

  function shutBar() {
    bar.setAttribute('data-shown', 'false');
    root.removeAttribute('data-cta-bar');
    try { localStorage.setItem(SHUT, '1'); } catch (err) {}
  }

  var alreadyShut = false;
  try { alreadyShut = localStorage.getItem(SHUT) === '1'; } catch (err) {}

  if (bar && heroCta && !alreadyShut && 'IntersectionObserver' in window) {
    var shutButton = bar.querySelector('.cta-bar-shut');
    if (shutButton) {
      shutButton.addEventListener('click', function () {
        shutBar();
        // Back to the button it stood in for, so a keyboard reader is not
        // dropped at the bottom of the document with nowhere to go.
        var target = heroCta.querySelector('a, button');
        if (target && document.activeElement === shutButton) { target.focus(); }
        watcher.disconnect();
      });
    }

    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { showBar(!entry.isIntersecting); });
    }, { rootMargin: '0px 0px -40px 0px' });
    watcher.observe(heroCta);

    // Turning the phone, or a font arriving late, changes the height.
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        if (root.getAttribute('data-cta-bar') === 'shown') { measureBar(); }
      }).observe(bar);
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

/* ---- counting visitors --------------------------------------------- */
/* One job: are people finding the site, and do they go on to the App
   Store. Anonymous and cookieless — nothing here identifies a reader.

   Nothing below names a provider except through the two checks in send(),
   so changing analytics means changing the one script tag in
   _build/template.html and the three standalone pages, not this file. */

(function () {
  'use strict';

  function send(name, data) {
    try {
      if (window.fathom) { window.fathom.trackEvent(name); return; }
      if (window.umami) { window.umami.track(name, data); }
    } catch (e) {}
  }

  /* The App Store badge is not on the site yet — it arrives when the app is
     approved. This listener is deliberately written against any link rather
     than against the badge, so it starts reporting the day that link lands,
     with no second visit to this file. */

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var link = target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';

    if (href.indexOf('apps.apple.com') !== -1) { send('appstore-click'); return; }

    /* Someone changing away from the language we offered them is the only
       honest test of whether the twenty-four translations reach the right
       readers, so it is worth a line of its own. */
    if (link.closest('.lang-list') && link.hasAttribute('hreflang')) {
      send('language-switch', { to: link.getAttribute('hreflang') });
      return;
    }

    if (link.host && link.host !== location.host && /^https?:/i.test(link.protocol)) {
      send('outbound-click', { url: href });
    }
  });
})();
