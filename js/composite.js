// ---------------------------------------------------------------------------
// Composite: draw the selfie "head" onto the generic racing-suit figure.
// ---------------------------------------------------------------------------
// Option 1 (simple overlay): no AI. The selfie is masked into an oval and
// placed at the head position of the SVG racing figure.
//
// Returns a data URL (PNG) of the finished composite, sized for the big screen.
// ---------------------------------------------------------------------------

const OUT_W = 900;
const OUT_H = 1200;

// Head placement on the figure (tuned to assets/driver.svg).
const HEAD = { cx: 450, cy: 300, rx: 150, ry: 185 };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draw `img` to cover a target box (like CSS object-fit: cover).
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * @param {string} selfieDataUrl  selfie as a data URL
 * @param {string} bodySrc        path to the racing figure (SVG/PNG)
 * @returns {Promise<string>}     data URL (PNG) of the composite
 */
export async function composite(selfieDataUrl, bodySrc = 'assets/driver.svg') {
  const [body, face] = await Promise.all([
    loadImage(bodySrc),
    loadImage(selfieDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');

  // 1) Body / racing suit first.
  drawCover(ctx, body, 0, 0, OUT_W, OUT_H);

  // 2) Clip to an oval and draw the face as the head.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  drawCover(
    ctx,
    face,
    HEAD.cx - HEAD.rx,
    HEAD.cy - HEAD.ry,
    HEAD.rx * 2,
    HEAD.ry * 2
  );
  ctx.restore();

  // 3) Soft edge + subtle rim light so the cutout blends a little.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL('image/png');
}
