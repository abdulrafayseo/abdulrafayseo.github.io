/* =========================================================
       1. MOBILE NAVIGATION
       ========================================================= */
    (function () {
      const toggle = document.getElementById('nav-toggle');
      const links = document.getElementById('nav-links');
      if (!toggle || !links) return;

      function setOpen(open) {
        links.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }

      toggle.addEventListener('click', function () {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });

      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          toggle.focus();
        }
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 768) setOpen(false);
      });
    })();

    /* =========================================================
       2. MISSING SCREENSHOT FALLBACK
       Keeps the "Real Campaign Results" section presentable
       until the real images are dropped into ./images/
       ========================================================= */
    (function () {
      Array.prototype.forEach.call(document.querySelectorAll('.showcase-card img'), function (img) {
        function markEmpty() {
          const card = img.closest('.showcase-card');
          if (!card || card.classList.contains('is-empty')) return;
          card.classList.add('is-empty');
          const tag = card.querySelector('.showcase-tag');
          const el = document.createElement('div');
          el.className = 'showcase-placeholder';
          const strong = document.createElement('strong');
          strong.textContent = tag ? tag.textContent : 'Result';
          el.appendChild(strong);
          el.appendChild(document.createTextNode('Screenshot coming soon - add it at ' + img.getAttribute('src')));
          card.appendChild(el);
        }
        img.addEventListener('error', markEmpty);
        if (img.complete && img.naturalWidth === 0) markEmpty();
      });
    })();

    /* =========================================================
       3. SERVICE CARD DISCLOSURES
       The + buttons used to do nothing at all.
       ========================================================= */
    (function () {
      Array.prototype.forEach.call(document.querySelectorAll('.btn-plus[aria-controls]'), function (button) {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (!panel) return;
        button.addEventListener('click', function () {
          const open = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!open));
          button.setAttribute('aria-label', open ? 'More about this service' : 'Hide details');
          panel.hidden = open;
        });
      });
    })();

    /* =========================================================
       4. SCROLL-DRIVEN BACKGROUND SEQUENCE
       ---------------------------------------------------------
       120 WebP frames, about 2 MB in total. Only the first few
       are needed before the page is revealed; the rest stream
       in behind it.

       The sequence starts switched OFF for visitors whose system
       asks for reduced motion (on Windows that is Settings >
       Accessibility > Visual effects > Animation effects). The
       toggle in the footer overrides that either way, and the
       choice is remembered for next time.
       ========================================================= */
    (function () {
      const TOTAL_FRAMES = 120;
      const FRAME_PREFIX = '/frames/frame-';
      const FRAME_SUFFIX = '.webp';
      const INITIAL_BATCH = 10;          // frames required before reveal
      const CONCURRENCY = 6;             // parallel background downloads
      const REVEAL_TIMEOUT_MS = 6000;    // never trap the visitor behind the loader
      const STORAGE_KEY = 'portfolio-background-motion';

      const canvas = document.getElementById('animation-canvas');
      const ctx = canvas.getContext('2d');
      const loader = document.getElementById('loader');
      const loaderText = document.getElementById('loader-text');
      const loaderFill = document.getElementById('loader-fill');
      const toggle = document.getElementById('motion-toggle');

      // Only the home page shows the sequence. On the reading pages the CSS
      // hides the canvas, so loading 2.2 MB of frames for a surface nobody
      // sees would be pure waste - and the loader has to come off by hand
      // here, because nothing else is going to hide it.
      if (!document.body.classList.contains('page-home')) {
        if (loader) loader.classList.add('hidden');
        return;
      }

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

      function readChoice() {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
      }

      function writeChoice(value) {
        try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private mode */ }
      }

      const saved = readChoice();
      let motionOn = saved === 'on' ? true : (saved === 'off' ? false : !prefersReduced.matches);

      const images = new Array(TOTAL_FRAMES);
      let targetFrame = 0;
      let currentFrame = 0;
      let running = false;
      let revealed = false;
      let sequenceRequested = false;

      function frameSrc(index) {
        return FRAME_PREFIX + String(index + 1).padStart(3, '0') + FRAME_SUFFIX;
      }

      function loadFrame(index) {
        return new Promise(function (resolve) {
          const img = new Image();
          img.decoding = 'async';
          img.onload = function () { images[index] = img; resolve(true); };
          img.onerror = function () { resolve(false); };
          img.src = frameSrc(index);
        });
      }

      function nearestLoaded(index) {
        for (let i = index; i >= 0; i--) { if (images[i]) return images[i]; }
        for (let i = index + 1; i < TOTAL_FRAMES; i++) { if (images[i]) return images[i]; }
        return null;
      }

      function draw(img) {
        if (!img || !img.naturalWidth) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (w - dw) / 2, dh > h ? 0 : (h - dh) / 2, dw, dh);
      }

      function render() {
        const i = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
        draw(nearestLoaded(i));
      }

      function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        render();
      }

      function tick() {
        const diff = targetFrame - currentFrame;
        if (Math.abs(diff) < 0.01) {
          currentFrame = targetFrame;
          render();
          running = false;               // settle instead of looping forever
          return;
        }
        currentFrame += diff * 0.12;
        render();
        requestAnimationFrame(tick);
      }

      function startTicking() {
        if (running) return;
        running = true;
        requestAnimationFrame(tick);
      }

      function onScroll() {
        if (!motionOn) return;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) return;
        const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / maxScroll));
        targetFrame = progress * (TOTAL_FRAMES - 1);
        startTicking();
      }

      function reveal() {
        if (revealed) return;
        revealed = true;
        loader.classList.add('hidden');
        onScroll();
        render();
      }

      // Skips frames that are already in memory, so this works whether
      // it runs at startup or later, when the toggle is switched on.
      function loadRest() {
        let next = 1;
        function worker() {
          while (next < TOTAL_FRAMES && images[next]) { next++; }
          if (next >= TOTAL_FRAMES) return Promise.resolve();
          const index = next++;
          return loadFrame(index).then(worker);
        }
        const workers = [];
        for (let i = 0; i < CONCURRENCY; i++) { workers.push(worker()); }
        return Promise.all(workers).then(render);
      }

      function ensureSequence() {
        if (sequenceRequested) return;
        sequenceRequested = true;
        loadRest();
      }

      function syncToggle() {
        if (!toggle) return;
        toggle.setAttribute('aria-pressed', String(motionOn));
        const label = toggle.querySelector('.motion-toggle-text');
        if (label) {
          label.textContent = motionOn ? 'Background motion on' : 'Background motion off';
        }
      }

      function applyMotion() {
        syncToggle();
        if (motionOn) {
          ensureSequence();
          onScroll();
        } else {
          running = false;
          currentFrame = 0;
          targetFrame = 0;
          render();
        }
      }

      if (toggle) {
        toggle.addEventListener('click', function () {
          motionOn = !motionOn;
          writeChoice(motionOn ? 'on' : 'off');
          applyMotion();
        });
      }

      // Follow the system setting as long as the visitor has not
      // made a choice of their own on this site.
      if (prefersReduced.addEventListener) {
        prefersReduced.addEventListener('change', function (e) {
          if (readChoice()) return;
          motionOn = !e.matches;
          applyMotion();
        });
      }

      function init() {
        resizeCanvas();
        syncToggle();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', resizeCanvas);
        window.addEventListener('scroll', onScroll, { passive: true });
        setTimeout(reveal, REVEAL_TIMEOUT_MS);

        // With motion off, one still frame is all the page needs.
        const needed = motionOn ? INITIAL_BATCH : 1;
        let done = 0;
        const batch = [];

        for (let i = 0; i < needed; i++) {
          batch.push(loadFrame(i).then(function () {
            done++;
            const percent = Math.round((done / needed) * 100);
            loaderText.textContent = 'Loading ' + percent + '%';
            loaderFill.style.width = percent + '%';
            render();
          }));
        }

        Promise.all(batch).then(function () {
          reveal();
          if (motionOn) ensureSequence();
        });
      }

      init();
    })();

    /* =========================================================
       5. WORK INDEX FILTER
       ---------------------------------------------------------
       Every card is already in the HTML. The filter only toggles
       a class on cards that are on the page, so the list is
       complete before this script runs and stays complete if it
       never does.
       ========================================================= */
    (function () {
      const grid = document.getElementById('work-grid');
      if (!grid) return;

      const buttons = Array.prototype.slice.call(document.querySelectorAll('.work-filter'));
      const cards = Array.prototype.slice.call(grid.querySelectorAll('.work-card'));
      const empty = document.getElementById('work-empty');
      if (!buttons.length) return;

      function applyFilter(value) {
        let shown = 0;
        cards.forEach(function (card) {
          const list = (card.getAttribute('data-disciplines') || '').split(' ');
          const match = value === 'all' || list.indexOf(value) !== -1;
          card.classList.toggle('work-card-hidden', !match);
          if (match) shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      }

      buttons.forEach(function (button) {
        button.addEventListener('click', function () {
          buttons.forEach(function (other) {
            other.setAttribute('aria-pressed', String(other === button));
          });
          applyFilter(button.getAttribute('data-filter') || 'all');
        });
      });
    })();

    /* =========================================================
       6. CASE-STUDY FIGURE LIGHTBOX
       ---------------------------------------------------------
       Thumb in the page, full rendition in the overlay. Focus is
       trapped while open and returned to the trigger on close;
       Escape always closes.
       ========================================================= */
    (function () {
      const triggers = Array.prototype.slice.call(
        document.querySelectorAll('.case-figure-trigger'));
      if (!triggers.length) return;

      const overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.hidden = true;
      overlay.innerHTML =
        '<button type="button" class="lightbox-close" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button><div class="lightbox-figure"><img class="lightbox-image" alt="" /></div>';
      document.body.appendChild(overlay);

      const image = overlay.querySelector('.lightbox-image');
      const closeButton = overlay.querySelector('.lightbox-close');
      let opener = null;

      function close() {
        overlay.hidden = true;
        document.body.classList.remove('lightbox-open');
        image.removeAttribute('src');
        if (opener) { opener.focus(); opener = null; }
      }

      function open(trigger) {
        opener = trigger;
        const img = trigger.querySelector('img');
        image.src = trigger.getAttribute('data-full');
        image.alt = img ? img.alt : '';
        image.width = parseInt(trigger.getAttribute('data-full-width'), 10) || 0;
        image.height = parseInt(trigger.getAttribute('data-full-height'), 10) || 0;
        overlay.setAttribute('aria-label', image.alt);
        overlay.hidden = false;
        document.body.classList.add('lightbox-open');
        closeButton.focus();
      }

      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () { open(trigger); });
      });

      closeButton.addEventListener('click', close);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

      document.addEventListener('keydown', function (e) {
        if (overlay.hidden) return;
        if (e.key === 'Escape') { close(); return; }
        // Only the close button is focusable inside, so Tab stays on it.
        if (e.key === 'Tab') { e.preventDefault(); closeButton.focus(); }
      });
    })();

    /* =========================================================
       7. HEADER SURFACE ON SCROLL
       ---------------------------------------------------------
       The header is fixed and transparent at rest. Once the page
       has moved past the threshold it becomes an opaque blurred
       bar, so body text scrolling underneath never collides with
       the nav labels.
       ========================================================= */
    (function () {
      const header = document.querySelector('header');
      if (!header) return;

      const THRESHOLD = 24;

      // Toggling one class is cheap enough to do inline. Deferring it to
      // requestAnimationFrame would leave the bar in the wrong state whenever
      // the frame callback is throttled, which browsers do for hidden tabs.
      function apply() {
        header.classList.toggle('is-scrolled', (window.scrollY || 0) > THRESHOLD);
      }

      window.addEventListener('scroll', apply, { passive: true });
      window.addEventListener('resize', apply);
      apply();   // a reload partway down the page starts in the right state
    })();

    /* =========================================================
       8. WORK DROPDOWN
       ---------------------------------------------------------
       The menu is already in the HTML, so every discipline page
       is reachable if this never runs. All this adds is the
       collapse: open on click, close on Escape, on outside click
       and on blur out of the menu.
       ========================================================= */
    (function () {
      const dropdowns = Array.prototype.slice.call(
        document.querySelectorAll('.nav-dropdown'));
      if (!dropdowns.length) return;

      function close(dropdown) {
        dropdown.classList.remove('is-open');
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }

      function closeAll(except) {
        dropdowns.forEach(function (d) { if (d !== except) close(d); });
      }

      dropdowns.forEach(function (dropdown) {
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        const menu = dropdown.querySelector('.nav-dropdown-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', function (e) {
          e.preventDefault();
          const open = dropdown.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          closeAll(dropdown);
          if (open) {
            const first = menu.querySelector('a');
            if (first) first.focus();
          }
        });

        // Leaving the group by keyboard closes it; clicking a link inside
        // navigates, so there is nothing to restore.
        dropdown.addEventListener('focusout', function (e) {
          if (!dropdown.contains(e.relatedTarget)) close(dropdown);
        });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const open = dropdowns.filter(function (d) {
          return d.classList.contains('is-open');
        });
        if (!open.length) return;
        open.forEach(function (d) {
          const toggle = d.querySelector('.nav-dropdown-toggle');
          close(d);
          if (toggle) toggle.focus();
        });
      });

      document.addEventListener('click', function (e) {
        dropdowns.forEach(function (d) {
          if (!d.contains(e.target)) close(d);
        });
      });
    })();
