/* Rat qui court : tête du logo + corps, pattes et queue animés.
   Les pattes sont placées par cinématique inverse à deux segments :
   le pied reste posé au sol pendant l'appui, puis se lève et revient. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const GROUND = 612;

  // Corps allongé, dans l'esprit du logo (croupe ronde, touffes de poils au poitrail)
  const BODY = 'M196,430 C170,330 230,226 360,206 C470,190 600,222 690,282 C750,322 790,370 800,410 L816,440 L792,446 L806,470 L776,470 L782,492 L752,484 C700,504 630,508 580,502 L540,514 L546,498 L500,502 L456,516 L460,498 C360,512 260,500 222,472 C206,460 198,446 196,430 Z';
  const HAUNCH = 'M262,262 C368,286 424,392 392,494';
  const SHOULDER = 'M650,300 C686,330 698,372 688,414';

  // Pattes : longueurs en unités du logo
  const LEGS = [
    { name: 'hind', far: true,  hip: [372, 456], a: 94, b: 100, phase: 0.5, knee: -1, paw: 98, w: [42, 22, 20] },
    { name: 'front', far: true, hip: [716, 446], a: 88, b: 90, phase: 0.0, knee: 1, paw: 50, w: [34, 17, 16] },
    { name: 'hind', far: false, hip: [372, 456], a: 94, b: 100, phase: 0.0, knee: -1, paw: 98, w: [42, 22, 20] },
    { name: 'front', far: false, hip: [716, 446], a: 88, b: 90, phase: 0.5, knee: 1, paw: 50, w: [34, 17, 16] }
  ];

  const STRIDE = 200, LIFT = 56, DUTY = 0.55;
  const VIEW = [-300, 118, 1500, 552];

  function foot(leg, t, amount) {
    // Position du pied relative à la hanche, dans le repère sol
    const p = ((t + leg.phase) % 1 + 1) % 1;
    let x, y;
    if (p < DUTY) { // appui : le pied glisse vers l'arrière, posé
      const k = p / DUTY;
      x = STRIDE / 2 - k * STRIDE;
      y = 0;
    } else { // envol : le pied se lève et revient vers l'avant
      const k = (p - DUTY) / (1 - DUTY);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * k);
      x = -STRIDE / 2 + e * STRIDE;
      y = -LIFT * Math.sin(Math.PI * k);
    }
    return [x * amount, y * amount];
  }

  function ik(h, f, a, b, dir) {
    const dx = f[0] - h[0], dy = f[1] - h[1];
    let d = Math.hypot(dx, dy);
    d = Math.min(d, a + b - 0.01);
    const base = Math.atan2(dy, dx);
    const cos = (a * a + d * d - b * b) / (2 * a * d);
    const ang = Math.acos(Math.max(-1, Math.min(1, cos)));
    const k = base - dir * ang;
    return [h[0] + a * Math.cos(k), h[1] + a * Math.sin(k)];
  }

  const pts = list => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  function pawPath(ankle, angle, len, w) {
    // Pied effilé terminé par trois doigts recourbés, comme sur le logo
    const c = Math.cos(angle), s = Math.sin(angle);
    const P = (u, v) => [ankle[0] + c * u - s * v, ankle[1] + s * u + c * v];
    const tip = P(len, 0);
    let d = `M${pts([P(0, -w)])} L${pts([P(len * 0.8, -w * 0.6)])} L${pts([P(len * 0.8, w * 0.7)])} L${pts([P(0, w)])} Z`;
    [-0.55, 0.05, 0.65].forEach(v => {
      const a = P(len * 0.75, v * w), b = P(len + 18, v * w * 1.4 + 6), e = P(len + 6, v * w * 1.4 + 12);
      d += ` M${pts([a])} Q${pts([b])} ${pts([e])} L${pts([P(len * 0.7, v * w + 6)])} Z`;
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
      <g class="rr-bob">
        <path d="${BODY}"/>
        <path class="rr-cut" d="${HAUNCH}"/>
        <path class="rr-cut" d="${SHOULDER}"/>
        <g class="rr-head" transform="translate(790 458) rotate(32) scale(.62) translate(-752 -602)">
          <use href="#rb-body" clip-path="url(#rc-head)"/><use href="#rb-face"/>
        </g>
      </g>
      <g class="rr-near"></g>`;
    container.replaceChildren(svg);
    const far = svg.querySelector('.rr-far'), near = svg.querySelector('.rr-near');
    const bob = svg.querySelector('.rr-bob'), tail = svg.querySelector('.rr-tail');
    const legEls = LEGS.map(leg => {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = '<path class="rr-limb"/><path class="rr-limb"/><path/>';
      (leg.far ? far : near).append(g);
      return g;
    });

    let t = 0, amount = 0, target = opts.running ? 1 : 0, last = performance.now(), raf = 0;
    const period = opts.period || 0.42;

    function render() {
      const lift = -Math.abs(Math.sin(t * Math.PI * 2)) * 18 * amount; // deux rebonds par cycle au trot
      const pitch = Math.sin(t * Math.PI * 4) * 1.6 * amount;
      bob.setAttribute('transform', `translate(0 ${lift.toFixed(1)}) rotate(${pitch.toFixed(2)} 520 420)`);
      LEGS.forEach((leg, i) => {
        const [fx, fy] = foot(leg, t, amount);
        const hip = [leg.hip[0], leg.hip[1] + lift];
        const ankle = [leg.hip[0] + fx + (leg.name === 'hind' ? -40 : 0), GROUND - (leg.name === 'hind' ? 26 : 18) + fy];
        const knee = ik(hip, ankle, leg.a, leg.b, leg.knee);
        const [thigh, shin, paw] = legEls[i].children;
        thigh.setAttribute('d', `M${pts([hip])} L${pts([knee])}`);
        thigh.style.strokeWidth = leg.w[0];
        shin.setAttribute('d', `M${pts([knee])} L${pts([ankle])}`);
        shin.style.strokeWidth = leg.w[1];
        const tilt = fy < 0 ? (leg.name === 'hind' ? 0.6 : 0.9) * (fy / LIFT) : 0;
        paw.setAttribute('d', pawPath(ankle, tilt, leg.paw, leg.w[2] / 2));
      });
      // Queue : part de la croupe, traîne derrière, ondule, et finit en crosse comme sur le logo
      const n = 40, L = 560, base = [204, 452 + lift];
      const top = [], bottom = [];
      let x = base[0], y = base[1];
      for (let j = 0; j <= n; j++) {
        const u = j / n;
        const wave = Math.sin(u * 4 - t * Math.PI * 2) * 0.32 * u * (0.35 + 0.65 * amount);
        const theta = Math.PI - 0.12 + 2.7 * Math.pow(u, 2.6) + wave - (1 - amount) * 0.25 * u;
        if (j) { x += Math.cos(theta) * L / n; y += Math.sin(theta) * L / n; }
        const w = 15 * (1 - u) + 4;
        const nx = -Math.sin(theta), ny = Math.cos(theta);
        top.push([x + nx * w / 2, y + ny * w / 2]); bottom.unshift([x - nx * w / 2, y - ny * w / 2]);
      }
      tail.setAttribute('d', `M${pts(top)} L${pts(bottom)} Z`);
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      amount += (target - amount) * Math.min(1, dt * 8);
      t = (t + dt / period * Math.max(amount, 0.0001)) % 1;
      render();
      if (Math.abs(target - amount) > 0.002 || target > 0) raf = requestAnimationFrame(frame);
      else { amount = target; render(); raf = 0; }
    }

    function setRunning(on) {
      target = on ? 1 : 0;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    render();
    if (target) setRunning(true);
    // Vitesse d'avancée qui correspond aux foulées (en px/s pour un rat affiché sur `width` px)
    const groundSpeed = width => STRIDE * (width / VIEW[2]) / (DUTY * period);
    return { setRunning, groundSpeed, renderAt(phase, a = 1) { t = phase; amount = a; render(); } };
  }

  window.MangerRat = { create };
})();
