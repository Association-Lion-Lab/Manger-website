/* Rat qui court : tête du logo, corps souple et pattes animés en galop bondissant.
   Le corps est construit autour d'une colonne vertébrale qui s'étire en vol et se voûte
   quand les pattes arrière se ramènent sous le ventre ; les pieds restent posés au sol
   pendant l'appui (cinématique inverse à deux segments). */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const GROUND = 580;
  const VIEW = [-320, 140, 1560, 470];
  const SPEED = 467; // avancée au sol par cycle, en unités du dessin

  // Chaque patte est une chaîne articulée : hanche → genou → talon (ou poignet) → orteils.
  // Appui : les orteils restent plantés et avancent à la vitesse du sol, le talon se soulève
  // progressivement (lift, en radians) jusqu'à la poussée.
  // Envol : le talon suit des positions clés [phase, x, y, flexion de la cheville en degrés] ;
  // le pied prolonge alors la jambe, plié selon la cheville, ce qui garde la patte cohérente.
  const GAIT = {
    hind: {
      stance: { from: 0.42, to: 0.75, toe: [85, -69], lift: [0, 1.0] },
      swing: [[0.75, -115, -72, -20], [0.85, -150, -62, -12], [1.0, -146, -64, -20], [1.15, -96, -70, -55], [1.28, -20, -62, -95], [1.36, 18, -34, -105], [1.42, -1, 0, -110]],
      stand: [40, 0]
    },
    front: {
      stance: { from: 0.12, to: 0.42, toe: [75, -65], lift: [0, 0.7] },
      swing: [[0.42, -99, -28, -40], [0.55, -84, -52, -110], [0.75, 0, -62, -80], [0.9, 80, -54, -40], [1.0, 72, -38, -30], [1.12, 31, 0, -30]],
      stand: [30, 0]
    }
  };
  const ARCH = [[0, -0.25], [0.15, 0], [0.42, 1], [0.62, 0.6], [0.8, -0.15], [1, -0.25]];
  const LIFT = [[0, -34], [0.15, -4], [0.42, 6], [0.62, 0], [0.8, -24], [1, -34]];
  const PITCH = [[0, -2], [0.2, 7], [0.45, 1], [0.7, -6], [0.9, -4], [1, -2]];

  const LEGS = [
    { hind: true, far: true, s: 0.33, drop: 8, a: 92, b: 86, paw: 86, w: [46, 26, 24], dir: 1, offset: 0.04, gait: 'hind' },
    { hind: false, far: true, s: 0.8, drop: 28, a: 62, b: 66, paw: 44, w: [36, 19, 17], dir: -1, offset: 0.07, gait: 'front' },
    { hind: true, far: false, s: 0.33, drop: 8, a: 92, b: 86, paw: 86, w: [46, 26, 24], dir: 1, offset: 0, gait: 'hind' },
    { hind: false, far: false, s: 0.8, drop: 28, a: 62, b: 66, paw: 44, w: [36, 19, 17], dir: -1, offset: 0, gait: 'front' }
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
  const TOP = [[0, 13], [0.14, 44], [0.36, 76], [0.75, 66], [1, 46]];
  const BOTTOM = [[0, 13], [0.13, 36], [0.38, 58], [0.57, 66], [0.77, 74], [1, 44]];
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

  // Segment de membre effilé : arrondi à chaque articulation, plus large côté corps
  function limb(p, q, r1, r2) {
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
    const A = [p[0] + nx * r1, p[1] + ny * r1], B = [q[0] + nx * r2, q[1] + ny * r2];
    const C = [q[0] - nx * r2, q[1] - ny * r2], D = [p[0] - nx * r1, p[1] - ny * r1];
    return `M${pt(A)} L${pt(B)} A${r2},${r2} 0 0 0 ${pt(C)} L${pt(D)} A${r1},${r1} 0 0 0 ${pt(A)} Z`;
  }

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
      <path class="rr-cut rr-shoulder"/>
      <g class="rr-head"><use href="#rb-body" clip-path="url(#rc-head)"/><use href="#rb-face"/></g>
      <g class="rr-near"></g>`;
    container.replaceChildren(svg);
    const q = sel => svg.querySelector(sel);
    const body = q('.rr-body'), tufts = q('.rr-tufts'), tail = q('.rr-tail');
    const shoulder = q('.rr-shoulder'), head = q('.rr-head');
    const legEls = LEGS.map(leg => {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = leg.hind ? '<path/><path/><path/><path/><path class="rr-cut"/>' : '<path/><path/><path/>';
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

      // Ligne de l'épaule
      const sh = frame(0.76);
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
        const g = GAIT[leg.gait], F = leg.paw, ground = GROUND - 6;
        const fromToe = (x, lift) => [hip[0] + x - F * Math.cos(lift), ground - F * Math.sin(lift)];
        const p = ((t + leg.offset) % 1 + 1) % 1;
        const { from, to, toe, lift } = g.stance;
        let heel, footAngle, flex = null;
        if (p >= from && p <= to) { // appui : orteils plantés, talon qui se soulève
          const k = (p - from) / (to - from);
          footAngle = lerp(lift[0], lift[1], k * k);
          heel = fromToe(lerp(toe[0], toe[1], k), footAngle);
        } else { // envol : positions clés du talon, cheville pliée
          const keys = g.swing, q = p < from ? p + 1 : p;
          const [hx, hy, fl] = sample(keys.map(([kp, ...v]) => [(kp - keys[0][0]) / (keys[keys.length - 1][0] - keys[0][0]), ...v]), (q - keys[0][0]) / (keys[keys.length - 1][0] - keys[0][0]));
          heel = [hip[0] + hx, ground + hy];
          flex = fl;
        }
        // Mélange avec la pose debout quand le rat ralentit
        const stand = fromToe(g.stand[0], 0);
        heel = [lerp(stand[0], heel[0], amount), lerp(stand[1], heel[1], amount)];
        const knee = ik(hip, heel, leg.a, leg.b, leg.dir);
        if (flex !== null) {
          const shin = Math.atan2(heel[1] - knee[1], heel[0] - knee[0]);
          // près du contact au sol, le pied se remet à plat pour rejoindre l'appui sans à-coup
          const q = p < from ? p + 1 : p, near = Math.min(Math.abs(q - to), Math.abs(from + 1 - q));
          const k = Math.min(1, near / 0.07);
          const toGround = Math.abs(q - to) < Math.abs(from + 1 - q) ? lift[1] : lift[0];
          let free = shin + flex * Math.PI / 180;
          while (free - toGround > Math.PI) free -= 2 * Math.PI;
          while (free - toGround < -Math.PI) free += 2 * Math.PI;
          free = Math.max(-0.25, Math.min(Math.PI - 0.15, free)); // les orteils ne pointent jamais vers le haut
          footAngle = lerp(toGround, free, ease(k));
        }
        footAngle = lerp(0, footAngle, amount);
        const [thigh, shinEl, paw, haunchEl, haunchCut] = legEls[i].children;
        thigh.setAttribute('d', limb(hip, knee, leg.w[0] / 2, leg.w[1] / 2));
        shinEl.setAttribute('d', limb(knee, heel, leg.w[1] / 2, leg.w[2] / 2));
        paw.setAttribute('d', pawPath(heel, footAngle, F, leg.w[2] / 2));
        if (leg.hind) {
          // Croupe et cuisse : une seule masse accrochée à la hanche, qui pivote avec le fémur
          const fa = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), ca = Math.cos(fa), sa = Math.sin(fa);
          const E = (th, rx = 96, ry = 80, cx = 34) => [hip[0] + (cx + rx * Math.cos(th)) * ca - ry * Math.sin(th) * sa, hip[1] + (cx + rx * Math.cos(th)) * sa + ry * Math.sin(th) * ca];
          const ring = [];
          for (let j = 0; j < 18; j++) ring.push(E(j / 18 * Math.PI * 2));
          haunchEl.setAttribute('d', smooth(ring));
          const arc = [-2.5, -1.9, -1.2, -0.5].map(th => E(th, 82, 66, 34));
          haunchCut.setAttribute('d', `M${pt(arc[0])} C${pt(arc[1])} ${pt(arc[2])} ${pt(arc[3])}`);
        }
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
