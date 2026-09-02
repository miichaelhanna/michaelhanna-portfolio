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

  // the hero's date rule draws itself once the page is in
  requestAnimationFrame(() => $('hero').classList.add('in'));

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
  const ease = t => 1 - Math.pow(1 - t, 3);

  // 02 · the dial. Scroll sweeps the needle from "too slow" through the
  // zone the product had to live in, and out to "too fast" before it
  // settles back into the middle: the tension, then the resolution.
  const dialTrack = $('dial-track'), needle = $('needle'), dialRead = $('dial-read');
  const DIAL = [
    '<b>Onboarding this slow reads as legacy.</b> The shopper is gone before the first form field loads.',
    '<b>Zinia had to live here.</b> Light and fast enough to feel like a fintech, controlled enough to be a bank.',
    '<b>Approvals this fast lose the risk team.</b> And, eventually, the regulator.'
  ];
  let dialState = -1;
  const dialProg = $('dial-prog');
  const setDial = p => {
    dialProg.style.width = (p * 100) + '%';
    // 0 to .55: sweep 6% -> 94%; .55 to 1: return to 50% and hold
    const x = p < .55 ? 6 + ease(p / .55) * 88 : 94 - ease((p - .55) / .45) * 44;
    needle.style.left = x + '%';
    const s = x < 32 ? 0 : x > 68 ? 2 : 1;
    if (s !== dialState) {
      dialState = s;
      dialRead.innerHTML = DIAL[s];
      dialRead.classList.toggle('sweet', s === 1);
    }
  };

  // 03 · the fine print becomes the headline. Scroll fades the footnote
  // and prints the plan, one dated line at a time.
  const termsTrack = $('terms-track'), tVague = $('t-vague'), tLine = $('t-line');
  const tRows = [...document.querySelectorAll('#t-plan .row')];
  const termsProg = $('terms-prog');
  const setTerms = p => {
    termsProg.style.width = (p * 100) + '%';
    tVague.classList.toggle('off', p > .3);
    tRows.forEach((r, i) => r.classList.toggle('on', p > .36 + i * .12));
    const clear = p > .84;
    tLine.classList.toggle('on', clear);
    tLine.textContent = clear ? 'Crystal clear, upfront. Where they stayed' : 'Where users hesitated, then abandoned';
  };

  // 05 · the rollout ladder: each rung draws its rule as it passes the
  // reader's eye line, and its title comes into focus.
  const rungs = [...document.querySelectorAll('.rung')];
  const setLadder = () => {
    const line = innerHeight * .72;
    rungs.forEach(r => {
      const b = r.getBoundingClientRect();
      const p = clamp((line - b.top) / (b.height * .9), 0, 1);
      r.querySelector('.draw').style.width = (p * 100) + '%';
      r.classList.toggle('on', p > .45);
    });
  };

  // The sentence types itself onto the dark band, once, when it arrives.
  const pullTw = $('pull-tw'), pullLine = $('pull-line');
  if (pullTw) {
    const LINE = 'Trust is the new UX.';
    let typed = false;
    const type = () => {
      if (typed) return;
      typed = true;
      if (reduced) { pullTw.textContent = LINE; pullLine.classList.add('done'); return; }
      let i = 0;
      const step = () => {
        pullTw.textContent = LINE.slice(0, ++i);
        if (i < LINE.length) setTimeout(step, LINE[i - 1] === ' ' ? 140 : 70);
        else setTimeout(() => pullLine.classList.add('done'), 900);
      };
      setTimeout(step, 350);
    };
    new IntersectionObserver((es, obs) => es.forEach(e => {
      if (!e.isIntersecting) return;
      type(); obs.disconnect();
    }), { threshold: .5 }).observe($('pull-band'));
  }

  // 06 · proof. The three numbers count with scroll; then the markets grid
  // lights three live markets, then the sixteen the product was positioned for.
  const proofTrack = $('proof-track');
  const counts = [...document.querySelectorAll('[data-count]')];
  const mgrid = $('mgrid');
  const cells = [];
  for (let i = 0; i < 16; i++) { const c = document.createElement('i'); mgrid.appendChild(c); cells.push(c); }
  const mLive = $('m-live'), mNext = $('m-next');
  const fmt = (el, t) => {
    const target = +el.dataset.count, v = Math.round(target * t);
    el.textContent = el.dataset.fmt === 'm' ? (v / 1000000).toFixed(1) + 'M' : v.toLocaleString('en-US');
  };
  const setProof = p => {
    const c = ease(clamp(p / .5, 0, 1));
    counts.forEach(el => fmt(el, c));
    const live = Math.round(clamp((p - .45) / .2, 0, 1) * 3);
    const next = Math.round(clamp((p - .62) / .34, 0, 1) * 13);
    cells.forEach((cell, i) => {
      cell.classList.toggle('live', i < live);
      cell.classList.toggle('next', i >= 3 && i < 3 + next);
    });
    mLive.textContent = live;
    mNext.textContent = live === 3 ? 3 + next : 0;
  };

  // one scroll loop drives every stage
  const bar = $('pg');
  const onScroll = () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = clamp(scrollY / (total || 1), 0, 1) * 100 + '%';
    setDial(trackProg(dialTrack));
    setTerms(trackProg(termsTrack));
    setLadder();
    setProof(trackProg(proofTrack));
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });

  // track heights give each stage its scroll room
  const tune = () => {
    const m = innerWidth < 700;
    dialTrack.style.height = m ? '200vh' : '230vh';
    termsTrack.style.height = m ? '200vh' : '230vh';
    proofTrack.style.height = m ? '210vh' : '240vh';
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
