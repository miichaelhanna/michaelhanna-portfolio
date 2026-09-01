// Card faces are the exported Figma artwork, rasterised in the browser at the
// exact size they occupy in the model's texture atlas — so the vector art is
// rendered once at final resolution and never resampled.
//
// The portrait is identical on all eight cards, so it is stripped from each SVG
// (replaced by a __PHOTO__ token) and shipped once: 8 x 2.4MB of duplicated
// bitmap becomes ~660KB total. The token is spliced back in at runtime because
// an SVG loaded as an <img> runs in secure static mode and cannot fetch
// external resources of its own.

// Figma exports the 716x1000 card body inset inside an 876x1160 canvas, the
// padding being room for its drop shadow. We crop back to the body.
const CANVAS = { w: 876, h: 1160 };
const BODY = { x: 80, y: 70, w: 716, h: 1000 };

const CARDS = ['santander', 'openbank', 'ikea', 'globant', 'sixflags', 'mab', 'noon', 'hanzo'];

const PHOTO = 'lanyard/cards/photo.jpg';
const cardUrl = key => `lanyard/cards/${key}.svg`;

const loadImage = src =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('failed to load ' + src));
    img.src = src;
  });

async function photoDataUri() {
  const blob = await fetch(PHOTO).then(r => r.blob());
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
}

// Force the SVG to rasterise at the target pixel size. outW/outH are applied
// independently, which also absorbs the atlas's non-square UV region — the
// artwork lands undistorted on the card without a second resampling pass.
function sizedSvg(text, photo, sx, sy) {
  const w = Math.round(CANVAS.w * sx);
  const h = Math.round(CANVAS.h * sy);
  return text
    .split('__PHOTO__').join(photo)
    .replace(/<svg([^>]*)>/, (m, attrs) => {
      const cleaned = attrs
        .replace(/\swidth="[^"]*"/, '')
        .replace(/\sheight="[^"]*"/, '')
        .replace(/\spreserveAspectRatio="[^"]*"/, '');
      // preserveAspectRatio="none" is required: with a viewBox present the
      // default ("xMidYMid meet") letterboxes instead of stretching, which
      // would offset the artwork and break the crop below.
      return `<svg${cleaned} width="${w}" height="${h}" preserveAspectRatio="none">`;
    });
}

// The card's background colour, read from the four corners inset 2% — far
// enough in to clear the 1px hairline border the export draws around the card,
// and away from any artwork. The most common of the four wins, so a corner that
// happens to carry a graphic can't skew the result.
function sampleBackground(ctx, w, h) {
  const ix = Math.round(w * 0.02);
  const iy = Math.round(h * 0.02);
  const tally = new Map();
  for (const [x, y] of [[ix, iy], [w - ix, iy], [ix, h - iy], [w - ix, h - iy]]) {
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 250) continue;                       // ignore anything not opaque
    const key = `rgb(${d[0]},${d[1]},${d[2]})`;
    tally.set(key, (tally.get(key) || 0) + 1);
  }
  let best = 'rgb(255,255,255)', top = 0;
  for (const [key, n] of tally) if (n > top) { best = key; top = n; }
  return best;
}

// Renders every card face at exactly outW x outH pixels, returning the canvas
// plus the card's background colour — sampled from the rendered corner pixel,
// so it is correct however the artwork layers its background. The compositor
// paints the card's back and edges with it.
export async function renderCardFaces(outW, outH) {
  const sx = outW / BODY.w;
  const sy = outH / BODY.h;
  const photo = await photoDataUri();

  return Promise.all(
    CARDS.map(async key => {
      const text = await fetch(cardUrl(key)).then(r => r.text());
      const url = URL.createObjectURL(
        new Blob([sizedSvg(text, photo, sx, sy)], { type: 'image/svg+xml;charset=utf-8' })
      );
      try {
        const img = await loadImage(url);
        const cv = document.createElement('canvas');
        cv.width = outW;
        cv.height = outH;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Offset so the padded canvas crops down to the card body.
        ctx.drawImage(img, -BODY.x * sx, -BODY.y * sy, Math.round(CANVAS.w * sx), Math.round(CANVAS.h * sy));
        return { key, canvas: cv, bg: sampleBackground(ctx, outW, outH) };
      } finally {
        URL.revokeObjectURL(url);
      }
    })
  );
}
