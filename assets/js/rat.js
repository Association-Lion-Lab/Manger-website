/* Rat qui court : tête du logo, corps souple et pattes animés en galop bondissant.
   Le corps est construit autour d'une colonne vertébrale qui s'étire en vol et se voûte
   quand les pattes arrière se ramènent sous le ventre ; les pieds restent posés au sol
   pendant l'appui (cinématique inverse à deux segments). */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const GROUND = 580;
  const VIEW = [-320, 140, 1560, 470];
  const SPEED = 467; // avancée au sol par cycle, en unités du dessin

  // Poses clés du galop : [phase, x relatif à la hanche, hauteur au-dessus du sol, angle du pied, appui linéaire ?]
  const FRONT_KEYS = [
    [0.00, 110, -46, -0.25], [0.12, 75, 0, 0, true], [0.42, -65, 0, 0.1],
    [0.55, -70, -40, 1.1], [0.75, 10, -66, 0.9], [0.90, 100, -60, -0.1], [1.00, 110, -46, -0.25]
  ];
  const HIND_KEYS = [
    [0.00, -150, -64, 2.7], [0.15, -110, -96, 2.2], [0.28, -10, -88, 1.2], [0.36, 70, -40, 0.3],
    [0.42, 85, 0, 0, true], [0.75, -69, 0, 0.5], [0.85, -130, -36, 2.0], [1.00, -150, -64, 2.7]
  ];
  const ARCH = [[0, -0.25], [0.15, 0], [0.42, 1], [0.62, 0.6], [0.8, -0.15], [1, -0.25]];
  const LIFT = [[0, -34], [0.15, -4], [0.42, 6], [0.62, 0], [0.8, -24], [1, -34]];
  const PITCH = [[0, -2], [0.2, 7], [0.45, 1], [0.7, -6], [0.9, -4], [1, -2]];

  const LEGS = [
    { hind: true, far: true, s: 0.37, drop: 34, a: 72, b: 84, paw: 86, w: [44, 22, 20], dir: -1, offset: 0.04 },
    { hind: false, far: true, s: 0.8, drop: 28, a: 62, b: 66, paw: 44, w: [36, 17, 15], dir: 1, offset: 0.07 },
    { hind: true, far: false, s: 0.37, drop: 34, a: 72, b: 84, paw: 86, w: [44, 22, 20], dir: -1, offset: 0 },
    { hind: false, far: false, s: 0.8, drop: 28, a: 62, b: 66, paw: 44, w: [36, 17, 15], dir: 1, offset: 0 }
  ];

  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => 0.5 - 0.5 * Math.cos(Math.PI * k);

  function sample(keys, p) {
    p = ((p % 1) + 1) % 1;
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
    const [p0, ...v0] = keys[i], [p1, ...v1] = keys[i + 1];
    const raw = (p - p0) / (p1 - p0 || 1);
    const k = v0[v0.length - 1] === true ? raw : ease(raw);
    return v0.filter(v => typeof v === 'number').map((v, j) => lerp(v, v1[j], k));
  }

  // Épaisseur du corps le long de la colonne (0 = naissance de la queue, 1 = cou)
  const TOP = [[0, 13], [0.14, 62], [0.36, 94], [0.75, 66], [1, 46]];
  const BOTTOM = [[0, 13], [0.13, 60], [0.38, 102], [0.57, 70], [0.77, 74], [1, 44]];
  const profile = (table, s) => sample(table.map(([p, v]) => [p, v]), Math.min(s, 0.9999))[0];

  function spinePoint(s, arch) {
    const L = 570 * (1 - 0.12 * arch);
    return [490 + (s - 0.5) * L, 420 - (18 + 58 * arch) * Math.sin(Math.PI * s) - 10 * s];
  }

  function smooth(points) {
    const n = points.length;
    let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + ' Z';
  }

  function ik(h, f, a, b, dir) {
    const dx = f[0] - h[0], dy = f[1] - h[1];
    const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
    const cos = (a * a + d * d - b * b) / (2 * a * d);
    const k = Math.atan2(dy, dx) - dir * Math.acos(Math.max(-1, Math.min(1, cos)));
    return [h[0] + a * Math.cos(k), h[1] + a * Math.sin(k)];
  }

  const pt = p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

  function pawPath(ankle, angle, len, w) {
    // Pied effilé terminé par trois doigts recourbés, comme sur le logo
    const c = Math.cos(angle), s = Math.sin(angle);
    const P = (u, v) => [ankle[0] + c * u - s * v, ankle[1] + s * u + c * v];
    let d = `M${pt(P(0, -w))} L${pt(P(len * 0.8, -w * 0.6))} L${pt(P(len * 0.8, w * 0.7))} L${pt(P(0, w))} Z`;
    [-0.55, 0.05, 0.65].forEach(v => {
      d += ` M${pt(P(len * 0.75, v * w))} Q${pt(P(len + 18, v * w * 1.4 + 6))} ${pt(P(len + 6, v * w * 1.4 + 12))} L${pt(P(len * 0.7, v * w + 6))} Z`;
    });
    return d;
  }

  function create(container, opts = {}) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', VIEW.join(' '));
    svg.setAttribute('class', 'runrat');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <g class="rr-far"></g>
      <path class="rr-tail"/>
      <path class="rr-body"/>
      <path class="rr-tufts"/>
      <path class="rr-cut rr-haunch"/>
      <path class="rr-cut rr-shoulder"/>
      <g class="rr-head"><use href="#rb-body" clip-path="url(#rc-head)"/><use href="#rb-face"/></g>
      <g class="rr-near"></g>`;
    container.replaceChildren(svg);
    const q = sel => svg.querySelector(sel);
    const body = q('.rr-body'), tufts = q('.rr-tufts'), tail = q('.rr-tail');
    const haunch = q('.rr-haunch'), shoulder = q('.rr-shoulder'), head = q('.rr-head');
    const legEls = LEGS.map(leg => {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = '<path class="rr-limb"/><path class="rr-limb"/><path/>';
      q(leg.far ? '.rr-far' : '.rr-near').append(g);
      return g;
    });

    let t = 0, amount = 0, target = opts.running ? 1 : 0, last = performance.now(), raf = 0;
    const period = opts.period || 0.4;

    function render() {
      const arch = lerp(0.15, sample(ARCH, t)[0], amount);
      const lift = sample(LIFT, t)[0] * amount;
      const pitch = sample(PITCH, t)[0] * amount * Math.PI / 180;
      const cos = Math.cos(pitch), sin = Math.sin(pitch);
      const world = ([x, y]) => [490 + (x - 490) * cos - (y - 420) * sin, 420 + lift + (x - 490) * sin + (y - 420) * cos];
      const frame = s => {
        const p = world(spinePoint(s, arch));
        const p2 = world(spinePoint(Math.min(1, s + 0.01), arch)), p1 = world(spinePoint(Math.max(0, s - 0.01), arch));
        const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const tg = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len];
        return { p, t: tg, n: [tg[1], -tg[0]] }; // n pointe vers le haut
      };
      const at = (f, along, up) => [f.p[0] + f.t[0] * along + f.n[0] * up, f.p[1] + f.t[1] * along + f.n[1] * up];

      // Corps
      const N = 16, top = [], bottom = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N, f = frame(s);
        top.push(at(f, 0, profile(TOP, s)));
        bottom.unshift(at(f, 0, -profile(BOTTOM, s)));
      }
      const neck = frame(1);
      body.setAttribute('d', smooth([...top, at(neck, 34, 6), ...bottom]));

      // Touffes de poils sous le poitrail
      let d = '';
      [0.66, 0.79, 0.91].forEach(s => {
        const f = frame(s), base = profile(BOTTOM, s) - 4;
        d += `M${pt(at(f, -16, -base))} L${pt(at(f, -26, -base - 22))} L${pt(at(f, 10, -base))} Z `;
      });
      tufts.setAttribute('d', d);

      // Lignes de la cuisse et de l'épaule
      const h = frame(0.36), sh = frame(0.76);
      haunch.setAttribute('d', `M${pt(at(h, -40, 70))} C${pt(at(h, 60, 56))} ${pt(at(h, 74, -30))} ${pt(at(h, 30, -86))}`);
      shoulder.setAttribute('d', `M${pt(at(sh, -24, 44))} C${pt(at(sh, 20, 30))} ${pt(at(sh, 26, -6))} ${pt(at(sh, 14, -46))}`);

      // Tête du logo, dans le prolongement du cou
      const hp = at(neck, 4, -18), ang = Math.atan2(neck.t[1], neck.t[0]) * 180 / Math.PI + 20;
      head.setAttribute('transform', `translate(${pt(hp)}) rotate(${ang.toFixed(2)}) scale(.48) translate(-752 -602)`);

      // Queue : épaisse à la naissance, traîne derrière, ondule et finit en légère crosse
      const t0 = frame(0), baseAng = Math.atan2(-t0.t[1], -t0.t[0]);
      const tl = [], tr = [];
      let x = t0.p[0], y = t0.p[1];
      for (let j = 0; j <= 36; j++) {
        const u = j / 36;
        const theta = baseAng + 0.1 + 1.2 * Math.pow(u, 3) + Math.sin(u * 4 - t * Math.PI * 2) * 0.22 * u * (0.4 + 0.6 * amount);
        if (j) { x += Math.cos(theta) * 13; y += Math.sin(theta) * 13; }
        const w = 22 * Math.pow(1 - u, 1.4) + 4, nx = -Math.sin(theta), ny = Math.cos(theta);
        tl.push([x + nx * w / 2, y + ny * w / 2]); tr.unshift([x - nx * w / 2, y - ny * w / 2]);
      }
      tail.setAttribute('d', `M${tl.map(pt).join(' L')} L${tr.map(pt).join(' L')} Z`);

      // Pattes
      LEGS.forEach((leg, i) => {
        const f = frame(leg.s), hip = at(f, 0, -leg.drop);
        const [rx, ry, ra] = sample(leg.hind ? HIND_KEYS : FRONT_KEYS, t + leg.offset);
        const fx = lerp(leg.hind ? 0 : 20, rx, amount), fy = ry * amount, fa = ra * amount;
        const ankle = [hip[0] + fx, GROUND - (leg.hind ? 20 : 14) + fy];
        const knee = ik(hip, ankle, leg.a, leg.b, leg.dir);
        const [thigh, shin, paw] = legEls[i].children;
        thigh.setAttribute('d', `M${pt(hip)} L${pt(knee)}`);
        thigh.style.strokeWidth = leg.w[0];
        shin.setAttribute('d', `M${pt(knee)} L${pt(ankle)}`);
        shin.style.strokeWidth = leg.w[1];
        paw.setAttribute('d', pawPath(ankle, fa, leg.paw, leg.w[2] / 2));
      });
    }

    function frameLoop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      amount += (target - amount) * Math.min(1, dt * 8);
      t = (t + dt / period * Math.max(amount, 0.0001)) % 1;
      render();
      if (Math.abs(target - amount) > 0.002 || target > 0) raf = requestAnimationFrame(frameLoop);
      else { amount = target; render(); raf = 0; }
    }

    function setRunning(on) {
      target = on ? 1 : 0;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frameLoop); }
    }

    render();
    if (target) setRunning(true);
    // Vitesse d'avancée qui correspond aux foulées (en px/s pour un rat affiché sur `width` px)
    const groundSpeed = width => SPEED * (width / VIEW[2]) / period;
    return { setRunning, groundSpeed, renderAt(phase, a = 1) { t = phase; amount = a; render(); } };
  }

  window.MangerRat = { create };
})();
