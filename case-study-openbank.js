document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.style.opacity = 1; e.target.style.transform = 'none';
    io.unobserve(e.target);
  }), { threshold: .08 });
  if (!reduced) document.querySelectorAll('[data-fx]').forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight * .95) {
      el.style.opacity = 0;
      el.style.transform = 'translateY(12px)';
      el.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)';
      io.observe(el);
    }
  });

  // three forces: spring-loaded, scroll driven
  const FORCES = [
    { h: 'Velocity, or the window closes', b: 'Deposits fund lending. No time for iteration, polish, or a second attempt.', x: 200, y: 34 },
    { h: 'Cash App is the baseline, not the ceiling', b: 'Seamless onboarding. Instant confirmation. Anything less reads as legacy.', x: 352, y: 262 },
    { h: 'Fifty states, zero mistakes', b: 'KYC. AML. Fraud prevention that cannot fail publicly, immediately.', x: 48, y: 262 }
  ];
  const C = { x: 200, y: 152 };
  const tdot = $('tri-dot'), fh = $('f-head'), fb = $('f-body');
  const tethers = [$('tl0'), $('tl1'), $('tl2')];
  const verts = [$('tv0'), $('tv1'), $('tv2')].map(g => g.firstElementChild);
  const smooth = t => t * t * (3 - 2 * t);
  let pos = { x: C.x, y: C.y }, vel = { x: 0, y: 0 }, weights = [1, 0, 0], fIdx = -1;
  const setForceProgress = p => {
    const a = smooth(clamp((p - .22) / .22, 0, 1));
    const b = smooth(clamp((p - .56) / .22, 0, 1));
    weights = [(1 - a), a * (1 - b), b];
    const dom = weights[0] >= weights[1] && weights[0] >= weights[2] ? 0 : (weights[1] >= weights[2] ? 1 : 2);
    if (dom !== fIdx) {
      fIdx = dom;
      fh.textContent = FORCES[dom].h;
      fb.textContent = FORCES[dom].b;
    }
  };
  const springStep = () => {
    let tx = C.x, ty = C.y;
    FORCES.forEach((F, i) => { tx += (F.x - C.x) * .66 * weights[i]; ty += (F.y - C.y) * .66 * weights[i]; });
    vel.x = (vel.x + (tx - pos.x) * .085) * .87;
    vel.y = (vel.y + (ty - pos.y) * .085) * .87;
    pos.x += vel.x; pos.y += vel.y;
    tdot.setAttribute('cx', pos.x.toFixed(2));
    tdot.setAttribute('cy', pos.y.toFixed(2));
    const speed = Math.min(1, Math.hypot(vel.x, vel.y) / 5);
    tdot.setAttribute('r', (7 + speed * 2.4).toFixed(2));
    tethers.forEach((t, i) => {
      const F = FORCES[i];
      // tether sags away from the pull it is losing
      const mx = (F.x + pos.x) / 2, my = (F.y + pos.y) / 2;
      const slack = (1 - weights[i]) * 26;
      const nx = -(pos.y - F.y), ny = (pos.x - F.x);
      const nl = Math.hypot(nx, ny) || 1;
      const cx = mx + (nx / nl) * slack, cy = my + (ny / nl) * slack;
      t.setAttribute('d', 'M' + F.x + ' ' + F.y + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + pos.x.toFixed(1) + ' ' + pos.y.toFixed(1));
      t.setAttribute('stroke-width', (1 + weights[i] * 2.2).toFixed(2));
      t.style.opacity = String(.14 + weights[i] * .86);
      verts[i].setAttribute('fill', weights[i] > .5 ? '#FF3334' : '#fff');
      verts[i].setAttribute('stroke', weights[i] > .5 ? '#FF3334' : '#1D1D1F');
      verts[i].setAttribute('r', (7 + weights[i] * 2.5).toFixed(2));
    });
    requestAnimationFrame(springStep);
  };
  setForceProgress(0);
  springStep();

  // the cut
  const feats = [...document.querySelectorAll('[data-feat]')];
  const keep = document.querySelector('[data-keep]');
  const others = feats.filter(f => f !== keep);
  const cutpay = $('cutpay'), cutgrid = $('cutgrid');
  const cutN = $('cut-n'), cutKick = $('cut-kick');
  const setCut = p => {
    const gone = clamp((p - .06) / .5, 0, 1) * others.length;
    others.forEach((el, i) => {
      const g = ease(clamp(gone - i, 0, 1));
      el.style.opacity = String(1 - .92 * g);
      el.style.transform = 'translateY(' + (g * 6) + 'px) scale(' + (1 - .05 * g) + ')';
    });
    const hot = clamp((p - .5) / .14, 0, 1);
    keep.style.color = hot > .45 ? '#FF3334' : '#1D1D1F';
    keep.style.transform = 'scale(' + (1 + .14 * ease(hot)) + ')';
    const remaining = Math.max(1, 9 - Math.floor(clamp((p - .06) / .5, 0, 1) * 8));
    if (cutN.textContent !== String(remaining)) cutN.textContent = String(remaining);
    cutKick.textContent = remaining === 1 ? 'Products that shipped in the year' : 'Products in the plan';
    const pay = ease(clamp((p - .74) / .16, 0, 1));
    cutgrid.style.opacity = String(1 - pay);
    cutpay.style.opacity = String(pay);
  };

  // failover: scroll-driven
  const route = $('route'), live = $('live'), rdot = $('rdot'), railcap = $('railcap');
  const rlen = route.getTotalLength();
  live.style.strokeDasharray = rlen;
  const achpost = $('achpost'), rtppost = $('rtppost'), una = $('una'), unr = $('unr');
  const tl = [$('t-ach'), $('t-rtp'), $('t-deb')];
  const caps = [
    '<b style="font-weight:650;color:#1D1D1F">A transfer leaves on ACH.</b> The default rail: cheap, proven, slow.',
    '<b style="font-weight:650;color:#1D1D1F">ACH is unavailable.</b> A legacy bank shows an error here. We reroute to RTP, and the transfer keeps moving.',
    '<b style="font-weight:650;color:#1D1D1F">RTP is unavailable too.</b> A debit top-up through Plaid carries it. Funded, and no wall in sight.'
  ];
  let capIdx = -1;
  const setRail = p => {
    p = clamp(p, 0, 1);
    const d = rlen * p, pt = route.getPointAtLength(d);
    rdot.setAttribute('cx', pt.x); rdot.setAttribute('cy', pt.y);
    live.style.strokeDashoffset = rlen - d;
    const aF = p > .40, rF = p > .63;
    achpost.style.opacity = aF ? .07 : .18;
    rtppost.style.opacity = rF ? .07 : .18;
    una.style.opacity = aF ? 1 : 0;
    unr.style.opacity = rF ? 1 : 0;
    const i = p < .42 ? 0 : p < .65 ? 1 : 2;
    if (i !== capIdx) {
      capIdx = i;
      railcap.innerHTML = caps[i];
      tl.forEach((t, j) => t.style.fill = j === i ? '#FF3334' : '#86868B');
    }
    $('railfill').style.width = (p * 100) + '%';
  };
  setRail(0);

  const bar = $('pg');
  const forcesTrack = $('fig-forces-track'), cutTrack = $('fig-cut-track'), railTrack = $('fig-rails-track'), moneyTrack = $('fig-money-track');
  const moneyN = $('money-n'), moneyFill = $('money-fill'), moneyLine = $('money-line'), moneyKick = $('money-kick'), resgrid = $('resgrid');
  let moneyPhase = -1;
  const setMoney = p => {
    const v = 2 * ease(clamp(p / .84, 0, 1));
    moneyN.textContent = v.toFixed(2);
    moneyFill.style.width = (clamp(p / .84, 0, 1) * 100) + '%';
    const phase = v < .5 ? 0 : v < 1.2 ? 1 : v < 1.95 ? 2 : 3;
    if (phase !== moneyPhase) {
      moneyPhase = phase;
      moneyLine.textContent = [
        'One product, in all fifty states, funded five minutes at a time.',
        'Every dollar of it arrived through the same screen.',
        'No customer met a wall, including when a rail did.',
        'Two billion dollars, from the one thing we did not cut.'
      ][phase];
      moneyKick.textContent = phase === 3 ? 'Deposits · ten weeks after launch · fifty states' : 'Deposits · ten weeks after launch';
    }
    resgrid.style.opacity = String(clamp((p - .86) / .1, 0, 1));
  };
  // Same bottom-band tinting as the home page: iOS blends its bottom search
  // bar from the document background (and the #hm-safe-bot strip paints the
  // home-indicator band), so both follow whatever section sits at the bottom
  // edge of the visual viewport. The top stays white — the sticky nav is
  // always white and covers the status-bar band.
  const darkSecs = [...document.querySelectorAll('[data-dark]')];
  const safeBot = $('hm-safe-bot');
  let wasBotDark = null;
  const paintChrome = () => {
    const seen = window.visualViewport ? Math.min(window.visualViewport.height, innerHeight) : innerHeight;
    const botDark = darkSecs.some(s => {
      const r = s.getBoundingClientRect();
      return r.top < seen - 8 && r.bottom > seen - 8;
    });
    if (botDark === wasBotDark) return;
    wasBotDark = botDark;
    const c = botDark ? '#000000' : '#ffffff';
    document.documentElement.style.background = c;
    document.body.style.background = c;
    if (safeBot) safeBot.style.background = c;
  };
  const onScroll = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = clamp(scrollY / (total || 1), 0, 1) * 100 + '%';
    const trackProg = el => {
      const r = el.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    };
    setRail(ease(clamp(trackProg(railTrack) / .92, 0, 1)));
    setCut(clamp(trackProg(cutTrack) / .94, 0, 1));
    setForceProgress(trackProg(forcesTrack));
    setMoney(trackProg(moneyTrack));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  // Chrome tinting runs directly on scroll, not through the rAF batch above:
  // it's a cheap early-outing check, and browsers throttle rAF in background
  // or embedded views while still delivering scroll events.
  addEventListener('scroll', paintChrome, { passive: true });
  addEventListener('resize', () => { wasBotDark = null; paintChrome(); });
  onScroll();
  paintChrome();

  const nx = $('next-link'), na = nx.querySelector('span');
  nx.addEventListener('mouseenter', () => na.style.transform = 'translateX(9px)');
  nx.addEventListener('mouseleave', () => na.style.transform = 'none');

  const tune = () => {
    const m = innerWidth < 700;
    forcesTrack.style.height = m ? '170vh' : '185vh';
    moneyTrack.style.height = m ? '210vh' : '230vh';
    cutTrack.style.height = m ? '260vh' : '300vh';
    railTrack.style.height = m ? '190vh' : '215vh';
    cutgrid.style.gridTemplateColumns = m ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
    document.querySelectorAll('#fig-rails text').forEach(t => { t.style.fontSize = m ? '19px' : ''; });
    live.setAttribute('stroke-width', m ? 5 : 3);
    rdot.setAttribute('r', m ? 11 : 7);
    document.querySelectorAll('#fig-rails line').forEach(l => l.setAttribute('stroke-width', m ? 2.4 : 1.5));
  };
  tune();
  addEventListener('resize', tune);

  // Footer headline word alternates between what someone might be reaching
  // out for; the ID card's clock reads Madrid local time (CET/CEST derived
  // from the actual offset, not hard-coded, so it keeps up with DST).
  const ctaWord = $('hm-cta-word');
  if (ctaWord) {
    const words = ['idea.', 'product.', 'launch.', 'bet.', 'hire.'];
    let wi = 0;
    setInterval(() => {
      ctaWord.classList.add('is-swap');
      setTimeout(() => {
        wi = (wi + 1) % words.length;
        ctaWord.textContent = words[wi];
        ctaWord.classList.remove('is-swap');
      }, 250);
    }, 2200);
  }

  const ctaTimes = document.querySelectorAll('.cta-time'), ctaTzs = document.querySelectorAll('.cta-tz');
  if (ctaTimes.length) {
    const MADRID = 'Europe/Madrid';
    const offsetHours = date => {
      const p = new Intl.DateTimeFormat('en-US', {
        timeZone: MADRID, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
      const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour === '24' ? 0 : p.hour, p.minute, p.second);
      return Math.round((asUTC - date.getTime()) / 3600000);
    };
    const tick = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-GB', { timeZone: MADRID, hour12: false });
      const tz = offsetHours(now) === 2 ? 'CEST' : 'CET';
      ctaTimes.forEach(el => { el.textContent = time; });
      ctaTzs.forEach(el => { el.textContent = tz; });
    };
    tick();
    setInterval(tick, 1000);
  }
});
