(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  // Viewport height measured once; only a width change (rotation) re-measures it.
  var vh = innerHeight, lastW = innerWidth;
  addEventListener('resize', function () {
    if (innerWidth === lastW) return;
    lastW = innerWidth; vh = innerHeight;
    root.style.setProperty('--vh', vh / 100 + 'px');
    onScroll();
  });

  /* Header + scroll-driven effects */
  var header = $('#header');
  var clean = $('#nettoyage'), cleanStage = clean && $('.clean__stage', clean), pct = $('#clean-pct');
  var ticking = false;
  function onScroll() {
    header.classList.toggle('is-solid', scrollY > 40);
    if (clean) {
      var r = clean.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      var e = Math.min(1, Math.max(0, (p - .12) / .76)); // hold the "before" and "after" a little at each end
      cleanStage.style.setProperty('--p', (e * 100).toFixed(2) + '%');
      cleanStage.style.setProperty('--blade', e > 0 && e < 1 ? 1 : 0);
      pct.textContent = Math.round(e * 100);
    }
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Mobile menu */
  var burger = $('#burger'), nav = $('#nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('is-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false); });

  /* Reveal + counters */
  function count(el) {
    var to = +el.dataset.count;
    if (reduce || to < 2) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1200;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      $$('[data-count]', en.target).forEach(count);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.reveal, .ratio, .plate').forEach(function (el) { io.observe(el); });

  /* Videos: play only when visible, never with reduced motion */
  function autoVideo(v, eager) {
    if (!v) return;
    var btn = $('.vid-btn[data-video="' + v.id + '"]'), userPaused = reduce, seen = false;
    function play() { var p = v.play(); if (p) p.catch(function () {}); }
    function sync() {
      btn.classList.toggle('is-paused', v.paused);
      btn.setAttribute('aria-label', v.paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause');
    }
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    btn.addEventListener('click', function () {
      userPaused = !v.paused;
      if (userPaused) v.pause(); else { v.preload = 'auto'; play(); }
    });
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); }
    new IntersectionObserver(function (en) {
      seen = en[0].isIntersecting;
      if (seen && !userPaused) { if (!eager) v.preload = 'auto'; play(); }
      else if (!seen) v.pause();
    }, { threshold: .15 }).observe(v);
    sync();
  }
  autoVideo($('#hero-video'), true);
  autoVideo($('#cat-video'), false);

  /* Before / after */
  $$('.compare').forEach(function (c) {
    var r = $('.compare__range', c);
    r.addEventListener('input', function () { c.style.setProperty('--pos', r.value + '%'); });
  });
  var tabs = $$('.ba__tabs [role=tab]');
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return;
      var n = tabs[(i + k + tabs.length) % tabs.length]; selectTab(n); n.focus();
    });
  });

  /* Simulator — rates (m²/h) are indicative; ratio from Henri: 1 h of CAT ≈ 1 day of brush cutter */
  var sRange = $('#sim-surface'), sOut = $('#sim-surface-out'), surface = 5000;
  function num(n) { return String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
  function fmtSurface(m) {
    return m >= 10000 ? num(Math.round(m / 1000) / 10) + '\u00a0ha' : num(m) + '\u00a0m²';
  }
  function fmtHours(h) {
    if (h < 1) return 'moins d’1 h';
    return '≈ ' + num(Math.round(h * 2) / 2) + '\u00a0h';
  }
  function fmtDays(h) {
    if (h < 1) return 'presque 1 jour';
    var n = Math.round(h * 2) / 2;
    return '≈ ' + num(n) + (n > 1 ? '\u00a0jours' : '\u00a0jour');
  }
  function sim() {
    var t = +sRange.value / 1000;
    var m = 500 * Math.pow(200, t);
    surface = m < 10000 ? Math.round(m / 100) * 100 : Math.round(m / 1000) * 1000;
    var rate = +$('input[name=dens]:checked').value;
    var h = surface / rate;
    sOut.textContent = fmtSurface(surface);
    sRange.style.setProperty('--fill', (t * 100) + '%');
    $('#sim-cat').textContent = fmtHours(h);
    $('#sim-man').textContent = fmtDays(h);
    // Bars share one time scale: a day of brush cutting = 8 h, so the CAT bar is 1/8 of the other.
    var w = 30 + 70 * t;
    $('#sim-bar-man').style.width = w + '%';
    $('#sim-bar-cat').style.width = (w / 8) + '%';
  }
  sRange.addEventListener('input', sim);
  $$('input[name=dens]').forEach(function (r) { r.addEventListener('change', sim); });
  sim();
  $('#sim-cta').addEventListener('click', function () {
    var v = surface < 1000 ? 0 : surface < 5000 ? 1 : surface < 10000 ? 2 : surface <= 50000 ? 3 : 4;
    $$('input[name=surface]')[v].checked = true;
    var f = $('input[name=type][value="Friche / broussailles"]'); if (!$('input[name=type]:checked')) f.checked = true;
  });

  /* Pour qui tiles pre-fill the form type */
  $$('.tile[data-type]').forEach(function (t) {
    t.addEventListener('click', function () {
      var r = $('input[name=type][value="' + t.dataset.type + '"]'); if (r) r.checked = true;
    });
  });

  /* Gallery filters + lightbox */
  var fbtns = $$('.filters button'), items = $$('.gal__it');
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      fbtns.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      items.forEach(function (it) { it.hidden = b.dataset.filter !== 'tout' && it.dataset.cat !== b.dataset.filter; });
    });
  });
  var lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  items.forEach(function (it) {
    var btn = $('button', it), img = $('img', btn);
    btn.addEventListener('click', function () {
      lbImg.src = btn.dataset.full; lbImg.alt = img.alt; lbCap.textContent = $('span', btn).textContent;
      if (lb.showModal) lb.showModal();
    });
  });
  $('#lb-close').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* Map */
  var map = $('.map'), svg = $('#carte'), info = $('#zone-info'), chips = $$('#towns button');
  var cities = $$('.map__city', svg);
  function pickCity(name) {
    cities.forEach(function (c) { c.classList.toggle('is-on', c.dataset.city === name); });
    chips.forEach(function (b) { b.classList.toggle('is-on', b.dataset.city === name); });
    var c = cities.filter(function (x) { return x.dataset.city === name; })[0];
    if (!c) return;
    info.innerHTML = name === 'Claira'
      ? '<strong>Claira</strong> · notre base, 31 chemin du Mas Bordas'
      : '<strong>' + name + '</strong> · à ' + c.dataset.km + ' km de Claira à vol d’oiseau';
  }
  chips.forEach(function (b) {
    b.addEventListener('click', function () { if (map.classList.contains('is-full')) zoom(false); pickCity(b.dataset.city); });
  });
  cities.forEach(function (c) {
    c.addEventListener('click', function () { pickCity(c.dataset.city); });
    c.addEventListener('mouseenter', function () { pickCity(c.dataset.city); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCity(c.dataset.city); } });
  });
  var toggle = $('#map-toggle');
  function vb(s) { return s.split(' ').map(Number); }
  function zoom(full) {
    var from = vb(svg.getAttribute('viewBox')), to = vb(full ? svg.dataset.full : svg.dataset.zoom);
    map.classList.toggle('is-full', full);
    toggle.setAttribute('aria-pressed', full);
    toggle.textContent = full ? 'Revenir autour de Claira' : 'Voir toute la zone (66 + Aude)';
    if (reduce) { svg.setAttribute('viewBox', to.join(' ')); return; }
    var t0 = performance.now(), dur = 900;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      svg.setAttribute('viewBox', from.map(function (a, i) { return (a + (to[i] - a) * e).toFixed(1); }).join(' '));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  toggle.addEventListener('click', function () { zoom(!map.classList.contains('is-full')); });
  pickCity('Claira');

  /* Multi-step quote form (demo: shows a confirmation, sends nothing) */
  var form = $('#form'), steps = $$('.step', form), cur = 0;
  var prev = $('#form-prev'), next = $('#form-next'), send = $('#form-send');
  function show(i) {
    steps.forEach(function (s, k) { s.hidden = k !== i; s.classList.toggle('is-on', k === i); });
    cur = i;
    $('#form-bar').style.width = ((i + 1) * 25) + '%';
    $('#form-step-lbl').textContent = 'Étape ' + (i + 1) + ' sur 4';
    prev.hidden = i === 0; next.hidden = i === 3; send.hidden = i !== 3;
  }
  function err(step, msg) { var e = $('.form__err', step); if (e) e.textContent = msg || ''; return !msg; }
  function valid(i) {
    var s = steps[i];
    if (i === 0) return err(s, $('input[name=type]:checked', s) ? '' : 'Choisissez un type de terrain pour continuer.');
    if (i === 1) {
      var c = $('input[name=commune]', s);
      c.setAttribute('aria-invalid', !c.value.trim());
      if (!$('input[name=surface]:checked', s)) return err(s, 'Choisissez une surface (ou « Je ne sais pas »).');
      return err(s, c.value.trim() ? '' : 'Indiquez la commune du terrain.');
    }
    if (i === 3) {
      var n = $('input[name=nom]', s), t = $('input[name=tel]', s), m = $('input[name=email]', s);
      var okT = t.value.replace(/[^\d+]/g, '').length >= 10, okM = !m.value || m.checkValidity();
      n.setAttribute('aria-invalid', !n.value.trim()); t.setAttribute('aria-invalid', !okT); m.setAttribute('aria-invalid', !okM);
      if (!n.value.trim()) return err(s, 'Indiquez votre nom.');
      if (!okT) return err(s, 'Indiquez un numéro de téléphone valide.');
      return err(s, okM ? '' : 'L’adresse e-mail ne semble pas correcte.');
    }
    return true;
  }
  function go(i) {
    show(i);
    var top = form.getBoundingClientRect().top;
    if (top < 70) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var f = $('input, textarea', steps[i]); if (f && i !== 2 && matchMedia('(hover: hover)').matches) f.focus({ preventScroll: true });
  }
  next.addEventListener('click', function () {
    if (valid(cur)) return go(cur + 1);
    var bad = $('[aria-invalid="true"]', steps[cur]) || $('input', steps[cur]); if (bad) bad.focus();
  });
  prev.addEventListener('click', function () { go(cur - 1); });
  // Choosing a big button on steps 1-2 moves on automatically: fewer taps for people not used to forms.
  $$('input[name=type]').forEach(function (r) { r.addEventListener('change', function () { err(steps[0], ''); setTimeout(function () { if (cur === 0) go(1); }, 280); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valid(3)) { var bad = $('[aria-invalid="true"]', steps[3]); if (bad) bad.focus(); return; }
    var name = $('input[name=nom]', form).value.trim().split(' ')[0];
    $('#done-name').textContent = name;
    form.classList.add('is-done');
    var done = $('#form-done'); done.hidden = false; done.focus();
  });

  /* Photo upload previews */
  var input = $('#photos'), thumbs = $('#thumbs'), drop = $('#drop'), files = [];
  function render() {
    thumbs.innerHTML = '';
    files.forEach(function (f, i) {
      var li = d.createElement('li'), img = d.createElement('img'), b = d.createElement('button');
      img.src = URL.createObjectURL(f); img.alt = 'Photo ajoutée ' + (i + 1);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', 'Retirer la photo ' + (i + 1));
      b.addEventListener('click', function () { files.splice(i, 1); render(); });
      li.appendChild(img); li.appendChild(b); thumbs.appendChild(li);
    });
    $('strong', drop).textContent = files.length ? 'Ajouter une autre photo' : 'Prendre ou choisir une photo';
  }
  input.addEventListener('change', function () {
    Array.prototype.slice.call(input.files).forEach(function (f) { if (/^image\//.test(f.type) && files.length < 6) files.push(f); });
    input.value = ''; render();
  });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('is-over'); }); });

  $('#year').textContent = new Date().getFullYear();
})();
