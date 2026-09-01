document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const stage = $('hm-stage'), intro = $('hm-intro'), work = $('hm-work'), lab = $('hm-lab');
  const abt = $('hm-about'), abtLeft = $('hm-abt-left'), abtName = $('hm-abtname'), big = $('hm-big');
  const abtCopy = $('hm-abt-copy'), abtHero = $('hm-abt-hero');
  const statFig = document.querySelector('#hm-abt-stat .st-fig'), statNum = $('hm-stat-num');
  const navAbout = $('hm-navabout'), navContact = $('hm-navcontact'), navWork = $('hm-navwork');
  const navRow = $('hm-nav');
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
      else el.style.color = dark ? 'rgba(255,255,255,.6)' : '#8a8a8a';
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
    el.style.color = dark ? 'rgba(245,245,247,.62)' : '#8a8a8a';
  });
  const setChromeFor = m => {
    setTheme(m === 'about' ? ABOUT_BG : m === 'lab' ? '#111' : '#ffffff');
    if (m !== 'about') { setChrome(m === 'lab'); return; }
    if (head) head.style.background = ABOUT_BG;
    navInk(true);
    document.querySelectorAll('[data-ch="name"]').forEach(el => { el.style.color = '#1a1a1a'; });
  };
  // While the curtain is crossing, the header steps out of the way so the wipe
  // edge runs through the top band too instead of stopping at a white bar.
  const headClear = () => { if (!head) return; head.style.transition = 'none'; head.style.background = 'transparent'; };
  // The nav is not in the middle of the screen, so flipping its ink at the
  // halfway mark leaves it the wrong colour — light on white — for a beat. Swap
  // it when the curtain edge actually reaches it instead.
  // The nav sits opposite the big wordmark. On the home landing the name is off
  // to the right and the header's left is empty, so the links move over to fill
  // it; once the name drops into the header — or on About, where the name is
  // already on the left — they go back to the right. The row keeps its layout
  // box either way and is only translated, so nothing reflows.
  let navDx = 0, navLeft = null;
  const measureNav = () => {
    if (!navRow || !head) return;
    const tf = navRow.style.transform, tr = navRow.style.transition;
    navRow.style.transition = 'none';
    navRow.style.transform = 'none';
    const padLeft = parseFloat(getComputedStyle(head).paddingLeft) || 0;
    navDx = Math.round(head.getBoundingClientRect().left + padLeft - navRow.getBoundingClientRect().left);
    navRow.style.transform = tf;
    void navRow.offsetWidth;
    navRow.style.transition = tr;
  };
  const placeNav = left => {
    if (!navRow || left === navLeft) return;
    navLeft = left;
    if (!left) { navRow.style.transform = 'translateX(0)'; return; }
    // Measure now rather than trusting the cached offset: the row is narrower on
    // About, where it holds only Work, so the distance to the left margin differs.
    measureNav();
    navRow.style.transform = 'translateX(' + navDx + 'px)';
  };

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
    const on = m === 'about';
    headName.style.display = on ? 'none' : '';
    navWork.style.textDecoration = on ? 'none' : 'underline';
    navAbout.style.textDecoration = on ? 'underline' : 'none';
    [navWork, navAbout].forEach(el => { el.style.textUnderlineOffset = '5px'; });
    navLeft = null;   // the row may have shifted, so any cached offset is stale
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
    if (m === 'lab') lab.scrollTo({ top: 0, behavior: 'instant' });
    if (m === 'intro') intro.scrollTo({ top: 0, behavior: 'instant' });
    if (m === 'about') { syncAbout(); abt.scrollTo({ top: 0, behavior: 'instant' }); }
    setMode(m);
    updateHead();
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
  const promote = on => [big, abtName].forEach(el => {
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
  };

  let navBusy = false;
  const toAbout = () => {
    if (navBusy || mode === 'about') return;
    navBusy = true;
    // The name can only travel if it is on screen to travel from. Deeper into
    // the page it is not, and yanking the scroll to the top first to make room
    // for it read as a redirect through the home screen before the About page
    // arrived. From down there the curtain runs on its own and the scroll is
    // left alone.
    const travel = intro.scrollTop < intro.clientHeight * .5;
    if (travel) intro.scrollTo({ top: 0, behavior: 'instant' });
    setT(false); resetHover(); headClear(); promote(true);
    syncAbout();
    abt.style.visibility = 'visible'; abt.style.opacity = 1;
    abt.style.pointerEvents = 'auto'; abt.style.zIndex = 4;
    const dx = travel ? big.getBoundingClientRect().left - abtName.getBoundingClientRect().left : 0;
    const cross = navCross(true);
    let swapped = false;
    const step = e => {
      abt.style.clipPath = 'inset(0 ' + ((1 - e) * 100).toFixed(3) + '% 0 0)';
      abtName.style.transform = 'translateX(' + (dx * (1 - e)) + 'px)';
      big.style.transform = 'translateX(' + (-dx * e) + 'px)';
      if (!swapped && e > cross) { swapped = true; paintNav('about'); navInk(true); placeNav(true); }
    };
    step(0);
    run(step).then(() => {
      abt.style.clipPath = 'none'; abt.style.zIndex = 3;
      headSettle('about');
      abtName.style.transform = ''; big.style.transform = ''; promote(false);
      shw(intro, false); shw(work, false); shw(lab, false);
      setMode('about');
      navBusy = false;
    });
  };

  // The same move played backwards: the name runs right, back to where the home
  // page keeps it, and the curtain comes in from the right behind it.
  const toHome = () => {
    if (navBusy || mode !== 'about') return;
    navBusy = true;
    setT(false); resetHover(); headClear(); promote(true);
    intro.scrollTo({ top: 0, behavior: 'instant' });
    syncAbout();
    shw(intro, true);
    intro.style.zIndex = 4;
    const dx = big.getBoundingClientRect().left - abtName.getBoundingClientRect().left;
    const cross = navCross(false);
    let swapped = false;
    const step = e => {
      intro.style.clipPath = 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(3) + '%)';
      big.style.transform = 'translateX(' + (-dx * (1 - e)) + 'px)';
      abtName.style.transform = 'translateX(' + (dx * e) + 'px)';
      if (!swapped && e > cross) { swapped = true; paintNav('intro'); navInk(false); placeNav(true); }
    };
    step(0);
    run(step).then(() => {
      intro.style.clipPath = 'none'; intro.style.zIndex = 2;
      headSettle('intro');
      big.style.transform = ''; abtName.style.transform = ''; promote(false);
      shw(abt, false);
      setMode('intro');
      updateHead();
      navBusy = false;
    });
  };

  const nav = t => {
    if (t === 'work') return mode === 'about' ? toHome() : showWork(false);
    if (t === 'about') return mode === 'intro' ? toAbout() : go('about');
    if (t === 'intro' && mode === 'about') return toHome();
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
      else el.style.color = onDark ? 'rgba(255,255,255,.65)' : '#8a8a8a';
    });
  };
  const headName = $('hm-headname');
  // The home page is one scroll now: the opening screen, then the work itself.
  // The header name appears once the opening screen is behind you.
  const updateHead = () => {
    const on = mode !== 'intro' || intro.scrollTop > intro.clientHeight * .35;
    headName.style.opacity = on ? 1 : 0;
    headName.style.pointerEvents = on ? 'auto' : 'none';
    // About keeps its single Work link on the left.
    placeNav(mode === 'about' || (mode === 'intro' && !on));
  };
  intro.addEventListener('scroll', () => requestAnimationFrame(() => {
    updateHead();
    if (mode === 'intro') paintChrome();
  }), { passive: true });

  // Work is a scroll position on the home page now, not a layer of its own.
  const showWork = instant => {
    if (mode !== 'intro') go('intro');
    intro.scrollTo({ top: work.offsetTop, behavior: instant ? 'instant' : 'smooth' });
    requestAnimationFrame(() => { updateHead(); paintChrome(); });
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
    measureNav();
    if (navLeft) navRow.style.transform = 'translateX(' + navDx + 'px)';
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
});
