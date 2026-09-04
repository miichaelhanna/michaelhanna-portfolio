document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // entrance for prose blocks
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

  // the attribution's date rule draws itself once the page is in
  requestAnimationFrame(() => $('attrib').classList.add('in'));

  // progress of a tall track through the viewport, 0 to 1
  const trackProg = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  };
  // Each pinned block carries the section's heading and intro with its
  // stage, so the words that set the stage up stay on screen while it plays.
  // On a phone that whole block is usually taller than the screen, and the
  // old answer — anchor the block's bottom to the viewport — jammed the
  // stage against the bottom edge with the heading lost off the top. Now it
  // is decided by what fits, in order of preference:
  //   1. heading + intro + stage all fit under the nav: pin the lot there;
  //   2. otherwise the heading and the earlier paragraphs are moved out to
  //      scroll normally ahead of the block, and only the LAST paragraph
  //      pins with the stage — the sentences that lead into it stay in
  //      view, and the stage sits where it can be read;
  //   3. and only if even that is too tall does the block anchor by its
  //      bottom, with real breathing room, so the stage is whole and the
  //      tail of the paragraph shows above it.
  // The move is undone before every measure, so a resize re-decides.
  const stages = [...document.querySelectorAll('.stage-track .stage')];
  const viewH = () => window.visualViewport ? Math.min(window.visualViewport.height, innerHeight) : innerHeight;
  const unsplit = st => {
    const lead = st.parentElement.querySelector(':scope > .stage-lead');
    if (!lead) return;
    const pinned = st.querySelector('.pinned'), prose = pinned.querySelector('.prose');
    const h2 = lead.querySelector('h2');
    if (h2) pinned.insertBefore(h2, pinned.firstChild);
    const leadProse = lead.querySelector('.prose');
    if (leadProse && prose) {
      const last = prose.firstElementChild;
      [...leadProse.children].forEach(p => prose.insertBefore(p, last));
    }
    lead.remove();
  };
  const split = st => {
    const pinned = st.querySelector('.pinned'), prose = pinned && pinned.querySelector('.prose');
    if (!pinned || !prose) return false;
    const ps = [...prose.querySelectorAll(':scope > p')];
    const h2 = pinned.querySelector(':scope > h2');
    if (!h2 && ps.length < 2) return false;
    const lead = document.createElement('div');
    lead.className = 'stage-lead';
    if (h2) lead.appendChild(h2);
    if (ps.length > 1) {
      const lp = document.createElement('div');
      lp.className = 'prose';
      ps.slice(0, -1).forEach(p => lp.appendChild(p));
      lead.appendChild(lp);
    }
    st.parentElement.insertBefore(lead, st);
    return true;
  };
  const stick = () => stages.forEach(st => {
    const nav = document.querySelector('nav').offsetHeight;
    const ih = viewH(), top = nav + 16, room = ih - top - 24;
    unsplit(st);
    if (st.offsetHeight <= room) { st.style.setProperty('--stick', top + 'px'); return; }
    if (split(st) && st.offsetHeight <= room) { st.style.setProperty('--stick', top + 'px'); return; }
    const pad = Math.max(24, Math.round(ih * .05));
    st.style.setProperty('--stick', Math.min(top, ih - st.offsetHeight - pad) + 'px');
  });

  // 01 · the three forces take the room in turn, then the line lands
  const forcesTrack = $('forces-track'), forcesProg = $('forces-prog');
  const forces = [...document.querySelectorAll('.force')];
  const forceLine = $('force-line');
  const setForces = p => {
    forcesProg.style.width = (p * 100) + '%';
    const idx = p < .3 ? 0 : p < .58 ? 1 : 2;
    forces.forEach((f, i) => f.classList.toggle('on', i === idx));
    forceLine.classList.toggle('on', p > .84);
  };

  // 03 · the cut: eight products fade, one remains, then the payoff line
  const cutTrack = $('cut-track'), cutProg = $('cut-prog');
  const feats = [...document.querySelectorAll('[data-feat]')];
  const keep = document.querySelector('[data-keep]');
  const others = feats.filter(f => f !== keep);
  const cutpay = $('cutpay'), cutgrid = $('cutgrid');
  const cutN = $('cut-n'), cutKick = $('cut-kick');
  const setCut = p => {
    cutProg.style.width = (p * 100) + '%';
    const gone = clamp((p - .06) / .6, 0, 1) * others.length;
    others.forEach((el, i) => {
      const g = ease(clamp(gone - i, 0, 1));
      el.style.opacity = String(1 - .9 * g);
      el.style.transform = 'translateY(' + (g * 6) + 'px) scale(' + (1 - .05 * g) + ')';
    });
    const hot = clamp((p - .58) / .14, 0, 1);
    keep.style.color = hot > .45 ? '#FF0000' : '#222222';
    keep.style.transform = 'scale(' + (1 + .14 * ease(hot)) + ')';
    const remaining = Math.max(1, 9 - Math.floor(clamp((p - .06) / .6, 0, 1) * 8));
    if (cutN.textContent !== String(remaining)) cutN.textContent = String(remaining);
    cutN.classList.toggle('one', remaining === 1);
    cutKick.textContent = remaining === 1 ? 'Products that shipped in the year' : 'Products in the plan';
    // the grid leaves first, then the payoff line arrives: no overlap
    cutgrid.style.opacity = String(1 - ease(clamp((p - .74) / .08, 0, 1)));
    cutpay.style.opacity = String(ease(clamp((p - .84) / .12, 0, 1)));
  };

  // 05 · the rails: one promise, three ways of keeping it
  const railsTrack = $('rails-track'), railsProg = $('rails-prog');
  const route = $('route'), live = $('live'), rdot = $('rdot'), railcap = $('railcap');
  const rlen = route.getTotalLength();
  live.style.strokeDasharray = rlen;
  const achpost = $('achpost'), rtppost = $('rtppost'), una = $('una'), unr = $('unr');
  const railLabels = [$('t-ach'), $('t-rtp'), $('t-deb')];
  const CAPS = [
    '<b>A transfer leaves on ACH.</b> The default rail: cheap, proven, slow.',
    '<b>ACH is unavailable.</b> A legacy bank shows an error here. We reroute to RTP, and the transfer keeps moving.',
    '<b>RTP is unavailable too.</b> A debit top-up through Plaid carries it. Funded, and no wall in sight.'
  ];
  let capIdx = -1;
  const setRail = raw => {
    railsProg.style.width = (raw * 100) + '%';
    const p = ease(clamp(raw / .92, 0, 1));
    const d = rlen * p, pt = route.getPointAtLength(d);
    rdot.setAttribute('cx', pt.x); rdot.setAttribute('cy', pt.y);
    live.style.strokeDashoffset = rlen - d;
    const aF = p > .40, rF = p > .63;
    achpost.style.opacity = aF ? .06 : .16;
    rtppost.style.opacity = rF ? .06 : .16;
    una.style.opacity = aF ? 1 : 0;
    unr.style.opacity = rF ? 1 : 0;
    const i = p < .42 ? 0 : p < .65 ? 1 : 2;
    if (i !== capIdx) {
      capIdx = i;
      railcap.innerHTML = CAPS[i];
      railLabels.forEach((t, j) => t.style.fill = j === i ? '#FF0000' : '#8C877E');
    }
  };

  // 06 · four cities light up, then the sentence that held them together
  const cityBand = $('city-band');
  const cities = [...document.querySelectorAll('#cities span')];
  const cityLine = $('city-line');
  new IntersectionObserver((es, obs) => es.forEach(e => {
    if (!e.isIntersecting) return;
    cities.forEach((c, i) => setTimeout(() => c.classList.add('on'), 200 + i * 220));
    setTimeout(() => cityLine.classList.add('on'), 200 + cities.length * 220 + 200);
    obs.disconnect();
  }), { threshold: .45 }).observe(cityBand);

  // 07 · the money: $0.00B to $2.00B with the reader's scroll
  const moneyTrack = $('money-track');
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

  // one scroll loop drives every stage
  const bar = $('pg');
  const onScroll = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = clamp(scrollY / (total || 1), 0, 1) * 100 + '%';
    setForces(trackProg(forcesTrack));
    setCut(clamp(trackProg(cutTrack) / .94, 0, 1));
    setRail(trackProg(railsTrack));
    setMoney(trackProg(moneyTrack));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  // track heights give each stage its scroll room
  const tune = () => {
    const m = innerWidth < 700;
    forcesTrack.style.height = m ? '220vh' : '250vh';
    cutTrack.style.height = m ? '260vh' : '300vh';
    railsTrack.style.height = m ? '240vh' : '280vh';
    moneyTrack.style.height = m ? '240vh' : '280vh';
    stick();
  };
  tune();
  addEventListener('resize', () => { tune(); onScroll(); });
  addEventListener('load', tune);
  onScroll();

  // The band under the page — the phone's home-indicator strip — continues
  // whatever is actually at the foot of the screen, and it carries one of two
  // colours: white under the prose, black under the black closing sections.
  // It was pinned black for the whole page before, which is only true of the
  // last two screens and left a black bar under a white page for all the rest.
  // The change is a step, not a fade — the strip has no transition, so it
  // switches on the frame the thing under it does. Only the strip is painted:
  // the body is this page's own background and every prose section sits on it,
  // so blacking that out would take the whole case study with it.
  const safeBot = $('hm-safe-bot');
  const CLEAR = c => !c || c === 'transparent' || /^rgba\(0,\s*0,\s*0,\s*0\)$/.test(c);
  // A pixel in from the bottom edge, then up through the ancestors until
  // something actually paints: most sections are transparent and sit on the
  // page's own ground.
  const floorColour = () => {
    let el = document.elementFromPoint(Math.round(innerWidth / 2), innerHeight - 2), guard = 0;
    while (el && el !== document.documentElement && guard++ < 24) {
      // Inline background before computed: the inline one is the colour a
      // section is heading for, the computed one is whatever it is passing
      // through if it happens to be animating.
      const c = el.style.backgroundColor || getComputedStyle(el).backgroundColor;
      if (!CLEAR(c)) return c;
      el = el.parentElement;
    }
    return null;
  };
  let floorPaint = '';
  const paintFloor = () => {
    if (!safeBot) return;
    const c = floorColour();
    if (!c) return;
    const p = c.match(/\d+/g);
    // Two colours and nothing in between: a section's own tint never reaches
    // the phone's bar, however light or dark that section happens to be.
    const paint = !p || (p[0] * .299 + p[1] * .587 + p[2] * .114) > 140 ? '#ffffff' : '#000000';
    if (paint === floorPaint) return;
    floorPaint = paint;
    safeBot.style.background = paint;
  };
  let floorRaf = 0;
  const syncFloor = () => {
    if (floorRaf) return;
    floorRaf = requestAnimationFrame(() => { floorRaf = 0; paintFloor(); });
  };
  addEventListener('scroll', syncFloor, { passive: true });
  addEventListener('resize', syncFloor, { passive: true });
  paintFloor();


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
