// ---------------------------------------------------------------------------
// Kiosk page: details form -> selfie -> submit to AI queue -> wait -> done.
// ---------------------------------------------------------------------------

const $ = (sel) => document.querySelector(sel);

// Steps
const stepForm = $('#step-form');
const stepCamera = $('#step-camera');
const stepPreview = $('#step-preview');
const stepProcessing = $('#step-processing');
const stepDone = $('#step-done');

// Form fields
const nameInput = $('#name');
const emailInput = $('#email');
const phoneInput = $('#phone');
const formError = $('#form-error');
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

// Processing
const queueNote = $('#queue-note');

let stream = null;
let capturedSelfie = null;
let details = { name: '', email: '', phone: '' };
let pollTimer = null;

function show(step) {
  [stepForm, stepCamera, stepPreview, stepProcessing, stepDone].forEach((s) =>
    s.classList.add('hidden')
  );
  step.classList.remove('hidden');
}

// ---- Step 1: form validation ----
function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validPhone(v) {
  return v.replace(/[^\d]/g, '').length >= 8;
}
function checkForm() {
  const okName = nameInput.value.trim().length >= 2;
  const okEmail = validEmail(emailInput.value.trim());
  const okPhone = validPhone(phoneInput.value.trim());
  toCameraBtn.disabled = !(okName && okEmail && okPhone);
}
[nameInput, emailInput, phoneInput].forEach((el) =>
  el.addEventListener('input', () => {
    formError.classList.add('hidden');
    checkForm();
  })
);

toCameraBtn.addEventListener('click', async () => {
  details = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
  };
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
      'Could not access the camera. Allow camera permission and reload. The camera only works over HTTPS or on localhost. (' +
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
  const size = Math.min(video.videoWidth, video.videoHeight) || 720;
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  const target = 640;
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  ctx.translate(target, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, target, target);
  capturedSelfie = canvas.toDataURL('image/jpeg', 0.85);
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

submitBtn.addEventListener('click', submitToQueue);

async function submitToQueue() {
  submitBtn.disabled = true;
  show(stepProcessing);
  queueNote.textContent = '';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: details.name,
        email: details.email,
        phone: details.phone,
        selfie: capturedSelfie,
      }),
    });
    if (!res.ok) throw new Error('Server rejected the submission (' + res.status + ')');
    const { id, position } = await res.json();
    showQueue(position);
    pollStatus(id);
  } catch (err) {
    show(stepPreview);
    submitBtn.disabled = false;
    alert('Sorry, sending failed: ' + (err && err.message ? err.message : err));
  }
}

function showQueue(position) {
  if (position > 0) {
    queueNote.textContent = `You're #${position + 1} in the queue…`;
  } else {
    queueNote.textContent = 'Generating your photo…';
  }
}

function pollStatus(id) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/status/' + id);
      if (!res.ok) return;
      const data = await res.json();
      showQueue(data.position);
      if (data.status === 'done') {
        clearInterval(pollTimer);
        $('#done-name').textContent = details.name;
        show(stepDone);
      } else if (data.status === 'error') {
        clearInterval(pollTimer);
        show(stepPreview);
        submitBtn.disabled = false;
        alert('AI generation failed: ' + (data.error || 'unknown error'));
      }
    } catch {
      /* keep polling */
    }
  }, 2500);
}

// ---- Step 5: done ----
$('#again').addEventListener('click', () => {
  capturedSelfie = null;
  details = { name: '', email: '', phone: '' };
  nameInput.value = '';
  emailInput.value = '';
  phoneInput.value = '';
  toCameraBtn.disabled = true;
  submitBtn.disabled = false;
  clearInterval(pollTimer);
  show(stepForm);
});

window.addEventListener('pagehide', stopCamera);

checkForm();
show(stepForm);
