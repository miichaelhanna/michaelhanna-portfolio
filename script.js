document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const stage = $('hm-stage'), intro = $('hm-intro'), work = $('hm-work'), lab = $('hm-lab');
  const abt = $('hm-about'), abtLeft = $('hm-abt-left'), abtName = $('hm-abtname'), big = $('hm-big');
  const abtCopy = $('hm-abt-copy'), abtHero = $('hm-abt-hero');
  const statFig = document.querySelector('#hm-abt-stat .st-fig'), statNum = $('hm-stat-num');
  const navAbout = $('hm-navabout'), navWork = $('hm-navwork'), navLab = $('hm-navlab');
  const labName = $('hm-labname'), labMark = $('hm-lab-mark'), labHero = $('hm-lab-hero');
  const hero = $('hm-hero');
  const touch = matchMedia('(hover:none)').matches;
  const layers = [intro, lab, abt];
  const shw = (el, on) => { el.style.opacity = on ? 1 : 0; el.style.visibility = on ? 'visible' : 'hidden'; el.style.pointerEvents = on ? 'auto' : 'none'; };
  const setT = on => layers.forEach(x => x.style.transition = on ? 'opacity .35s,visibility .35s' : 'none');
  const head = $('hm-head');
  const setChrome = dark => {
    if (head) head.style.background = dark ? '#111' : '#fff';
    document.querySelectorAll('[data-ch]').forEach(el => {
      if (el.dataset.ch === 'name') el.style.color = dark ? '#D7FF3F' : '#1a1a1a';
      else el.style.color = dark ? '#fff' : '#1a1a1a';
    });
  };
  const ABOUT_BG = '#0c0c0e';
  // Mobile browsers tint their chrome from this, so it has to follow the page
  // or the status bar reads as a mismatched band above a dark screen.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const setTheme = c => { if (themeMeta) themeMeta.setAttribute('content', c); };
  // The About page is dark, so the header has to follow it — but only the nav
  // ink: the [data-ch=name] rule must leave the home wordmark black, because the
  // two wordmarks are stacked on top of each other during the move.
  const navInk = dark => document.querySelectorAll('[data-ch="link"]').forEach(el => {
    el.style.color = dark ? '#fff' : '#1a1a1a';
  });
  const PAGE_BG = { about: ABOUT_BG, lab: '#3A5B85' };
  const setChromeFor = m => {
    setTheme(PAGE_BG[m] || '#ffffff');
    if (!PAGE_BG[m]) { setChrome(false); return; }
    if (head) head.style.background = PAGE_BG[m];
    navInk(true);
    document.querySelectorAll('[data-ch="name"]').forEach(el => { el.style.color = '#1a1a1a'; });
  };
  // While the curtain is crossing, the header steps out of the way so the wipe
  // edge runs through the top band too instead of stopping at a white bar.
  const headClear = () => { if (!head) return; head.style.transition = 'none'; head.style.background = 'transparent'; };
  // The nav is not in the middle of the screen, so flipping its ink at the
  // halfway mark leaves it the wrong colour — light on white — for a beat. Swap
  // it when the curtain edge actually reaches it instead.
  const navCross = fromLeft => {
    const r = navAbout.parentElement.getBoundingClientRect();
    const mid = (r.left + r.width / 2) / innerWidth;
    return fromLeft ? mid : 1 - mid;
  };
  const headSettle = m => { if (!head) return; setChromeFor(m); head.style.transition = 'background .3s'; };

  const resetHover = () => {
    setChrome(false);
    stage.style.background = '#fff';
    if (hero) hero.style.color = '';
  };
  let mode = 'intro';
  // The About page trades the whole nav for a single Work link — the big name is
  // already on the page, so the header repeat would just be saying it twice.
  // Work and About sit together on the left, Contact holds the right edge, on
  // every page. The page you are on is underlined rather than hidden, so the nav
  // never changes shape as you move between them.
  const paintNav = m => {
    const cur = { about: navAbout, lab: navLab }[m] || navWork;
    [navAbout, navWork, navLab].forEach(el => {
      el.style.textDecoration = el === cur ? 'underline' : 'none';
      el.style.textUnderlineOffset = '5px';
    });
  };
  const setMode = m => {
    mode = m;
    paintNav(m);
    try { history.replaceState(null, '', location.pathname + location.search + (m === 'intro' ? '' : '#' + m)); } catch (e) {}
  };
  const go = m => {
    setT(true); resetHover();
    setChromeFor(m);
    shw(intro, m === 'intro'); shw(lab, m === 'lab'); shw(abt, m === 'about');
    if (m === 'lab') { syncAbout(); lab.scrollTo({ top: 0, behavior: 'instant' }); }
    if (m === 'intro') intro.scrollTo({ top: 0, behavior: 'instant' });
    if (m === 'about') { syncAbout(); abt.scrollTo({ top: 0, behavior: 'instant' }); }
    setMode(m);
  };

  // Page moves lifted from alitwotimes.com: the name travels one straight
  // horizontal line at unchanged size while a hard-edged curtain wipes the
  // incoming page in from the side the name is heading for. Measured off the
  // real thing — 1.5s on an expo in-out, so it is almost still at both ends and
  // quick through the middle. Both names are tweened together, which puts them
  // at the same screen x every frame: what you see is one name changing colour
  // as the curtain edge crosses it.
  const NAV_MS = 1500;
  const expoIO = p => p <= 0 ? 0 : p >= 1 ? 1
    : p < .5 ? Math.pow(2, 20 * p - 10) / 2
             : (2 - Math.pow(2, -20 * p + 10)) / 2;
  const still = matchMedia('(prefers-reduced-motion:reduce)');
  // will-change is a hint for the duration of an animation, not a permanent
  // setting. Left on, it keeps both wordmarks on their own compositor layers for
  // the life of the page — and on iOS a promoted layer inside an overflow
  // scroller can be composited out of step with the content, so the name appears
  // to hang in place while the page slides past it. Promote for the tween only.
  // Home centres "Hanna" under "Michael"; About runs it flush left. Left alone
  // that makes the two wordmarks different shapes, and the second line would jump
  // sideways the instant the curtain edge crossed it. Both second lines are
  // tweened to the same place every frame instead, so it slides into its new
  // alignment as part of the move.
  const l2Of = h => {
    const l2 = h && h.querySelector('.wm-l2');
    if (!l2 || !h) return 0;
    const keep = l2.style.transform;
    l2.style.transform = 'none';
    const o = Math.round(l2.getBoundingClientRect().left - h.getBoundingClientRect().left);
    l2.style.transform = keep;
    return o;
  };
  const l2Set = (h, x) => {
    const l2 = h && h.querySelector('.wm-l2');
    if (l2) l2.style.transform = x == null ? '' : 'translateX(' + x + 'px)';
  };
  const promote = (other, on) => [big, other].forEach(el => {
    if (el) el.style.willChange = on ? 'transform' : '';
  });
  const tween = (ms, step) => new Promise(done => {
    const t0 = performance.now();
    const frame = t => {
      const p = Math.min(1, (t - t0) / ms);
      step(expoIO(p));
      p < 1 ? requestAnimationFrame(frame) : done();
    };
    requestAnimationFrame(frame);
  });
  const run = step => still.matches
    ? Promise.resolve().then(() => step(1))
    : tween(NAV_MS, step);

  // The About name hangs off the home name's height, so the travel is level.
  // hm-big's viewport top plus the intro's scroll is its y with the intro at 0.
  const syncAbout = () => {
    if (!abtLeft || !big) return;
    const top = Math.round(big.getBoundingClientRect().top + intro.scrollTop);
    abtLeft.style.top = top + 'px';
    if (!abtCopy || !abtHero) return;
    // Beside the name on a desktop, under it on a phone — either way the top is
    // measured off what it follows rather than guessed, and the hero grows to
    // hold whichever column runs longer.
    const stacked = innerWidth <= 900;
    const copyTop = stacked ? top + abtLeft.offsetHeight + Math.round(innerHeight * .04) : top;
    abtCopy.style.top = copyTop + 'px';
    // The hero used to be pinned to a full viewport, which parked the reach band
    // exactly on the fold with nothing showing. Instead it is only as tall as it
    // needs to be, and where the copy leaves room the height is set so the top
    // of the figure sits PEEK pixels above the fold — the number is visibly cut
    // off, so it reads as something to scroll to.
    const PEEK = 88;
    const bottom = Math.max(top + abtLeft.offsetHeight, copyTop + abtCopy.offsetHeight);
    const floor = bottom + Math.round(innerHeight * .035);
    const wanted = statFig ? innerHeight - PEEK - statFig.offsetTop : innerHeight;
    abtHero.style.minHeight = Math.max(floor, wanted) + 'px';
    // After Hours carries the same wordmark at the same height, so its move is
    // level too; the hero below it is only as tall as the name needs.
    if (labMark && labHero) {
      labMark.style.top = top + 'px';
      labHero.style.minHeight = (top + labMark.offsetHeight + Math.round(innerHeight * .07)) + 'px';
    }
  };

  // One move, three pages. About enters from the left, After Hours from the
  // right; the name travels between wherever the two pages keep it, and the
  // second line slides between their alignments. Nothing here is per-page except
  // the entries in this table.
  const PAGES = {
    about: { layer: abt, name: abtName, fromLeft: true },
    lab:   { layer: lab, name: labName, fromLeft: false }
  };
  const wipe = (fromLeft, e) => fromLeft
    ? 'inset(0 ' + ((1 - e) * 100).toFixed(3) + '% 0 0)'
    : 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(3) + '%)';

  let navBusy = false;
  const enter = key => {
    const pg = PAGES[key];
    if (navBusy || !pg || mode === key) return;
    navBusy = true;
    // The name can only travel if it is on screen to travel from. Deeper into
    // the page it is not, and yanking the scroll to the top first read as a
    // detour through the home screen, so from down there the curtain runs alone.
    const travel = intro.scrollTop < intro.clientHeight * .5;
    if (travel) intro.scrollTo({ top: 0, behavior: 'instant' });
    setT(false); resetHover(); headClear(); promote(pg.name, true);
    syncAbout();
    pg.layer.style.visibility = 'visible'; pg.layer.style.opacity = 1;
    pg.layer.style.pointerEvents = 'auto'; pg.layer.style.zIndex = 4;
    pg.layer.scrollTop = 0;
    const dx = travel ? big.getBoundingClientRect().left - pg.name.getBoundingClientRect().left : 0;
    const cross = navCross(pg.fromLeft);
    const oH = l2Of(big), oP = l2Of(pg.name);
    let swapped = false;
    const step = e => {
      const P = oH + (oP - oH) * e;
      l2Set(big, P - oH); l2Set(pg.name, P - oP);
      pg.layer.style.clipPath = wipe(pg.fromLeft, e);
      pg.name.style.transform = 'translateX(' + (dx * (1 - e)) + 'px)';
      big.style.transform = 'translateX(' + (-dx * e) + 'px)';
      if (!swapped && e > cross) { swapped = true; paintNav(key); navInk(true); }
    };
    step(0);
    run(step).then(() => {
      pg.layer.style.clipPath = 'none'; pg.layer.style.zIndex = 3;
      headSettle(key);
      pg.name.style.transform = ''; big.style.transform = '';
      l2Set(big, null); l2Set(pg.name, null); promote(pg.name, false);
      shw(intro, false);
      Object.keys(PAGES).forEach(k => { if (k !== key) shw(PAGES[k].layer, false); });
      setMode(key);
      navBusy = false;
    });
  };

  // The same move played backwards: the name returns to where the home page
  // keeps it and the curtain comes in from the opposite side.
  const leave = () => {
    const pg = PAGES[mode];
    if (navBusy || !pg) return;
    navBusy = true;
    setT(false); resetHover(); headClear(); promote(pg.name, true);
    intro.scrollTo({ top: 0, behavior: 'instant' });
    syncAbout();
    shw(intro, true);
    intro.style.zIndex = 4;
    const dx = big.getBoundingClientRect().left - pg.name.getBoundingClientRect().left;
    const cross = navCross(!pg.fromLeft);
    const oH = l2Of(big), oP = l2Of(pg.name);
    let swapped = false;
    const step = e => {
      const P = oP + (oH - oP) * e;
      l2Set(big, P - oH); l2Set(pg.name, P - oP);
      intro.style.clipPath = wipe(!pg.fromLeft, e);
      big.style.transform = 'translateX(' + (-dx * (1 - e)) + 'px)';
      pg.name.style.transform = 'translateX(' + (dx * e) + 'px)';
      if (!swapped && e > cross) { swapped = true; paintNav('intro'); navInk(false); }
    };
    step(0);
    run(step).then(() => {
      intro.style.clipPath = 'none'; intro.style.zIndex = 2;
      headSettle('intro');
      big.style.transform = ''; pg.name.style.transform = '';
      l2Set(big, null); l2Set(pg.name, null); promote(pg.name, false);
      shw(pg.layer, false);
      setMode('intro');
      navBusy = false;
    });
  };

  const nav = t => {
    if (t === 'work') return PAGES[mode] ? leave() : showWork(false);
    if (t === 'intro') return PAGES[mode] ? leave() : go('intro');
    if (PAGES[t]) return mode === 'intro' ? enter(t) : go(t);
    go(t);
  };
  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => nav(el.dataset.go)));

  // Header sits over whichever section is scrolled under it, so it flips to
  // light type only while a section marked [data-dark] is behind it.
  const darkSecs = [...work.querySelectorAll('[data-dark]')];
  const HEAD_Y = 40;
  let wasDark = null;
  const paintChrome = () => {
    const y = intro.scrollTop + HEAD_Y;
    const onDark = darkSecs.some(s => y >= s.offsetTop && y <= s.offsetTop + s.offsetHeight);
    if (onDark === wasDark) return;
    wasDark = onDark;
    if (head) head.style.background = onDark ? '#0c0c0e' : '#fff';
    document.querySelectorAll('[data-ch]').forEach(el => {
      if (el.dataset.ch === 'name') el.style.color = onDark ? '#f5f5f7' : '#1a1a1a';
      else el.style.color = onDark ? '#fff' : '#1a1a1a';
    });
  };
  intro.addEventListener('scroll', () => requestAnimationFrame(() => {
    if (mode === 'intro') paintChrome();
  }), { passive: true });

  // Work is a scroll position on the home page now, not a layer of its own.
  const showWork = instant => {
    if (mode !== 'intro') go('intro');
    intro.scrollTo({ top: work.offsetTop, behavior: instant ? 'instant' : 'smooth' });
    requestAnimationFrame(paintChrome);
  };

  // One gesture moves one section. Mandatory snapping alone isn't enough: a
  // short scroll lands below the halfway mark and springs straight back, so the
  // page feels sticky. Stepping section-to-section makes every scroll land.
  // Only the opening screen steps. Past it the work sections scroll normally —
  // they are shorter than the viewport, and snapping those fights the gesture.
  let sectionLock = false;
  intro.addEventListener('wheel', e => {
    if (mode !== 'intro' || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const h = intro.clientHeight, y = intro.scrollTop;
    if (y > h - 2) return;
    if (y <= 0 && e.deltaY < 0) return;
    e.preventDefault();
    if (sectionLock || Math.abs(e.deltaY) < 6) return;
    sectionLock = true;
    intro.scrollTo({ top: e.deltaY > 0 ? h : 0, behavior: 'smooth' });
    setTimeout(() => { sectionLock = false; }, 620);
  }, { passive: false });

  const tune = () => {
    syncAbout();
  };
  addEventListener('resize', tune);
  tune();

  // Footer wordmark: sized to span the full width and sit flush on the bottom
  // edge. Both numbers are measured at runtime rather than hardcoded — the type
  // is a system font, so its width-per-em and the gap under the letters differ
  // between platforms.
  const mark = document.querySelector('.wf-mark');
  const fitMark = () => {
    if (!mark || !mark.parentElement) return;
    const avail = mark.parentElement.clientWidth;
    if (!avail) return;

    // width: measure the TEXT, not the box — the span is display:block, so its
    // own width is just the container's and scaling against it does nothing.
    // A Range around the text nodes gives the real inline width.
    mark.style.fontSize = '100px';
    const range = document.createRange();
    range.selectNodeContents(mark);
    const w = range.getBoundingClientRect().width;
    if (!w) return;
    mark.style.fontSize = (100 * avail / w) + 'px';

    // bottom: pull the box down by the gap between the letters and its lower edge
    const cs = getComputedStyle(mark);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(mark.textContent);
    const F = parseFloat(cs.fontSize);
    const halfLead = (F - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    const gap = F - (halfLead + m.fontBoundingBoxAscent) - m.actualBoundingBoxDescent;
    mark.style.marginBottom = (-gap / F).toFixed(4) + 'em';
  };
  fitMark();
  addEventListener('resize', fitMark);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMark);

  // Reach band. The figure is fitted to the column off its FINAL string, so the
  // type size is settled before a single digit is drawn — otherwise the number
  // would resize itself on the way up. Tabular figures keep the digits from
  // shuffling, and the right edge stays put while the number grows leftward.
  const STAT_TO = 12;
  const fitStat = () => {
    if (!statFig || !statNum) return;
    const avail = statFig.clientWidth;
    if (!avail) return;
    // Measure the whole line — number plus the word — at its final value.
    const keep = statNum.textContent;
    statNum.textContent = String(STAT_TO);
    statFig.style.fontSize = '100px';
    const range = document.createRange();
    range.selectNodeContents(statFig);
    const w = range.getBoundingClientRect().width;
    if (w) statFig.style.fontSize = (100 * avail / w) + 'px';
    statNum.textContent = keep;
  };

  let statRun = false;
  const runStat = () => {
    if (statRun || !statNum) return;
    statRun = true;
    if (still.matches) { statNum.textContent = String(STAT_TO); return; }
    // Only twelve steps to play with, so the easing stays gentle — a hard
    // ease-out would spend most of the run parked on 12.
    const D = 1600, t0 = performance.now();
    const out = p => 1 - Math.pow(1 - p, 2);
    const frame = t => {
      const p = Math.min(1, (t - t0) / D);
      statNum.textContent = String(Math.round(STAT_TO * out(p)));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  if (statFig) {
    fitStat();
    addEventListener('resize', fitStat);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStat);
    if (typeof IntersectionObserver === 'undefined') runStat();
    else new IntersectionObserver((es, o) => {
      es.forEach(e => { if (e.isIntersecting) { runStat(); o.disconnect(); } });
    }, { root: abt, threshold: .8 }).observe(statFig);
  }

  // The bench: cards tilt and sink with their distance from the middle of the
  // rail, and straighten as one arrives. Driven off the rail's own scroll, so
  // trackpad, swipe, drag and keyboard all feed the same thing.
  const bench = $('hm-bench');
  if (bench) {
    const cards = [...bench.querySelectorAll('.wb-card')];
    const lay = () => {
      const r = bench.getBoundingClientRect();
      if (!r.width) return;
      const mid = r.left + r.width / 2;
      cards.forEach((c, i) => {
        const b = c.getBoundingClientRect();
        const d = Math.max(-1, Math.min(1, (b.left + b.width / 2 - mid) / (r.width / 2)));
        const a = Math.abs(d);
        c.style.transform = 'translateY(' + (a * 16).toFixed(1) + 'px) rotate(' +
                            ((i % 2 ? 1.9 : -2.4) * a).toFixed(2) + 'deg)';
        c.style.opacity = (1 - a * .3).toFixed(3);
      });
    };
    bench.addEventListener('scroll', () => requestAnimationFrame(lay), { passive: true });
    addEventListener('resize', lay);
    lay();

    // A horizontal scrollbar is a poor handle on a desktop, so the rail drags.
    // Touch is left alone: the browser already does this better than script can.
    let down = false, sx = 0, sl = 0;
    bench.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      down = true; sx = e.clientX; sl = bench.scrollLeft;
      bench.classList.add('is-drag');
      bench.setPointerCapture(e.pointerId);
    });
    bench.addEventListener('pointermove', e => { if (down) bench.scrollLeft = sl - (e.clientX - sx); });
    const release = () => { down = false; bench.classList.remove('is-drag'); };
    bench.addEventListener('pointerup', release);
    bench.addEventListener('pointercancel', release);
  }

  const mq = $('hm-mq');
  if (mq) mq.style.animation = 'mq 10s linear infinite';

  const h = (location.hash || '').replace('#', '');
  if (h === 'lab' || h === 'about') go(h);
  else {
    go('intro');
    if (h === 'work') {
      showWork(true);
      try { history.replaceState(null, '', location.pathname + location.search + '#work'); } catch (e) {}
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncAbout);

  // Work footer's headline word alternates between what someone might be
  // reaching out for.
  const ctaWord = $('hm-cta-word');
  if (ctaWord) {
    const words = ['idea.', 'hire.'];
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

  // The ID card's clock appears twice (About page + Work footer), so every
  // tick updates all instances rather than one element by id. Madrid's
  // CET/CEST label is derived from the actual UTC offset, not hard-coded, so
  // it keeps up with DST on its own.
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
