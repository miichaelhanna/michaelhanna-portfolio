// Arriving from the home page. The picture that was clicked there is the
// hero of this page, and it was left on screen at a known rectangle; a
// stand-in (#hm-arrive, created before first paint at the top of the body)
// is already sitting in that spot. This grows it into the hero's real place
// while the rest of the page fills in beneath, then fades it away over the
// hero itself — so the move reads as one picture changing rooms, not two
// pages. Every path out of here ends in the same cleanup, and a timer
// guarantees it even if an animation never reports back.
(function () {
  var root = document.documentElement;
  var a = window.__hmArrive, clone = document.getElementById('hm-arrive');
  var done = function () {
    root.classList.remove('hm-arriving');
    if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
  };
  if (!a || !clone) return done();
  var hero = document.getElementById('hero');
  if (!hero || !clone.animate) return done();
  var fallback = setTimeout(done, 3000);
  var run = function () {
    var r = hero.getBoundingClientRect();
    var radius = getComputedStyle(hero).borderTopLeftRadius;
    var D = 850, E = 'cubic-bezier(.22,1,.36,1)';
    var opts = { duration: D, easing: E, fill: 'forwards' };
    var move = clone.animate([
      { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px', borderRadius: a.radius },
      { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', borderRadius: radius }
    ], opts);
    var img = clone.querySelector('img');
    if (img) img.animate([{ transform: img.style.transform || 'none' }, { transform: 'none' }], opts);
    // The page beneath fades in while the picture is still on its way, so
    // by the time it lands there is a page around it.
    var page = [].slice.call(document.body.children).filter(function (el) {
      return !/^(NAV|SCRIPT|LINK|STYLE)$/.test(el.tagName) && !/^(hm-safe-top|hm-safe-bot|pg|hm-arrive)$/.test(el.id);
    });
    page.forEach(function (el) {
      el.animate([{ opacity: 0 }, { opacity: 0, offset: .28 }, { opacity: 1 }], { duration: D, easing: 'ease', fill: 'backwards' });
    });
    root.classList.remove('hm-arriving');
    move.finished.then(function () {
      var fade = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: 'ease', fill: 'forwards' });
      return fade.finished;
    }).then(function () { clearTimeout(fallback); done(); }, function () { clearTimeout(fallback); done(); });
  };
  // Two frames after fonts settle, so the hero is measured where it will
  // actually sit rather than where a fallback font left it.
  var go = function () { requestAnimationFrame(function () { requestAnimationFrame(run); }); };
  var fontsIn = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsIn, new Promise(function (res) { setTimeout(res, 400); })]).then(go, go);
})();
