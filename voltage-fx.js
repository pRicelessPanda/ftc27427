/* ============================================================
   Vienna Voltage — shared interaction layer (voltage-fx.js)
   Self-initializing, idempotent. Safe to include on every page.
   ============================================================ */
(function () {
  'use strict';
  if (window.__voltageFX) return;
  window.__voltageFX = true;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------------- Scroll progress bar ---------------- */
  function initProgress() {
    var bar = document.getElementById('prog-bar');
    if (!bar) {
      var wrap = document.createElement('div'); wrap.id = 'prog';
      bar = document.createElement('div'); bar.id = 'prog-bar';
      wrap.appendChild(bar); document.body.appendChild(wrap);
    }
    function upd() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
    }
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /* ---------------- Nav: scrolled state, active link, mobile menu ---------------- */
  function initNav() {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('scrolled', scrollY > 24); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (href && href.indexOf('#') !== 0 && href === here) a.classList.add('active');
    });

    var inner = nav.querySelector('.nav-inner');
    var links = nav.querySelector('.nav-links');
    if (!inner || !links) return;

    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.innerHTML = '<span></span><span></span><span></span>';
    inner.appendChild(btn);

    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);

    var close = function () { document.body.classList.remove('menu-open'); };
    btn.addEventListener('click', function () { document.body.classList.toggle('menu-open'); });
    scrim.addEventListener('click', close);
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------------- Reveal on scroll (with stagger) ---------------- */
  function initReveal() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.dataset.stagger) || 80;
      Array.prototype.forEach.call(group.children, function (c, i) {
        if (!c.dataset.delay) c.dataset.delay = i * step;
      });
    });
    var els = [].slice.call(document.querySelectorAll('.fade, .card, [data-reveal]'));
    if (reduce) { els.forEach(function (e) { e.classList.add('visible', 'show'); }); return; }
    function check() {
      var vh = innerHeight || document.documentElement.clientHeight;
      for (var k = els.length - 1; k >= 0; k--) {
        var el = els[k], r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + 'ms';
          el.classList.add('visible', 'show');
          els.splice(k, 1);
        }
      }
    }
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
    (function loop() { check(); if (els.length) requestAnimationFrame(loop); })();
  }

  /* ---------------- Count up ---------------- */
  function initCounters() {
    var els = [].slice.call(document.querySelectorAll('[data-count]'));
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.dataset.count);
      var dur = +(el.dataset.dur || 1700);
      var pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      var dec = +(el.dataset.dec || 0);
      var group = el.dataset.group !== '0';
      var fmt = function (n) {
        if (dec) return n.toFixed(dec);
        return group ? Math.round(n).toLocaleString('en-US') : '' + Math.round(n);
      };
      if (reduce) { el.textContent = pre + fmt(target) + suf; return; }
      var t0 = null;
      function tick(t) {
        if (t0 === null) t0 = t;
        var p = clamp((t - t0) / dur, 0, 1);
        var e = 1 - Math.pow(2, -10 * p);
        el.textContent = pre + fmt(target * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = pre + fmt(target) + suf;
      }
      requestAnimationFrame(tick);
    }
    function check() {
      var vh = innerHeight || document.documentElement.clientHeight;
      for (var k = els.length - 1; k >= 0; k--) {
        var el = els[k], r = el.getBoundingClientRect();
        if (r.top < vh * 0.85 && r.bottom > 0) { run(el); els.splice(k, 1); }
      }
    }
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    check();
    (function loop() { check(); if (els.length) requestAnimationFrame(loop); })();
  }

  /* ---------------- Magnetic buttons ---------------- */
  function initMagnetic() {
    if (touch || reduce) return;
    var sel = '.btn-primary,.btn-secondary,.nav-cta,[data-magnetic]';
    document.querySelectorAll(sel).forEach(function (el) {
      var strength = el.classList.contains('nav-cta') ? 0.22 : 0.34;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (y - 2).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------- 3D tilt cards ---------------- */
  function initTilt() {
    if (touch || reduce) return;
    var sel = '[data-tilt],.card,.stat-card,.sub-card,.impact-box,.member-card,' +
      '.advisor-card,.use-card,.way-card,.tier-card,.post-card,.sponsor-card';
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.dataset.noTilt) return;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (py - 0.5) * -7;
        var ry = (px - 0.5) * 7;
        el.style.transform = 'perspective(820px) rotateX(' + rx.toFixed(2) +
          'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-5px)';
        el.classList.add('tilting');
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
        el.classList.remove('tilting');
      });
    });
  }

  /* ---------------- Generic scroll parallax ---------------- */
  function initParallax() {
    if (reduce) return;
    var els = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;
    var ticking = false;
    function upd() {
      var y = scrollY;
      els.forEach(function (el) {
        var s = parseFloat(el.dataset.parallax) || 0.2;
        el.style.transform = 'translate3d(0,' + (y * s).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(upd); ticking = true; }
    }, { passive: true });
    upd();
  }

  /* ---------------- Refined spark cursor ---------------- */
  function initCursor() {
    if (touch || reduce) { document.body.style.cursor = 'auto'; return; }
    var sc = document.getElementById('spark-canvas');
    if (!sc) { sc = document.createElement('canvas'); sc.id = 'spark-canvas'; document.body.appendChild(sc); }
    var ctx = sc.getContext('2d');
    var glow = document.getElementById('cursor-glow');
    if (!glow) { glow = document.createElement('div'); glow.id = 'cursor-glow'; document.body.appendChild(glow); }
    var ring = document.getElementById('cursor-ring');
    if (!ring) { ring = document.createElement('div'); ring.id = 'cursor-ring'; document.body.appendChild(ring); }

    function rsz() { sc.width = innerWidth; sc.height = innerHeight; }
    addEventListener('resize', rsz); rsz();

    var mx = innerWidth / 2, my = innerHeight / 2, px = mx, py = my;
    var gx = mx, gy = my, rx = mx, ry = my;
    var sp = [];

    document.addEventListener('mousemove', function (e) {
      px = mx; py = my; mx = e.clientX; my = e.clientY;
      var dx = mx - px, dy = my - py;
      var spd = Math.sqrt(dx * dx + dy * dy);
      var n = Math.min(Math.floor(spd * 0.45), 7);
      for (var i = 0; i < n; i++) {
        var a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.9;
        var s = Math.random() * spd * 0.16 + 0.4;
        sp.push({ x: mx, y: my,
          vx: -Math.cos(a) * s * (0.4 + Math.random() * 0.6),
          vy: -Math.sin(a) * s * (0.4 + Math.random() * 0.6) - Math.random() * 0.7,
          life: 1, decay: 0.028 + Math.random() * 0.04,
          size: Math.random() * 2.2 + 0.6, hue: 200 + Math.random() * 45 });
      }
    });

    document.addEventListener('mousedown', function () { document.body.classList.add('cursor-down'); });
    document.addEventListener('mouseup', function () { document.body.classList.remove('cursor-down'); });

    document.addEventListener('click', function (e) {
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * Math.PI * 2;
        var s = Math.random() * 4 + 1.5;
        sp.push({ x: e.clientX, y: e.clientY,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
          life: 1, decay: 0.018 + Math.random() * 0.024,
          size: Math.random() * 3 + 1, hue: 200 + Math.random() * 50 });
      }
    });

    // hover state via delegation (works for dynamically added nodes too)
    var hoverSel = 'a,button,input,textarea,select,label,[data-tilt],.filter-btn,.sub-nav-item,.tl-node';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover');
    });

    (function anim() {
      gx = lerp(gx, mx, 0.35); gy = lerp(gy, my, 0.35);
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';

      ctx.clearRect(0, 0, sc.width, sc.height);
      for (var i = sp.length - 1; i >= 0; i--) {
        var s = sp[i];
        s.x += s.vx; s.y += s.vy; s.vy += 0.055; s.vx *= 0.97; s.life -= s.decay;
        if (s.life <= 0) { sp.splice(i, 1); continue; }
        var len = Math.sqrt(s.vx * s.vx + s.vy * s.vy) * 2.6;
        var ang = Math.atan2(s.vy, s.vx);
        ctx.save();
        ctx.globalAlpha = s.life;
        ctx.translate(s.x, s.y); ctx.rotate(ang);
        var g = ctx.createLinearGradient(-len, 0, s.size, 0);
        g.addColorStop(0, 'hsla(' + s.hue + ',100%,80%,0)');
        g.addColorStop(0.4, 'hsla(' + s.hue + ',100%,85%,' + s.life + ')');
        g.addColorStop(1, 'hsla(' + (s.hue + 20) + ',100%,96%,' + s.life + ')');
        ctx.strokeStyle = g; ctx.lineWidth = s.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(s.size, 0); ctx.stroke();
        ctx.globalAlpha = s.life * 0.9;
        ctx.fillStyle = 'hsla(' + (s.hue + 20) + ',100%,96%,1)';
        ctx.beginPath(); ctx.arc(s.size, 0, s.size * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(anim);
    })();

    // glow uses left/top:0 baseline now that transform positions it
    glow.style.left = '0px'; glow.style.top = '0px';
  }

  function boot() {
    initProgress();
    initNav();
    initReveal();
    initCounters();
    initMagnetic();
    initTilt();
    initParallax();
    initCursor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
