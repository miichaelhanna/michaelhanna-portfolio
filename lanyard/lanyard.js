// reactbits.dev Lanyard (https://www.reactbits.dev/components/lanyard) ported
// from JSX to htm tagged templates so it runs without a build step. React,
// three.js, react-three-fiber, and the rapier physics engine load from esm.sh
// via the import map in index.html; card.glb and lanyard.png are local assets.
import { createElement, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import htm from 'htm';
import { renderCardFaces } from './cards.js';

const html = htm.bind(createElement);

extend({ MeshLineGeometry, MeshLineMaterial });

const CARD_GLB = 'lanyard/card.glb';
const LANYARD_TEX = 'lanyard/lanyard.png';

// The card model's front face is UV-mapped to the LEFT half of the texture
// atlas (measured from card.glb). Everything else in the atlas — the back face
// and the edges — is flooded with the card's own colour.
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };

function Lanyard({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
  fov = 20,
  transparent = true,
  faces = null,
  frontIndex = 0,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1,
  frameloop = 'always'
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The phone canvas is much shorter, so the camera moves in to keep the card
  // a legible size rather than letting it shrink with the viewport.
  const cam = isMobile ? [0, 0.3, 15] : position;

  return html`
    <div className="lanyard-wrapper">
      <${Canvas}
        key=${isMobile ? 'narrow' : 'wide'}
        frameloop=${frameloop}
        camera=${{ position: cam, fov: fov }}
        dpr=${[1, 2]}
        gl=${{ alpha: transparent }}
        onCreated=${({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity=${Math.PI * 0.55} />
        <directionalLight position=${[0, 0, 10]} intensity=${Math.PI * 0.45} />
        <${Physics} gravity=${gravity} timeStep=${isMobile ? 1 / 30 : 1 / 60}>
          <${Band}
            isMobile=${isMobile}
            faces=${faces}
            frontIndex=${frontIndex}
            imageFit=${imageFit}
            lanyardImage=${lanyardImage}
            lanyardWidth=${lanyardWidth}
          />
        <//>
        <${Environment} blur=${0.75}>
          <${Lightformer} intensity=${2} color="white" position=${[0, -1, 5]} rotation=${[0, 0, Math.PI / 3]} scale=${[100, 0.1, 1]} />
          <${Lightformer} intensity=${3} color="white" position=${[-1, -1, 1]} rotation=${[0, 0, Math.PI / 3]} scale=${[100, 0.1, 1]} />
          <${Lightformer} intensity=${3} color="white" position=${[1, 1, 1]} rotation=${[0, 0, Math.PI / 3]} scale=${[100, 0.1, 1]} />
          <${Lightformer} intensity=${10} color="white" position=${[-10, 0, 14]} rotation=${[0, Math.PI / 2, Math.PI / 3]} scale=${[100, 10, 1]} />
        <//>
      <//>
    </div>`;
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  faces = null,
  frontIndex = 0,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 1
}) {
  const band = useRef(),
    fixed = useRef(),
    j1 = useRef(),
    j2 = useRef(),
    j3 = useRef(),
    card = useRef();
  const vec = new THREE.Vector3(),
    ang = new THREE.Vector3(),
    rot = new THREE.Vector3(),
    dir = new THREE.Vector3();
  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  const { nodes, materials } = useGLTF(CARD_GLB);
  const texture = useTexture(lanyardImage || LANYARD_TEX);
  // Faces arrive as pre-rendered canvases (see cards.js), so swapping between
  // them never suspends the canvas — a suspend would unmount the rigid bodies
  // and reset the physics mid-swing.
  const frontFace = faces && faces.length ? faces[frontIndex % faces.length] : null;

  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;
    if (!frontFace) return baseMap;

    const baseImg = baseMap.image;
    // Faces are rendered at exactly the atlas's front-face size (see cards.js),
    // so the atlas is used at its native resolution and the face copies 1:1.
    const W = baseImg.width;
    const H = baseImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Paint the whole atlas in the card's own colour before laying the artwork
    // down: everything the front face doesn't cover — the back, and the edges
    // above and below it — then matches the front instead of showing white.
    ctx.fillStyle = frontFace.bg;
    ctx.fillRect(0, 0, W, H);

    const drawFitted = (img, rect) => {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      // 'fill' maps the face onto the UV region exactly — no crop, and it
      // cancels the region's aspect difference so the artwork isn't stretched.
      if (imageFit === 'fill') { ctx.drawImage(img, rx, ry, rw, rh); return; }
      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.clip();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    };

    drawFitted(frontFace.canvas, FRONT_UV_RECT);

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap.flipY;
    composite.anisotropy = 16;
    composite.needsUpdate = true;
    return composite;
  }, [frontFace, imageFit, materials.base.map, isMobile]);

  // Each face swap composites a fresh texture; release the previous one so
  // cycling through the cards doesn't accumulate GPU memory.
  const prevMap = useRef(null);
  useEffect(() => {
    const prev = prevMap.current;
    if (prev && prev !== cardMap && prev !== materials.base.map) prev.dispose();
    prevMap.current = cardMap;
  }, [cardMap, materials.base.map]);

  // The card is unlit and most faces are white, so on a white page it would
  // have no edge at all. A soft contact shadow behind it does the separating —
  // what a physical badge casts, without reintroducing reflections.
  //
  // The shadow plane is oversized versus the card (see below) so a halo can
  // peek out past its silhouette — but the opaque rect drawn here has to
  // actually reach that halo band before blur softens it. A rect padded
  // this far in stayed entirely inside the card's own footprint, so all
  // that ever showed was the blur's already-faded tail: invisible in
  // practice. Padding it much less means real shadow, not just tail,
  // extends past the card edge.
  const shadowTex = useMemo(() => {
    const W = 256, H = 358;                       // card aspect, so the blur isn't stretched
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.filter = 'blur(18px)';
    x.fillStyle = 'rgba(18,18,24,.45)';
    const p = 14;
    x.beginPath();
    x.roundRect(p, p, W - p * 2, H - p * 2, 26);
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, []);

  // Match the shadow to the card mesh's own bounds rather than guessing.
  const shadow = useMemo(() => {
    const g = nodes.card.geometry;
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const s = g.boundingBox.getSize(new THREE.Vector3());
    return { pos: [c.x, c.y - 0.035, c.z - 0.045], size: [s.x * 1.42, s.y * 1.30] };
  }, [nodes.card.geometry]);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return html`
    <${Fragment}>
      ${''/* Card face is unlit (meshBasicMaterial): no clearcoat, no environment
             reflections, no shading. toneMapped=false bypasses the renderer's
             filmic curve so the artwork renders exactly as authored. */}
      <group position=${[0, 4, 0]}>
        <${RigidBody} ref=${fixed} ...${segmentProps} type="fixed" />
        <${RigidBody} position=${[0.5, 0, 0]} ref=${j1} ...${segmentProps}>
          <${BallCollider} args=${[0.1]} />
        <//>
        <${RigidBody} position=${[1, 0, 0]} ref=${j2} ...${segmentProps}>
          <${BallCollider} args=${[0.1]} />
        <//>
        <${RigidBody} position=${[1.5, 0, 0]} ref=${j3} ...${segmentProps}>
          <${BallCollider} args=${[0.1]} />
        <//>
        <${RigidBody} position=${[2, 0, 0]} ref=${card} ...${segmentProps} type=${dragged ? 'kinematicPosition' : 'dynamic'}>
          <${CuboidCollider} args=${[0.8, 1.125, 0.01]} />
          <group
            scale=${2.25}
            position=${[0, -1.2, -0.05]}
            onPointerOver=${() => hover(true)}
            onPointerOut=${() => hover(false)}
            onPointerUp=${e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown=${e => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            <mesh position=${shadow.pos} renderOrder=${-1}>
              <planeGeometry args=${shadow.size} />
              <meshBasicMaterial map=${shadowTex} transparent=${true} depthWrite=${false} toneMapped=${false} />
            </mesh>
            <mesh geometry=${nodes.card.geometry}>
              <meshLambertMaterial map=${cardMap} map-anisotropy=${16} toneMapped=${false} />
            </mesh>
            <mesh geometry=${nodes.clip.geometry} material=${materials.metal} material-roughness=${0.3} />
            <mesh geometry=${nodes.clamp.geometry} material=${materials.metal} />
          </group>
        <//>
      </group>
      <mesh ref=${band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest=${false}
          resolution=${isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map=${texture}
          repeat=${[-4, 1]}
          lineWidth=${lanyardWidth}
        />
      </mesh>
    <//>`;
}

// The model's atlas is 1678x1677 and the front face occupies 50% x 75.5% of it,
// so faces render at exactly 839x1266 — the size they are actually sampled at.
const FACE_W = 839;
const FACE_H = 1266;
const STRAP_TEX = 'lanyard/strap.png';
// How often to check which logo is centred under the label. The strip moves
// slowly, so this is far more often than needed to look instant.
const FOLLOW_MS = 120;

function App() {
  const [faces, setFaces] = useState(null);
  const [i, setI] = useState(0);
  // Rendering a full-width WebGL scene every frame while the user is three
  // sections away costs smoothness for nothing, so the loop parks when the
  // badge scrolls out of view.
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = document.getElementById('hm-lanyard-root');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let live = true;
    renderCardFaces(FACE_W, FACE_H).then(f => { if (live) setFaces(f); });
    return () => { live = false; };
  }, []);

  // The badge wears whichever logo is currently centred in the strip — i.e. the
  // one sitting under the "Trusted by" label. Tiles carry data-card; the one
  // logo with no badge (AIB) is untagged, so the card simply holds its previous
  // face as that tile passes rather than blanking.
  useEffect(() => {
    if (!faces || !faces.length || !onScreen) return;
    const keys = faces.map(f => f.key);
    let raf = 0, last = 0, shown = -1;

    const tick = t => {
      raf = requestAnimationFrame(tick);
      if (t - last < FOLLOW_MS) return;
      last = t;
      const strip = document.querySelector('.tb-marquee');
      if (!strip) return;
      const r = strip.getBoundingClientRect();
      if (!r.width) return;
      const mid = r.left + r.width / 2;

      let best = null, bestDist = Infinity;
      for (const el of document.querySelectorAll('.tb-tile[data-card]')) {
        const b = el.getBoundingClientRect();
        if (!b.width) continue;
        const d = Math.abs(b.left + b.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = el.dataset.card; }
      }
      if (!best) return;
      const idx = keys.indexOf(best);
      if (idx >= 0 && idx !== shown) { shown = idx; setI(idx); }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [faces, onScreen]);

  if (!faces) return null;
  return html`<${Lanyard}
    position=${[0, 0.3, 16]}
    fov=${18}
    faces=${faces}
    frontIndex=${i}
    frameloop=${onScreen ? 'always' : 'never'}
    lanyardImage=${STRAP_TEX}
    imageFit="fill"
  />`;
}

const rootEl = document.getElementById('hm-lanyard-root');
if (rootEl) createRoot(rootEl).render(html`<${App} />`);
