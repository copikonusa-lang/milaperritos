// Letras cursivas estilo Palmer (trazo continuo).
// Sistema local: línea base y=0, altura de la x = -100. Cada letra empieza en (0,0)
// y termina en (w,0) para enlazar con la siguiente.
(function () {
  const G = {
    m: {
      w: 140,
      s: [
        ['C', 6, -34, 12, -80, 22, -98],
        ['C', 28, -106, 32, -96, 32, -80],
        ['C', 32, -54, 31, -24, 31, 0],
        ['C', 33, -60, 44, -100, 60, -100],
        ['C', 74, -100, 78, -84, 78, -62],
        ['C', 78, -40, 77, -20, 77, 0],
        ['C', 79, -60, 90, -100, 106, -100],
        ['C', 120, -100, 124, -84, 124, -60],
        ['C', 124, -40, 122, -18, 126, -8],
        ['C', 128, -2, 134, 0, 140, 0],
      ],
    },
    e: {
      w: 56,
      s: [
        ['C', 16, -6, 40, -28, 42, -56],
        ['C', 44, -84, 14, -84, 12, -52],
        ['C', 10, -18, 26, 0, 56, 0],
      ],
    },
    s: {
      w: 62,
      s: [
        ['C', 10, -28, 20, -72, 28, -104],
        ['C', 48, -76, 56, -36, 42, -10],
        ['C', 34, 2, 14, 2, 15, -8],
        ['C', 17, -14, 36, 0, 62, 0],
      ],
    },
    a: {
      w: 78,
      s: [
        ['C', 6, -30, 12, -78, 34, -96],
        ['C', 42, -101, 50, -99, 54, -94],
        ['C', 40, -104, 12, -98, 10, -56],
        ['C', 8, -14, 40, -6, 52, -50],
        ['C', 54, -64, 55, -80, 56, -98],
        ['C', 55, -70, 54, -40, 54, -20],
        ['C', 54, -4, 62, 0, 78, 0],
      ],
    },
    i: {
      w: 46,
      s: [
        ['C', 8, -28, 18, -70, 24, -100],
        ['C', 22, -64, 20, -26, 22, -12],
        ['C', 24, -2, 34, 0, 46, 0],
      ],
    },
    // o: termina arriba (enlace alto, como en Palmer)
    o: {
      w: 72, endHigh: true,
      hi: ['C', 10, -96, 24, -100, 36, -98],
      s: [
        ['C', 4, -30, 10, -84, 36, -98],
        ['C', 18, -102, 4, -80, 6, -48],
        ['C', 8, -10, 34, 2, 48, -18],
        ['C', 58, -34, 56, -82, 36, -98],
        ['C', 52, -93, 60, -90, 72, -90],
      ],
    },
    // l: lazo alto
    l: {
      w: 60,
      hi: ['C', 10, -110, 32, -150, 40, -190],
      s: [
        ['C', 16, -50, 40, -140, 40, -190],
        ['C', 40, -222, 14, -222, 16, -186],
        ['C', 18, -130, 20, -50, 22, -14],
        ['C', 24, -2, 40, 0, 60, 0],
      ],
    },
    // t: sube, baja por el mismo camino; la rayita va después
    t: {
      w: 56,
      hi: ['C', 12, -110, 24, -140, 30, -166],
      s: [
        ['C', 12, -50, 26, -128, 30, -166],
        ['C', 28, -120, 24, -50, 26, -14],
        ['C', 28, -2, 40, 0, 56, 0],
      ],
    },
  };
  G.m.hi = ['C', 8, -92, 16, -99, 22, -98];
  G.a.hi = ['C', 10, -90, 24, -94, 34, -96];
  G.i.hi = ['C', 10, -92, 18, -96, 24, -100];
  G.e.hi = ['C', 16, -80, 40, -60, 42, -56];
  G.s.hi = ['C', 12, -92, 22, -98, 28, -104];

  const BASE = { 'á': 'a' };

  function build(word, opts) {
    opts = opts || {};
    const tail = opts.tail !== false;
    let ox = 0;
    let d = 'M 0 0';
    const lifts = [];
    const ranges = [];
    let high = false;
    for (const ch of word) {
      const k = BASE[ch] || ch;
      const g = G[k];
      if (!g) continue;
      const start = ox;
      g.s.forEach((seg0, si) => {
        const seg = si === 0 && high && g.hi ? g.hi : seg0;
        if (seg[0] === 'C') {
          d += ` C ${seg[1] + ox} ${seg[2]} ${seg[3] + ox} ${seg[4]} ${seg[5] + ox} ${seg[6]}`;
        }
      });
      high = !!g.endHigh;
      if (k === 't') lifts.push({ type: 'cross', x1: ox + 8, y1: -112, x2: ox + 54, y2: -112 });
      if (k === 'i') lifts.push({ type: 'dot', x: ox + 30, y: -138 });
      if (ch === 'á') lifts.push({ type: 'accent', x1: ox + 30, y1: -120, x2: ox + 46, y2: -146 });
      ox += g.w;
      ranges.push({ ch, x0: start, x1: ox });
    }
    if (tail && high) {
      d += ` C ${ox + 8} -90 ${ox + 16} -92 ${ox + 24} -96`;
      ox += 24;
    } else if (tail) {
      d += ` C ${ox + 18} 0 ${ox + 34} -4 ${ox + 50} -14`;
      ox += 50;
    }
    return { d, width: ox, lifts, ranges };
  }

  function letter(ch) {
    // Letra suelta para fichas: entrada corta y salida corta.
    return build(ch, { tail: false });
  }

  window.Cursiva = { build, letter, SLANT: -12 };
})();

// Letras de imprenta (manuscrita escolar) para inglés.
// Línea base y=0, altura de la x = -60, ascendentes -120, descendentes +52.
(function () {
  const K = 0.5523;
  function circ(cx, cy, r, from) {
    // Círculo en sentido antihorario visual empezando a la derecha (from='r') o arriba (from='t')
    const k = r * K;
    const R = [cx + r, cy], T = [cx, cy - r], Lf = [cx - r, cy], B = [cx, cy + r];
    const segs = {
      rt: ['C', cx + r, cy - k, cx + k, cy - r, T[0], T[1]],
      tl: ['C', cx - k, cy - r, cx - r, cy - k, Lf[0], Lf[1]],
      lb: ['C', cx - r, cy + k, cx - k, cy + r, B[0], B[1]],
      br: ['C', cx + k, cy + r, cx + r, cy + k, R[0], R[1]],
    };
    return from === 't' ? [segs.tl, segs.lb, segs.br, segs.rt] : [segs.rt, segs.tl, segs.lb, segs.br];
  }
  const G = {
    a: { w: 60, start: [60, -30], s: [...circ(30, -30, 30, 'r'), ['L', 60, -60], ['L', 60, 0]] },
    d: { w: 60, start: [60, -30], s: [...circ(30, -30, 30, 'r'), ['L', 60, -120], ['L', 60, 0]] },
    g: { w: 60, start: [60, -30], s: [...circ(30, -30, 30, 'r'), ['L', 60, -60], ['L', 60, 28], ['C', 60, 46, 48, 54, 32, 54], ['C', 18, 54, 8, 48, 4, 40]] },
    o: { w: 60, start: [30, -60], s: circ(30, -30, 30, 't') },
    b: { w: 60, start: [0, -120], s: [['L', 0, 0], ['L', 0, -30], ['C', 0, -46.6, 13.4, -60, 30, -60], ['C', 46.6, -60, 60, -46.6, 60, -30], ['C', 60, -13.4, 46.6, 0, 30, 0], ['C', 13.4, 0, 0, -13.4, 0, -30]] },
    h: { w: 54, start: [0, -120], s: [['L', 0, 0], ['L', 0, -36], ['C', 5, -52, 16, -60, 29, -60], ['C', 45, -60, 54, -50, 54, -34], ['L', 54, 0]] },
    t: { w: 44, start: [20, -104], s: [['L', 20, -12], ['C', 20, -3, 26, 0, 32, 0], ['C', 37, 0, 41, -2, 44, -5]], cross: [2, -60, 42, -60] },
    e: { w: 60, start: [3, -30], s: [['L', 59, -30], ['C', 59, -48, 47, -60, 31, -60], ['C', 14, -60, 2, -47, 2, -30], ['C', 2, -12, 15, 0, 32, 0], ['C', 44, 0, 53, -5, 58, -13]] },
  };
  const GAP = 22;
  function build(word) {
    let ox = 0, d = '';
    const lifts = [], ranges = [];
    const chars = Array.from(word);
    chars.forEach((ch, i) => {
      const g = G[ch]; if (!g) return;
      d += `M ${g.start[0] + ox} ${g.start[1]}`;
      for (const s of g.s) {
        if (s[0] === 'L') d += ` L ${s[1] + ox} ${s[2]}`;
        else d += ` C ${s[1] + ox} ${s[2]} ${s[3] + ox} ${s[4]} ${s[5] + ox} ${s[6]}`;
      }
      d += ' ';
      if (g.cross) lifts.push({ type: 'cross', x1: g.cross[0] + ox, y1: g.cross[1], x2: g.cross[2] + ox, y2: g.cross[3] });
      ranges.push({ ch, x0: ox, x1: ox + g.w });
      ox += g.w + (i < chars.length - 1 ? GAP : 0);
    });
    return { d: d.trim(), width: ox, lifts, ranges };
  }
  window.Imprenta = { build, letter: build, SLANT: 0, XH: 60 };
})();
