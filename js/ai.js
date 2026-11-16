// ---------------------------------------------------------------------------
// AI face generation — PLACEHOLDER for the future Option (step 2).
// ---------------------------------------------------------------------------
// Right now this just returns the selfie unchanged, so the app runs fully with
// the simple overlay (Option 1).
//
// Later, swap the body of `enhanceFace` to call an image-generation / face-swap
// API (e.g. Replicate, Stability, fal.ai, or a hosted face-swap model). Keep the
// same signature — it takes a selfie data URL and resolves to a data URL — so
// nothing else in the app has to change.
// ---------------------------------------------------------------------------

export const AI_ENABLED = false;

/**
 * @param {string} selfieDataUrl
 * @returns {Promise<string>} a (possibly transformed) image data URL
 */
export async function enhanceFace(selfieDataUrl) {
  if (!AI_ENABLED) return selfieDataUrl;

  // Example shape for later (do NOT ship API keys in client code — proxy via
  // the Node server in Option B, or a serverless function):
  //
  //   const res = await fetch('/api/face', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ image: selfieDataUrl }),
  //   });
  //   const { image } = await res.json();
  //   return image;

  return selfieDataUrl;
}
