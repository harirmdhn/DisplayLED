// ---------------------------------------------------------------------------
// AI provider: turn a selfie into a "person in a racing suit" image.
// ---------------------------------------------------------------------------
// Technique: face-swap the selfie onto a generic racing-suit base image. This
// keeps the person recognizable (pure text-to-image tends to lose likeness).
//
// MODES:
//   - 'mock'    : no FAL_KEY set. Returns the selfie unchanged so the whole
//                 flow (queue, polling, display, motion) works without a key.
//   - 'fal'     : FAL_KEY set. Calls fal.ai to do the face-swap.
//
// Set your key via environment variable or server/.env:
//   FAL_KEY=xxxxxxxx
//
// The base racing-suit image the face is swapped onto:
//   RACING_BASE_URL=https://.../racing-suit.jpg   (a generic, original image)
// If unset, mock mode is forced (we need a base to swap onto).
// ---------------------------------------------------------------------------

const FAL_KEY = process.env.FAL_KEY || '';
const RACING_BASE_URL = process.env.RACING_BASE_URL || '';

// fal.ai face-swap endpoint (queue API). You can change the model id here.
const FAL_MODEL = process.env.FAL_MODEL || 'fal-ai/face-swap';

export const PROVIDER_MODE = FAL_KEY && RACING_BASE_URL ? 'fal' : 'mock';

/**
 * @param {string} selfieDataUrl  data URL of the selfie (jpeg/png)
 * @param {{name?: string}} meta
 * @returns {Promise<string>}     data URL (or https URL) of the final image
 */
export async function generateRacingImage(selfieDataUrl, meta = {}) {
  if (PROVIDER_MODE === 'mock') {
    // Simulate processing time so the queue/"please wait" UX is realistic.
    await delay(1500);
    return selfieDataUrl;
  }
  return falFaceSwap(selfieDataUrl);
}

// --- fal.ai implementation -------------------------------------------------
async function falFaceSwap(selfieDataUrl) {
  // 1) Submit the job to fal's queue.
  const submit = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Face from the selfie, swapped onto the racing-suit base image.
      base_image_url: RACING_BASE_URL,
      swap_image_url: selfieDataUrl, // fal accepts data URLs for inputs
    }),
  });

  if (!submit.ok) {
    throw new Error(`fal submit failed: ${submit.status} ${await safeText(submit)}`);
  }
  const submitJson = await submit.json();
  const statusUrl = submitJson.status_url;
  const responseUrl = submitJson.response_url;
  if (!statusUrl || !responseUrl) {
    // Some models return the result inline.
    const inline = extractImageUrl(submitJson);
    if (inline) return inline;
    throw new Error('fal: no status_url/response_url in submit response');
  }

  // 2) Poll until completed (cap ~180s to match real-world timing).
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await delay(2500);
    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const stJson = await st.json();
    if (stJson.status === 'COMPLETED') break;
    if (stJson.status === 'FAILED' || stJson.status === 'ERROR') {
      throw new Error(`fal job failed: ${JSON.stringify(stJson).slice(0, 300)}`);
    }
  }

  // 3) Fetch the result.
  const result = await fetch(responseUrl, {
    headers: { Authorization: `Key ${FAL_KEY}` },
  });
  if (!result.ok) {
    throw new Error(`fal result failed: ${result.status} ${await safeText(result)}`);
  }
  const resultJson = await result.json();
  const img = extractImageUrl(resultJson);
  if (!img) throw new Error('fal: no image in result');
  return img;
}

// fal result shapes vary by model; try common fields.
function extractImageUrl(obj) {
  if (!obj) return null;
  if (typeof obj.image === 'string') return obj.image;
  if (obj.image && obj.image.url) return obj.image.url;
  if (Array.isArray(obj.images) && obj.images[0]) {
    return obj.images[0].url || obj.images[0];
  }
  return null;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
