document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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

  // Stage · what we designed from: render, site, steel
  const refTrack = $('ref-track');
  const refImgs = [...document.querySelectorAll('[data-ri]')];
  const refNo = $('ref-no'), refTxt = $('ref-txt');
  const REF = [
    '<b>The render.</b> Six lands, a tented Citadel, a coaster diving off a cliff. For most of the project, this was the ground truth.',
    '<b>What was actually there.</b> The site, changing weekly. Every path on our map was a promise someone else still had to keep.',
    '<b>The headline ride.</b> Falcons Flight mid-assembly. By the time the app work ran, it stood complete; its booking rules were written before it had ever carried a guest.'
  ];
  let refIdx = -1;
  const refProg = $('ref-prog');
  // phases come from the images that actually loaded, so a missing photo
  // drops its caption instead of leaving an empty frame in the sequence
  const setRef = p => {
    refProg.style.width = (p * 100) + '%';
    const avail = refImgs.filter(img => img.style.display !== 'none');
    if (!avail.length) return;
    const step = Math.min(avail.length - 1, Math.floor(clamp(p, 0, .999) * avail.length));
    const ri = +avail[step].dataset.ri;
    if (ri === refIdx) return;
    refIdx = ri;
    refImgs.forEach(img => img.classList.toggle('on', +img.dataset.ri === ri));
    refNo.textContent = '0' + (ri + 1) + ' / 03';
    refTxt.innerHTML = REF[ri];
  };

  // Stage · the missing inputs: each loses its source, one at a time
  const inpTrack = $('inp-track');
  // Every line here is backed by a sentence in the case text.
  const INPUTS = [
    { i: 'Walking distances', n: 'Walked and timed on the ground', b: 'Read off plans and models, three thousand kilometres away' },
    { i: 'Queue times', n: 'Observed, ride by ride', b: 'A model with a date attached' },
    { i: 'Crowd flow', n: 'Watched where people stop and linger', b: 'Modelled. No crowd had ever crossed the park' },
    { i: 'Demand', n: 'Years of history to forecast from', b: 'Zero operating days of demand history' },
    { i: 'Ride capacity', n: 'Learned from real throughput', b: 'Engineered capacity, before any ride had carried a guest' },
    { i: 'The park itself', n: 'Open, running, observable', b: 'Sealed for commissioning, coasters cycling with nobody in the seats' }
  ];
  const inpCount = $('inp-count'), inpName = $('inp-name'), inpNorm = $('inp-norm'),
        inpOver = $('inp-over'), inpHere = $('inp-here'), inpProg = $('inp-prog');
  let inpIdx = -1;
  const setInp = p => {
    const n = INPUTS.length;
    const idx = Math.min(n - 1, Math.floor(p * n));
    const local = clamp(p * n - idx, 0, 1);
    if (idx !== inpIdx) {
      inpIdx = idx;
      const f = INPUTS[idx];
      inpCount.textContent = 'Input ' + (idx + 1) + ' of ' + n;
      inpName.textContent = f.i;
      inpNorm.textContent = f.n;
      inpOver.textContent = f.n;
      inpHere.textContent = f.b;
    }
    inpOver.style.setProperty('--w', (clamp((local - .25) / .3, 0, 1) * 100) + '%');
    inpHere.classList.toggle('on', local > .5);
    inpProg.style.width = (p * 100) + '%';
  };

  // 03 · the day. One sticky stage, on every screen: the time line advances
  // with the reader's scroll, and the sketch and the moment swap in step. The
  // phone used to stack all six moments instead, which made one section six
  // screens long; scrolling is the only input either way, so the stage simply
  // gets a shorter track there (see tune) and lays itself out in one column.
  const dayTrack = $('day-track');
  const dlFill = $('dl-fill');
  const dots = [...document.querySelectorAll('.dl-dot')];
  const moments = [...document.querySelectorAll('.moment')];
  const sketches = [...document.querySelectorAll('.sketch')];
  const dayStage = document.querySelector('.day-stage');
  const dayPanel = document.querySelector('.day-panel');
  const setDots = (idx, fill) => {
    dlFill.style.width = (fill * 100) + '%';
    dots.forEach((d, i) => { d.classList.toggle('on', i <= idx); d.classList.toggle('now', i === idx); });
  };
  const dayText = $('day-text');
  const html = moments.map(m => m.innerHTML);
  let dIdx = -1, dSwap = 0;
  const setDay = p => {
    const n = moments.length;
    const idx = Math.min(n - 1, Math.floor(clamp(p, 0, .999) * n));
    setDots(idx, p);
    if (idx === dIdx) return;
    const first = dIdx === -1;
    dIdx = idx;
    sketches.forEach(s => s.classList.toggle('is-on', +s.dataset.idx === idx));
    if (first) { dayText.innerHTML = html[idx]; return; }
    // A fast scroll crosses several moments before the fade finishes. Without
    // dropping the pending swap, the one that lands last wins and the panel
    // settles on a moment the time line has already left behind.
    clearTimeout(dSwap);
    dayText.style.opacity = 0;
    dSwap = setTimeout(() => { dayText.innerHTML = html[dIdx]; dayText.style.opacity = 1; }, 200);
  };
  setDay(0);

  // One column on a phone stands taller than the room under the nav. Where it
  // does, the stage anchors by its bottom instead, so the whole of it is on
  // screen rather than trailing off the end. The pin is measured against the
  // LONGEST moment, once, so it does not shift as the moments swap under it.
  const dayPin = () => {
    const keep = dayText.innerHTML;
    let tallest = 0;
    html.forEach(h => { dayText.innerHTML = h; tallest = Math.max(tallest, dayPanel.offsetHeight); });
    dayText.innerHTML = keep;
    const ih = viewH(), top = document.querySelector('nav').offsetHeight + 12;
    if (tallest <= ih - top - 12) { dayStage.style.removeProperty('--day-stick'); return; }
    dayStage.style.setProperty('--day-stick', Math.max(4, Math.min(top, ih - tallest - 12)) + 'px');
  };

  // 04 · the countdown: T−47 to T−0 with the reader's scroll; each public
  // date lights at its day; zero is the first colour on the page.
  const countTrack = $('count-track');
  const tminus = $('tminus'), tnum = $('tnum'), countLine = $('count-line');
  const cdates = [...document.querySelectorAll('.cdate')];
  const countProg = $('count-prog');
  const setCount = p => {
    countProg.style.width = (p * 100) + '%';
    const q = clamp((p - .08) / .72, 0, 1);
    const day = Math.round(47 * (1 - q));
    tnum.textContent = day;
    tminus.classList.toggle('zero', day === 0);
    cdates.forEach(d => d.classList.toggle('on', day <= +d.dataset.day));
    countLine.classList.toggle('on', p > .86);
  };

  // The park, real at last: dusk, then night, then the opening ceremony,
  // while the records stamp on one by one.
  const photoTrack = $('photo-track');
  const photoCap = $('photo-cap');
  const pimgs = [...document.querySelectorAll('[data-pi]')];
  const recs = [...document.querySelectorAll('.rec')];
  const PCAPS = [
    'December 31, 2025 · the park, real at last',
    'Opening night · six lands, lit for the first time',
    'The sky over the Citadel said the rest'
  ];
  let photoIdx = 0;
  const photoProg = $('photo-prog');
  const setPhoto = p => {
    photoProg.style.width = (p * 100) + '%';
    const avail = pimgs.filter(img => img.style.display !== 'none');
    const step = Math.min(avail.length - 1, Math.floor(clamp(p, 0, .999) * avail.length));
    const pi = +avail[step].dataset.pi;
    if (pi !== photoIdx) {
      photoIdx = pi;
      pimgs.forEach(img => img.classList.toggle('on', +img.dataset.pi === pi));
      photoCap.textContent = PCAPS[pi];
    }
    recs.forEach((r, i) => r.classList.toggle('on', p > .3 + i * .07));
  };

  // one scroll loop drives every stage
  const bar = $('pg');
  const onScroll = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = clamp(scrollY / (total || 1), 0, 1) * 100 + '%';
    setRef(trackProg(refTrack));
    setInp(trackProg(inpTrack));
    setCount(trackProg(countTrack));
    setPhoto(trackProg(photoTrack));
    setDay(trackProg(dayTrack));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  // track heights give each stage its scroll room
  const tune = () => {
    const m = innerWidth < 700;
    refTrack.style.height = m ? '240vh' : '280vh';
    inpTrack.style.height = m ? '320vh' : '360vh';
    countTrack.style.height = m ? '220vh' : '250vh';
    photoTrack.style.height = m ? '240vh' : '280vh';
    dayTrack.style.height = m ? '420vh' : '520vh';
    stick();
    dayPin();
  };
  tune();
  addEventListener('resize', () => { tune(); onScroll(); });
  addEventListener('load', tune);
  onScroll();

  // iOS bottom band follows whichever section sits at the bottom edge,
  // same treatment as the home page.
  const darkSecs = [...document.querySelectorAll('[data-dark]')];
  const safeBot = $('hm-safe-bot');
  let wasBotDark = null;
  const paintChrome = () => {
    const seen = window.visualViewport ? Math.min(window.visualViewport.height, innerHeight) : innerHeight;
    // Sample just inside the page's last pixel when the bottom edge has run
    // past it: iOS rubber-bands beyond the end of the document, the footer's
    // bottom lifts above the edge for that moment, and the last scroll event
    // of the bounce could leave the band painted white under a black footer.
    const docBottom = document.documentElement.getBoundingClientRect().bottom;
    const y = Math.min(seen - 8, docBottom - 1);
    const botDark = darkSecs.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    if (botDark === wasBotDark) return;
    wasBotDark = botDark;
    const c = botDark ? '#000000' : '#ffffff';
    document.documentElement.style.background = c;
    document.body.style.background = c;
    if (safeBot) safeBot.style.background = c;
  };
  // Re-read once the scroll has settled too, so the band always ends on
  // what is actually under the bottom edge, whatever the last event saw.
  let settle = 0;
  addEventListener('scroll', () => { paintChrome(); clearTimeout(settle); settle = setTimeout(paintChrome, 140); }, { passive: true });
  addEventListener('resize', () => { wasBotDark = null; paintChrome(); });
  paintChrome();


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
