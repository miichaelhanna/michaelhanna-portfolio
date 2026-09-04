// After Hours. The room after everyone has gone home. Two things sit on the
// bench, and the page around them is built to be touched: a pull cord for
// the lights (a real rope, after Feral UI's pullcord), a torch that rides
// the pointer while they are off and turns into a glove on the cord, type
// that bends towards the hand, a television playing the 404 game's own
// avatar, and a receipt that prints the Filed story out of a slot. On a
// phone the switch is a wall plate and the pieces follow each other down
// the page.
//
// Anything that animates runs only while it can be seen: the page has to be
// the one on screen (the layers are stacked and hidden with visibility, so
// a hidden layer still has layout) and the piece has to be inside the page's
// own scroller. Both are watched, and nothing burns a frame behind another
// page. No data, no libraries.
(() => {
  const lab = document.getElementById('hm-lab');
  if (!lab) return;
  const $ = s => lab.querySelector(s);
  const still = matchMedia('(prefers-reduced-motion:reduce)');
  // Phone mode is decided once, in the head, from the media query or a ?touch
  // flag; the CSS keys off the same class.
  const touch = document.documentElement.classList.contains('hm-touch');
  const labShown = () => getComputedStyle(lab).visibility !== 'hidden';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const runners = [];
  const sync = () => {
    const shown = labShown();
    runners.forEach(r => {
      const want = shown && r.inView;
      if (want && !r.on) { r.on = true; r.start(); }
      else if (!want && r.on) { r.on = false; r.stop(); }
    });
  };
  const watch = (el, start, stop, threshold) => {
    const r = { inView: false, on: false, start, stop: stop || (() => {}) };
    runners.push(r);
    if (typeof IntersectionObserver === 'undefined') { r.inView = true; sync(); return; }
    new IntersectionObserver(es => { es.forEach(e => { r.inView = e.isIntersecting; }); sync(); },
      { root: lab, threshold: threshold || .05 }).observe(el);
  };
  // Every arrival starts in the dark: coming back from About, from home, or
  // from the game finds the lights off again. Read off the inline style,
  // not the computed one: the layer fades out over a third of a second,
  // and the computed visibility still says 'visible' as the hide is written.
  const labWanted = () => lab.style.visibility !== 'hidden';
  let wasShown = labWanted();
  const onArrive = [];
  new MutationObserver(() => {
    const shown = labWanted();
    if (shown && !wasShown) onArrive.forEach(f => f());
    wasShown = shown;
    sync();
  }).observe(lab, { attributes: true, attributeFilter: ['style'] });

  // ── The clock. Madrid time, minutes only, in the sign beside the name.
  const clocks = lab.querySelectorAll('.lab-clock');
  if (clocks.length) {
    const tick = () => {
      const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid', hour12: false });
      clocks.forEach(c => { c.textContent = t.slice(0, 5); });
    };
    tick(); setInterval(tick, 15000);
  }

  // ── The lights. Off on arrival, everywhere. The ground goes from a warm
  //    black to ecru; the header, the browser tint and the safe-area strips
  //    belong to script.js, which listens for the event and follows.
  const DARK_BG = '#0f0d0b', LIT_BG = '#ffffff';
  const sw = $('#hm-lab-switch'), dot = $('#hm-lab-dot'), sign = $('#hm-lab-sign'), side = $('#hm-lab-side');
  let lit = false;
  const onLights = [];
  const paintLights = () => {
    lab.classList.toggle('is-lit', lit);
    onLights.forEach(f => f());
    lab.style.backgroundColor = lit ? LIT_BG : DARK_BG;
    dispatchEvent(new CustomEvent('hm-lab-lights', { detail: { bg: lit ? LIT_BG : DARK_BG, dark: !lit } }));
    if (dot) dot.classList.toggle('is-off', !lit);
    if (sign) sign.textContent = lit ? 'lights on' : 'lights off';
    if (sw) sw.setAttribute('aria-pressed', String(lit));
  };
  const toggleLights = () => {
    lit = !lit; paintLights();
    if (touch && navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  };
  paintLights();
  if (sw) sw.addEventListener('click', toggleLights);
  // The phone's wall plate: its own switch, mounted level with the top of
  // the name in the empty room to the left of it.
  const plate = $('#hm-lab-plate'), mark = $('#hm-lab-mark');
  if (plate && touch) {
    plate.addEventListener('click', toggleLights);
    onLights.push(() => plate.setAttribute('aria-pressed', String(lit)));
    const mount = () => { const t = parseFloat(mark && mark.style.top) || 0; if (t) plate.style.setProperty('--plate-top', Math.round(t + 6) + 'px'); };
    if (mark) new MutationObserver(mount).observe(mark, { attributes: true, attributeFilter: ['style'] });
    mount();
  }
  onArrive.push(() => { lit = false; paintLights(); });
  // The browser's back button can restore this page from its back-forward
  // cache exactly as it was left, lights and all. That counts as an
  // arrival too: everything registered for one runs again.
  addEventListener('pageshow', e => { if (e.persisted && labWanted()) onArrive.forEach(f => f()); });

  // ── The torch. A fixed cloak with a soft hole rides the pointer, and the
  //    pointer itself is a small flashlight, lens on the hotspot, beam just
  //    ahead of it. Over the cord it is a white glove; a fist while pulling.
  const torch = $('#hm-torch'), cur = $('#hm-cursor');
  if (torch && cur && !touch) {
    let tx = innerWidth / 2, ty = innerHeight * .42, raf = 0;
    const place = () => {
      torch.style.transform = 'translate3d(' + (tx + 44) + 'px,' + (ty - 44) + 'px,0)';
      cur.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      raf = 0;
    };
    lab.addEventListener('pointermove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(place);
      cur.classList.add('is-on');
      cur.classList.toggle('is-glove', !!e.target.closest('.lab-cord'));
      cur.classList.toggle('is-hot', !!e.target.closest('a,button,[role="button"],.tv-screen'));
    }, { passive: true });
    lab.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    place();
  }

  // ── The cord. Feral UI's pullcord, ported: a rope of sixteen links under
  //    gravity, damped, pulled straight by twenty passes of constraint each
  //    frame, drawn as one smooth path with a knob on the end. The lights
  //    switch the moment the pull crosses the detent, like a real chain,
  //    and a click or the keyboard gives it a scripted tug. It drops in from
  //    above on every arrival and the fall's momentum becomes the swing.
  const cordEl = $('#hm-cord'), rope = $('#hm-cord-rope'), knobG = $('#hm-cord-knobg'), knob = $('#hm-cord-knob'),
        hit = $('#hm-cord-hit'), inner = $('#hm-cord-inner'), note = $('#hm-cord-note'), cordSvg = $('#hm-cord-svg');
  if (cordEl && rope && knobG && hit && !touch) {
    const CFG = { gravity: 1250, damping: .94, iterations: 20, stretchMax: 26, stretchToggle: 20, maxVelocity: 22, sleep: .15 };
    const AX = 32, SEG = 16;
    let restY = 260, restSeg = restY / SEG, pts = [];
    const make = () => { pts = []; for (let i = 0; i <= SEG; i++) { const y = restSeg * i; pts.push({ x: AX, y, ox: AX, oy: y, fixed: i === 0 }); } };
    const path = () => {
      let d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2, yc = (pts[i].y + pts[i + 1].y) / 2;
        d += ' Q ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1) + ' ' + xc.toFixed(1) + ' ' + yc.toFixed(1);
      }
      return d + ' L ' + pts[SEG].x.toFixed(1) + ' ' + pts[SEG].y.toFixed(1);
    };
    // The hand goes where the hand is. It used to be parked on the knob, so
    // reaching for the middle of the rope drew a glove down at the ball
    // instead of under the cursor — the cord looked like it could only be
    // taken by its end. It rides the link being hovered, or the one held,
    // and moves with that link as the rope swings.
    const gloveEl = $('#hm-cord-glove');
    let hoverI = SEG;
    const placeGlove = () => {
      if (!gloveEl) return;
      const g = pts[dragging ? grabI : hoverI] || pts[SEG];
      gloveEl.setAttribute('transform', 'translate(' + (g.x - 8 * PX).toFixed(2) + ' ' + (g.y - 10 * PX).toFixed(2) + ')');
    };
    const render = () => {
      rope.setAttribute('d', path());
      knobG.setAttribute('transform', 'translate(' + (pts[SEG].x - AX).toFixed(2) + ' ' + (pts[SEG].y - restY).toFixed(2) + ')');
      placeGlove();
    };
    let raf = 0, running = false, prevT = 0, prevDt = 0, dragging = false;
    const target = { x: AX, y: restY };
    const step = now => {
      const dt = prevT ? Math.min(.04, Math.max(.004, (now - prevT) / 1000)) : 1 / 60;
      prevT = now;
      const tc = prevDt > 0 ? dt / prevDt : 1;
      const velCoef = tc * Math.pow(CFG.damping, dt * 60), accCoef = dt * dt;
      for (let i = 1; i < pts.length; i++) pts[i].fixed = false;
      pts[grabI].fixed = dragging;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p.fixed) continue;
        const vx = p.x - p.ox, vy = p.y - p.oy;
        p.ox = p.x; p.oy = p.y;
        p.x += vx * velCoef;
        p.y += vy * velCoef + CFG.gravity * accCoef;
      }
      pts[0].x = AX; pts[0].y = 0;
      if (dragging) { const g = pts[grabI]; g.ox = g.x; g.oy = g.y; g.x = target.x; g.y = target.y; }
      for (let k = 0; k < CFG.iterations; k++) {
        for (let i = 0; i < SEG; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1e-4;
          const diff = (restSeg - dist) / dist * .5;
          const ox = dx * diff, oy = dy * diff;
          if (!a.fixed) { a.x -= ox; a.y -= oy; }
          if (!b.fixed) { b.x += ox; b.y += oy; }
        }
      }
      prevDt = dt;
      render();
      let speed = 0;
      for (let i = 1; i < pts.length; i++) speed += Math.abs(pts[i].x - pts[i].ox) + Math.abs(pts[i].y - pts[i].oy);
      if (!dragging && speed < CFG.sleep * dt * 60) { running = false; return; }
      raf = requestAnimationFrame(step);
    };
    const wake = () => { if (running) return; running = true; prevT = 0; prevDt = 0; raf = requestAnimationFrame(step); };
    // The cord ends a little above the statement, wherever the layout puts
    // it (syncAbout in script.js positions the statement).
    const layout = () => {
      const top = parseFloat(side && side.style.top) || 0;
      restY = clamp(top ? top - 40 : 260, 140, 360);
      restSeg = restY / SEG;
      cordEl.style.setProperty('--cord-h', restY + 'px');
      cordSvg.setAttribute('viewBox', '0 0 64 ' + (restY + 140));
      knob.setAttribute('cy', restY);
      hit.style.top = '0px'; hit.style.height = (restY + 23) + 'px';
      if (note) note.style.top = (restY - 11) + 'px';
      cancelAnimationFrame(raf); running = false;
      make(); render();
    };
    // The hand: a 90s cursor hand on a 16 by 18 grid, 1 = outline, 2 = fill,
    // each cell PX units, laid so the palm closes on the knob.
    const PX = 2.2;
    const HAND = [
      '......11........', '.....1221.......', '.....1221.......', '.....1221.......', '.....122111.....',
      '.....12212211...', '.....1221221211.', '.11..12212212221', '1221.12222222221', '1222122222222221',
      '1222222222222221', '.122222222222221', '..12222222222221', '..1222222222221.', '...122222222221.',
      '...12222222221..', '....1222222221..', '....1111111111..'
    ];
    const gloveG = $('#hm-cord-glove');
    if (gloveG) {
      let s = '';
      HAND.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === '.') return;
        s += '<rect x="' + (x * PX).toFixed(2) + '" y="' + (y * PX).toFixed(2) + '" width="' + PX + '" height="' + PX + '" fill="' + (c === '1' ? '#141210' : '#fff') + '"/>';
      }));
      gloveG.innerHTML = s;
    }
    if (side) new MutationObserver(layout).observe(side, { attributes: true, attributeFilter: ['style'] });
    layout();

    // Which link of the rope the hand has hold of. The drag drives that point
    // rather than the end, so the rope bends where you took it and the slack
    // below swings from your hand under its own weight.
    let pulled = false, clicked = false, didDrag = false, x0 = 0, y0 = 0, grabI = SEG, grabY = restY;
    const pull = () => {
      toggleLights();
      if (!pulled) { pulled = true; cordEl.classList.add('is-pulled'); }
      hit.setAttribute('aria-pressed', String(lit));
    };
    const scripted = () => { pull(); if (still.matches) return; pts[SEG].oy -= 22; wake(); };
    hit.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true; didDrag = false; clicked = false; x0 = e.clientX; y0 = e.clientY;
      // The cord's box is 64 units wide and drawn at 64px, so a client offset
      // is a rope unit. Link 0 is the fixing and cannot be dragged.
      const gy = e.clientY - cordEl.getBoundingClientRect().top;
      grabI = clamp(Math.round(gy / restSeg), 1, SEG);
      grabY = restSeg * grabI;
      target.x = AX; target.y = grabY;
      try { hit.setPointerCapture(e.pointerId); } catch (x) {}
      lab.classList.add('is-pulling');
      wake();
      e.preventDefault();
    });
    hit.addEventListener('pointermove', e => {
      if (!dragging) return;
      const rx = e.clientX - x0, ry = grabY + (e.clientY - y0);
      if (Math.abs(rx) > 3 || Math.abs(e.clientY - y0) > 3) didDrag = true;
      const dist = Math.hypot(rx, ry) || 1e-4, maxD = grabY + CFG.stretchMax;
      const k = dist > maxD ? maxD / dist : 1;
      target.x = AX + rx * k; target.y = ry * k;
      // Pulled far enough past where this link hangs, wherever it hangs.
      if (!clicked && dist - grabY >= Math.min(CFG.stretchToggle, CFG.stretchMax - 1)) { clicked = true; pull(); }
    });
    const up = () => {
      if (!dragging) return;
      dragging = false; lab.classList.remove('is-pulling');
      const p = pts[grabI], vx = p.x - p.ox, vy = p.y - p.oy, v = Math.hypot(vx, vy);
      if (v > CFG.maxVelocity) { const k = CFG.maxVelocity / v; p.ox = p.x - vx * k; p.oy = p.y - vy * k; }
      wake();
      if (!didDrag && !clicked) scripted();
    };
    hit.addEventListener('pointerup', up); hit.addEventListener('pointercancel', up);
    // Hovering: follow the pointer down the rope even when the physics loop is
    // asleep, so the hand tracks without the cord having to be moving.
    const trackHover = e => {
      const gy = e.clientY - cordEl.getBoundingClientRect().top;
      hoverI = clamp(Math.round(gy / restSeg), 1, SEG);
      if (!dragging) placeGlove();
    };
    hit.addEventListener('pointermove', trackHover, { passive: true });
    hit.addEventListener('pointerenter', e => { cordEl.classList.add('is-hover'); trackHover(e); });
    hit.addEventListener('pointerleave', () => cordEl.classList.remove('is-hover'));
    hit.addEventListener('mousedown', e => e.preventDefault());
    hit.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); scripted(); } });
    // The entrance: a clean fall from above (CSS), then the rope takes the
    // momentum and does the overshoot, the swing and the settle itself.
    let dropped = false;
    const endDrop = () => {
      if (dropped) return; dropped = true;
      inner.classList.remove('is-drop');
      if (still.matches) return;
      pts[SEG].oy -= 13; pts[SEG].ox -= 6; wake();
    };
    const drop = () => {
      if (!inner || still.matches) return;
      dropped = false;
      inner.classList.remove('is-drop'); void inner.offsetWidth; inner.classList.add('is-drop');
      setTimeout(endDrop, 1700);
    };
    if (inner) inner.addEventListener('animationend', e => { if (e.animationName === 'cord-drop') endDrop(); });
    onArrive.push(drop);
    if (labWanted()) drop();
  }

  // ── Type that bends. Each letter of the headline and the piece titles is
  //    its own span; the nearer the pointer, the wider and heavier it sets.
  //    Words stay whole (a widening letter must never push its neighbour
  //    onto the next line); only the spaces between them can break.
  const lens = [];
  lab.querySelectorAll('.lab-h2, .lab-title').forEach(h => {
    const base = h.classList.contains('lab-title') ? [80, 800] : [88, 700];
    const text = h.textContent;
    h.textContent = '';
    text.split(' ').forEach((word, i) => {
      if (i) h.appendChild(document.createTextNode(' '));
      const w = document.createElement('span'); w.className = 'wd';
      [...word].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = ch; w.appendChild(s);
        lens.push({ el: s, base });
      });
      h.appendChild(w);
    });
  });
  if (lens.length && !touch && !still.matches) {
    let px = -1e4, py = -1e4, raf = 0;
    const relax = () => lens.forEach(l => { l.el.style.removeProperty('--w'); l.el.style.removeProperty('--g'); });
    onLights.push(() => { if (lit) relax(); });
    const paint = () => {
      raf = 0;
      // Only in the dark: with the lights on the type stands still.
      if (lit) { relax(); return; }
      lens.forEach(l => {
        const r = l.el.getBoundingClientRect();
        if (!r.width) return;
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        const k = Math.exp(-(dx * dx + dy * dy) / 16000);
        l.el.style.setProperty('--w', (l.base[0] + (100 - l.base[0]) * k).toFixed(1));
        l.el.style.setProperty('--g', (l.base[1] - 380 * k).toFixed(0));
      });
    };
    lab.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    lab.addEventListener('pointerleave', () => { px = -1e4; py = -1e4; if (!raf) raf = requestAnimationFrame(paint); });
  }

  // ── Objects that lean after the pointer.
  const tilt = (zone, el, ry0, rx0, amt) => {
    if (!zone || !el || touch || still.matches) return;
    const rest = () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); };
    onLights.push(() => { if (lit) rest(); });
    zone.addEventListener('pointermove', e => {
      if (lit) return;
      const r = zone.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--ry', (ry0 + x * amt) + 'deg');
      el.style.setProperty('--rx', (rx0 - y * amt) + 'deg');
    }, { passive: true });
    zone.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
  };

  // ── 01 · The television. The 404 game's avatar, drawn from the same
  //    sprite sheet the game cuts its parts from, running along a hill that
  //    never ends. Rings drift past and get picked up. Hover and it runs
  //    faster; click the glass and the picture becomes the story.
  const tv = $('#hm-tv'), cv = $('#hm-tv-canvas'), tvScreen = $('#hm-tv-screen');
  if (tv && cv && cv.getContext) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, GY = 168, SC = .6;
    ctx.imageSmoothingEnabled = false;
    const rig = new Image(); let rigReady = false;
    rig.onload = () => { rigReady = true; };
    rig.src = '/assets/avatar-rig.png';
    const P = {
      head: { sx: 0, sy: 0, w: 48, h: 51, px: 25.5, py: 50 }, torso: { sx: 50, sy: 0, w: 41, h: 37, px: 20.3, py: 36.5 },
      armF: { sx: 93, sy: 0, w: 21, h: 29, px: 10, py: 2.2 }, armB: { sx: 116, sy: 0, w: 8, h: 14, px: -2.5, py: -9.8 },
      legB: { sx: 126, sy: 0, w: 20, h: 24, px: 15.3, py: .2 }, legF: { sx: 148, sy: 0, w: 34, h: 24, px: 5.2, py: .2 }
    };
    const A = { neck: [0, -36.2], shF: [-16.3, -32], shB: [9.5, -30.3], hipB: [-6.2, .2], hipF: [6.3, .2] };
    const part = (p, rot) => { ctx.save(); ctx.rotate(rot || 0); ctx.drawImage(rig, p.sx, p.sy, p.w, p.h, -p.px, -p.py, p.w, p.h); ctx.restore(); };
    let cam = 0, phase = 0, speed = 1, want = 1, rings = [], sparks = [], got = 0, nextRing = 1.2, raf = 0, last = 0;
    const ringsEl = $('#hm-tv-rings');
    const cloud = (x, y, s) => { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x, y, 30 * s, 9 * s); ctx.fillRect(x + 7 * s, y - 6 * s, 14 * s, 7 * s); ctx.fillRect(x + 17 * s, y - 4 * s, 10 * s, 5 * s); };
    const draw = () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3fa6ff'); g.addColorStop(.6, '#7fcbff'); g.addColorStop(1, '#c9ecff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.arc(268, 34, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe36e'; ctx.beginPath(); ctx.arc(268, 34, 11, 0, Math.PI * 2); ctx.fill();
      const cx = (cam * .15) % 420;
      for (let i = -1; i < 2; i++) { cloud(i * 420 - cx + 40, 40, 1.2); cloud(i * 420 - cx + 210, 66, .9); cloud(i * 420 - cx + 330, 26, 1); }
      const hx = (cam * .3) % 300;
      for (let i = -1; i < 3; i++) {
        const bx = i * 300 - hx;
        ctx.fillStyle = '#5fcf7a'; ctx.beginPath(); ctx.arc(bx + 70, GY + 12, 95, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#4bbf68'; ctx.beginPath(); ctx.arc(bx + 220, GY + 18, 75, Math.PI, 0); ctx.fill();
      }
      const nx = (cam * .55) % 240;
      for (let i = -1; i < 3; i++) {
        const bx = i * 240 - nx;
        ctx.fillStyle = '#2fa34e'; ctx.beginPath(); ctx.arc(bx + 40, GY + 4, 32, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#278f44'; ctx.beginPath(); ctx.arc(bx + 160, GY + 6, 44, Math.PI, 0); ctx.fill();
      }
      ctx.fillStyle = '#3bb54a'; ctx.fillRect(0, GY, W, 6);
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, GY + 6, W, H - GY - 6);
      const ox = cam % 24;
      ctx.fillStyle = '#a56d36';
      for (let y = GY + 6; y < H; y += 12) for (let x = -24 - ox + ((y - GY - 6) / 12 % 2) * 12; x < W; x += 24) ctx.fillRect(x, y, 12, 12);
      rings.forEach(r => {
        ctx.strokeStyle = '#FFC61A'; ctx.lineWidth = 3;
        const sq = Math.abs(Math.cos(r.t * 5));
        ctx.beginPath(); ctx.ellipse(r.x, r.y, 7 * (0.25 + 0.75 * sq), 7, 0, 0, Math.PI * 2); ctx.stroke();
      });
      sparks.forEach(s => { ctx.fillStyle = s.c; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); });
      if (!rigReady) return;
      const c = clamp(speed, 0, 1.6), s = Math.sin(phase), cs = Math.cos(phase);
      const legF = -s * .95 * (.4 + .6 * c), legB = s * .95 * (.4 + .6 * c);
      const armF = s * .8 * (.3 + .7 * c) - .2 * c, armB = -s * .8 * (.3 + .7 * c) + .2 * c;
      const lean = .2 * Math.min(1, c), head = -.1 * c + cs * .04 * c, bounce = Math.abs(cs) * 5 * c;
      ctx.save();
      ctx.translate(96, GY);
      ctx.scale(SC, SC);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(0, -24.3 - bounce);
      // Same cut, same fix as the game: the back leg's sprite trails its toe,
      // so it is mirrored about the hip and its rotation negated with it.
      ctx.save(); ctx.translate(A.hipB[0], A.hipB[1]); ctx.scale(-1, 1); part(P.legB, -legB); ctx.restore();
      ctx.save(); ctx.rotate(lean);
      ctx.save(); ctx.translate(A.shB[0], A.shB[1]); part(P.armB, armB); ctx.restore();
      part(P.torso, 0);
      ctx.save(); ctx.translate(A.neck[0], A.neck[1]); part(P.head, head); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(A.hipF[0], A.hipF[1]); part(P.legF, legF); ctx.restore();
      ctx.save(); ctx.rotate(lean); ctx.translate(A.shF[0], A.shF[1]); part(P.armF, armF); ctx.restore();
      ctx.restore();
    };
    const frame = t => {
      const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
      speed += (want - speed) * Math.min(1, dt * 4);
      const v = 150 * speed;
      cam += v * dt; phase += dt * 13 * speed;
      nextRing -= dt;
      if (nextRing <= 0) { nextRing = 1 + Math.random() * 1.6; const n = Math.random() < .35 ? 3 : 1; for (let i = 0; i < n; i++) rings.push({ x: W + 20 + i * 20, y: GY - 40 - Math.random() * 40, t: Math.random() * 6 }); }
      rings.forEach(r => { r.x -= v * dt; r.t += dt; });
      rings = rings.filter(r => {
        if (Math.abs(r.x - 96) < 12 && r.y > GY - 70) {
          got++; if (ringsEl) ringsEl.textContent = '◎ ' + got;
          for (let i = 0; i < 6; i++) sparks.push({ x: r.x, y: r.y, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 90, t: 0, c: i % 2 ? '#FFC61A' : '#fff' });
          return false;
        }
        return r.x > -20;
      });
      sparks.forEach(s => { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; });
      sparks = sparks.filter(s => s.t < .5);
      draw();
      raf = requestAnimationFrame(frame);
    };
    if (still.matches) { rig.onload = () => { rigReady = true; draw(); }; draw(); }
    else watch(tv, () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }, () => { cancelAnimationFrame(raf); raf = 0; });
    tv.addEventListener('pointerenter', () => { want = 1.7; });
    tv.addEventListener('pointerleave', () => { want = 1; });
    tilt($('#hm-tv'), $('#hm-tv-shell'), 0, 0, 7);
    const story = on => {
      tv.classList.toggle('is-story', on);
      const st = $('#hm-tv-story'), ui = $('#hm-tv-ui');
      if (st) st.setAttribute('aria-hidden', String(!on));
      if (ui) ui.setAttribute('aria-hidden', String(on));
      want = on ? .35 : 1;
    };
    if (tvScreen && !touch) tvScreen.addEventListener('click', e => { if (!e.target.closest('a,button')) story(!tv.classList.contains('is-story')); });
    const coin = $('#hm-tv-coin'); if (coin) coin.addEventListener('click', () => story(true));
    const eject = $('#hm-tv-eject'); if (eject) eject.addEventListener('click', () => story(false));
    // A fresh coin means a fresh pair of runs on the game page.
    const fresh = () => { try { sessionStorage.setItem('hm-404-runs', '0'); } catch (x) {} };
    const play = $('#hm-tv-play'); if (play) play.addEventListener('click', fresh);
    const go = $('#hm-tv-go'); if (go) go.addEventListener('click', fresh);
  }

  // ── 02 · Filed. The receipt prints itself once the piece is properly in
  //    view, the way a thermal printer does it in a cartoon: the slot chugs,
  //    the paper comes out a line at a time with a glow at the print head,
  //    pauses to think now and then, and drops with a bounce at the end.
  const rc = $('#hm-rc'), printer = lab.querySelector('.rc-printer'), slot = lab.querySelector('.rc-slot'), head = $('#hm-rc-head');
  if (rc) {
    const bars = $('#hm-rc-bars');
    if (bars) { let s = '', seed = 7; for (let i = 0; i < 46; i++) { seed = (seed * 9301 + 49297) % 233280; s += '<i style="width:' + [1, 1, 2, 2, 3, 1][seed % 6] + 'px"></i>'; } bars.innerHTML = s; }
    let printed = false;
    const LINES = 34;
    const print = () => {
      if (printed) return; printed = true;
      if (still.matches) { rc.style.clipPath = ''; rc.classList.add('is-printed'); return; }
      let q = 0;
      if (slot) slot.classList.add('is-printing');
      if (head) head.classList.add('is-on');
      const line = () => {
        q++;
        const p = q / LINES;
        // The paper hangs from the slit and grows downward, header first,
        // as each line is laid down at the head; a feed twitch each line.
        rc.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100).toFixed(2) + '% 0)';
        rc.style.transform = 'translateY(' + (Math.random() * 2.2).toFixed(2) + 'px) rotate(' + ((Math.random() - .5) * .5).toFixed(2) + 'deg)';
        if (q < LINES) {
          // a beat every few lines, as if it had to think about the next one
          const pause = q % 7 === 0 ? 260 + Math.random() * 220 : 0;
          setTimeout(line, 55 + Math.random() * 70 + pause);
          return;
        }
        rc.style.clipPath = ''; rc.style.transform = '';
        if (slot) slot.classList.remove('is-printing');
        if (head) head.classList.remove('is-on');
        rc.classList.add('is-printed');
      };
      setTimeout(line, 420);
    };
    rc.style.clipPath = 'inset(0 0 100% 0)';
    // Only once the reader has actually arrived: most of the printer on
    // screen, not a corner of it peeking in from below.
    watch(printer || rc, print, null, .6);
  }

  // ── The meter. The count is anchored to a real reading — BASE tokens on
  //    BASE_DAY, taken off the local Claude logs — and then walks itself
  //    forward: every day since the anchor adds that day's own figure, so
  //    the page keeps counting on its own and nobody has to come back and
  //    edit a constant. Re-anchor whenever you want it exact again.
  //
  //    The squares are the shape everybody already knows, generated rather
  //    than recorded: a day's level comes from a hash of the day itself, so
  //    it is identical on every visit, on every machine, and the grid slides
  //    one column and gains one square each morning. Weekends run lighter
  //    and the whole year ramps up towards now, because the habit got worse
  //    rather than better. The same generator feeds the count, so the number
  //    and the grid are never telling two different stories.
  const gh = $('#hm-gh');
  if (gh) {
    const BASE = 12190187228;               // tokens, measured 2026-09-04
    const BASE_DAY = Date.UTC(2026, 8, 4);  // the morning that reading was taken
    const PER_REPLY = 255700;               // BASE ÷ 47,672 replies
    const PER_SESSION = 31580000;           // BASE ÷ 386 sessions
    const DAY = 864e5, COLS = 53;
    const cells = $('#hm-gh-cells'), months = $('#hm-gh-months');
    const num = $('#hm-gh-num'), sub = $('#hm-gh-sub'), read = $('#hm-gh-read');

    // A cheap, well-mixed hash: the day number in, a stable 0..1 out.
    const rnd = (n, salt) => {
      let h = (Math.imul(n, 2654435761) + Math.imul(salt, 40503)) >>> 0;
      h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
      h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    // Midnight UTC today, so every reader sees the same grid on the same day.
    const today = Math.floor(Date.now() / DAY) * DAY;
    const BANDS = [[0, 0], [3e6, 14e6], [14e6, 34e6], [34e6, 68e6], [68e6, 132e6]];
    const dayOf = t => {
      const n = Math.round(t / DAY), wd = new Date(t).getUTCDay();
      // How hard the year was leaning by then: a slow ramp over the window,
      // so last autumn reads as gaps and this month reads as a wall.
      const ramp = .6 + .4 * clamp((t - (today - 364 * DAY)) / (364 * DAY), 0, 1);
      const busy = (wd === 0 || wd === 6 ? .68 : 1) * ramp;
      const a = rnd(n, 1), b = rnd(n, 2);
      const lv = a > Math.min(busy * 1.25, .97) ? 0 : clamp(1 + Math.floor(b * b * 4 * busy + b * 1.1), 1, 4);
      const band = BANDS[lv];
      return { lv: lv, tok: Math.round(band[0] + rnd(n, 3) * (band[1] - band[0])) };
    };

    // Walk the anchor forward to today. Capped, so a machine with a wildly
    // wrong clock costs a few hundred iterations rather than a hung tab.
    let total = BASE;
    for (let t = BASE_DAY + DAY, i = 0; t <= today && i < 4000; t += DAY, i++) total += dayOf(t).tok;

    const fmt = n => n.toLocaleString('en-US');
    const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const stamp = t => { const d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; };
    const rest = () => {
      read.innerHTML = fmt(Math.round(total / PER_REPLY)) + ' replies · '
        + fmt(Math.round(total / PER_SESSION)) + ' sessions'
        + (touch ? '' : ' · <span style="opacity:.7">hover a day</span>');
    };

    // 53 columns, the last one stopping at today; the first is whatever
    // Sunday lands 52 weeks back, exactly as the original does it.
    const start = today - ((COLS - 1) * 7 + new Date(today).getUTCDay()) * DAY;
    let grid = '', mrow = '', prevMon = -1;
    for (let c = 0; c < COLS; c++) {
      const m = new Date(start + c * 7 * DAY).getUTCMonth();
      // Label a column only where the month turns over, and never the first
      // one — a half-month's worth of columns cannot hold the word.
      mrow += '<span>' + (c > 0 && m !== prevMon ? MON[m] : '') + '</span>';
      prevMon = m;
    }
    for (let i = 0; i < COLS * 7; i++) {
      // Row-major in the markup, column-major in the grid: the flow is set
      // to columns, so the cells fill down each week in order.
      const t = start + (Math.floor(i / 7) * 7 + (i % 7)) * DAY;
      if (t > today) { grid += '<i class="is-void"></i>'; continue; }
      grid += '<i class="l' + dayOf(t).lv + '" data-t="' + t + '"></i>';
    }
    months.innerHTML = mrow;
    cells.innerHTML = grid;
    // The grid is wider than a phone: start it at today, not last autumn.
    const scroller = gh.querySelector('.gh-scroll');
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;

    // Hover reads out into the line under the grid. No floating box: in the
    // dark the pointer is already carrying a torch.
    let lit = null;
    if (!touch) {
      cells.addEventListener('pointerover', e => {
        const i = e.target.closest('i[data-t]'); if (!i || i === lit) return;
        if (lit) lit.classList.remove('is-on');
        lit = i; i.classList.add('is-on');
        const t = +i.dataset.t, d = dayOf(t);
        read.innerHTML = d.tok
          ? '<b>' + fmt(d.tok) + '</b> tokens on ' + stamp(t)
          : 'nothing on ' + stamp(t) + ' · a day off';
      });
      cells.addEventListener('pointerleave', () => {
        if (lit) { lit.classList.remove('is-on'); lit = null; }
        rest();
      });
    }
    rest();

    // The count rolls up once, when the meter is actually on screen.
    sub.textContent = 'tokens through claude · since the first prompt';
    let ran = false;
    const roll = () => {
      if (ran) return; ran = true;
      if (still.matches) { num.textContent = fmt(total); return; }
      const from = Math.round(total * .88), t0 = performance.now(), ms = 1600;
      const step = now => {
        const p = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - p, 4);
        num.textContent = fmt(Math.round(from + (total - from) * e));
        if (p < 1) requestAnimationFrame(step);
      };
      num.textContent = fmt(from);
      requestAnimationFrame(step);
    };
    num.textContent = fmt(Math.round(total * .88));
    watch(gh, roll, null, .3);
  }

})();
