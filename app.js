/* MilaPerritos · Misión 1 (mesa · mamá · misa, cursiva Palmer) y Misión 2 (hat · bag · bed · hot, inglés) */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const L = {
    bg: document.getElementById('bg'),
    scene: document.getElementById('scene'),
    fx: document.getElementById('fx'),
    chrome: document.getElementById('chrome'),
  };
  const panel = document.getElementById('panel');
  const C = Cursiva;

  const C_INK = '#3b2a1a';
  const C_ORANGE = '#f28c38';
  const C_GOLD = '#e6b422';
  const C_GREEN = '#3f9f6b';
  const C_BLUE = '#3d8bd8';
  const C_PURPLE = '#9c6ade';
  const C_PINK = '#e86a7a';

  // ------------------------------------------------------------------ Estado (solo en memoria)
  // Cada misión: sus palabras, el perrito que aprende los trucos y el perrito nuevo que llega a la manada.
  const LESSONS = [
    {
      id: 'l1', name: 'Misión 1', title: 'Misión 1 · Español', sub: 'Español · letra cursiva',
      words: ['mesa', 'mamá', 'misa'], warmup: true, lang: 'es', star: 'main', starName: 'tu perrito',
      friend: 'canela', friendName: 'Canela', friendSay: '¡Llegó Canela, una nueva amiga para tu manada!',
      distract: { 'mesa': 'misa', 'mamá': 'mesa', 'misa': 'mamá' },
      tricks: [
        { id: 'patita', name: 'Dar la patita', verb: 'dar la patita' },
        { id: 'rodar', name: 'Rodar', verb: 'rodar' },
        { id: 'pelota', name: 'Atrapar la pelota', verb: 'atrapar la pelota' },
      ],
    },
    {
      id: 'l2', name: 'Misión 2', title: 'Misión 2 · Inglés', sub: 'Inglés · letra de imprenta',
      words: ['hat', 'bag', 'bed', 'hot'], warmup: false, lang: 'en', star: 'canela', starName: 'Canela',
      friend: 'coco', friendName: 'Coco', friendSay: '¡Llegó Coco, un perrito nuevo para tu manada!',
      distract: { 'hat': 'hot', 'hot': 'hat', 'bag': 'bed', 'bed': 'bag' },
      tricks: [
        { id: 'sentarse', name: 'Sentarse', verb: 'sentarse' },
        { id: 'patita2', name: 'Dar la patita', verb: 'dar la patita' },
        { id: 'acostarse', name: 'Acostarse', verb: 'acostarse' },
        { id: 'saltar', name: 'Saltar', verb: 'saltar' },
      ],
    },
  ];
  const EN_WORDS = new Set(LESSONS.filter((l) => l.lang === 'en').flatMap((l) => l.words));
  const PRINT_WORDS = EN_WORDS;
  function lessonOf(word) { return LESSONS.find((l) => l.words.includes(word)) || LESSONS[0]; }
  function lessonDone(l) { return l.words.every((w) => S.progress[w] && S.progress[w].done); }
  let LES = LESSONS[0], WORDS = LES.words, TRICKS = LES.tricks;
  function setLesson(id) {
    LES = LESSONS.find((l) => l.id === id) || LESSONS[0];
    WORDS = LES.words; TRICKS = LES.tricks; S.lesson = LES.id;
  }
  function blankWord() { return { find: null, build: null, read: null, write: null, trick: null, done: false }; }
  function freshState() {
    const p = {};
    LESSONS.forEach((l) => l.words.forEach((w) => (p[w] = blankWord())));
    // Misión 1 ya la completó Milana (mesa, mamá, misa) y Canela ya está en su manada.
    LESSONS[0].words.forEach((w, i) => { p[w].done = true; p[w].trick = LESSONS[0].tricks[i].id; p[w].prev = true; });
    return { warmup: true, progress: p, friends: ['canela'], sound: true, voice: true, lesson: 'l2' };
  }
  const STORE = 'milaperritos_v2';
  function loadState() {
    const base = freshState();
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return base;
      const d = JSON.parse(raw);
      const st = Object.assign(base, d);
      st.progress = Object.assign(freshState().progress, d.progress || {});
      if (!Array.isArray(st.friends)) st.friends = [];
      if (!st.friends.includes('canela')) st.friends.unshift('canela');
      return st;
    } catch (e) { return base; }
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }
  let S = loadState();
  setLesson(S.lesson || 'l2');

  // ------------------------------------------------------------------ Utilidades SVG
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'cls') n.setAttribute('class', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }
  function restartClass(node, cls) {
    node.classList.remove(cls);
    void node.getBoundingClientRect();
    node.classList.add(cls);
  }
  function toStage(evt) {
    const pt = stage.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(stage.getScreenCTM().inverse());
  }
  function tween(dur, fn, done) {
    const t0 = performance.now();
    function f(t) {
      const k = Math.min(1, (t - t0) / dur);
      fn(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      if (k < 1) raf.push(requestAnimationFrame(f)); else if (done) done();
    }
    raf.push(requestAnimationFrame(f));
  }

  // Temporizadores ligados a la pantalla actual
  let timers = [];
  let raf = [];
  function later(ms, fn) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() {
    timers.forEach(clearTimeout); timers = [];
    raf.forEach(cancelAnimationFrame); raf = [];
  }

  // ------------------------------------------------------------------ Sonido
  let actx = null;
  function ac() {
    if (!actx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) actx = new A();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  const SFX = {
    yip(delay) {
      if (!S.sound) return; const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const v = 0.85 + Math.random() * 0.3;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1350 * v; f.Q.value = 1.3;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(680 * v, t);
      o.frequency.exponentialRampToValueAtTime(1550 * v, t + 0.035);
      o.frequency.exponentialRampToValueAtTime(540 * v, t + 0.15);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2);
    },
    yips(n) { for (let i = 0; i < n; i++) SFX.yip(i * 0.19); },
    whine(delay) {
      if (!S.sound) return; const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(950, t);
      o.frequency.linearRampToValueAtTime(1420, t + 0.25);
      o.frequency.linearRampToValueAtTime(1150, t + 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.65);
    },
    tone(freq, dur, type, vol, delay) {
      if (!S.sound) return; const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    pop() { SFX.tone(520, 0.09, 'triangle', 0.14); SFX.tone(780, 0.07, 'triangle', 0.08, 0.03); },
    click() { SFX.tone(1200, 0.05, 'square', 0.05); SFX.tone(1800, 0.04, 'triangle', 0.06, 0.02); },
    sniff() {
      if (!S.sound) return; const c = ac(); if (!c) return;
      for (let i = 0; i < 2; i++) {
        const t = c.currentTime + i * 0.2;
        const len = Math.floor(c.sampleRate * 0.12);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len);
        const src = c.createBufferSource(); src.buffer = buf;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.8;
        const g = c.createGain(); g.gain.value = 0.18;
        src.connect(f); f.connect(g); g.connect(c.destination); src.start(t);
      }
    },
    sparkle() { [880, 1108, 1318, 1760].forEach((f, i) => SFX.tone(f, 0.22, 'sine', 0.07, i * 0.07)); },
    fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => SFX.tone(f, 0.26, 'triangle', 0.09, i * 0.13)); },
    balloon() {
      if (!S.sound) return; const c = ac(); if (!c) return;
      const t = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.08);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = 0.35;
      src.connect(g); g.connect(c.destination); src.start(t);
    },
  };

  // ------------------------------------------------------------------ Voz (prototipo: síntesis del navegador)
  let esVoice = null, enVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    const norm = (x) => (x.lang || '').replace('_', '-');
    esVoice = null; enVoice = null;
    const pref = ['es-VE', 'es-US', 'es-419', 'es-MX', 'es-CO', 'es-ES'];
    for (const p of pref) { const v = vs.find((x) => norm(x) === p); if (v) { esVoice = v; break; } }
    if (!esVoice) esVoice = vs.find((x) => norm(x).toLowerCase().startsWith('es')) || null;
    // Inglés: preferimos voces de EE. UU. de buena calidad
    const en = vs.filter((x) => norm(x).toLowerCase().startsWith('en'));
    const score = (v) => (norm(v) === 'en-US' ? 10 : 0) + (/google|natural|neural|samantha|aria|jenny|zira/i.test(v.name) ? 5 : 0) + (v.localService ? 0 : 1);
    enVoice = en.sort((a, b) => score(b) - score(a))[0] || null;
  }
  function splitLang(text) {
    // separa las palabras en inglés para que se digan con voz en inglés
    const parts = [];
    const re = /[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]+/g;
    let last = 0, m, buf = '';
    while ((m = re.exec(text))) {
      if (EN_WORDS.has(m[0].toLowerCase())) {
        buf += text.slice(last, m.index);
        if (buf.trim()) parts.push({ t: buf, lang: 'es' });
        buf = '';
        parts.push({ t: m[0].toLowerCase(), lang: 'en' });
        last = m.index + m[0].length;
      }
    }
    buf += text.slice(last);
    if (buf.replace(/[\s¿?¡!.,:;]/g, '')) parts.push({ t: buf, lang: 'es' });
    return parts;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, opts) {
    opts = opts || {};
    text = starText(text);
    if (!S.voice || !('speechSynthesis' in window)) { if (opts.onend) later(900, opts.onend); return; }
    try {
      if (!opts.queue) speechSynthesis.cancel();
      const parts = splitLang(text);
      parts.forEach((pt, i) => {
        const u = new SpeechSynthesisUtterance(pt.t);
        if (pt.lang === 'en') {
          u.lang = enVoice ? enVoice.lang : 'en-US';
          if (enVoice) u.voice = enVoice;
          u.rate = 0.72; u.pitch = 1.05;
        } else {
          u.lang = esVoice ? esVoice.lang : 'es-VE';
          if (esVoice) u.voice = esVoice;
          u.rate = opts.rate || 0.88; u.pitch = 1.08;
        }
        if (opts.onend && i === parts.length - 1) u.onend = opts.onend;
        speechSynthesis.speak(u);
      });
    } catch (e) { /* sin voz */ }
  }
  function hush() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {} }

  // ------------------------------------------------------------------ Entrada táctil
  let lockUntil = 0;
  function isPalm(e) { return e.pointerType === 'touch' && (e.width > 90 || e.height > 90); }
  function onTap(node, fn) {
    node.classList.add('tap');
    let downId = null, sx = 0, sy = 0;
    node.addEventListener('pointerdown', (e) => {
      if (isPalm(e) || downId !== null) return;
      downId = e.pointerId; sx = e.clientX; sy = e.clientY;
      const pr = node.querySelector('.press'); if (pr) pr.classList.add('down');
      ac();
    });
    const up = (e) => {
      if (e.pointerId !== downId) return;
      downId = null; const pr = node.querySelector('.press'); if (pr) pr.classList.remove('down');
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 40) return;
      if (performance.now() < lockUntil) return;
      fn(e);
    };
    node.addEventListener('pointerup', up);
    const rel = () => { downId = null; const pr = node.querySelector('.press'); if (pr) pr.classList.remove('down'); };
    node.addEventListener('pointercancel', rel);
    node.addEventListener('pointerleave', (e) => { if (e.pointerId === downId && e.pointerType === 'mouse') rel(); });
  }

  function button(parent, o) {
    const g = el('g', { transform: `translate(${o.x},${o.y})` }, parent);
    const inner = el('g', { cls: 'press' }, g);
    const w = o.w || 360, h = o.h || 100;
    el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: o.fill || C_ORANGE, stroke: o.stroke || 'none', 'stroke-width': o.stroke ? 3 : 0 }, inner);
    el('rect', { x: -w / 2 + 6, y: h / 2 - 12, width: w - 12, height: 8, rx: 4, fill: 'rgba(0,0,0,.08)' }, inner);
    let tx = 0;
    if (o.icon) {
      const ic = el('g', { transform: `translate(${o.label ? -w / 2 + h / 2 + 4 : 0},0)` }, inner);
      ICONS[o.icon](ic, o.iconColor || o.color || '#fff');
      if (o.label) tx = h / 2 - 8;
    }
    if (o.label) el('text', { x: tx, y: (o.fs || 40) * 0.36, 'text-anchor': 'middle', 'font-size': o.fs || 40, 'font-weight': 900, fill: o.color || '#fff', text: o.label }, inner);
    if (o.onTap) onTap(g, o.onTap);
    return g;
  }

  // ------------------------------------------------------------------ Íconos
  function pawShape(g, color, s) {
    s = s || 1;
    el('ellipse', { cx: 0, cy: 8 * s, rx: 15 * s, ry: 12.5 * s, fill: color }, g);
    [[-15, -6], [-6, -15], [6, -15], [15, -6]].forEach(([x, y]) => el('circle', { cx: x * s, cy: y * s, r: 6 * s, fill: color }, g));
  }
  const ICONS = {
    speaker(g, c) {
      el('path', { d: 'M-18 -10 h10 l14 -12 v44 l-14 -12 h-10z', fill: c }, g);
      el('path', { d: 'M12 -12 q10 12 0 24 M20 -20 q18 20 0 40', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    },
    help(g, c) {
      pawShape(g, c, 0.9);
    },
    house(g, c) {
      el('path', { d: 'M-22 2 L0 -20 L22 2 M-15 -4 V20 H15 V-4', fill: 'none', stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    },
    play(g, c) { el('path', { d: 'M-10 -16 L16 0 L-10 16z', fill: c }, g); },
    eraser(g, c) {
      el('path', { d: 'M-14 12 L6 -14 L20 -2 L2 22z', fill: 'none', stroke: c, 'stroke-width': 5, 'stroke-linejoin': 'round' }, g);
    },
    check(g, c) { el('path', { d: 'M-16 0 L-4 12 L18 -12', fill: 'none', stroke: c, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); },
  };

  // ------------------------------------------------------------------ Escenarios
  function bgPark(opt) {
    clear(L.bg);
    opt = opt || {};
    el('rect', { width: 1600, height: 900, fill: opt.sky || '#dff1fb' }, L.bg);
    if (!opt.noSun) el('circle', { cx: 1460, cy: 110, r: 56, fill: opt.sun || '#ffd66b' }, L.bg);
    cloud(260, 130, 1); cloud(980, 90, 0.8);
    el('path', { d: `M0 ${opt.ground || 640} Q 400 ${(opt.ground || 640) - 40} 800 ${opt.ground || 640} T 1600 ${(opt.ground || 640) - 10} V900 H0z`, fill: opt.grass || '#bfe3b4' }, L.bg);
    el('path', { d: `M0 ${(opt.ground || 640) + 90} Q 500 ${(opt.ground || 640) + 50} 1000 ${(opt.ground || 640) + 95} T 1600 ${(opt.ground || 640) + 80} V900 H0z`, fill: opt.grass2 || '#a9d79b' }, L.bg);
  }
  function cloud(x, y, s) {
    const g = el('g', { transform: `translate(${x},${y}) scale(${s})`, opacity: 0.9 }, L.bg);
    [[0, 0, 46], [44, -16, 38], [86, 0, 42], [42, 14, 40]].forEach(([cx, cy, r]) => el('circle', { cx, cy, r, fill: '#fff' }, g));
  }
  function bgPlain(color) {
    clear(L.bg);
    el('rect', { width: 1600, height: 900, fill: color }, L.bg);
  }

  // ------------------------------------------------------------------ Perrito
  const COATS = {
    main: { body: '#e8b07a', dark: '#d69a62', ear: '#8b5a2b', light: '#f7dec0', tail: '#c98a4e' },
    canela: { body: '#c9743a', dark: '#b5652f', ear: '#6e3b1a', light: '#f3c9a0', tail: '#a85a28' },
    coco: { body: '#f2ece2', dark: '#ddd2c0', ear: '#4a3a30', light: '#ffffff', tail: '#d8ccb8' },
  };
  const COLLAR = { main: '#e25555', canela: C_PURPLE, coco: C_BLUE };
  const PUP_NAME = { main: 'tu perrito', canela: 'Canela', coco: 'Coco' };
  function puppy(parent, x, y, s, coatName) {
    coatName = coatName || LES.star || 'main';
    const coat = COATS[coatName];
    const root = el('g', { transform: `translate(${x},${y}) scale(${s})` }, parent);
    el('ellipse', { cx: 0, cy: 6, rx: 100, ry: 16, fill: 'rgba(0,0,0,.12)' }, root);
    const lift = el('g', { transform: 'translate(0,-110)' }, root);
    const anim = el('g', {}, lift);
    const body = el('g', { transform: 'translate(0,110)' }, anim);
    // cola
    const tailP = el('g', { transform: 'translate(62,-62)' }, body);
    const tail = el('g', { cls: 'wag' }, tailP);
    el('path', { d: 'M0 0 C 22 -8 38 -38 32 -74', fill: 'none', stroke: coat.tail, 'stroke-width': 20, 'stroke-linecap': 'round' }, tail);
    // patas traseras
    el('ellipse', { cx: -58, cy: -20, rx: 34, ry: 22, fill: coat.dark }, body);
    el('ellipse', { cx: 58, cy: -20, rx: 34, ry: 22, fill: coat.dark }, body);
    // cuerpo
    el('ellipse', { cx: 0, cy: -72, rx: 74, ry: 72, fill: coat.body }, body);
    el('ellipse', { cx: 0, cy: -56, rx: 42, ry: 46, fill: coat.light }, body);
    // patas delanteras
    const legL = el('g', { transform: 'translate(-28,-72)' }, body);
    el('rect', { x: -17, y: 0, width: 34, height: 72, rx: 17, fill: coat.body }, legL);
    el('ellipse', { cx: 0, cy: 68, rx: 21, ry: 11, fill: coat.light }, legL);
    const legRP = el('g', { transform: 'translate(28,-72)' }, body);
    const legR = el('g', {}, legRP);
    el('rect', { x: -17, y: 0, width: 34, height: 72, rx: 17, fill: coat.body }, legR);
    el('ellipse', { cx: 0, cy: 68, rx: 21, ry: 11, fill: coat.light }, legR);
    // collar
    el('path', { d: 'M-52 -134 Q 0 -108 52 -134', fill: 'none', stroke: COLLAR[coatName] || '#e25555', 'stroke-width': 13, 'stroke-linecap': 'round' }, body);
    el('circle', { cx: 0, cy: -116, r: 10, fill: C_GOLD }, body);
    // cabeza
    const headP = el('g', { transform: 'translate(0,-160)' }, body);
    const head = el('g', {}, headP);
    const earLP = el('g', { transform: 'translate(-50,-34)' }, head);
    const earL = el('g', {}, earLP);
    el('ellipse', { cx: -10, cy: 34, rx: 23, ry: 46, fill: coat.ear, transform: 'rotate(16 -10 34)' }, earL);
    const earRP = el('g', { transform: 'translate(50,-34)' }, head);
    const earR = el('g', {}, earRP);
    el('ellipse', { cx: 10, cy: 34, rx: 23, ry: 46, fill: coat.ear, transform: 'rotate(-16 10 34)' }, earR);
    el('circle', { cx: 0, cy: 0, r: 72, fill: coat.body }, head);
    el('ellipse', { cx: 0, cy: 30, rx: 44, ry: 31, fill: coat.light }, head);
    el('circle', { cx: -46, cy: 22, r: 10, fill: '#f5a3a3', opacity: 0.55 }, head);
    el('circle', { cx: 46, cy: 22, r: 10, fill: '#f5a3a3', opacity: 0.55 }, head);
    const eyesO = el('g', { cls: 'eyes-open' }, head);
    [-26, 26].forEach((ex) => {
      el('circle', { cx: ex, cy: -6, r: 11, fill: '#2b1d12' }, eyesO);
      el('circle', { cx: ex + 3.5, cy: -10, r: 4, fill: '#fff' }, eyesO);
    });
    const eyesC = el('g', { cls: 'eyes-closed', opacity: 0 }, head);
    el('path', { d: 'M-38 -4 Q -26 -16 -14 -4 M14 -4 Q 26 -16 38 -4', fill: 'none', stroke: '#2b1d12', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, eyesC);
    el('ellipse', { cx: 0, cy: 16, rx: 12, ry: 9, fill: '#2b1d12' }, head);
    el('path', { d: 'M-17 30 Q -8 41 0 30 Q 8 41 17 30', fill: 'none', stroke: '#2b1d12', 'stroke-width': 3.6, 'stroke-linecap': 'round' }, head);
    const tongue = el('path', { cls: 'tongue', d: 'M-10 35 Q 0 66 10 35Z', fill: C_PINK, opacity: 0 }, head);
    const ball = el('circle', { cx: 0, cy: 44, r: 18, fill: C_BLUE, opacity: 0 }, head);

    const P = {
      root, anim, tail, head, legR, earL, earR, x, y, s,
      setPos(nx, ny, ns) { P.x = nx; P.y = ny; if (ns) P.s = ns; root.setAttribute('transform', `translate(${P.x},${P.y}) scale(${P.s})`); },
      moveTo(nx, ny, dur, done) {
        const ox = P.x, oy = P.y;
        tween(dur || 700, (k) => P.setPos(ox + (nx - ox) * k, oy + (ny - oy) * k), done);
      },
      eyes(closed) { eyesO.setAttribute('opacity', closed ? 0 : 1); eyesC.setAttribute('opacity', closed ? 1 : 0); },
      tongue(on) { tongue.setAttribute('opacity', on ? 1 : 0); },
      ball(on) { ball.setAttribute('opacity', on ? 1 : 0); },
      wag(mode) { tail.setAttribute('class', mode === 'fast' ? 'wag-fast' : mode === 'none' ? '' : 'wag'); },
      play(cls) { anim.setAttribute('class', ''); void anim.getBoundingClientRect(); anim.setAttribute('class', cls); },
      headDo(cls) { head.setAttribute('class', ''); void head.getBoundingClientRect(); head.setAttribute('class', cls); },
      ears() { restartClass(earL, 'ears-up'); restartClass(earR, 'ears-up-r'); },
      sleep(on) {
        P.eyes(on); P.wag(on ? 'none' : 'slow'); P.tongue(false);
        head.setAttribute('class', on ? 'h-sleep' : '');
        anim.setAttribute('class', on ? 'a-breathe' : '');
      },
      happy() { P.eyes(false); P.tongue(true); P.wag('fast'); P.play('a-jump'); P.ears(); SFX.yips(2); later(1100, () => SFX.yip()); },
      hop() { P.play('a-hop'); SFX.yip(); },
      confused() { P.headDo('h-tilt'); SFX.sniff(); },
      trick(id) {
        P.wag('fast'); P.tongue(true);
        if (id === 'patita' || id === 'patita2') { restartClass(legR, 'leg-up'); SFX.yip(0.4); SFX.yip(1.2); }
        else if (id === 'rodar') { P.play('a-roll'); SFX.yip(1.2); }
        else if (id === 'pelota') {
          P.tongue(false);
          const svgRoot = parent;
          const b = el('circle', { cx: 0, cy: 0, r: 18 * P.s, fill: C_BLUE }, svgRoot);
          const sx = P.x + 420 * P.s, sy = P.y - 380 * P.s, ex = P.x, ey = P.y - 290 * P.s;
          tween(900, (k) => {
            const xx = sx + (ex - sx) * k;
            const yy = sy + (ey - sy) * k - Math.sin(k * Math.PI) * 180 * P.s;
            b.setAttribute('cx', xx); b.setAttribute('cy', yy);
          }, () => { b.remove(); P.ball(true); SFX.yip(); later(1600, () => P.ball(false)); });
          later(420, () => P.play('a-hop'));
        } else if (id === 'bailar') { P.play('a-dance'); SFX.yips(2); }
        else if (id === 'sentarse') { P.play('a-sit'); SFX.yip(0.2); later(1700, () => SFX.yip()); }
        else if (id === 'acostarse') { P.play('a-lie'); P.wag('slow'); later(700, () => P.eyes(true)); later(2300, () => { P.eyes(false); SFX.yip(); }); }
        else if (id === 'saltar') { P.play('a-jump'); SFX.yips(3); }
      },
    };
    return P;
  }

  // ------------------------------------------------------------------ Dibujo de palabras en cursiva
  function isPrint(word) { return PRINT_WORDS.has(word); }
  function modFor(word, o) { return (o && o.print != null ? o.print : isPrint(word)) ? Imprenta : C; }
  function cursiveWord(parent, word, o) {
    o = o || {};
    const M = modFor(word, o);
    const b = M.build(word, { tail: o.tail !== false });
    const s = (o.scale || 1) * (M === C ? 1 : 0.88);
    const sk = Math.tan((M.SLANT * Math.PI) / 180);
    // centro visual: la inclinación desplaza la parte alta hacia la derecha
    const cx = o.cx != null ? o.cx - (b.width * s) / 2 + 50 * s * sk : o.x;
    const by = o.baseline + (M === C ? 0 : -6 * s);
    const g = el('g', { transform: `translate(${cx},${by}) scale(${s}) skewX(${M.SLANT})` }, parent);
    const path = el('path', {
      d: b.d, fill: 'none', stroke: o.color || C_INK, 'stroke-width': o.sw || 9,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, g);
    const liftEls = [];
    if (o.lifts !== false) {
      b.lifts.forEach((lf) => {
        if (lf.type === 'dot') liftEls.push(el('circle', { cx: lf.x, cy: lf.y, r: (o.sw || 9) * 0.85, fill: o.color || C_INK }, g));
        else liftEls.push(el('line', { x1: lf.x1, y1: lf.y1, x2: lf.x2, y2: lf.y2, stroke: o.color || C_INK, 'stroke-width': o.sw || 9, 'stroke-linecap': 'round' }, g));
      });
    }
    return { g, path, b, liftEls, scale: s };
  }
  function drawOn(pathEl, dur, done) {
    const len = pathEl.getTotalLength();
    pathEl.style.strokeDasharray = len;
    pathEl.style.strokeDashoffset = len;
    tween(dur, (k) => (pathEl.style.strokeDashoffset = len * (1 - k)), done);
  }

  // ------------------------------------------------------------------ Elementos comunes de pantalla
  let inactivity = null;
  function armIdle(ms, fn) {
    if (inactivity) clearTimeout(inactivity);
    inactivity = setTimeout(() => { inactivity = null; fn(); }, ms);
    timers.push(inactivity);
  }
  function stopIdle() { if (inactivity) { clearTimeout(inactivity); inactivity = null; } }

  function starText(t) {
    if (LES.star === 'main') return t;
    const n = PUP_NAME[LES.star];
    return t.replace(/Tu perrito/g, n).replace(/tu perrito/g, n);
  }
  function instruction(text) {
    text = starText(text);
    const g = el('g', { cls: 'fade-in' }, L.scene);
    const w = Math.min(1180, text.length * 22 + 120);
    el('rect', { x: 800 - w / 2, y: 34, width: w, height: 84, rx: 42, fill: 'rgba(255,255,255,.88)' }, g);
    el('text', { x: 800, y: 89, 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 800, fill: C_INK, text }, g);
    return g;
  }

  function stationDots(current) {
    const g = el('g', { transform: 'translate(1330,76)' }, L.scene);
    const names = ['Encuentra', 'Arma', 'Lee', 'Escribe'];
    names.forEach((n, i) => {
      const x = i * 72;
      const done = i < current, now = i === current;
      const pg = el('g', { transform: `translate(${x},0)` }, g);
      el('circle', { cx: 0, cy: 0, r: 28, fill: now ? '#fff' : done ? '#fff6d6' : 'rgba(255,255,255,.55)', stroke: now ? C_ORANGE : 'none', 'stroke-width': 4 }, pg);
      const pw = el('g', { transform: 'scale(.95)' }, pg);
      pawShape(pw, done ? C_GOLD : now ? C_ORANGE : '#b9b3a6', 0.95);
    });
    return g;
  }

  // Botones fijos inferiores: Repetir · Ayúdame · Parque  (y candado de papá)
  function bottomBar(o) {
    const g = el('g', {}, L.scene);
    if (o.repeat) button(g, { x: 120, y: 820, w: 150, h: 110, fill: C_BLUE, icon: 'speaker', onTap: o.repeat });
    if (o.help) button(g, { x: 290, y: 820, w: 150, h: 110, fill: '#fff', stroke: '#e3d6bf', icon: 'help', iconColor: C_ORANGE, onTap: o.help });
    if (o.park !== false) button(g, { x: o.repeat ? 440 : 120, y: 820, w: 110, h: 110, fill: 'rgba(255,255,255,.85)', icon: 'house', iconColor: '#7a6a55', onTap: () => go('map') });
    return g;
  }

  function parentLock() {
    clear(L.chrome);
    const g = el('g', { transform: 'translate(1546,856)' }, L.chrome);
    el('circle', { r: 34, fill: 'rgba(255,255,255,.55)' }, g);
    const ring = el('circle', { r: 30, fill: 'none', stroke: C_ORANGE, 'stroke-width': 5, 'stroke-dasharray': 188.5, 'stroke-dashoffset': 188.5, transform: 'rotate(-90)' }, g);
    el('rect', { x: -11, y: -4, width: 22, height: 17, rx: 3, fill: '#8a7d6b' }, g);
    el('path', { d: 'M-7 -4 v-5 a7 7 0 0 1 14 0 v5', fill: 'none', stroke: '#8a7d6b', 'stroke-width': 3.5 }, g);
    let holdT = null, start = 0, frame = null;
    const cancel = () => { if (holdT) clearTimeout(holdT); holdT = null; cancelAnimationFrame(frame); ring.setAttribute('stroke-dashoffset', 188.5); };
    g.style.cursor = 'pointer';
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); start = performance.now();
      const f = () => { const k = Math.min(1, (performance.now() - start) / 2500); ring.setAttribute('stroke-dashoffset', 188.5 * (1 - k)); if (k < 1) frame = requestAnimationFrame(f); };
      frame = requestAnimationFrame(f);
      holdT = setTimeout(() => { cancel(); openGate(); }, 2500);
    });
    g.addEventListener('pointerup', cancel);
    g.addEventListener('pointerleave', cancel);
    g.addEventListener('pointercancel', cancel);
  }

  function fxHearts(x, y, n) {
    for (let i = 0; i < (n || 5); i++) {
      const hg = el('g', { transform: `translate(${x + (Math.random() * 160 - 80)},${y + Math.random() * 30})` }, L.fx);
      const h = el('path', { cls: 'heart', d: 'M0 -6 C -6 -18 -26 -14 -24 2 C -22 14 -6 22 0 30 C 6 22 22 14 24 2 C 26 -14 6 -18 0 -6Z', fill: [C_PINK, C_ORANGE, C_PURPLE, C_GOLD][i % 4] }, hg);
      h.style.animationDelay = i * 0.12 + 's';
      setTimeout(() => hg.remove(), 2400);
    }
  }
  function fxConfetti(x, y, n) {
    const cols = [C_PINK, C_ORANGE, C_PURPLE, C_GOLD, C_GREEN, C_BLUE];
    for (let i = 0; i < (n || 26); i++) {
      const r = el('rect', { cls: 'confetti', x: x - 6, y: y - 6, width: 12, height: 18, rx: 3, fill: cols[i % cols.length] }, L.fx);
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
      r.style.setProperty('--dx', Math.cos(a) * d + 'px');
      r.style.setProperty('--dy', Math.sin(a) * d + 160 + 'px');
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = 'center';
      setTimeout(() => r.remove(), 1800);
    }
  }
  function fxStars(x, y) {
    SFX.sparkle();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = el('circle', { cx: x, cy: y, r: 9, fill: C_GOLD }, L.fx);
      tween(600, (k) => { st.setAttribute('cx', x + Math.cos(a) * 120 * k); st.setAttribute('cy', y + Math.sin(a) * 120 * k); st.setAttribute('opacity', 1 - k); }, () => st.remove());
    }
  }

  // ------------------------------------------------------------------ Navegación
  let current = null;
  function go(name, arg) {
    clearTimers(); stopIdle(); hush();
    clear(L.scene); clear(L.fx);
    lockUntil = performance.now() + 600;
    current = name;
    save();
    SCREENS[name](arg);
    parentLock();
  }

  // ================================================================== PANTALLAS
  const SCREENS = {};

  // ---------------------------------------------------------------- Inicio
  SCREENS.home = function () {
    bgPark();
    el('text', { x: 800, y: 150, 'text-anchor': 'middle', 'font-size': 92, 'font-weight': 900, fill: C_INK, text: 'MilaPerritos', 'letter-spacing': '-1' }, L.scene);
    el('text', { x: 800, y: 210, 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 700, fill: '#6b5440', text: LES.title + ' · ' + (LES.lang === 'en' ? 'letra de imprenta' : 'letra cursiva') }, L.scene);
    el('ellipse', { cx: 800, cy: 640, rx: 230, ry: 50, fill: '#8b5fd0' }, L.scene);
    el('ellipse', { cx: 800, cy: 628, rx: 200, ry: 36, fill: '#b48cf0' }, L.scene);
    const pup = puppy(L.scene, 800, 640, 1.05);
    pup.sleep(true);
    const z = el('g', { transform: 'translate(900,360)' }, L.scene);
    const zt = el('text', { cls: 'zz', x: 0, y: 0, 'font-size': 48, 'font-weight': 900, fill: '#6f86a6', text: 'z z z' }, z);
    let started = false;
    const btn = button(L.scene, {
      x: 800, y: 800, w: 680, h: 120, label: '¡Vamos a jugar, Milana!', fs: 48,
      onTap: () => {
        if (started) return; started = true;
        ac(); zt.remove();
        pup.sleep(false); pup.ears(); pup.happy();
        say('¡Hola, Milana! ¡Vamos a jugar!');
        later(2000, () => go('map'));
      },
    });
    btn.querySelector('.press').classList.add('pulse');
  };

  // ---------------------------------------------------------------- Mapa del parque
  const NODE_POS = [{ x: 250, y: 690 }, { x: 610, y: 520 }, { x: 980, y: 640 }, { x: 1290, y: 440 }, { x: 1450, y: 250 }];
  function nodesFor(l) {
    const keys = l.warmup ? ['warmup', ...l.words, 'party'] : [...l.words, 'party'];
    return keys.map((k, i) => ({ key: k, x: NODE_POS[i].x, y: NODE_POS[i].y }));
  }
  function nodeDone(k) { return k === 'warmup' ? S.warmup : k === 'party' ? (S.friends.includes(LES.friend)) : S.progress[k].done; }
  function nextNode() {
    if (LES.warmup && !S.warmup) return 'warmup';
    for (const w of WORDS) if (!S.progress[w].done) return w;
    return 'party';
  }
  SCREENS.map = function () {
    bgPark({ ground: 330, noSun: false });
    // camino
    const d = 'M 140 760 C 300 760 380 560 610 520 S 820 700 980 640 S 1180 430 1290 440 S 1420 300 1450 250';
    el('path', { d, fill: 'none', stroke: '#efe0b4', 'stroke-width': 70, 'stroke-linecap': 'round' }, L.scene);
    el('path', { d, fill: 'none', stroke: '#f7ecca', 'stroke-width': 46, 'stroke-linecap': 'round', 'stroke-dasharray': '2 38' }, L.scene);
    const nxt = nextNode();
    const allDone = WORDS.every((w) => S.progress[w].done);
    const NODES = nodesFor(LES);
    // selector de misiones
    LESSONS.forEach((l, i) => {
      const on = l.id === LES.id, fin = lessonDone(l) && S.friends.includes(l.friend);
      const bx = 150 + i * 250, by = 200;
      const b = el('g', { transform: `translate(${bx},${by})` }, L.scene);
      const bi = el('g', { cls: 'press' }, b);
      el('rect', { x: -112, y: -40, width: 224, height: 80, rx: 40, fill: on ? C_ORANGE : 'rgba(255,255,255,.9)', stroke: on ? 'none' : '#e1d6c0', 'stroke-width': 3 }, bi);
      el('text', { x: fin ? -12 : 0, y: -4, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, fill: on ? '#fff' : C_INK, text: l.name }, bi);
      el('text', { x: fin ? -12 : 0, y: 24, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: on ? '#fff' : '#7a6a55', text: l.lang === 'en' ? 'Inglés' : 'Español' }, bi);
      if (fin) star(bi, 82, 0, 18, C_GOLD);
      onTap(b, () => { if (!on) { setLesson(l.id); go('map'); } });
    });
    NODES.forEach((n, i) => {
      if (n.key === 'party' && !allDone) {
        const g = el('g', { transform: `translate(${n.x},${n.y})`, opacity: 0.5 }, L.scene);
        el('circle', { r: 56, fill: 'rgba(255,255,255,.6)', stroke: '#d9cdb2', 'stroke-width': 3, 'stroke-dasharray': '8 8' }, g);
        star(g, 0, 0, 26, '#cfc4ad');
        return;
      }
      const g = el('g', { transform: `translate(${n.x},${n.y})` }, L.scene);
      const inner = el('g', { cls: n.key === nxt ? 'pulse' : '' }, g);
      const done = nodeDone(n.key);
      el('circle', { r: 82, fill: '#fff', stroke: done ? C_GOLD : n.key === nxt ? C_ORANGE : '#e1d6c0', 'stroke-width': 7 }, inner);
      if (n.key === 'party') {
        star(inner, 0, -4, 40, C_GOLD);
        el('text', { y: 120, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 900, fill: C_INK, text: '¡Fiesta!' }, g);
      } else if (n.key === 'warmup') {
        cursiveWord(inner, 'm', { cx: 0, baseline: 30, scale: 0.55, sw: 12, color: done ? C_GOLD : C_INK, tail: false });
      } else {
        const pw = el('g', { transform: 'scale(2.3)' }, inner);
        pawShape(pw, done ? C_GOLD : n.key === nxt ? C_ORANGE : '#c9bfae');
        if (done) el('text', { y: 120, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: '#7a5a20', text: TRICKS[WORDS.indexOf(n.key)].name }, g);
      }
      onTap(g, () => {
        if (n.key === 'warmup') go('warmup');
        else if (n.key === 'party') go('party');
        else go('mission', { word: n.key, station: 0 });
      });
    });
    const at = NODES.find((n) => n.key === nxt) || NODES[0];
    const pup = puppy(L.scene, at.x + (at.x > 1350 ? -150 : 150), at.y + 70, 0.55);
    pup.hop();
    bottomBar({ park: false });
    button(L.scene, { x: 120, y: 820, w: 110, h: 110, fill: 'rgba(255,255,255,.9)', icon: 'house', iconColor: C_ORANGE, onTap: () => go('casita') });
    const nW = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco'][WORDS.length];
    instruction(nxt === 'party' ? '¡Lo lograste! Toca la estrella para la fiesta' : 'Toca la huellita que brilla');
    later(500, () => say(nxt === 'party' ? `¡Terminaste las ${nW} palabras! Toca la estrella para la fiesta.` : (nxt === WORDS[0] && LES.lang === 'en' && !S.progress[nxt].find && S.progress[nxt].find !== 0) ? `${LES.title.replace('·', '.')}. Hoy vamos a aprender palabras en inglés con Canela. Toca la huellita que brilla.` : nxt === 'warmup' ? 'Primero vamos a calentar con la letra m. Toca la huellita que brilla.' : 'Toca la huellita que brilla para la siguiente palabra.'));
  };
  function star(g, x, y, r, color) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1) + ' ';
    }
    return el('path', { d: d + 'Z', fill: color, 'stroke-linejoin': 'round' }, g);
  }

  // ---------------------------------------------------------------- Componente: repasar con el perrito
  function traceBoard(word, o) {
    o = o || {};
    const area = el('g', {}, L.scene);
    el('rect', { x: 110, y: 150, width: 1380, height: 560, rx: 40, fill: '#f4e3bf' }, area);
    el('rect', { x: 110, y: 150, width: 1380, height: 560, rx: 40, fill: 'none', stroke: '#e5cf9f', 'stroke-width': 4 }, area);
    const PR = isPrint(word);
    const bTmp = modFor(word).build(word);
    const s = Math.min(2.5, 1150 / bTmp.width);
    const baseline = PR ? 540 : 520;
    el('line', { x1: 160, y1: baseline, x2: 1440, y2: baseline, stroke: '#d8c49a', 'stroke-width': 3 }, area);
    if (PR) {
      const se = s * 0.88, by = baseline - 6 * se;
      el('line', { x1: 160, y1: by - 60 * se, x2: 1440, y2: by - 60 * se, stroke: '#e3d2ad', 'stroke-width': 3, 'stroke-dasharray': '14 12' }, area);
      el('line', { x1: 160, y1: by - 120 * se, x2: 1440, y2: by - 120 * se, stroke: '#e3d2ad', 'stroke-width': 3 }, area);
    } else
    el('line', { x1: 160, y1: baseline - 100 * s, x2: 1440, y2: baseline - 100 * s, stroke: '#e3d2ad', 'stroke-width': 3, 'stroke-dasharray': '14 12' }, area);
    // carretera
    const road = cursiveWord(area, word, { cx: 800, baseline, scale: s, sw: 38, color: '#fff4da', lifts: false });
    const guide = cursiveWord(area, word, { cx: 800, baseline, scale: s, sw: 3.2, color: '#b49a68', lifts: false });
    guide.path.setAttribute('stroke-dasharray', '6 7');
    const fill = cursiveWord(area, word, { cx: 800, baseline, scale: s, sw: 24, color: '#9fd3a3', lifts: false });
    const LEN = fill.path.getTotalLength();
    fill.path.style.strokeDasharray = LEN;
    fill.path.style.strokeDashoffset = LEN;
    const inkG = el('g', { transform: road.g.getAttribute('transform') }, area);
    // punto de inicio
    const p0 = fill.path.getPointAtLength(0);
    const startDot = el('circle', { cx: p0.x, cy: p0.y, r: 14, fill: C_GREEN }, road.g);
    // en imprenta cada letra tiene su punto de inicio
    const letterStarts = [];
    if (PR) (road.b.d.match(/M\s*[-\d.]+\s+[-\d.]+/g) || []).slice(1).forEach((m) => {
      const [x, y] = m.replace('M', '').trim().split(/\s+/).map(Number);
      letterStarts.push(el('circle', { cx: x, cy: y, r: 10, fill: C_GREEN, opacity: 0.55 }, road.g));
    });
    // muestras del camino
    const N = Math.ceil(LEN / 3);
    const pts = [];
    for (let i = 0; i <= N; i++) { const p = fill.path.getPointAtLength((i / N) * LEN); pts.push({ x: p.x, y: p.y }); }
    const ctm = fill.path.getCTM();
    function toStageXY(p) { const sp = stage.createSVGPoint(); sp.x = p.x; sp.y = p.y; return sp.matrixTransform(ctm); }
    // huellita guía
    const pawG = el('g', {}, area);
    const pawInner = el('g', {}, pawG);
    pawShape(pawInner, '#8b5a2b', 1.15);
    let cur = 0, done = false, demoRunning = false, inkPath = null, inkD = '', waitT = 0;
    function placePaw() {
      const p = toStageXY(pts[Math.min(N, cur + 10)]);
      pawG.setAttribute('transform', `translate(${p.x},${p.y - 34})`);
    }
    function setFill(i) { fill.path.style.strokeDashoffset = LEN * (1 - i / N); }
    placePaw();
    const TOL = 30;
    let activeId = null;
    function local(e) {
      const sp = stage.createSVGPoint(); sp.x = e.clientX; sp.y = e.clientY;
      return sp.matrixTransform(fill.path.getScreenCTM().inverse());
    }
    const hit = el('rect', { x: 110, y: 150, width: 1380, height: 560, rx: 40, fill: 'transparent' }, area);
    hit.style.touchAction = 'none';
    hit.addEventListener('pointerdown', (e) => {
      if (isPalm(e) || activeId !== null || done || demoRunning) return;
      activeId = e.pointerId; try { hit.setPointerCapture(e.pointerId); } catch (x) {}
      const p = local(e);
      inkPath = el('path', { d: '', fill: 'none', stroke: '#6a4a2a', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inkG);
      inkD = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; inkPath.setAttribute('d', inkD);
      if (o.onActivity) o.onActivity();
      advance(p);
    });
    hit.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activeId) return;
      const p = local(e);
      inkD += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; inkPath.setAttribute('d', inkD);
      if (o.onActivity) o.onActivity();
      advance(p);
    });
    const end = (e) => { if (e.pointerId === activeId) activeId = null; };
    hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
    function advance(p) {
      let best = -1, bd = 1e9;
      const hi = Math.min(N, cur + 45);
      for (let i = Math.max(0, cur - 4); i <= hi; i++) {
        const dd = Math.hypot(pts[i].x - p.x, pts[i].y - p.y);
        if (dd < bd) { bd = dd; best = i; }
      }
      if (bd < TOL && best > cur) {
        cur = best; setFill(cur); placePaw();
        if (cur >= N - 3) finish();
      } else if (bd > TOL * 2 && performance.now() - waitT > 1500) {
        waitT = performance.now();
        restartClass(pawInner, 'a-wait');
      }
    }
    function finish() {
      if (done) return; done = true;
      cur = N; setFill(N); pawG.setAttribute('opacity', 0);
      SFX.sparkle();
      const lifts = road.b.lifts;
      if (!lifts.length) { if (o.onDone) o.onDone(); return; }
      // Levantar el lápiz: puntito o tilde
      if (o.onLift) o.onLift();
      let idx = 0;
      const nextLift = () => {
        if (idx >= lifts.length) { if (o.onDone) o.onDone(); return; }
        const lf = lifts[idx];
        const lp = lf.type === 'dot' ? { x: lf.x, y: lf.y } : { x: (lf.x1 + lf.x2) / 2, y: (lf.y1 + lf.y2) / 2 };
        const sp = toStageXY(lp);
        const bf = el('g', { transform: `translate(${sp.x},${sp.y})` }, area);
        const bi = el('g', { cls: 'pulse' }, bf);
        butterfly(bi);
        el('circle', { r: 70, fill: 'transparent' }, bf);
        onTap(bf, () => {
          bf.remove();
          if (lf.type === 'dot') el('circle', { cx: lf.x, cy: lf.y, r: 9, fill: '#6a4a2a' }, inkG);
          else el('line', { x1: lf.x1, y1: lf.y1, x2: lf.x2, y2: lf.y2, stroke: '#6a4a2a', 'stroke-width': 8, 'stroke-linecap': 'round' }, inkG);
          SFX.pop(); idx++; later(350, nextLift);
        });
      };
      nextLift();
    }
    return {
      demo(cb) {
        if (demoRunning || done) return; demoRunning = true;
        clear(inkG); cur = 0; setFill(0);
        const dur = 5200;
        tween(dur, (k) => { const i = Math.round(k * N); setFill(i); const p = toStageXY(pts[Math.min(N, i)]); pawG.setAttribute('transform', `translate(${p.x},${p.y - 34})`); }, () => {
          later(500, () => { setFill(0); cur = 0; placePaw(); demoRunning = false; if (cb) cb(); });
        });
      },
      reset() { if (done || demoRunning) return; clear(inkG); cur = 0; setFill(0); placePaw(); },
      progress() { return cur / N; },
      pulsePaw() { restartClass(pawInner, 'a-wait'); },
      isDone() { return done; },
    };
  }
  function butterfly(g) {
    el('ellipse', { cx: -20, cy: -10, rx: 22, ry: 28, fill: C_PURPLE, transform: 'rotate(-25 -20 -10)' }, g);
    el('ellipse', { cx: 20, cy: -10, rx: 22, ry: 28, fill: C_PURPLE, transform: 'rotate(25 20 -10)' }, g);
    el('ellipse', { cx: -14, cy: 18, rx: 14, ry: 16, fill: '#c7a6f3' }, g);
    el('ellipse', { cx: 14, cy: 18, rx: 14, ry: 16, fill: '#c7a6f3' }, g);
    el('rect', { x: -4, y: -26, width: 8, height: 52, rx: 4, fill: C_INK }, g);
  }

  // ---------------------------------------------------------------- Calentamiento: la m
  const WARM = ['m', 'me', 'ma', 'mi'];
  SCREENS.warmup = function (step) {
    step = step || 0;
    bgPlain('#fdf2dc');
    const item = WARM[step];
    instruction(step === 0 ? 'La m: sigue a tu perrito' : 'Une la m: ' + ['', 'me', 'ma', 'mi'][step]);
    // progreso
    const pg = el('g', { transform: 'translate(1380,76)' }, L.scene);
    WARM.forEach((w, i) => el('circle', { cx: i * 50, cy: 0, r: 14, fill: i < step ? C_GOLD : i === step ? C_ORANGE : '#e3d6bf' }, pg));
    const pup = puppy(L.scene, 1420, 860, 0.5);
    let hintLvl = 0;
    const tb = traceBoard(item, {
      onActivity: () => armIdle(10000, idleHint),
      onLift: () => say('Ahora el puntito. Toca la mariposa.'),
      onDone: () => {
        stopIdle();
        pup.happy(); fxStars(800, 430);
        say(step === WARM.length - 1 ? '¡Ya conoces la m! ¡Muy bien!' : '¡Muy bien!');
        later(2200, () => {
          if (step < WARM.length - 1) go('warmup', step + 1);
          else { S.warmup = true; go('map'); }
        });
      },
    });
    function idleHint() {
      hintLvl++;
      if (hintLvl === 1) { say('Pon tu dedo en el punto verde y sigue a tu perrito.'); tb.pulsePaw(); armIdle(10000, idleHint); }
      else { say('Mira cómo se hace.'); tb.demo(() => armIdle(12000, idleHint)); }
    }
    const intro = step === 0 ? 'Vamos a escribir la letra m en cursiva. Empieza en el punto verde, sube, y sigue a tu perrito.' : 'Ahora unimos la m: ' + item + '.';
    later(400, () => say(intro));
    armIdle(12000, idleHint);
    tbButtons(tb, intro, () => { tb.demo(); });
  };
  function tbButtons(tb, repeatText, demoFn) {
    const g = el('g', {}, L.scene);
    button(g, { x: 120, y: 820, w: 150, h: 110, fill: C_BLUE, icon: 'speaker', onTap: () => say(repeatText) });
    button(g, { x: 270, y: 820, w: 110, h: 110, fill: 'rgba(255,255,255,.9)', icon: 'house', iconColor: '#7a6a55', onTap: () => go('map') });
    button(g, { x: 640, y: 820, w: 420, h: 110, fill: C_GREEN, icon: 'play', label: 'Ver cómo se hace', fs: 32, onTap: demoFn });
    button(g, { x: 990, y: 820, w: 220, h: 110, fill: '#fff', stroke: '#e3d6bf', icon: 'eraser', iconColor: '#8a7d6b', label: 'Borrar', color: C_INK, fs: 34, onTap: () => tb.reset() });
  }

  // ---------------------------------------------------------------- Misión de una palabra
  function others(word) { return WORDS.filter((w) => w !== word); }
  SCREENS.mission = function (arg) {
    const word = arg.word, st = arg.station;
    const fns = [stFind, stBuild, stRead, stWrite];
    fns[st](word);
  };
  function nextStation(word, st) {
    if (st < 3) go('mission', { word, station: st + 1 });
    else go('victory', word);
  }

  // 3A · Encuentra
  function stFind(word) {
    bgPark({ ground: 700 });
    stationDots(0);
    instruction('Escucha y toca la palabra');
    const distract = lessonOf(word).distract[word];
    const pair = Math.random() < 0.5 ? [word, distract] : [distract, word];
    const pup = puppy(L.scene, 1400, 830, 0.6);
    let wrong = 0, hint = 0, finished = false;
    const prompt = `Tu perrito busca la palabra ${word}. ¿Dónde está?`;
    const cards = pair.map((w, i) => {
      const cx = i === 0 ? 500 : 1060, cy = 430;
      const g = el('g', { transform: `translate(${cx},${cy})` }, L.scene);
      const shakeG = el('g', {}, g);
      const glowR = el('rect', { x: -250, y: -150, width: 500, height: 300, rx: 40, fill: 'none', stroke: C_GOLD, 'stroke-width': 14, opacity: 0 }, shakeG);
      const bg = el('rect', { x: -230, y: -130, width: 460, height: 260, rx: 34, fill: '#fff', stroke: '#e3d6bf', 'stroke-width': 4 }, shakeG);
      cursiveWord(shakeG, w, { cx: 0, baseline: 50, scale: 0.95, sw: 10 });
      const card = { w, g, shakeG, bg, glowR };
      onTap(g, () => choose(card));
      return card;
    });
    function choose(card) {
      if (finished) return;
      armIdle(10000, idleHint);
      if (card.w === word) {
        finished = true; stopIdle();
        card.bg.setAttribute('stroke', C_GREEN); card.bg.setAttribute('stroke-width', 12);
        card.glowR.setAttribute('opacity', 0);
        fxStars(parseFloat(card.g.getAttribute('transform').match(/translate\(([\d.]+)/)[1]), 430);
        pup.happy();
        S.progress[word].find = Math.max(hint, wrong > 0 ? 1 : 0);
        say(`¡Sí! Aquí dice ${word}.`);
        later(2300, () => nextStation(word, 0));
      } else {
        wrong++;
        restartClass(card.shakeG, 'shake');
        pup.confused();
        if (wrong >= 2) showHint(2);
        else say('Mmm. Escucha otra vez: ' + word);
      }
    }
    function showHint(level) {
      hint = Math.max(hint, level);
      const t = cards.find((c) => c.w === word);
      if (level >= 2) { t.glowR.setAttribute('opacity', 1); t.glowR.setAttribute('class', 'glow'); say('Mira la que brilla. Ahí dice ' + word + '.'); }
      if (level >= 3) { const o = cards.find((c) => c.w !== word); o.g.setAttribute('opacity', 0.25); }
    }
    function idleHint() {
      if (finished) return;
      hint++;
      if (hint === 1) say(prompt); else showHint(hint);
      if (hint < 3) armIdle(10000, idleHint);
    }
    bottomBar({ repeat: () => say(prompt), help: () => { hint++; if (hint === 1) say(prompt); else showHint(Math.min(3, hint)); } });
    later(400, () => say(prompt));
    armIdle(12000, idleHint);
  }

  // 3B · Arma (arrastrar y soltar)
  function stBuild(word) {
    bgPlain('#fff6e5');
    stationDots(1);
    instruction('Arma la palabra con las letras');
    const letters = Array.from(word);
    const n = letters.length;
    // modelo
    const modelG = el('g', {}, L.scene);
    el('rect', { x: 500, y: 150, width: 600, height: 150, rx: 30, fill: '#fff', stroke: '#efdfbf', 'stroke-width': 3 }, modelG);
    cursiveWord(modelG, word, { cx: 800, baseline: 265, scale: 0.78, sw: 8, color: '#b9a98a' });
    // casillas
    const SW = 180, GAP = 28;
    const totalW = n * SW + (n - 1) * GAP;
    const slots = letters.map((ch, i) => {
      const cx = 800 - totalW / 2 + SW / 2 + i * (SW + GAP), cy = 440;
      const g = el('g', { transform: `translate(${cx},${cy})` }, L.scene);
      const glow = el('g', {}, g);
      const r = el('rect', { x: -SW / 2, y: -SW / 2, width: SW, height: SW, rx: 30, fill: '#fffaf0', stroke: '#e4cf9a', 'stroke-width': 5, 'stroke-dasharray': '16 12' }, glow);
      const pw = el('g', { transform: 'scale(2)', opacity: 0.35 }, glow);
      pawShape(pw, '#d9c59a');
      el('text', { y: SW / 2 + 40, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: '#c2ad80', text: String(i + 1) }, g);
      return { ch, cx, cy, g, r, glow, filled: null };
    });
    // fichas
    let order = letters.map((c, i) => i);
    for (let k = 0; k < 20; k++) {
      order.sort(() => Math.random() - 0.5);
      if (order.some((v, i) => v !== i)) break;
    }
    const TW = 160;
    const trayW = n * TW + (n - 1) * 40 + 80;
    el('rect', { x: 800 - trayW / 2, y: 590, width: trayW, height: 180, rx: 90, fill: '#f1dfc0' }, L.scene);
    const tiles = order.map((li, j) => {
      const ch = letters[li];
      const hx = 800 - (n * TW + (n - 1) * 40) / 2 + TW / 2 + j * (TW + 40), hy = 680;
      const g = el('g', { transform: `translate(${hx},${hy})` }, L.scene);
      const inner = el('g', {}, g);
      const box = el('rect', { x: -TW / 2, y: -TW / 2, width: TW, height: TW, rx: 28, fill: '#fff', stroke: C_ORANGE, 'stroke-width': 4 }, inner);
      el('rect', { x: -TW / 2 + 8, y: TW / 2 - 14, width: TW - 16, height: 8, rx: 4, fill: 'rgba(0,0,0,.06)' }, inner);
      cursiveWord(inner, ch, { cx: 0, baseline: 40, scale: ch === 'm' ? 0.8 : 0.95, sw: 11, tail: false, print: isPrint(word) });
      const t = { ch, g, inner, box, hx, hy, x: hx, y: hy, placed: false };
      g.style.touchAction = 'none';
      return t;
    });
    const pup = puppy(L.scene, 1440, 880, 0.48);
    let selected = null, drag = null, wrongRow = 0, hint = 0, finished = false;
    const prompt = `Vamos a armar ${word}. Pon cada letra en su huellita, empezando por la izquierda.`;

    function setPos(t, x, y, sc) { t.x = x; t.y = y; t.g.setAttribute('transform', `translate(${x},${y}) scale(${sc || 1})`); }
    function nearestSlot(x, y) {
      let best = null, bd = 1e9;
      slots.forEach((s) => { const d = Math.hypot(s.cx - x, s.cy - y); if (d < bd) { bd = d; best = s; } });
      return { slot: best, d: bd };
    }
    function highlight(s) { slots.forEach((x) => x.r.setAttribute('stroke', x === s && !x.filled ? C_ORANGE : '#e4cf9a')); }
    function goHome(t) {
      const ox = t.x, oy = t.y;
      tween(380, (k) => setPos(t, ox + (t.hx - ox) * k, oy + (t.hy - oy) * k), () => setPos(t, t.hx, t.hy));
    }
    function tryPlace(t, s) {
      armIdle(10000, idleHint);
      if (s.filled) { goHome(t); highlight(null); return; }
      if (s.ch === t.ch) {
        s.filled = t; t.placed = true;
        const ox = t.x, oy = t.y;
        tween(220, (k) => setPos(t, ox + (s.cx - ox) * k, oy + (s.cy - oy) * k), () => setPos(t, s.cx, s.cy));
        s.r.setAttribute('stroke', C_GOLD); s.r.setAttribute('stroke-dasharray', 'none'); s.r.setAttribute('fill', '#fff6d0');
        s.glow.setAttribute('class', '');
        t.box.setAttribute('stroke', C_GOLD);
        t.g.classList.remove('tap');
        SFX.click(); SFX.yip(0.05);
        wrongRow = 0;
        if (slots.every((x) => x.filled)) complete();
      } else {
        wrongRow++;
        SFX.sniff(); pup.confused();
        // rebote suave a la cesta
        const ox = t.x, oy = t.y;
        tween(200, (k) => setPos(t, ox, oy - 40 * Math.sin(k * Math.PI)), () => goHome(t));
        if (wrongRow >= 2) showHint(2);
      }
      highlight(null);
    }
    function deselect() { if (selected) { selected.box.setAttribute('stroke-width', 4); setPos(selected, selected.hx, selected.hy, 1); selected = null; } }
    tiles.forEach((t) => {
      t.g.addEventListener('pointerdown', (e) => {
        if (finished || t.placed || drag || isPalm(e)) return;
        e.stopPropagation(); ac();
        const p = toStage(e);
        drag = { t, id: e.pointerId, sx: p.x, sy: p.y, moved: false };
        try { t.g.setPointerCapture(e.pointerId); } catch (x) {}
        L.scene.appendChild(t.g);
        armIdle(10000, idleHint);
      });
      t.g.addEventListener('pointermove', (e) => {
        if (!drag || drag.t !== t || e.pointerId !== drag.id) return;
        const p = toStage(e);
        if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 14) { drag.moved = true; if (selected && selected !== t) deselect(); SFX.pop(); }
        if (drag.moved) {
          setPos(t, p.x, p.y - 40, 1.1);
          const ns = nearestSlot(p.x, p.y - 40);
          highlight(ns.d < 150 ? ns.slot : null);
        }
      });
      const up = (e) => {
        if (!drag || drag.t !== t || e.pointerId !== drag.id) return;
        const wasMoved = drag.moved; drag = null;
        if (wasMoved) {
          const ns = nearestSlot(t.x, t.y);
          if (ns.d < 120) tryPlace(t, ns.slot); else { goHome(t); highlight(null); setPos(t, t.x, t.y, 1); }
          selected = null;
        } else {
          // tocar y colocar
          if (selected === t) { deselect(); return; }
          deselect();
          selected = t; SFX.pop();
          t.box.setAttribute('stroke-width', 9);
          setPos(t, t.hx, t.hy - 30, 1.1);
        }
      };
      t.g.addEventListener('pointerup', up);
      t.g.addEventListener('pointercancel', (e) => { if (drag && drag.t === t) { drag = null; goHome(t); } });
    });
    slots.forEach((s) => {
      onTap(s.g, () => { if (selected && !s.filled) { const t = selected; selected = null; t.box.setAttribute('stroke-width', 4); tryPlace(t, s); } });
    });

    function firstEmpty() { return slots.find((s) => !s.filled); }
    function showHint(level) {
      hint = Math.max(hint, level);
      const s = firstEmpty(); if (!s) return;
      if (level === 1) say(prompt);
      if (level >= 2) { s.glow.setAttribute('class', 'glow'); s.r.setAttribute('stroke', C_ORANGE); if (level === 2) say('Esta huellita va primero.'); }
      if (level >= 3) {
        const t = tiles.find((x) => !x.placed && x.ch === s.ch);
        if (t) { restartClass(t.inner, 'bounce1'); if (level === 3) say('Esta letra va ahí.'); }
      }
      if (level >= 4) {
        const t = tiles.find((x) => !x.placed && x.ch === s.ch);
        if (t) {
          say('Mira, así.');
          const ghost = el('g', { transform: `translate(${t.hx},${t.hy})`, opacity: 0.7 }, L.fx);
          pawShape(ghost, '#8b5a2b', 1.6);
          tween(1100, (k) => ghost.setAttribute('transform', `translate(${t.hx + (s.cx - t.hx) * k},${t.hy + (s.cy - t.hy) * k})`), () => later(400, () => ghost.remove()));
        }
      }
    }
    function idleHint() {
      if (finished) return;
      hint++; showHint(Math.min(4, hint));
      if (hint < 4) armIdle(10000, idleHint);
    }
    function complete() {
      finished = true; stopIdle();
      S.progress[word].build = hint;
      later(450, () => {
        tiles.forEach((t) => t.g.setAttribute('opacity', 0));
        slots.forEach((s) => s.g.setAttribute('opacity', 0.25));
        const big = cursiveWord(L.scene, word, { cx: 800, baseline: 520, scale: 1.45, sw: 12, color: C_INK });
        big.liftEls.forEach((x) => x.setAttribute('opacity', 0));
        say(isPrint(word) ? '¡Armaste la palabra!' : '¡Las letras se dieron la mano!');
        drawOn(big.path, 1700, () => {
          big.liftEls.forEach((x) => x.setAttribute('opacity', 1));
          pup.happy(); fxStars(800, 430);
          later(900, () => say(word));
          later(2600, () => nextStation(word, 1));
        });
      });
    }
    bottomBar({ repeat: () => say(prompt), help: () => { hint++; showHint(Math.min(4, hint)); } });
    later(400, () => say(prompt));
    armIdle(12000, idleHint);
  }

  // 3C · Léela con papá
  function stRead(word) {
    bgPlain('#f3efe6');
    stationDots(2);
    el('rect', { x: 230, y: 150, width: 1140, height: 540, rx: 44, fill: '#fff' }, L.scene);
    const w = cursiveWord(L.scene, word, { cx: 800, baseline: 500, scale: 1.75, sw: 12, color: '#1f160e' });
    const prompt = 'Ahora léela con papá.';
    let firstPart = null, done = false;
    // franja de papá
    const strip = el('g', {}, L.scene);
    el('rect', { x: 0, y: 742, width: 1600, height: 158, fill: '#e9e3d6' }, strip);
    el('text', { x: 330, y: 832, 'text-anchor': 'end', 'font-size': 30, 'font-weight': 800, fill: '#6b5f50', text: 'Papá:' }, strip);
    const opts = [
      { k: 'sola', label: 'La leyó sola', c: C_GREEN },
      { k: 'ayuda', label: 'Con ayuda', c: C_BLUE },
      { k: 'luego', label: 'Otro día', c: '#8f978f' },
    ];
    opts.forEach((o, i) => {
      const x = 500 + i * 300;
      const g = el('g', { transform: `translate(${x},820)` }, strip);
      const inner = el('g', { cls: 'press' }, g);
      el('rect', { x: -135, y: -46, width: 270, height: 92, rx: 46, fill: '#fff', stroke: o.c, 'stroke-width': 4 }, inner);
      const pw = el('g', { transform: 'translate(-92,0) scale(1.05)' }, inner);
      pawShape(pw, o.c);
      el('text', { x: 18, y: 10, 'text-anchor': 'middle', 'font-size': 27, 'font-weight': 800, fill: C_INK, text: o.label }, inner);
      onTap(g, () => result(o.k));
    });
    // pista de papá: primera parte
    const fp = el('g', { transform: 'translate(1380,820)' }, strip);
    const fpi = el('g', { cls: 'press' }, fp);
    el('rect', { x: -110, y: -40, width: 220, height: 80, rx: 40, fill: 'rgba(255,255,255,.7)' }, fpi);
    el('text', { x: 0, y: 9, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 800, fill: '#6b5f50', text: 'Primera parte' }, fpi);
    onTap(fp, () => {
      if (firstPart) return;
      const r = w.b.ranges;
      const x0 = r[0].x0, x1 = r[1].x1;
      firstPart = el('path', { d: `M ${x0 + 10} 26 Q ${(x0 + x1) / 2} 44 ${x1 - 6} 26`, fill: 'none', stroke: C_ORANGE, 'stroke-width': 7, 'stroke-linecap': 'round' }, w.g);
    });
    function result(k) {
      if (done) return; done = true;
      S.progress[word].read = k;
      const pup = puppy(L.scene, 1700, 720, 0.75);
      pup.moveTo(1300, 720, 700, () => { pup.happy(); fxHearts(1300, 450, 4); });
      later(900, () => say(word + '. ¡Muy bien!'));
      later(3000, () => nextStation(word, 2));
    }
    button(L.scene, { x: 120, y: 820, w: 150, h: 110, fill: C_BLUE, icon: 'speaker', onTap: () => say(prompt) });
    later(400, () => say(prompt));
  }

  // 3D · Escribe en la arena
  function stWrite(word) {
    bgPlain('#fbf0d8');
    stationDots(3);
    instruction('Escribe ' + 'la palabra: sigue a tu perrito');
    const pup = puppy(L.scene, 1440, 880, 0.48);
    let hint = 0, demoUsed = false;
    const prompt = `Escribe ${word} en cursiva. Empieza en el punto verde y sigue a tu perrito sin levantar el dedo.`;
    const tb = traceBoard(word, {
      onActivity: () => armIdle(10000, idleHint),
      onLift: () => say(word === 'misa' ? 'Ahora el puntito de la i. Toca la mariposa.' : word === 'mamá' ? 'Ahora la rayita de la a. Toca la mariposa.' : word.includes('t') ? 'Ahora la rayita de la t. Toca la mariposa.' : ''),
      onDone: () => {
        stopIdle();
        S.progress[word].write = demoUsed ? 'demo' : hint ? 'pista' : 'sola';
        pup.happy(); fxStars(800, 430);
        say(`¡Escribiste ${word}!`);
        later(2400, () => nextStation(word, 3));
      },
    });
    function idleHint() {
      hint++;
      if (hint === 1) { say('Pon tu dedo en el punto verde y sigue a tu perrito.'); tb.pulsePaw(); armIdle(10000, idleHint); }
      else { demoUsed = true; say('Mira cómo se hace.'); tb.demo(() => armIdle(14000, idleHint)); }
    }
    tbButtons(tb, prompt, () => { demoUsed = true; tb.demo(); });
    later(400, () => say(prompt));
    armIdle(12000, idleHint);
  }

  // ---------------------------------------------------------------- Victoria de palabra
  SCREENS.victory = function (word) {
    bgPark({ sky: '#fff1dc', grass: '#cfe8bf', grass2: '#bddfa9', ground: 690, noSun: true });
    const idx = WORDS.indexOf(word);
    const trick = TRICKS[idx];
    const pup = puppy(L.scene, 1010, 770, 0.95);
    pup.ears(); SFX.whine();
    const capT = instruction(`¡Completaste ${word}! Toca la caja`);
    // caja
    const box = el('g', { transform: 'translate(560,770)' }, L.scene);
    const boxB = el('g', { cls: 'bob' }, box);
    el('rect', { x: -110, y: -170, width: 220, height: 170, rx: 10, fill: C_ORANGE }, boxB);
    el('rect', { x: -20, y: -170, width: 40, height: 170, fill: '#ffd66b' }, boxB);
    const lid = el('g', {}, boxB);
    el('rect', { x: -128, y: -212, width: 256, height: 50, rx: 10, fill: '#f6a55e' }, lid);
    el('rect', { x: -20, y: -212, width: 40, height: 50, fill: '#ffd66b' }, lid);
    el('path', { d: 'M0 -212 q-40 -50 -64 -12 z M0 -212 q40 -50 64 -12 z', fill: C_PINK }, lid);
    let opened = false;
    const prompt = `¡Completaste la palabra ${word}! Tu perrito aprendió algo nuevo. Toca la caja.`;
    later(300, () => say(prompt));
    armIdle(7000, function nudge() { if (opened) return; pup.hop(); SFX.whine(0.3); armIdle(7000, nudge); });
    onTap(box, () => {
      if (opened) return; opened = true; stopIdle();
      boxB.setAttribute('class', '');
      lid.setAttribute('class', 'lid-open');
      fxHearts(560, 560, 6); SFX.fanfare();
      pup.happy();
      capT.remove();
      instruction('¡Tu perrito está feliz!');
      say('¡Guau! ¡Tu perrito está feliz!');
      later(2000, () => {
        pup.trick(trick.id);
        later(trick.id === 'rodar' ? 1500 : 2000, () => say(`¡Aprendió a ${trick.verb}!`));
      });
      later(4200, () => {
        S.progress[word].trick = trick.id; S.progress[word].done = true; save();
        const c = el('g', { transform: 'translate(1330,360)' }, L.scene);
        const ci = el('g', { cls: 'pop-in' }, c);
        el('rect', { x: -170, y: -150, width: 340, height: 300, rx: 26, fill: '#fff', stroke: C_GOLD, 'stroke-width': 6 }, ci);
        el('text', { y: -96, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, fill: '#9a6b12', text: `Truco ${idx + 1}` }, ci);
        el('text', { y: -52, 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 900, fill: C_INK, text: trick.name }, ci);
        el('line', { x1: -130, x2: 130, y1: -20, y2: -20, stroke: '#f0e3c4', 'stroke-width': 3 }, ci);
        cursiveWord(ci, word, { cx: 0, baseline: 80, scale: 0.62, sw: 9 });
        SFX.sparkle();
        later(1400, () => {
          const last = WORDS.every((w) => S.progress[w].done);
          const b = button(L.scene, { x: 1330, y: 600, w: 300, h: 104, label: last ? '¡A la fiesta!' : 'Seguir', fs: 40, onTap: () => go(last ? 'party' : 'map') });
          b.querySelector('.press').classList.add('pulse');
        });
      });
    });
  };

  // ---------------------------------------------------------------- Gran fiesta canina
  SCREENS.party = function () {
    bgPark({ sky: '#e9e1fb', ground: 700, sun: '#ffd66b' });
    const pup = puppy(L.scene, 760, 820, 0.8);
    const FR = LES.friend;
    const newFriend = !S.friends.includes(FR);
    // el resto de la manada también celebra
    const pack = ['main', ...S.friends].filter((c) => c !== LES.star && c !== FR);
    const packPups = pack.map((c, i) => puppy(L.scene, 1130 + i * 230, 850, 0.55, c));
    const friend = puppy(L.scene, -150, 830, 0.68, FR);
    instruction('¡Fiesta! Revienta los globos');
    SFX.fanfare(); pup.happy();
    const cols = [C_ORANGE, C_BLUE, C_PINK, C_PURPLE];
    let popped = 0;
    const nb = WORDS.length, bsp = nb > 3 ? 360 : 440, bsc = nb > 3 ? 0.8 : 1;
    WORDS.forEach((w, i) => {
      const x = 800 - ((nb - 1) * bsp) / 2 + i * bsp, y = 330;
      const g = el('g', { transform: `translate(${x},${y}) scale(${bsc})` }, L.scene);
      const bb = el('g', { cls: 'bob' }, g);
      bb.style.animationDelay = i * 0.3 + 's';
      el('path', { d: 'M0 150 C 20 200 -20 240 0 300', fill: 'none', stroke: '#8a7d6b', 'stroke-width': 3 }, bb);
      el('ellipse', { cx: 0, cy: 0, rx: 175, ry: 150, fill: cols[i] }, bb);
      el('path', { d: 'M-12 148 L12 148 L0 166z', fill: cols[i] }, bb);
      el('ellipse', { cx: -70, cy: -70, rx: 30, ry: 18, fill: 'rgba(255,255,255,.35)', transform: 'rotate(-30 -70 -70)' }, bb);
      cursiveWord(bb, w, { cx: 0, baseline: 40, scale: 0.75, sw: 11, color: '#fff' });
      let gone = false;
      onTap(g, () => {
        if (gone) return; gone = true;
        bb.setAttribute('class', 'balloon-pop');
        bb.style.transformOrigin = '0 0';
        SFX.balloon(); fxConfetti(x, y, 30);
        say(w); SFX.yip(0.5);
        popped++;
        later(320, () => g.remove());
        if (popped === WORDS.length) later(1300, finale);
      });
    });
    later(600, () => say('¡Fiesta, Milana! Revienta los globos con tus palabras.'));
    later(1800, () => {
      friend.moveTo(330, 830, 1400, () => {
        friend.happy();
        if (newFriend) { S.friends.push(FR); save(); say(LES.friendSay, { queue: true }); }
      });
    });
    function finale() {
      pup.trick('bailar'); friend.trick('bailar'); packPups.forEach((pp) => pp.trick('bailar'));
      later(1900, () => {
        const ov = el('g', {}, L.fx);
        el('rect', { width: 1600, height: 900, fill: 'rgba(60,40,20,.35)' }, ov);
        const card = el('g', { transform: 'translate(800,430)' }, ov);
        const ci = el('g', { cls: 'pop-in' }, card);
        el('rect', { x: -520, y: -330, width: 1040, height: 640, rx: 40, fill: '#fffdf6', stroke: C_GOLD, 'stroke-width': 10 }, ci);
        el('text', { y: -250, 'text-anchor': 'middle', 'font-size': 52, 'font-weight': 900, fill: C_INK, text: '¡Milana leyó y escribió!' }, ci);
        const fsp = nb > 3 ? 240 : 320;
        WORDS.forEach((w, i) => cursiveWord(ci, w, { cx: -((nb - 1) * fsp) / 2 + i * fsp, baseline: -110, scale: 0.7, sw: 10 }));
        el('rect', { x: -470, y: -50, width: 940, height: 280, rx: 30, fill: '#dff1fb' }, ci);
        el('rect', { x: -470, y: 150, width: 940, height: 80, rx: 0, fill: '#bfe3b4' }, ci);
        const team = ['main', ...S.friends.filter((c) => c !== 'main')];
        const tsp = team.length > 2 ? 210 : 240;
        team.forEach((c, i) => { const pp = puppy(ci, -((team.length - 1) * tsp) / 2 + i * tsp, 212, team.length > 2 ? 0.5 : 0.58, c); if (c === LES.star) pp.happy(); });
        el('text', { x: 0, y: 280, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 800, fill: '#6b5440', text: 'Milana y su manada' }, ci);
        fxConfetti(800, 200, 40);
        say('¡Qué orgullo! Milana leyó y escribió ' + WORDS.slice(0, -1).join(', ') + ' y ' + WORDS[WORDS.length - 1] + '.');
        later(2200, () => {
          const b = button(L.fx, { x: 800, y: 830, w: 320, h: 100, label: 'Terminar', fs: 40, onTap: () => go('close') });
          b.querySelector('.press').classList.add('pulse');
        });
      });
    }
  };

  // ---------------------------------------------------------------- Cierre tranquilo
  SCREENS.close = function () {
    bgPark({ sky: '#f9d3a5', sun: '#f6a55e', grass: '#a9cf9b', grass2: '#97c288', ground: 650 });
    el('ellipse', { cx: 760, cy: 700, rx: 230, ry: 50, fill: '#8b5fd0' }, L.scene);
    el('ellipse', { cx: 760, cy: 688, rx: 200, ry: 36, fill: '#b48cf0' }, L.scene);
    const pup = puppy(L.scene, 760, 700, 0.95);
    pup.sleep(true);
    el('text', { cls: 'zz', x: 860, y: 430, 'font-size': 48, 'font-weight': 900, fill: '#8a6a4a', text: 'z z z' }, L.scene);
    instruction('Tu perrito se va a descansar');
    later(400, () => say('¡Qué buena aventura, Milana! Tu perrito se va a descansar. Mañana te espera.'));
    button(L.scene, { x: 1250, y: 800, w: 340, h: 100, fill: '#fff', label: 'Ver mi casita', color: '#7a4a10', fs: 36, onTap: () => go('casita') });
    button(L.scene, { x: 120, y: 820, w: 110, h: 110, fill: 'rgba(255,255,255,.85)', icon: 'house', iconColor: '#7a6a55', onTap: () => go('map') });
  };

  // ---------------------------------------------------------------- Mi casita (álbum de trucos)
  SCREENS.casita = function () {
    bgPlain('#fdebd3');
    el('rect', { x: 0, y: 640, width: 1600, height: 260, fill: '#e8c79a' }, L.bg);
    el('rect', { x: 0, y: 630, width: 1600, height: 14, fill: '#d6ae78' }, L.bg);
    instruction('Mi casita: toca un truco');
    // la manada
    const team = ['main', ...S.friends.filter((c) => c !== 'main')];
    const pups = {};
    const px = [1250, 1460, 1060, 1500];
    team.forEach((c, i) => { pups[c] = puppy(L.scene, px[i] || 1300, 800 + (i ? 15 : 0), i ? 0.58 : 0.8, c); });
    LESSONS.forEach((l, r) => {
      const y = 260 + r * 250, cw = 200, gap = 26, x0 = 130;
      el('text', { x: x0 - 10, y: y - 105, 'font-size': 24, 'font-weight': 900, fill: '#8a6236', text: `${l.title} · trucos de ${PUP_NAME[l.star] === 'tu perrito' ? 'tu perrito' : PUP_NAME[l.star]}` }, L.scene);
      el('rect', { x: x0 - 10, y: y + 92, width: l.words.length * (cw + gap), height: 14, rx: 6, fill: '#b7895a' }, L.scene);
      l.tricks.forEach((t, i) => {
        const w = l.words[i];
        const x = x0 + cw / 2 + i * (cw + gap);
        const got = S.progress[w].trick === t.id;
        const g = el('g', { transform: `translate(${x},${y})` }, L.scene);
        if (got) {
          el('rect', { x: -cw / 2, y: -88, width: cw, height: 176, rx: 20, fill: '#fff', stroke: C_GOLD, 'stroke-width': 5 }, g);
          el('text', { y: -50, 'text-anchor': 'middle', 'font-size': 23, 'font-weight': 900, fill: C_INK, text: t.name }, g);
          cursiveWord(g, w, { cx: 0, baseline: 45, scale: 0.42, sw: 9 });
          onTap(g, () => { const pp = pups[l.star] || pups.main; pp.trick(t.id); say(`${PUP_NAME[l.star] === 'tu perrito' ? '' : PUP_NAME[l.star] + '. '}${t.name}. Palabra: ${w}.`); });
        } else {
          el('rect', { x: -cw / 2, y: -88, width: cw, height: 176, rx: 20, fill: 'rgba(255,255,255,.45)', stroke: '#d8c2a0', 'stroke-width': 4, 'stroke-dasharray': '12 10' }, g);
          const pw = el('g', { transform: 'scale(1.8)', opacity: 0.35 }, g);
          pawShape(pw, '#b9a27e');
        }
      });
    });
    later(400, () => say('Esta es tu casita con tu manada. Toca un truco para verlo otra vez.'));
    button(L.scene, { x: 120, y: 820, w: 110, h: 110, fill: '#fff', icon: 'house', iconColor: C_ORANGE, onTap: () => go('map') });
  };

  // ================================================================== Área de papá
  function openGate() {
    hush();
    const n = 2 + Math.floor(Math.random() * 7);
    const choices = [n, (n + 3) % 9 + 1, (n + 5) % 9 + 1].sort(() => Math.random() - 0.5);
    panel.innerHTML = `<div class="pcard gate"><h2>Área de papá</h2><p class="sub">Toca el número <b style="font-size:22px">${n}</b> para entrar.</p>
      <div class="nums">${choices.map((c) => `<button class="pbtn" data-n="${c}">${c}</button>`).join('')}</div>
      <div class="prow" style="justify-content:center;margin-top:14px"><button class="pbtn" data-x="1">Volver al juego</button></div></div>`;
    panel.hidden = false;
    panel.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => { if (+b.dataset.n === n) openPanel(); else closePanel(); }));
    panel.querySelector('[data-x]').addEventListener('click', closePanel);
  }
  function chip(v, kind) {
    if (v === null || v === undefined) return '<span class="c-none">—</span>';
    if (kind === 'lvl') return v === 0 ? '<span class="chip c-ok">Sola</span>' : `<span class="chip c-help">Con pista (nivel ${v})</span>`;
    if (kind === 'read') return { sola: '<span class="chip c-ok">La leyó sola</span>', ayuda: '<span class="chip c-help">Con ayuda</span>', luego: '<span class="chip c-later">Otro día</span>' }[v];
    if (kind === 'write') return { sola: '<span class="chip c-ok">Repasó sola</span>', pista: '<span class="chip c-help">Con pista</span>', demo: '<span class="chip c-help">Vio la demostración</span>' }[v];
    return v;
  }
  function openPanel() {
    const rows = LESSONS.map((l) => `<tr><td colspan="6" style="font-weight:800;padding-top:10px">${l.title} — ${l.lang === 'en' ? 'imprenta' : 'cursiva Palmer'} · trucos de ${PUP_NAME[l.star]}${S.friends.includes(l.friend) ? ' · llegó ' + l.friendName : ''}</td></tr>` + l.words.map((w) => {
      const p = S.progress[w];
      const t = l.tricks.find((x) => x.id === p.trick);
      const pv = p.prev ? '<span class="chip c-ok">Hecho</span>' : null;
      return `<tr><td class="w">${w}</td><td>${pv || chip(p.find, 'lvl')}</td><td>${pv || chip(p.build, 'lvl')}</td><td>${pv || chip(p.read, 'read')}</td><td>${pv || chip(p.write, 'write')}</td><td>${t ? t.name : '<span class="c-none">—</span>'}</td></tr>`;
    }).join('')).join('');
    panel.innerHTML = `<div class="pcard"><h2>Área de papá</h2>
      <p class="sub">Manada: ${['main', ...S.friends].map((c) => c === 'main' ? 'su perrito' : PUP_NAME[c]).join(' · ')}. Calentamiento de la m: <b>${S.warmup ? 'hecho' : 'pendiente'}</b>.</p>
      <table><thead><tr><th>Palabra</th><th>Encontrar</th><th>Armar</th><th>Leer</th><th>Escribir</th><th>Truco</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="prow" style="margin-bottom:14px">
        <label class="ptog"><input type="checkbox" id="tSound" ${S.sound ? 'checked' : ''}> Sonidos y ladridos</label>
        <label class="ptog"><input type="checkbox" id="tVoice" ${S.voice ? 'checked' : ''}> Voz</label>
      </div>
      <div class="prow">
        <button class="pbtn pri" id="pClose">Volver al juego</button>
        <button class="pbtn" id="pMap">Ir al parque</button>
        <button class="pbtn" id="pReset">Repetir ${LES.name} (la manada se queda)</button>
      </div>
      <p class="pnote">El progreso se guarda en esta pizarra (aunque se cierre la página). La voz usa la del navegador; en la versión final irá grabada en español venezolano. Los ladridos son sonidos de prueba.</p></div>`;
    panel.hidden = false;
    panel.querySelector('#tSound').addEventListener('change', (e) => { S.sound = e.target.checked; save(); });
    panel.querySelector('#tVoice').addEventListener('change', (e) => { S.voice = e.target.checked; if (!S.voice) hush(); save(); });
    panel.querySelector('#pClose').addEventListener('click', closePanel);
    panel.querySelector('#pMap').addEventListener('click', () => { closePanel(); go('map'); });
    panel.querySelector('#pReset').addEventListener('click', () => {
      // Solo reinicia la misión activa. Nunca quita perritos de la manada.
      LES.words.forEach((w) => { S.progress[w] = blankWord(); });
      if (LES.warmup) S.warmup = false;
      save(); closePanel(); go('map');
    });
  }
  function closePanel() { panel.hidden = true; panel.innerHTML = ''; }

  // Evita menú contextual / zoom accidental en la pizarra
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Atajo de QA: #pantalla
  window.__mila = { go, S: () => S, setState: (fn) => fn(S), setLesson, save, splitLang };
  go('home');
})();
