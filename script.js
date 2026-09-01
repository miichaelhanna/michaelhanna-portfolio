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
  // iOS Safari tints its two chrome bands from two different sources, and this
  // site defeats the automatic one: the body never scrolls (pages are layers
  // with their own overflow scrollers inside a fixed stage), so Safari can't
  // sample the content behind its bars. The status bar follows the theme-color
  // meta — that has to match whatever is under the header. The bottom search
  // bar blends from the document's own background — that has to match whatever
  // is at the bottom of the viewport. Mid-scroll on the home page those are
  // different colours (white "Trusted by" up top, black CTA band below), so
  // the two are set independently.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const setChromeTop = c => { if (themeMeta) themeMeta.setAttribute('content', c); };
  const setChromeBottom = c => {
    document.documentElement.style.background = c;
    document.body.style.background = c;
  };
  const setTheme = c => { setChromeTop(c); setChromeBottom(c); };
  // The About page is dark, so the header has to follow it — but only the nav
  // ink: the [data-ch=name] rule must leave the home wordmark black, because the
  // two wordmarks are stacked on top of each other during the move.
  const navInk = dark => document.querySelectorAll('[data-ch="link"]').forEach(el => {
    el.style.color = dark ? '#fff' : '#1a1a1a';
  });
  const PAGE_BG = { about: ABOUT_BG, lab: '#3A5B85' };
  const setChromeFor = m => {
    setTheme(PAGE_BG[m] || '#ffffff');
    // Landing back on home mid-scroll (the curtain-only return from deep in
    // the page) must re-derive both bars from the actual scroll position —
    // the flat white set above is only right at the top.
    if (!PAGE_BG[m]) { setChrome(false); wasDark = null; wasBotDark = null; paintChrome(); return; }
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
  //
  // The tween used to be a requestAnimationFrame loop writing style.transform
  // and style.clipPath every frame. Chrome rendered that fine; Safari did not —
  // WebKit composites per-frame JS style writes out of step with each other, so
  // the curtain moved while both names sat frozen at their resting positions,
  // reading as two misaligned copies of the wordmark. Driving the same
  // keyframes through the Web Animations API hands the whole tween to the
  // browser's own animation engine, which every engine keeps in sync.
  const NAV_MS = 1500;
  // The same expo in-out shape the rAF loop computed, as a bezier the
  // animation engine understands.
  const NAV_EASE = 'cubic-bezier(0.87, 0, 0.13, 1)';
  const expoIO = p => p <= 0 ? 0 : p >= 1 ? 1
    : p < .5 ? Math.pow(2, 20 * p - 10) / 2
             : (2 - Math.pow(2, -20 * p + 10)) / 2;
  // When the eased progress passes a given fraction of the screen — solved
  // numerically since the curve doesn't invert in closed form. Used to fire
  // the nav ink swap at the moment the curtain edge actually crosses the nav.
  const timeAtProgress = target => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (expoIO(mid) < target) lo = mid; else hi = mid;
    }
    return ((lo + hi) / 2) * NAV_MS;
  };
  const still = matchMedia('(prefers-reduced-motion:reduce)');
  // Home centres "Hanna" under "Michael"; About runs both flush left. Left
  // alone that makes the two wordmarks different shapes, and the second line
  // would jump sideways the instant the curtain edge crossed it. Both second
  // lines are tweened to the same place instead, so the line slides into its
  // new alignment as part of the move.
  const l2El = h => h && h.querySelector('.wm-l2');
  const l2Of = h => {
    const l2 = l2El(h);
    if (!l2 || !h) return 0;
    const keep = l2.style.transform;
    l2.style.transform = 'none';
    const o = Math.round(l2.getBoundingClientRect().left - h.getBoundingClientRect().left);
    l2.style.transform = keep;
    return o;
  };
  // One WAAPI animation per moving part, all sharing duration + easing so
  // they stay in lockstep. Resolves when the set finishes; the caller then
  // commits final styles and cancels the animations.
  const animateNav = parts => {
    const opts = { duration: still.matches ? 0 : NAV_MS, easing: NAV_EASE, fill: 'forwards' };
    const anims = parts
      .filter(([el]) => el)
      .map(([el, prop, fromV, toV]) => el.animate([{ [prop]: fromV }, { [prop]: toV }], opts));
    return Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => anims);
  };

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

  // One move, any pair of pages. Home sits in the middle; About lives to its
  // left and After Hours to its right, and each always wipes in from that
  // same fixed side no matter where you're travelling from — so home<->about,
  // home<->lab, and a direct about<->lab hop all read as one consistent room
  // to move through, not three different effects. The name travels between
  // wherever the two pages keep it, and the second line slides between their
  // alignments. PAGES is kept as an alias for the non-home entries, since
  // that's the set several checks below only care about.
  const NODES = {
    intro: { layer: intro, name: big },
    about: { layer: abt, name: abtName, fromLeft: true },
    lab:   { layer: lab, name: labName, fromLeft: false }
  };
  const PAGES = { about: NODES.about, lab: NODES.lab };
  const wipe = (fromLeft, e) => fromLeft
    ? 'inset(0 ' + ((1 - e) * 100).toFixed(3) + '% 0 0)'
    : 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(3) + '%)';

  let navBusy = false;
  // The wordmark's Archivo Black loads with font-display:swap, so a click that
  // lands before it's in risks measuring dx/l2Of against the fallback font's
  // metrics; if the swap then lands mid-tween, the two names reflow to
  // different widths independently and the wipe shows two misaligned copies
  // instead of one. document.fonts.ready alone isn't enough — WebKit has been
  // seen resolving it a frame or two before the swapped font is actually
  // painted, so Safari still hit this after Chrome stopped. Two more rAFs
  // after the promise settles gives that repaint somewhere to land before
  // anything below measures a rect.
  const nextPaint = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const whenFontsReady = async fn => {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    await nextPaint();
    fn();
  };
  const travelTo = toKey => {
    const from = NODES[mode], to = NODES[toKey];
    if (navBusy || !to || !from || toKey === mode) return;
    navBusy = true;
    whenFontsReady(() => {
    // The name can only travel if it is on screen to travel from. Deeper into
    // the page it is not, and yanking the scroll to the top first read as a
    // detour, so from down there the curtain runs alone.
    const travel = from.layer.scrollTop < from.layer.clientHeight * .5;
    if (travel) from.layer.scrollTo({ top: 0, behavior: 'instant' });
    setT(false); resetHover(); headClear();
    syncAbout();
    to.layer.style.visibility = 'visible'; to.layer.style.opacity = 1;
    to.layer.style.pointerEvents = 'auto'; to.layer.style.zIndex = 4;
    to.layer.scrollTop = 0;
    const dx = travel ? from.name.getBoundingClientRect().left - to.name.getBoundingClientRect().left : 0;
    // Arriving somewhere uses that page's own fixed side; arriving back home
    // reverses whichever side is being left.
    const fromLeft = toKey === 'intro' ? !from.fromLeft : to.fromLeft;
    const oH = l2Of(from.name), oP = l2Of(to.name);
    // Nav ink swaps when the curtain edge actually reaches the nav, not at a
    // fixed halfway mark.
    const inkAt = setTimeout(() => { paintNav(toKey); navInk(toKey !== 'intro'); },
      still.matches ? 0 : timeAtProgress(navCross(fromLeft)));
    animateNav([
      [to.layer, 'clipPath', wipe(fromLeft, 0), wipe(fromLeft, 1)],
      [to.name, 'transform', 'translateX(' + dx + 'px)', 'translateX(0px)'],
      [from.name, 'transform', 'translateX(0px)', 'translateX(' + (-dx) + 'px)'],
      [l2El(from.name), 'transform', 'translateX(0px)', 'translateX(' + (oP - oH) + 'px)'],
      [l2El(to.name), 'transform', 'translateX(' + (oH - oP) + 'px)', 'translateX(0px)']
    ]).then(anims => {
      clearTimeout(inkAt);
      paintNav(toKey); navInk(toKey !== 'intro');
      to.layer.style.clipPath = 'none'; to.layer.style.zIndex = toKey === 'intro' ? 2 : 3;
      headSettle(toKey);
      to.name.style.transform = ''; from.name.style.transform = '';
      const fl2 = l2El(from.name), tl2 = l2El(to.name);
      if (fl2) fl2.style.transform = ''; if (tl2) tl2.style.transform = '';
      anims.forEach(a => a.cancel());
      Object.keys(NODES).forEach(k => { if (k !== toKey) shw(NODES[k].layer, false); });
      setMode(toKey);
      navBusy = false;
    });
    });
  };

  const nav = t => {
    if (t === 'work') return PAGES[mode] ? travelTo('intro') : showWork(false);
    if (t === 'intro') return PAGES[mode] ? travelTo('intro') : go('intro');
    if (PAGES[t]) return travelTo(t);
    go(t);
  };
  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => nav(el.dataset.go)));

  // Header sits over whichever section is scrolled under it, so it flips to
  // light type only while a section marked [data-dark] is behind it.
  const darkSecs = [...work.querySelectorAll('[data-dark]')];
  const HEAD_Y = 40;
  let wasDark = null, wasBotDark = null;
  const inDark = y => darkSecs.some(s => y >= s.offsetTop && y <= s.offsetTop + s.offsetHeight);
  const paintChrome = () => {
    // Top and bottom of the viewport are read separately: the header, the
    // status bar, and the theme-color follow what's under the top edge, while
    // the document background — what iOS blends its bottom search bar from —
    // follows what's under the bottom edge. Mid-scroll through Work's black
    // band those two disagree, and a single read left one bar mismatched.
    const onDark = inDark(intro.scrollTop + HEAD_Y);
    const botDark = inDark(intro.scrollTop + intro.clientHeight - 8);
    if (botDark !== wasBotDark) {
      wasBotDark = botDark;
      setChromeBottom(botDark ? '#000000' : '#ffffff');
    }
    if (onDark === wasDark) return;
    wasDark = onDark;
    if (head) head.style.background = onDark ? '#0c0c0e' : '#fff';
    setChromeTop(onDark ? '#0c0c0e' : '#ffffff');
    document.querySelectorAll('[data-ch]').forEach(el => {
      if (el.dataset.ch === 'name') el.style.color = onDark ? '#f5f5f7' : '#1a1a1a';
      else el.style.color = onDark ? '#fff' : '#1a1a1a';
    });
  };
  intro.addEventListener('scroll', () => requestAnimationFrame(() => {
    if (mode === 'intro') paintChrome();
  }), { passive: true });

  // The browser's own scrollTo({behavior:'smooth'}) is a short, near-linear
  // ease that reads as a snap, not a glide — nothing like the long, decelerating
  // scroll-jack Apple's product pages use. This drives scrollTop by hand instead,
  // on an expo-out curve (fast away from the gesture, a long soft landing) over
  // a deliberately unhurried second. CSS scroll-behavior has to be forced to
  // 'auto' for the duration: left on 'smooth', every scrollTop write below would
  // itself kick off a browser-smoothed hop, and the two would fight frame to frame.
  const easeOutExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const SNAP_MS = 900;
  const scrollSnap = (el, toY, ms) => new Promise(done => {
    const fromY = el.scrollTop, dist = toY - fromY;
    if (!dist || !ms) { el.scrollTop = toY; return done(); }
    const prevBehavior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    const t0 = performance.now();
    const frame = t => {
      const p = Math.min(1, (t - t0) / ms);
      el.scrollTop = fromY + dist * easeOutExpo(p);
      if (p < 1) return requestAnimationFrame(frame);
      el.style.scrollBehavior = prevBehavior;
      done();
    };
    requestAnimationFrame(frame);
  });

  // Work is a scroll position on the home page now, not a layer of its own.
  const showWork = instant => {
    if (mode !== 'intro') go('intro');
    scrollSnap(intro, work.offsetTop, instant || still.matches ? 0 : SNAP_MS);
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
    scrollSnap(intro, e.deltaY > 0 ? h : 0, still.matches ? 0 : SNAP_MS).then(() => { sectionLock = false; });
  }, { passive: false });

  const tune = () => {
    syncAbout();
    // A resize (or iOS toolbar collapse) moves the viewport's bottom edge, so
    // both chrome reads can change without any scroll happening.
    if (mode === 'intro') { wasDark = null; wasBotDark = null; paintChrome(); }
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

  // iOS Safari can restore this page from its back/forward cache without
  // re-running the effects that set the status bar / bottom toolbar colour,
  // so navigating back can leave that chrome on whatever it was when the
  // page got cached. Re-derive it fresh whenever that happens.
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    if (mode === 'intro') { wasDark = null; wasBotDark = null; paintChrome(); }
    else setChromeFor(mode);
  });

  // TEMP: auto-cycles the page transition for cross-browser verification.
  if (location.search.includes('transition-test')) {
    const cycle = ['about', 'intro', 'lab', 'intro'];
    let ci = 0;
    setInterval(() => { nav(cycle[ci]); ci = (ci + 1) % cycle.length; }, 4000);
  }

  // Work footer's headline word alternates between what someone might be
  // reaching out for.
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
