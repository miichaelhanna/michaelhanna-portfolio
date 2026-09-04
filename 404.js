(function () {
  'use strict';

  // ---------------------------------------------------------------- canvas
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.imageSmoothingEnabled = false;
  // Runner mode (see 404.html): the world was drawn for a 450px-tall frame;
  // a taller one keeps the world where it is and adds sky above.
  var RUN = !!window.HM_RUN, VOFF = H - 450;

  // ---------------------------------------------------------------- rig
  // Parts cut from the avatar (1/6 scale). Pivots are in part-local px.
  var rig = new Image();
  var rigReady = false;
  rig.onload = function () { rigReady = true; };
  rig.src = '/assets/avatar-rig.png';
  var P = {
    head:  { sx: 0,   sy: 0, w: 48, h: 51, px: 25.5, py: 50.0 },
    torso: { sx: 50,  sy: 0, w: 41, h: 37, px: 20.3, py: 36.5 },
    armF:  { sx: 93,  sy: 0, w: 21, h: 29, px: 10.0, py: 2.2 },
    armB:  { sx: 116, sy: 0, w: 8,  h: 14, px: -2.5, py: -9.8 },
    legB:  { sx: 126, sy: 0, w: 20, h: 24, px: 15.3, py: 0.2 },
    legF:  { sx: 148, sy: 0, w: 34, h: 24, px: 5.2,  py: 0.2 }
  };
  // anchors relative to the hip (0,0); feet are 24px below the hip
  var A = { neck: [0, -36.2], shF: [-16.3, -32], shB: [9.5, -30.3], hipB: [-6.2, 0.2], hipF: [6.3, 0.2] };
  var HIP_TO_FEET = 24.3;
  var BODY_H = 110;

  function part(p, rot) {
    ctx.save();
    ctx.rotate(rot || 0);
    ctx.drawImage(rig, p.sx, p.sy, p.w, p.h, -p.px, -p.py, p.w, p.h);
    ctx.restore();
  }

  // ---------------------------------------------------------------- constants
  var GROUND_Y = 390;
  var GRAV = 1900, JUMP_V = -700, JUMP_CUT = -220, MAX_FALL = 1100;
  var RUN_MAX = 340, RUN_ACC = 1500, RUN_DEC = 2400, AIR_ACC = 1000, SKID_DEC = 3200;
  var COYOTE = 0.1, BUFFER = 0.12;
  var SPRING_V = -1050;

  // ---------------------------------------------------------------- level
  var LEVEL_W = 3900;
  var START_X = parseInt(new URLSearchParams(location.search).get('x') || '0', 10) || 0;
  // ground segments (top at GROUND_Y)
  var ground = [[0, 1100], [1260, 2000], [2200, 3000], [3140, 3900]];
  // floating platforms [x, y, w]
  var plats = [
    [520, 300, 160], [760, 230, 120], [1130, 310, 130], [1480, 290, 140], [1690, 220, 120],
    [2050, 300, 150], [2480, 290, 160], [2690, 215, 120], [3030, 300, 110], [3400, 290, 140]
  ];
  var spikes = [[880, 2], [1560, 2], [2320, 3], [2900, 2], [3300, 2]];        // [x, count]
  var springs = [[1400, 0], [2630, 0], [3560, 0]];                            // [x, compress]
  var checkpoint = { x: 1960, on: false };
  var goal = { x: 3780, y: 300 };

  var rings0 = [];
  function row(x, y, n, gap) { for (var i = 0; i < n; i++) rings0.push([x + i * gap, y]); }
  function arc(x, y, n, gap, amp) { for (var i = 0; i < n; i++) rings0.push([x + i * gap, y - Math.sin((i / (n - 1)) * Math.PI) * amp]); }
  row(260, 340, 4, 34); row(560, 250, 4, 34); row(790, 180, 3, 34);
  arc(1080, 330, 5, 36, 80);                     // over pit 1
  row(1130, 262, 3, 40); row(1520, 240, 4, 34); row(1720, 170, 3, 34);
  arc(1360, 300, 5, 24, 120);                     // above spring 1
  arc(2000, 330, 6, 36, 90);                      // over pit 2
  row(2510, 240, 4, 34); row(2720, 165, 3, 34);
  arc(2590, 290, 5, 24, 130);                     // above spring 2
  arc(2980, 330, 5, 36, 80);                      // over pit 3
  row(3420, 240, 4, 34); row(3230, 340, 3, 34);
  arc(3520, 300, 5, 24, 130);                     // above spring 3

  // ---------------------------------------------------------------- state
  var state = 'ready'; // ready | play | win | done
  // Lives. Spikes and water both cost one, and the level restarts from the
  // beginning; the last one lost is game over.
  var LIVES = 3, lives = LIVES;
  var player, cam, rings, loose, parts, time, timerOn, deaths;
  var shake = 0, fade = 0;
  var input = { left: false, right: false, jump: false, jumpHeld: false, jumpBuf: 0 };

  function reset(fromCheckpoint) {
    var sx = (fromCheckpoint && checkpoint.on) ? checkpoint.x : (START_X || 120);
    player = {
      x: sx, y: GROUND_Y, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0,
      phase: 0, squashX: 1, squashY: 1, hurt: 0, inv: 0, ctrl: 0, wasGround: true, dead: 0
    };
    if (!fromCheckpoint) {
      rings = rings0.map(function (r) { return { x: r[0], y: r[1], got: false, t: Math.random() * 6 }; });
      checkpoint.on = false;
      time = 0; timerOn = false; deaths = 0;
    }
    player.rings = 0;
    loose = []; parts = [];
    cam = { x: Math.max(0, Math.min(LEVEL_W - W, sx - 300)) };
    for (var i = 0; i < springs.length; i++) springs[i][1] = 0;
  }

  // ---------------------------------------------------------------- helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fmtTime(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  function hitbox() { return { l: player.x - 16, r: player.x + 16, t: player.y - 96, b: player.y }; }

  function burst(x, y, color, n, spd) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), s = rand(spd * 0.4, spd);
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.3, 0.6), t: 0, c: color, g: 600 });
    }
  }
  function dust(x, y, dir) {
    parts.push({ x: x + rand(-6, 6), y: y - 2, vx: -dir * rand(30, 90), vy: rand(-40, -10), life: rand(0.25, 0.45), t: 0, c: 'rgba(255,255,255,.7)', g: -80, sz: rand(3, 6) });
  }

  // ---------------------------------------------------------------- update
  function solidsAt() {
    var s = [];
    for (var i = 0; i < ground.length; i++) s.push({ l: ground[i][0], r: ground[i][1], t: GROUND_Y, b: GROUND_Y + 200 });
    return s;
  }
  var solids = solidsAt();

  function update(dt) {
    if (timerOn) time += dt;
    shake = Math.max(0, shake - dt * 3);
    if (fade > 0) fade = Math.max(0, fade - dt * 1.6);

    var p = player;
    if (RUN) { input.right = true; input.left = false; }
    if (p.dead > 0) {
      p.dead -= dt;
      p.vy += GRAV * dt; p.y += p.vy * dt;
      if (p.dead <= 0) { if (lives <= 0) gameOver(); else { reset(false); fade = 1; if (RUN) timerOn = true; } }
      updateParts(dt);
      return;
    }

    // -- horizontal
    var want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (p.ctrl > 0) { p.ctrl -= dt; want = 0; }
    var acc = p.onGround ? RUN_ACC : AIR_ACC;
    p.skid = false;
    if (want !== 0) {
      if (p.onGround && Math.sign(p.vx) === -want && Math.abs(p.vx) > 120) {
        p.vx += want * SKID_DEC * dt; p.skid = true;
        if (Math.random() < 0.5) dust(p.x, p.y, -want);
      } else {
        p.vx += want * acc * dt;
      }
      p.face = want;
    } else if (p.onGround) {
      var d = RUN_DEC * dt;
      if (Math.abs(p.vx) <= d) p.vx = 0; else p.vx -= Math.sign(p.vx) * d;
    } else {
      p.vx *= (1 - 0.6 * dt);
    }
    p.vx = clamp(p.vx, -RUN_MAX, RUN_MAX);

    // -- jump
    if (p.onGround) p.coyote = COYOTE; else p.coyote -= dt;
    if (input.jumpBuf > 0) input.jumpBuf -= dt;
    if (input.jumpBuf > 0 && p.coyote > 0 && p.ctrl <= 0) {
      p.vy = JUMP_V; p.onGround = false; p.coyote = 0; input.jumpBuf = 0;
      p.squashX = 0.8; p.squashY = 1.2;
      for (var k = 0; k < 4; k++) dust(p.x, p.y, p.face * (k % 2 ? 1 : -1));
    }
    if (!input.jumpHeld && p.vy < JUMP_CUT) p.vy = JUMP_CUT;

    // -- integrate x
    p.x += p.vx * dt;
    var hb = hitbox();
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (hb.r > s.l && hb.l < s.r && hb.b > s.t + 2 && hb.t < s.b) {
        if (p.vx > 0) p.x = s.l - 16; else if (p.vx < 0) p.x = s.r + 16;
        p.vx = 0; hb = hitbox();
      }
    }
    p.x = clamp(p.x, 16, LEVEL_W - 16);

    // -- integrate y
    p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    var prevY = p.y;
    p.y += p.vy * dt;
    p.wasGround = p.onGround;
    p.onGround = false;
    hb = hitbox();
    if (p.vy >= 0) {
      for (i = 0; i < solids.length; i++) {
        s = solids[i];
        if (hb.r > s.l && hb.l < s.r && prevY <= s.t + 1 && p.y >= s.t) { p.y = s.t; p.vy = 0; p.onGround = true; }
      }
      for (i = 0; i < plats.length; i++) {
        var q = plats[i];
        if (hb.r > q[0] && hb.l < q[0] + q[2] && prevY <= q[1] + 1 && p.y >= q[1]) { p.y = q[1]; p.vy = 0; p.onGround = true; }
      }
      for (i = 0; i < springs.length; i++) {
        var sp = springs[i];
        if (hb.r > sp[0] && hb.l < sp[0] + 40 && prevY <= GROUND_Y - 14 + 4 && p.y >= GROUND_Y - 14) {
          p.y = GROUND_Y - 14; p.vy = SPRING_V; sp[1] = 1; p.onGround = false;
          p.squashX = 0.7; p.squashY = 1.35; input.jumpBuf = 0;
          burst(sp[0] + 20, GROUND_Y - 14, '#ffd23f', 6, 160);
        }
      }
    }
    if (p.onGround && !p.wasGround) {
      p.squashX = 1.25; p.squashY = 0.75;
      for (k = 0; k < 5; k++) dust(p.x, p.y, k % 2 ? 1 : -1);
      if (p.ctrl > 0) p.ctrl = 0;
    }
    p.squashX = lerp(p.squashX, 1, Math.min(1, dt * 12));
    p.squashY = lerp(p.squashY, 1, Math.min(1, dt * 12));

    // -- animation clock
    var spd = Math.abs(p.vx);
    if (p.onGround && spd > 10) {
      p.phase += dt * (6 + spd * 0.035);
      if (spd > 200 && Math.random() < dt * 8) dust(p.x - p.face * 10, p.y, p.face);
    } else if (p.onGround) {
      p.phase = lerp(p.phase, Math.round(p.phase / Math.PI) * Math.PI, Math.min(1, dt * 10));
    }
    p.inv = Math.max(0, p.inv - dt);
    p.hurt = Math.max(0, p.hurt - dt);

    // -- hazards
    hb = hitbox();
    if (p.inv <= 0) {
      for (i = 0; i < spikes.length; i++) {
        var sk = spikes[i], sl = sk[0], sr = sk[0] + sk[1] * 24;
        if (hb.r > sl + 4 && hb.l < sr - 4 && hb.b > GROUND_Y - 26 && hb.t < GROUND_Y) hurtPlayer();
      }
    }
    if (p.y > H + 120) { die(); }

    // -- rings
    for (i = 0; i < rings.length; i++) {
      var r = rings[i]; r.t += dt;
      if (r.got) continue;
      var dx = r.x - p.x, dy = r.y - (p.y - 50);
      if (dx * dx + dy * dy < 44 * 44) { r.got = true; p.rings++; burst(r.x, r.y, '#ffe680', 5, 120); }
    }
    for (i = loose.length - 1; i >= 0; i--) {
      var lr = loose[i]; lr.t += dt; lr.vy += 900 * dt; lr.x += lr.vx * dt; lr.y += lr.vy * dt;
      if (lr.y > GROUND_Y && onGroundAt(lr.x)) { lr.y = GROUND_Y; lr.vy *= -0.55; lr.vx *= 0.8; }
      if (lr.t > 3 || lr.y > H + 60) { loose.splice(i, 1); continue; }
      if (lr.t > 0.7) {
        dx = lr.x - p.x; dy = lr.y - (p.y - 50);
        if (dx * dx + dy * dy < 40 * 40) { loose.splice(i, 1); p.rings++; burst(lr.x, lr.y, '#ffe680', 4, 100); }
      }
    }

    // -- checkpoint / goal
    if (!checkpoint.on && p.x > checkpoint.x) { checkpoint.on = true; burst(checkpoint.x, GROUND_Y - 60, '#D7FF3F', 10, 180); }
    dx = goal.x - p.x; dy = (goal.y + Math.sin(time * 2) * 6) - (p.y - 50);
    if (dx * dx + dy * dy < 50 * 50) win();

    // -- camera
    var target = p.x - W * 0.38 + p.vx * 0.25;
    cam.x = lerp(cam.x, clamp(target, 0, LEVEL_W - W), Math.min(1, dt * 6));

    updateParts(dt);
  }

  function onGroundAt(x) {
    for (var i = 0; i < ground.length; i++) if (x >= ground[i][0] && x <= ground[i][1]) return true;
    return false;
  }

  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.t > q.life) parts.splice(i, 1);
    }
  }

  // A spike is as final as the water: the rings scatter and the run is over.
  function hurtPlayer() {
    var p = player;
    if (p.dead > 0) return;
    var n = Math.min(p.rings, 14);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + rand(-1.3, 1.3);
      var s = rand(220, 420);
      loose.push({ x: p.x, y: p.y - 50, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
    }
    p.rings = 0;
    die();
  }

  function die() {
    var p = player;
    if (p.dead > 0) return;
    p.dead = 0.9; p.vy = -500; p.vx = 0; deaths++; shake = 1;
    lives = Math.max(0, lives - 1);
  }

  // ---------------------------------------------------------------- draw
  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3fa6ff'); g.addColorStop(0.55, '#7fcbff'); g.addColorStop(1, '#c9ecff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sun
    ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.arc(W - 120 - cam.x * 0.02, 70, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe36e'; ctx.beginPath(); ctx.arc(W - 120 - cam.x * 0.02, 70, 20, 0, Math.PI * 2); ctx.fill();
  }
  function cloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillRect(x, y, 46 * s, 14 * s);
    ctx.fillRect(x + 10 * s, y - 10 * s, 22 * s, 12 * s);
    ctx.fillRect(x + 26 * s, y - 6 * s, 16 * s, 8 * s);
  }
  function drawFar() {
    // clouds
    var cx = (cam.x * 0.15) % 900;
    for (var i = -1; i < 3; i++) {
      cloud(i * 900 - cx + 80, 90, 1.4); cloud(i * 900 - cx + 380, 150, 1); cloud(i * 900 - cx + 640, 60, 1.1);
    }
    // far hills
    var hx = (cam.x * 0.3) % 600;
    for (i = -1; i < 3; i++) {
      var bx = i * 600 - hx;
      ctx.fillStyle = '#5fcf7a'; ctx.beginPath(); ctx.arc(bx + 150, 420, 200, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#4bbf68'; ctx.beginPath(); ctx.arc(bx + 440, 430, 160, Math.PI, 0); ctx.fill();
    }
    // near bushes
    var nx = (cam.x * 0.55) % 500;
    for (i = -1; i < 3; i++) {
      bx = i * 500 - nx;
      ctx.fillStyle = '#2fa34e'; ctx.beginPath(); ctx.arc(bx + 90, 400, 70, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#278f44'; ctx.beginPath(); ctx.arc(bx + 320, 405, 95, Math.PI, 0); ctx.fill();
    }
  }
  function slab(x, y, w, h, thin) {
    // grass top + checkered dirt
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(x - 2, y, w + 4, h);
    ctx.fillStyle = '#c98a45'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#b37538';
    var t = 20;
    for (var yy = 0; yy < h; yy += t) for (var xx = 0; xx < w; xx += t) {
      if (((xx / t + yy / t) | 0) % 2 === 0) ctx.fillRect(x + xx, y + yy, Math.min(t, w - xx), Math.min(t, h - yy));
    }
    ctx.fillStyle = '#2a9f45'; ctx.fillRect(x - 2, y, w + 4, thin ? 10 : 14);
    ctx.fillStyle = '#4ee06a'; ctx.fillRect(x, y, w, thin ? 6 : 8);
  }
  function drawWorld() {
    ctx.save(); ctx.translate(-Math.round(cam.x), 0);
    // water in the pits
    ctx.fillStyle = '#2b7fd6'; ctx.fillRect(cam.x, GROUND_Y + 26, W, H - GROUND_Y - 26);
    ctx.fillStyle = '#5fb0ff';
    for (var wx = Math.floor(cam.x / 40) * 40 - 40; wx < cam.x + W + 40; wx += 40) {
      var wt = performance.now() / 1000;
      var wy = GROUND_Y + 26 + Math.sin(wx * 0.05 + wt * 3) * 2;
      ctx.fillRect(wx + ((wt * 30) % 40), wy, 20, 3);
    }
    for (var i = 0; i < ground.length; i++) slab(ground[i][0], GROUND_Y, ground[i][1] - ground[i][0], H - GROUND_Y);
    for (i = 0; i < plats.length; i++) slab(plats[i][0], plats[i][1], plats[i][2], 22, true);

    // checkpoint post
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(checkpoint.x - 3, GROUND_Y - 70, 6, 70);
    ctx.fillStyle = checkpoint.on ? '#D7FF3F' : '#ff5a5a';
    ctx.beginPath(); ctx.moveTo(checkpoint.x + 3, GROUND_Y - 70); ctx.lineTo(checkpoint.x + 34, GROUND_Y - 60); ctx.lineTo(checkpoint.x + 3, GROUND_Y - 48); ctx.fill();

    // spikes
    for (i = 0; i < spikes.length; i++) {
      var sk = spikes[i];
      for (var k = 0; k < sk[1]; k++) {
        var x = sk[0] + k * 24;
        ctx.fillStyle = '#23262e'; ctx.beginPath(); ctx.moveTo(x - 1, GROUND_Y + 1); ctx.lineTo(x + 12, GROUND_Y - 30); ctx.lineTo(x + 25, GROUND_Y + 1); ctx.fill();
        ctx.fillStyle = '#cfd6e0'; ctx.beginPath(); ctx.moveTo(x + 2, GROUND_Y); ctx.lineTo(x + 12, GROUND_Y - 25); ctx.lineTo(x + 22, GROUND_Y); ctx.fill();
        ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x + 4, GROUND_Y); ctx.lineTo(x + 12, GROUND_Y - 22); ctx.lineTo(x + 12, GROUND_Y); ctx.fill();
      }
    }

    // springs
    for (i = 0; i < springs.length; i++) {
      var sp = springs[i]; sp[1] = Math.max(0, sp[1] - 0.06);
      var c = sp[1] * 8;
      ctx.fillStyle = '#23262e'; ctx.fillRect(sp[0] - 1, GROUND_Y - 15 + c, 42, 16 - c);
      ctx.fillStyle = '#e63946'; ctx.fillRect(sp[0], GROUND_Y - 14 + c, 40, 14 - c);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(sp[0] - 3, GROUND_Y - 18 + c, 46, 6);
      ctx.fillStyle = '#23262e'; ctx.fillRect(sp[0] - 3, GROUND_Y - 13 + c, 46, 2);
    }

    // rings
    for (i = 0; i < rings.length; i++) { var r = rings[i]; if (!r.got) ring(r.x, r.y, r.t, 1); }
    for (i = 0; i < loose.length; i++) { var lr = loose[i]; if (lr.t < 2 || Math.floor(lr.t * 12) % 2) ring(lr.x, lr.y, lr.t * 3, 1); }

    // goal page
    var gy = goal.y + Math.sin(time * 2) * 6;
    ctx.save(); ctx.translate(goal.x, gy);
    ctx.fillStyle = 'rgba(215,255,63,.25)'; ctx.beginPath(); ctx.arc(0, 0, 44 + Math.sin(time * 4) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#23262e'; ctx.fillRect(-19, -25, 38, 50);
    ctx.fillStyle = '#fff'; ctx.fillRect(-17, -23, 34, 46);
    ctx.fillStyle = '#cfd6e0'; ctx.fillRect(7, -23, 10, 10);
    ctx.fillStyle = '#9aa3b2'; for (k = 0; k < 4; k++) ctx.fillRect(-11, -8 + k * 7, k === 3 ? 12 : 22, 3);
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('404', 0, -12);
    ctx.restore();
    // pedestal
    ctx.fillStyle = '#23262e'; ctx.fillRect(goal.x - 26, GROUND_Y - 12, 52, 12);
    ctx.fillStyle = '#D7FF3F'; ctx.fillRect(goal.x - 24, GROUND_Y - 10, 48, 8);

    drawPlayer();

    // particles
    for (i = 0; i < parts.length; i++) {
      var q = parts[i]; var a = 1 - q.t / q.life;
      ctx.globalAlpha = a; ctx.fillStyle = q.c; var sz = q.sz || 4; ctx.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function ring(x, y, t, s) {
    var w = Math.abs(Math.cos(t * 4)) * 12 + 2;
    ctx.lineWidth = 4; ctx.strokeStyle = '#b8860b';
    ctx.beginPath(); ctx.ellipse(x, y, w + 1, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffc61a';
    ctx.beginPath(); ctx.ellipse(x, y, w, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - 1, Math.max(1, w - 3), 9, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  }

  function drawPlayer() {
    if (!rigReady) return;
    var p = player;
    if (p.inv > 0 && p.dead <= 0 && Math.floor(p.inv * 14) % 2 === 0) return; // flicker

    var spd = Math.abs(p.vx), c = clamp(spd / RUN_MAX, 0, 1);
    var s = Math.sin(p.phase), cs = Math.cos(p.phase);
    var legF, legB, armF, armB, lean, head, bounce = 0, tScaleY = 1;
    var now = performance.now() / 1000;

    if (p.dead > 0) {
      legF = 0.9; legB = -0.9; armF = -2.6; armB = 2.6; lean = 0; head = -0.3;
    } else if (state === 'win' || state === 'done') {
      var hop = Math.abs(Math.sin(now * 6));
      bounce = hop * 18; legF = 0.5 * hop; legB = -0.5 * hop; armF = -2.6 - hop * 0.3; armB = 2.5 + hop * 0.3; lean = 0; head = -0.15;
    } else if (p.hurt > 0) {
      legF = 0.7; legB = -0.6; armF = -1.6 + Math.sin(now * 40) * 0.4; armB = 1.5 + Math.sin(now * 40) * 0.4; lean = -0.45 * p.face; head = 0.35; lean = -0.45;
    } else if (!p.onGround) {
      if (p.vy < -150) { legF = 0.95; legB = -0.55; armF = -2.3; armB = 2.1; lean = 0.18; head = -0.1; }
      else if (p.vy < 150) { legF = 0.6; legB = -0.35; armF = -1.9; armB = 1.8; lean = 0.08; head = 0; }
      else { legF = 0.3; legB = -0.5; armF = -1.3; armB = 1.3; lean = -0.05; head = 0.12; }
    } else if (p.skid) {
      legF = 0.6; legB = -0.7; armF = 0.9; armB = -0.9; lean = -0.35; head = 0.2;
    } else if (c > 0.05) {
      legF = -s * 0.95 * (0.4 + 0.6 * c);
      legB = s * 0.95 * (0.4 + 0.6 * c);
      armF = s * 0.8 * (0.3 + 0.7 * c) - 0.2 * c;
      armB = -s * 0.8 * (0.3 + 0.7 * c) + 0.2 * c;
      lean = 0.22 * c; head = -0.1 * c + cs * 0.04 * c;
      bounce = Math.abs(cs) * 5 * c;
    } else {
      var br = Math.sin(now * 2.4);
      legF = 0; legB = 0; armF = 0.06 * br; armB = -0.06 * br; lean = 0; head = 0.02 * br; tScaleY = 1 + 0.018 * br;
    }

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.scale(p.face * p.squashX, p.squashY);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -HIP_TO_FEET - bounce);

    // back leg, back arm (behind torso)
    ctx.save(); ctx.translate(A.hipB[0], A.hipB[1]); part(P.legB, legB); ctx.restore();
    ctx.save(); ctx.rotate(lean); ctx.scale(1, tScaleY);
    ctx.save(); ctx.translate(A.shB[0], A.shB[1]); part(P.armB, armB); ctx.restore();
    part(P.torso, 0);
    ctx.save(); ctx.translate(A.neck[0], A.neck[1]); part(P.head, head); ctx.restore();
    ctx.restore();
    // front leg, front arm
    ctx.save(); ctx.translate(A.hipF[0], A.hipF[1]); part(P.legF, legF); ctx.restore();
    ctx.save(); ctx.rotate(lean); ctx.translate(A.shF[0], A.shF[1]); part(P.armF, armF); ctx.restore();
    ctx.restore();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake * 5, shake * 5), rand(-shake * 4, shake * 4));
    drawSky();
    ctx.translate(0, VOFF);
    drawFar();
    drawWorld();
    ctx.restore();
    if (fade > 0) { ctx.fillStyle = 'rgba(12,12,14,' + fade + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- hud / overlays
  var hudRings = document.getElementById('hud-rings'), hudRingN = document.getElementById('hud-ringn'), hudTime = document.getElementById('hud-time');
  var ovReady = document.getElementById('ov-ready'), ovWin = document.getElementById('ov-win'), ovStats = document.getElementById('ov-stats');
  var ovWinSub = document.getElementById('ov-win-sub');
  var LAB = /(^|[?&])lab(=|&|$)/.test(location.search);
  function runs() { try { return parseInt(sessionStorage.getItem('hm-404-runs') || '0', 10) || 0; } catch (e) { return 0; } }
  function setRuns(n) { try { sessionStorage.setItem('hm-404-runs', String(n)); } catch (e) {} }
  var hudLives = document.getElementById('hud-lives');
  function updateHud() {
    if (hudLives) hudLives.textContent = lives;
    hudRingN.textContent = player.rings;
    hudRings.classList.toggle('zero', player.rings === 0 && state === 'play');
    hudTime.textContent = fmtTime(time);
  }

  function start() {
    lives = LIVES;
    reset(false);
    state = 'play';
    if (RUN) timerOn = true;
    ovReady.classList.add('hide'); ovWin.classList.add('hide');
    document.getElementById('ov-win-title').textContent = 'page found';
    ovWinSub.textContent = "…just kidding. it's still a 404. but that was a good run.";
    canvas.focus({ preventScroll: true });
  }
  function win() {
    if (state !== 'play') return;
    state = 'win'; player.vx = 0; timerOn = false;
    burst(goal.x, goal.y, '#D7FF3F', 24, 260); burst(goal.x, goal.y, '#fff', 12, 180);
    var total = rings.length;
    ovStats.innerHTML = 'rings ' + player.rings + ' / ' + total + '<br>time ' + fmtTime(time) + (deaths ? '<br>falls ' + deaths : '');
    if (LAB) {
      var n = runs() + 1; setRuns(n);
      if (n >= LAB_RUNS) { state = 'done'; setTimeout(closing, 900); return; }
      ovWinSub.textContent = "…just kidding. it's still a 404. one more run, then it's back to business.";
    }
    setTimeout(function () { if (state === 'win') ovWin.classList.remove('hide'); }, 900);
  }

  // Out of lives. From After Hours that spends a run, like finishing does.
  function gameOver() {
    state = 'over'; timerOn = false;
    document.getElementById('ov-win-title').textContent = 'game over';
    ovStats.innerHTML = 'rings ' + player.rings + '<br>time ' + fmtTime(time) + '<br>lives 0 / ' + LIVES;
    if (LAB) {
      var n = runs() + 1; setRuns(n);
      if (n >= LAB_RUNS) { closing(); return; }
      ovWinSub.textContent = 'three lives, all spent. one more run, then it is back to business.';
    } else {
      ovWinSub.textContent = 'three lives, all spent. the page is still out there.';
    }
    ovWin.classList.remove('hide');
  }

  // ---------------------------------------------------------------- after hours
  // Opened from After Hours (?lab): the ready screen says why this exists,
  // there are two runs, and the second ends with the lights going off and a
  // walk back to the bench. The count lives in sessionStorage so a refresh
  // does not hand out a third; the After Hours page resets it on each coin.
  var LAB_RUNS = 2, byeTimer = 0;
  function closing() {
    state = 'done';
    document.getElementById('ov-win-title').textContent = "that's enough";
    ovWinSub.textContent = 'enough playing. back to business.';
    document.getElementById('btn-again').hidden = true;
    var home = document.getElementById('btn-home'); home.textContent = 'back to after hours'; home.href = '/#lab';
    var bye = document.getElementById('ov-bye'); bye.hidden = false;
    var left = 6;
    var tick = function () { bye.innerHTML = 'the bench is waiting · <b>' + left + '</b>'; if (left-- <= 0) { location.href = '/#lab'; return; } byeTimer = setTimeout(tick, 1000); };
    tick();
    ovWin.classList.remove('hide');
  }
  if (LAB) {
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') location.href = '/#lab'; });
    document.getElementById('ov-ready-sub').textContent = 'i grew up playing sonic. so the 404 on this site is one you can play. two runs, then back to business.';
    var fh = document.getElementById('foot-home'); fh.textContent = 'back to after hours'; fh.href = '/#lab';
    document.getElementById('foot-msg').textContent = 'run ' + Math.min(runs() + 1, LAB_RUNS) + ' of ' + LAB_RUNS;
    if (runs() >= LAB_RUNS) { ovReady.classList.add('hide'); ovStats.innerHTML = ''; closing(); }
  }

  // ---------------------------------------------------------------- loop
  var last = 0;
  function loop(ts) {
    var dt = Math.min(0.033, (ts - last) / 1000 || 0);
    last = ts;
    if (state === 'play') update(dt);
    else if (state === 'win' || state === 'done' || state === 'over') { updateParts(dt); }
    else { updateParts(dt); }
    draw();
    updateHud();
    requestAnimationFrame(loop);
  }
  reset(false);
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(loop); });

  // ---------------------------------------------------------------- input
  function press(k) {
    if (k === 'jump') {
      if (state === 'ready') { start(); return; }
      if (state === 'win' || state === 'done' || state === 'over') return;
      input.jumpHeld = true; input.jumpBuf = BUFFER;
    } else input[k] = true;
    if (state === 'play' && !timerOn) timerOn = true;
  }
  function release(k) {
    if (k === 'jump') input.jumpHeld = false; else input[k] = false;
  }
  var KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump' };
  window.addEventListener('keydown', function (e) {
    var k = KEYS[e.code]; if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    press(k);
  }, { passive: false });
  window.addEventListener('keyup', function (e) {
    var k = KEYS[e.code]; if (!k) return;
    release(k);
  });
  window.addEventListener('blur', function () { input.left = input.right = false; input.jumpHeld = false; });

  // touch pad
  var pad = document.getElementById('pad');
  var buttons = pad.querySelectorAll('button');
  Array.prototype.forEach.call(buttons, function (b) {
    var k = b.getAttribute('data-k'), active = 0;
    function down(e) { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); active++; b.classList.add('on'); press(k); }
    function up(e) { e.preventDefault(); active = Math.max(0, active - 1); if (active === 0) { b.classList.remove('on'); release(k); } }
    b.addEventListener('pointerdown', down, { passive: false });
    b.addEventListener('pointerup', up, { passive: false });
    b.addEventListener('pointercancel', up, { passive: false });
    b.addEventListener('lostpointercapture', function () { if (active > 0) { active = 0; b.classList.remove('on'); release(k); } });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
  // tapping the stage itself (outside the pad) jumps, and shows the pad on touch devices
  var touchY = null;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' && !RUN) pad.classList.add('force');
    e.preventDefault();
    if (state === 'ready') start();
    else if (state === 'play' && RUN) { press('jump'); touchY = e.clientY; }
    else if (state === 'play' && e.pointerType !== 'touch') { press('jump'); setTimeout(function () { release('jump'); }, 120); }
  }, { passive: false });
  // Runner: the finger held keeps the jump tall; a swipe down drops fast.
  canvas.addEventListener('pointermove', function (e) {
    if (!RUN || touchY === null || state !== 'play') return;
    if (e.clientY - touchY > 40 && !player.onGround) { player.vy = Math.max(player.vy, 950); release('jump'); touchY = null; }
  });
  function touchEnd() { if (RUN) release('jump'); touchY = null; }
  canvas.addEventListener('pointerup', touchEnd); canvas.addEventListener('pointercancel', touchEnd);
  if (RUN) {
    document.getElementById('ov-kbd').innerHTML = '<b>tap</b> or <b>swipe up</b> to jump &nbsp;·&nbsp; <b>swipe down</b> to drop &nbsp;·&nbsp; three lives';
    document.getElementById('ov-ready-sub').textContent = (LAB ? 'i grew up playing sonic. so the 404 on this site is one you can play. two runs, then back to business. ' : 'this page ran off somewhere past the hills. ') + 'you run on your own. mind the spikes.';
  }

  document.getElementById('btn-start').addEventListener('click', function (e) { e.stopPropagation(); start(); });
  document.getElementById('btn-again').addEventListener('click', function (e) { e.stopPropagation(); start(); });

  updateHud();
})();
