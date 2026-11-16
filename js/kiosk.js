// ---------------------------------------------------------------------------
// Kiosk page: name form -> selfie capture -> submit.
// ---------------------------------------------------------------------------

import { sendEntry } from './transport.js';
import { enhanceFace } from './ai.js';
import { composite } from './composite.js';

const $ = (sel) => document.querySelector(sel);

// Steps
const stepForm = $('#step-form');
const stepCamera = $('#step-camera');
const stepPreview = $('#step-preview');
const stepDone = $('#step-done');

// Form
const nameInput = $('#name');
const toCameraBtn = $('#to-camera');

// Camera
const video = $('#video');
const canvas = $('#capture-canvas');
const shutterBtn = $('#shutter');
const cameraError = $('#camera-error');

// Preview
const previewImg = $('#preview-img');
const retakeBtn = $('#retake');
const submitBtn = $('#submit');

let stream = null;
let capturedSelfie = null; // raw selfie data URL
let personName = '';

function show(step) {
  [stepForm, stepCamera, stepPreview, stepDone].forEach((s) =>
    s.classList.add('hidden')
  );
  step.classList.remove('hidden');
}

// ---- Step 1: form ----
nameInput.addEventListener('input', () => {
  toCameraBtn.disabled = nameInput.value.trim().length < 2;
});

toCameraBtn.addEventListener('click', async () => {
  personName = nameInput.value.trim();
  show(stepCamera);
  await startCamera();
});

// ---- Step 2: camera ----
async function startCamera() {
  cameraError.classList.add('hidden');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    cameraError.textContent =
      'Could not access the camera. Please allow camera permission and reload. (' +
      (err && err.name ? err.name : 'error') +
      ')';
    cameraError.classList.remove('hidden');
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

shutterBtn.addEventListener('click', () => {
  // Capture a centered square from the video, resized down for upload.
  const size = Math.min(video.videoWidth, video.videoHeight) || 720;
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  const target = 512; // keep upload small (important for Firestore 1MB limit)
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  // Mirror so the selfie looks natural.
  ctx.translate(target, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, target, target);
  capturedSelfie = canvas.toDataURL('image/jpeg', 0.82);
  stopCamera();
  previewImg.src = capturedSelfie;
  show(stepPreview);
});

// ---- Step 3: preview ----
retakeBtn.addEventListener('click', async () => {
  capturedSelfie = null;
  show(stepCamera);
  await startCamera();
});

submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';
  try {
    // Option 1 overlay today; enhanceFace is a no-op until AI is enabled.
    const enhanced = await enhanceFace(capturedSelfie);
    const photo = await composite(enhanced);

    await sendEntry({
      name: personName,
      photo, // composited PNG data URL (head on racing figure)
      selfie: enhanced, // raw-ish selfie too, handy once AI is added
      ts: Date.now(),
    });

    show(stepDone);
    $('#done-name').textContent = personName;
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send to the big screen';
    alert('Sorry, sending failed: ' + (err && err.message ? err.message : err));
  }
});

$('#again').addEventListener('click', () => {
  // reset everything for the next person
  capturedSelfie = null;
  personName = '';
  nameInput.value = '';
  toCameraBtn.disabled = true;
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send to the big screen';
  show(stepForm);
});

// Clean up camera if the page is hidden/closed.
window.addEventListener('pagehide', stopCamera);

show(stepForm);
