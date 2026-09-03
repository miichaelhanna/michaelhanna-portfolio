// After Hours. Every piece on the bench is a small thing that actually runs,
// built here with no data and no libraries. Each one is its own block below;
// a piece whose markup is missing simply doesn't start.
//
// Anything that animates runs only while it can be seen: the page has to be
// the one on screen (the layers are stacked and hidden with visibility, so a
// hidden layer still has layout) and the piece has to be inside the page's
// own scroller. Both are watched, and nothing burns a frame behind another
// page. (A background tab needs no check of its own: the browser already
// stops animation frames there.)
(() => {
  const lab = document.getElementById('hm-lab');
  if (!lab) return;
  const $ = s => lab.querySelector(s);
  const still = matchMedia('(prefers-reduced-motion:reduce)');
  const ACID = '#D7FF3F', INK = '#111A36', PAPER = '#F4F1EA';
  const labShown = () => getComputedStyle(lab).visibility !== 'hidden';

  const runners = [];
  const sync = () => {
    const shown = labShown();
    runners.forEach(r => {
      const want = shown && r.inView;
      if (want && !r.on) { r.on = true; r.start(); }
      else if (!want && r.on) { r.on = false; r.stop(); }
    });
  };
  const watch = (el, start, stop) => {
    const r = { inView: false, on: false, start, stop };
    runners.push(r);
    if (typeof IntersectionObserver === 'undefined') { r.inView = true; sync(); return; }
    new IntersectionObserver(es => { es.forEach(e => { r.inView = e.isIntersecting; }); sync(); },
      { root: lab, threshold: .05 }).observe(el);
  };
  new MutationObserver(sync).observe(lab, { attributes: true, attributeFilter: ['style'] });

  // A small seeded generator, so "tonight's" things are the same for everyone
  // who looks tonight, and different tomorrow.
  const mulberry = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const daySeed = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const ri = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ── The clock. Madrid time; the sign beside it reads "lights on" through
  //    the hours the bench is actually used. The holding page carries the
  //    seconds; the kicker (parked with the bench) only the minutes.
  const clocks = lab.querySelectorAll('.lab-clock'), secs = $('#hm-lab-clock-s'), dot = $('#hm-lab-dot'), sign = $('#hm-lab-sign');
  if (clocks.length || secs) {
    const tick = () => {
      const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid', hour12: false });
      clocks.forEach(c => { c.textContent = t.slice(0, 5); });
      if (secs) secs.innerHTML = t.split(':').join('<span class="hold-colon">:</span>');
      const h = (+t.slice(0, 2)) % 24;
      const night = h >= 22 || h < 6;
      if (dot) dot.classList.toggle('is-off', !night);
      if (sign) sign.textContent = secs ? (night ? 'lights on' : 'lights off')
                                        : (night ? 'lights on. bench open.' : 'lights off. day job hours.');
    };
    tick(); setInterval(tick, secs ? 1000 : 15000);
  }

  // ── 01 · Tonight's poster. A handful of compositions with room to vary,
  //    rather than random shapes: the floor stays high, and the date picks.
  const posterArt = $('#hm-poster-art'), posterBtn = $('#hm-poster');
  if (posterArt) {
    const W = 400, H = 500, u = W / 12;
    const PALS = [
      ['#1D1AEA', '#C0362C', INK], [INK, ACID, '#C0362C'], ['#3A5B85', '#C0362C', INK],
      ['#C0362C', '#1D1AEA', ACID], [INK, '#3A5B85', ACID], ['#C0362C', INK, '#3A5B85']
    ];
    const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const circle = (cx, cy, rad, c) => `<circle cx="${cx * u}" cy="${cy * u}" r="${rad * u}" fill="${c}"/>`;
    const rect = (x, y, w, h, c) => `<rect x="${x * u}" y="${y * u}" width="${w * u}" height="${h * u}" fill="${c}"/>`;
    const RECIPES = [
      // disc, a bar across, a rule down
      (r, p) => circle(ri(r, 4, 8), ri(r, 4, 7), ri(r, 3, 4), p[0]) + rect(0, ri(r, 9, 12), 12, ri(r, 1, 2), p[1]) + rect(ri(r, 1, 10), 0, 1, 15, p[2]),
      // a stack of bars and a ring
      (r, p) => {
        let s = '', y = ri(r, 1, 3);
        for (let i = 0; i < 3; i++) { const h = ri(r, 1, 3), x = ri(r, 0, 3); s += rect(x, y, 12 - x - ri(r, 0, 2), h, p[i % 3]); y += h + 1; }
        return s + `<circle cx="${ri(r, 7, 10) * u}" cy="${ri(r, 10, 13) * u}" r="${1.5 * u}" fill="none" stroke="${p[1]}" stroke-width="${u * .6}"/>`;
      },
      // a split, a disc on the seam
      (r, p) => rect(0, 0, 6, 15, p[0]) + circle(6, ri(r, 5, 9), 2.5 + r() * 1.5, p[1]) + rect(ri(r, 7, 9), ri(r, 11, 13), 3, 1, p[2]),
      // a quarter in a corner, a line through, a dot
      (r, p) => {
        const R = ri(r, 7, 10) * u, k = ri(r, 0, 3);
        const d = [`M0,0 h${R} a${R},${R} 0 0 1 -${R},${R} z`, `M${W},0 v${R} a${R},${R} 0 0 1 -${R},-${R} z`,
                   `M${W},${H} h-${R} a${R},${R} 0 0 1 ${R},-${R} z`, `M0,${H} v-${R} a${R},${R} 0 0 1 ${R},${R} z`][k];
        const y = ri(r, 2, 13) * u;
        return `<path d="${d}" fill="${p[0]}"/><line x1="0" y1="${y}" x2="${W}" y2="${y + ri(r, -3, 3) * u}" stroke="${p[1]}" stroke-width="${u * .35}"/>` + circle(ri(r, 2, 10), ri(r, 2, 13), 1.2, p[2]);
      },
      // a grid of dots with one square, a bar underneath
      (r, p) => {
        let s = ''; const ox = ri(r, 1, 2), oy = ri(r, 1, 3), sx = ri(r, 0, 3), sy = ri(r, 0, 3);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const x = ox + i * 2.5 + 1, y = oy + j * 2.5 + 1;
          s += (i === sx && j === sy) ? rect(x - 1, y - 1, 2, 2, p[1]) : circle(x, y, 1, p[0]);
        }
        return s + rect(0, 13, 12, 1, p[2]);
      },
      // two discs and a rule
      (r, p) => circle(6, 7, 5, p[0]) + circle(6 + ri(r, -3, 3), 7 + ri(r, -3, 3), 2, p[1]) + rect(ri(r, 0, 2), 0, 1, 15, p[2])
    ];
    let grid = '<g stroke="rgba(17,26,54,.08)">';
    for (let i = 1; i < 12; i++) grid += `<line x1="${i * u}" y1="0" x2="${i * u}" y2="${H}"/>`;
    for (let j = 1; j < 15; j++) grid += `<line x1="0" y1="${j * u}" x2="${W}" y2="${j * u}"/>`;
    grid += '</g>';
    const poster = (seed, n) => {
      const r = mulberry(seed);
      const p = shuffle(pick(r, PALS), r);
      const body = pick(r, RECIPES)(r, p);
      const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const foot = `<g font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif" font-size="8.5" letter-spacing="1.2" fill="${INK}" stroke="${PAPER}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"><text x="${u}" y="${H - u * .55}">AFTER HOURS · Nº ${String(n).padStart(3, '0')}</text><text x="${W - u}" y="${H - u * .55}" text-anchor="end">${date}</text></g>`;
      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${PAPER}"/>${grid}<g style="mix-blend-mode:multiply">${body}</g>${foot}</svg>`;
    };
    let n = 1;
    posterArt.innerHTML = poster(daySeed(), n);
    posterBtn.addEventListener('click', () => {
      n++;
      const seed = Math.floor(Math.random() * 2 ** 31);
      if (still.matches) { posterArt.innerHTML = poster(seed, n); return; }
      posterArt.classList.add('is-swap');
      setTimeout(() => { posterArt.innerHTML = poster(seed, n); requestAnimationFrame(() => posterArt.classList.remove('is-swap')); }, 280);
    });
  }

  // ── 02 · The moon. Phase from the date against a known new moon; the lit
  //    side is one path — a semicircle and an elliptical terminator.
  const moon = $('#hm-moon'), moonWhy = $('#hm-moon-why');
  if (moon) {
    const SYN = 29.530588853;
    let p = ((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / SYN) % 1; if (p < 0) p += 1;
    const k = Math.cos(2 * Math.PI * p), waxing = p < .5, crescent = k > 0;
    const r = 78, cx = 100, cy = 100, rx = Math.abs(k) * r;
    const lit = `M${cx},${cy - r} A${r},${r} 0 0 1 ${cx},${cy + r} A${rx.toFixed(2)},${r} 0 0 ${crescent ? 0 : 1} ${cx},${cy - r} Z`;
    const sr = mulberry(daySeed());
    let stars = '';
    for (let i = 0; i < 26; i++) {
      const x = sr() * 200, y = sr() * 200;
      if (Math.hypot(x - cx, y - cy) < r + 8) continue;
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.5 + sr() * .9).toFixed(2)}" fill="rgba(244,241,234,${(0.25 + sr() * .5).toFixed(2)})"/>`;
    }
    moon.innerHTML = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${stars}<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0B1126" stroke="rgba(244,241,234,.14)"/><path d="${lit}" fill="${PAPER}"${waxing ? '' : ' transform="translate(200,0) scale(-1,1)"'}/></svg>`;
    const lit100 = Math.round((1 - k) / 2 * 100);
    const name = p < .03 || p > .97 ? 'New moon' : p < .22 ? 'Waxing crescent' : p < .28 ? 'First quarter'
      : p < .47 ? 'Waxing gibbous' : p < .53 ? 'Full moon' : p < .72 ? 'Waning gibbous' : p < .78 ? 'Last quarter' : 'Waning crescent';
    const toFull = Math.round(((0.5 - p + 1) % 1) * SYN);
    const when = Math.abs(p - .5) < .03 ? 'Full tonight.' : toFull === 1 ? 'Full tomorrow.' : `Full in ${toFull} days.`;
    if (moonWhy) moonWhy.textContent = `${name}, ${lit100}% lit. ${when} From the date alone.`;
    moon.setAttribute('aria-label', `${name}, ${lit100}% lit`);
  }

  // ── 03 · A number that only goes up.
  const count = $('#hm-count');
  if (count) {
    const EPOCH = Date.UTC(2020, 0, 1), stage = count.parentElement;
    const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const fit = () => {
      const availW = stage.clientWidth - 32, availH = stage.clientHeight - 44;
      if (availW <= 0 || availH <= 0) return;
      count.style.fontSize = '100px';
      const w = count.getBoundingClientRect().width;
      if (w) count.style.fontSize = Math.max(16, Math.min(100 * availW / w, availH * .8)) + 'px';
    };
    const tick = () => { count.textContent = fmt(Math.floor((Date.now() - EPOCH) / 1000)); };
    tick(); fit();
    setInterval(tick, 1000);
    addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    new MutationObserver(fit).observe(lab, { attributes: true, attributeFilter: ['style'] });
  }

  // ── 04 · Field. A lattice of short lines; each drifts on its own slow wave
  //    and turns to face the pointer as it comes near.
  const field = $('#hm-field');
  if (field) {
    const ctx = field.getContext('2d');
    let W = 0, H = 0, pts = [], px = -1e4, py = -1e4, raf = 0, dirty = true;
    const t0 = performance.now();
    const wrap = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
    const build = () => {
      const dpr = Math.min(2, devicePixelRatio || 1), r = field.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      field.width = Math.round(W * dpr); field.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = 22, ox = ((W % s) / 2) + s / 2, oy = ((H % s) / 2) + s / 2;
      pts = [];
      for (let y = oy; y < H; y += s) for (let x = ox; x < W; x += s) pts.push({ x, y, a: 0 });
      dirty = true;
    };
    const draw = t => {
      ctx.clearRect(0, 0, W, H);
      const tt = still.matches ? 0 : (t - t0) / 1000, L = 4.5;
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (const p of pts) {
        const idle = Math.sin(p.x * .012 + tt * .6) * 1.2 + Math.cos(p.y * .015 - tt * .45) * 1.2;
        const dx = px - p.x, dy = py - p.y;
        const w = Math.exp(-(dx * dx + dy * dy) / 45000);
        const target = idle + wrap(Math.atan2(dy, dx) - idle) * w;
        p.a += wrap(target - p.a) * .14;
        const c = Math.cos(p.a) * L, s = Math.sin(p.a) * L;
        ctx.strokeStyle = w > .4 ? ACID : `rgba(244,241,234,${(.24 + w * .6).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(p.x - c, p.y - s); ctx.lineTo(p.x + c, p.y + s); ctx.stroke();
      }
    };
    const frame = t => { draw(t); raf = requestAnimationFrame(frame); };
    // Reduced motion: no drift, but the lines still look at the pointer —
    // redrawn only while it moves.
    const stillFrame = () => { if (!dirty) return; draw(0); dirty = pts.some(p => Math.abs(wrap(p.a - (Math.sin(p.x * .012) * 1.2 + Math.cos(p.y * .015) * 1.2))) > .01 && px > -1e3); raf = dirty ? requestAnimationFrame(stillFrame) : 0; };
    field.addEventListener('pointermove', e => { const r = field.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; dirty = true; if (still.matches && !raf) raf = requestAnimationFrame(stillFrame); }, { passive: true });
    field.addEventListener('pointerleave', () => { px = -1e4; py = -1e4; dirty = true; if (still.matches && !raf) raf = requestAnimationFrame(stillFrame); });
    addEventListener('resize', () => { build(); if (!raf && still.matches) raf = requestAnimationFrame(stillFrame); });
    build();
    watch(field, () => { if (!W) build(); if (still.matches) { dirty = true; if (!raf) raf = requestAnimationFrame(stillFrame); } else if (!raf) raf = requestAnimationFrame(frame); },
                 () => { cancelAnimationFrame(raf); raf = 0; });
  }

  // ── 05 · Ticket to nowhere. Tonight's is the same for everyone; a reissue
  //    is yours.
  const ticket = $('#hm-ticket'), pass = $('#hm-ticket-pass');
  if (ticket && pass) {
    const DEST = [['KEF', 'Reykjavík'], ['LIS', 'Lisbon'], ['OAX', 'Oaxaca'], ['CTS', 'Sapporo'], ['TBS', 'Tbilisi'], ['RAK', 'Marrakesh'],
      ['TOS', 'Tromsø'], ['NAP', 'Naples'], ['BEY', 'Beirut'], ['OPO', 'Porto'], ['PMO', 'Palermo'], ['ATH', 'Athens'], ['TNG', 'Tangier'],
      ['FAE', 'Vágar'], ['LJU', 'Ljubljana'], ['HND', 'Tokyo'], ['MEX', 'Mexico City'], ['CPT', 'Cape Town'], ['MLA', 'Valletta'], ['SPU', 'Split']];
    const el = id => document.getElementById(id);
    const issue = r => {
      const d = pick(r, DEST);
      el('tk-to').textContent = d[0]; el('tk-city').textContent = d[1];
      el('tk-flight').textContent = 'AH ' + ri(r, 100, 999);
      el('tk-time').textContent = '0' + ri(r, 0, 4) + ':' + String(ri(r, 0, 11) * 5).padStart(2, '0');
      el('tk-gate').textContent = String.fromCharCode(65 + ri(r, 0, 5)) + ri(r, 1, 24);
      const seat = ri(r, 1, 32) + 'ACDF'[ri(r, 0, 3)];
      el('tk-seat').textContent = seat; el('tk-seat2').textContent = seat;
      el('tk-date').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toLowerCase();
      let bars = '';
      for (let i = 0; i < 44; i++) bars += `<i style="width:${[1, 1, 1, 2, 2, 3][ri(r, 0, 5)]}px"></i>`;
      el('tk-bars').innerHTML = bars;
    };
    issue(mulberry(daySeed() + 7));
    ticket.addEventListener('click', () => {
      const r = mulberry(Math.floor(Math.random() * 2 ** 31));
      if (still.matches) { issue(r); return; }
      pass.classList.add('is-swap');
      setTimeout(() => { issue(r); requestAnimationFrame(() => pass.classList.remove('is-swap')); }, 300);
    });
  }

  // ── 06 · 1AM radio. Six stations on a dial; between them, static. Sound is
  //    synthesised (one loop of noise through a filter) and only on request.
  const dial = $('#rd-dial');
  if (dial) {
    const STATIONS = [
      [88.9, 'Test card', 'A tone and a pattern. Nobody watching.'],
      [91.3, 'Rain on Calle Mayor', 'Recorded from a window. Loops forever.'],
      [94.7, 'The Bench', 'Whatever is being built tonight, live.'],
      [98.2, 'Búho N26', 'The last night bus home, and the one after it.'],
      [101.5, 'Dead air', 'Nothing. On purpose.'],
      [104.9, 'Closedown', 'The anthem, then nothing until six.']
    ];
    const FMIN = 87.5, FMAX = 108, SPAN = FMAX - FMIN;
    const pct = f => ((f - FMIN) / SPAN * 100).toFixed(3);
    let html = '';
    for (let f = 88; f <= 108; f += .5) {
      const major = f % 2 === 0;
      html += `<span class="rd-tick${major ? ' is-major' : ''}${f % 4 === 0 ? ' is-big' : ''}" style="left:${pct(f)}%"${major ? ` data-f="${f}"` : ''}></span>`;
    }
    STATIONS.forEach(s => { html += `<span class="rd-station" style="left:${pct(s[0])}%"></span>`; });
    dial.insertAdjacentHTML('afterbegin', html);
    const needle = $('#rd-needle'), fEl = $('#rd-f'), nameEl = $('#rd-name'), progEl = $('#rd-prog'), vu = $('#rd-vu'), snd = $('#rd-snd');
    const bars = [];
    for (let i = 0; i < 28; i++) { const b = document.createElement('i'); vu.appendChild(b); bars.push(b); }
    let f = 94.7, tuned = null, q = 0;

    const audio = (() => {
      let ac = null, filt, gain, on = false;
      const build = () => {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        filt = ac.createBiquadFilter(); gain = ac.createGain(); gain.gain.value = 0;
        src.connect(filt); filt.connect(gain); gain.connect(ac.destination); src.start();
        return true;
      };
      const paint = () => { snd.setAttribute('aria-pressed', String(on)); snd.textContent = on ? 'sound on' : 'sound off'; };
      return {
        set(st, qq) {
          if (!ac || !on) return;
          const t = ac.currentTime;
          if (st) {
            filt.type = 'lowpass';
            filt.frequency.setTargetAtTime(320 + STATIONS.indexOf(st) * 170, t, .08);
            filt.Q.setTargetAtTime(1.1, t, .08);
            gain.gain.setTargetAtTime(st[1] === 'Dead air' ? .003 : .028 + .05 * (1 - qq), t, .08);
          } else {
            filt.type = 'bandpass';
            filt.frequency.setTargetAtTime(2400, t, .08);
            filt.Q.setTargetAtTime(.5, t, .08);
            gain.gain.setTargetAtTime(.07, t, .08);
          }
        },
        async toggle() {
          if (!ac && !build()) return;
          on = !on; paint();
          try { if (on) await ac.resume(); else await ac.suspend(); } catch (e) {}
          if (on) this.set(tuned, q);
        },
        off() { if (on) this.toggle(); }
      };
    })();

    const setF = nf => {
      f = Math.max(FMIN, Math.min(FMAX, Math.round(nf * 10) / 10));
      needle.style.left = pct(f) + '%';
      fEl.textContent = f.toFixed(1);
      dial.setAttribute('aria-valuenow', f.toFixed(1));
      let best = null, bd = 9;
      STATIONS.forEach(s => { const d = Math.abs(s[0] - f); if (d < bd) { bd = d; best = s; } });
      q = bd < .35 ? 1 - bd / .35 : 0;
      tuned = q > 0 ? best : null;
      nameEl.textContent = tuned ? tuned[1] : 'static';
      nameEl.classList.toggle('is-static', !tuned);
      progEl.textContent = tuned ? tuned[2] : 'Between stations. Keep going.';
      vu.classList.toggle('is-tuned', !!tuned);
      dial.setAttribute('aria-valuetext', f.toFixed(1) + (tuned ? ', ' + tuned[1] : ', static'));
      audio.set(tuned, q);
    };
    const fromX = x => { const r = dial.getBoundingClientRect(); return FMIN + Math.max(0, Math.min(1, (x - r.left) / r.width)) * SPAN; };
    let drag = false;
    dial.addEventListener('pointerdown', e => { drag = true; try { dial.setPointerCapture(e.pointerId); } catch (x) {} setF(fromX(e.clientX)); });
    dial.addEventListener('pointermove', e => { if (drag) setF(fromX(e.clientX)); });
    const up = () => { drag = false; };
    dial.addEventListener('pointerup', up); dial.addEventListener('pointercancel', up);
    dial.addEventListener('keydown', e => {
      const step = e.shiftKey ? 1 : .1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setF(f - step); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setF(f + step); e.preventDefault(); }
    });
    snd.addEventListener('click', () => audio.toggle());
    lab.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => audio.off()));
    document.querySelectorAll('#hm-head [data-go]').forEach(el => el.addEventListener('click', () => audio.off()));
    setF(f);

    let raf = 0; const t0 = performance.now();
    const frame = t => {
      const tt = (t - t0) / 1000;
      bars.forEach((b, i) => {
        let h;
        if (tuned && tuned[1] === 'Dead air') h = .05 + Math.random() * .03;
        else if (tuned) { const beat = Math.sin(tt * 2.3 + i * .42) * Math.sin(tt * .8 + i * .11); h = .12 + .8 * Math.abs(beat) * (.55 + .45 * q); }
        else h = .06 + Math.random() * .5;
        b.style.height = (h * 100).toFixed(1) + '%';
      });
      raf = requestAnimationFrame(frame);
    };
    if (still.matches) bars.forEach((b, i) => { b.style.height = (12 + 60 * Math.abs(Math.sin(i * .5))).toFixed(0) + '%'; });
    else watch(dial, () => { if (!raf) raf = requestAnimationFrame(frame); }, () => { cancelAnimationFrame(raf); raf = 0; audio.off(); });
  }

  // ── 07 · Roadmap poetry.
  const poemBtn = $('#hm-poem'), poemQ = $('#hm-poem-q');
  if (poemBtn && poemQ) {
    const N = ['north star', 'MVP', 'roadmap', 'flywheel', 'single source of truth', 'alignment', 'low-hanging fruit', 'quick win',
      'parking lot', 'learnings', 'synergy', 'bandwidth', 'runway', 'tiger team', 'ask', 'why', 'table stakes', 'guardrails',
      'growth loop', 'definition of done', 'happy path', 'blast radius', 'north-star metric', 'one-pager', 'discovery phase', 'value prop'];
    const V = ['double-click on', 'socialise', 'de-risk', 'unpack', 'level-set on', 'pressure-test', 'take offline', 'right-size',
      'sunset', 'land', 'unblock', 'action', 'workshop', 'ladder up', 'circle back on', 'park', 'align on', 'get ahead of', 'lean into',
      'operationalise', 'boil down', 'sanity-check'];
    const A = ['cross-functional', 'scrappy', 'holistic', 'outcome-driven', 'zero-to-one', 'best-in-class', 'ruthless', 'data-informed',
      'frictionless', 'lightweight', 'strategic', 'non-trivial', 'directionally correct', 'high-leverage'];
    const T = ['a two-week sprint', 'a quick sync', 'a fifteen-minute huddle', 'Q3', 'the next planning cycle', 'a working session', 'EOD', 'the offsite'];
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const the = n => 'the ' + n;
    const an = n => (/^[aeiou]/i.test(n) ? 'an ' : 'a ') + n;
    const TPL = [
      p => `Let’s ${p.v()} ${the(p.n())} before we ${p.v()} ${the(p.n())}.`,
      p => `Circling back: ${the(p.n())} is ${an(p.a())} ${p.n()}, not ${an(p.n())}.`,
      p => `Can we ${p.v()} ${the(p.n())} in ${p.t()}?`,
      p => `${cap(the(p.n()))} is really just ${the(p.n())} for ${the(p.n())}.`,
      p => `Zoom out: we’re here to ${p.v()} ${the(p.n())}, not to ${p.v()} ${the(p.n())}.`,
      p => `Quick one: who owns ${the(p.n())} once we ${p.v()} the ${p.a()} ${p.n()}?`,
      p => `Parking this, but ${the(p.n())} feels ${p.a()} and I’d love us to ${p.v()} it by ${p.t()}.`,
      p => `The ${p.a()} version of this is that we ${p.v()} ${the(p.n())} and call it ${the(p.n())}.`,
      p => `Not to ${p.v()} ${the(p.n())}, but is ${the(p.n())} even ${p.a()}?`
    ];
    let last = -1;
    const line = () => {
      const r = Math.random;
      const ns = N.slice(), vs = V.slice(), as = A.slice();
      const take = a => a.splice(Math.floor(r() * a.length), 1)[0];
      let i; do { i = Math.floor(r() * TPL.length); } while (i === last);
      last = i;
      return TPL[i]({ n: () => take(ns), v: () => take(vs), a: () => take(as), t: () => pick(r, T) });
    };
    poemBtn.addEventListener('click', () => {
      if (still.matches) { poemQ.textContent = line(); return; }
      poemQ.classList.add('is-swap');
      setTimeout(() => { poemQ.textContent = line(); requestAnimationFrame(() => poemQ.classList.remove('is-swap')); }, 220);
    });
  }
})();
