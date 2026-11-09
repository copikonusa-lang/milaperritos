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
  };

  const BASE = { 'á': 'a' };

  function build(word, opts) {
    opts = opts || {};
    const tail = opts.tail !== false;
    let ox = 0;
    let d = 'M 0 0';
    const lifts = [];
    const ranges = [];
    for (const ch of word) {
      const k = BASE[ch] || ch;
      const g = G[k];
      if (!g) continue;
      const start = ox;
      for (const seg of g.s) {
        if (seg[0] === 'C') {
          d += ` C ${seg[1] + ox} ${seg[2]} ${seg[3] + ox} ${seg[4]} ${seg[5] + ox} ${seg[6]}`;
        }
      }
      if (k === 'i') lifts.push({ type: 'dot', x: ox + 30, y: -138 });
      if (ch === 'á') lifts.push({ type: 'accent', x1: ox + 30, y1: -120, x2: ox + 46, y2: -146 });
      ox += g.w;
      ranges.push({ ch, x0: start, x1: ox });
    }
    if (tail) {
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
