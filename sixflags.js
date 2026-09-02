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
  // each pinned block sticks below the nav, or anchors to the bottom of the
  // viewport when it is taller than the space, so its stage is always visible
  const stages = [...document.querySelectorAll('.stage-track .stage')];
  const stick = () => stages.forEach(st => {
    const nav = document.querySelector('nav').offsetHeight;
    st.style.setProperty('--stick', Math.min(nav + 16, innerHeight - st.offsetHeight - 12) + 'px');
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

  // 03 · the day. One sticky stage on desktop: the time line advances with
  // scroll, the sketch and the moment swap in step. On phones the time line
  // pins to the top and the moments flow beneath, each with its sketch.
  const dayTrack = $('day-track');
  const dlFill = $('dl-fill');
  const dots = [...document.querySelectorAll('.dl-dot')];
  const moments = [...document.querySelectorAll('.moment')];
  const sketches = [...document.querySelectorAll('.sketch')];
  const dayMobile = matchMedia('(max-width:860px)').matches;
  const setDots = (idx, fill) => {
    dlFill.style.width = (fill * 100) + '%';
    dots.forEach((d, i) => { d.classList.toggle('on', i <= idx); d.classList.toggle('now', i === idx); });
  };
  let setDay;
  if (dayMobile) {
    // pin the time line flush under the real nav, whatever its height
    const head = document.querySelector('.day-head');
    const pinHead = () => { head.style.top = (document.querySelector('nav').offsetHeight - 1) + 'px'; };
    pinHead();
    addEventListener('resize', pinHead);
    moments.forEach(m => {
      const sk = sketches[+m.dataset.scr];
      if (!sk) return;
      const card = document.createElement('div');
      card.className = 'dsheet inline';
      card.setAttribute('aria-hidden', 'true');
      sk.classList.add('is-on');
      card.appendChild(sk);
      m.insertBefore(card, m.firstChild);
    });
    setDay = () => {
      const line = innerHeight * .5;
      let idx = 0;
      moments.forEach((m, i) => { if (m.getBoundingClientRect().top < line) idx = i; });
      const n = moments.length;
      const m = moments[idx], r = m.getBoundingClientRect();
      const local = clamp((line - r.top) / Math.max(1, r.height), 0, 1);
      setDots(idx, (idx + local) / n);
    };
  } else {
    const dayText = $('day-text');
    const html = moments.map(m => m.innerHTML);
    let dIdx = -1;
    setDay = p => {
      const n = moments.length;
      const idx = Math.min(n - 1, Math.floor(clamp(p, 0, .999) * n));
      setDots(idx, p);
      if (idx === dIdx) return;
      const first = dIdx === -1;
      dIdx = idx;
      sketches.forEach(s => s.classList.toggle('is-on', +s.dataset.idx === idx));
      if (first) { dayText.innerHTML = html[idx]; return; }
      dayText.style.opacity = 0;
      setTimeout(() => { dayText.innerHTML = html[dIdx]; dayText.style.opacity = 1; }, 200);
    };
    setDay(0);
  }

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
    setDay(dayMobile ? 0 : trackProg(dayTrack));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  // track heights give each stage its scroll room
  const tune = () => {
    const m = innerWidth < 700;
    refTrack.style.height = m ? '240vh' : '280vh';
    inpTrack.style.height = m ? '320vh' : '360vh';
    countTrack.style.height = m ? '220vh' : '250vh';
    photoTrack.style.height = m ? '240vh' : '280vh';
    dayTrack.style.height = dayMobile ? '' : '520vh';
    stick();
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
  addEventListener('scroll', paintChrome, { passive: true });
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
