const SOUND_KEY = 'scannerSoundEnabled';

let audioCtx = null;

export function isScannerSoundEnabled() {
  const v = localStorage.getItem(SOUND_KEY);
  return v !== 'false';
}

export function setScannerSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
}

export async function primeScannerAudioContext() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch {
    // noop
  }
}

function playTones(seq = []) {
  if (!isScannerSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    const ctx = audioCtx;
    const now = ctx.currentTime + 0.005;
    seq.forEach((it, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = it.type || 'sine';
      osc.frequency.value = Number(it.freq || 440);
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + Number(it.at || idx * 0.09);
      const dur = Number(it.dur || 0.08);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    });
  } catch {
    // noop
  }
}

export function playScanAccepted() {
  playTones([
    { freq: 720, at: 0, dur: 0.07, type: 'triangle' },
    { freq: 1020, at: 0.08, dur: 0.08, type: 'triangle' }
  ]);
}

export function playScanWarning() {
  playTones([
    { freq: 480, at: 0, dur: 0.09, type: 'square' },
    { freq: 360, at: 0.11, dur: 0.12, type: 'square' }
  ]);
}

export function playScanRejected() {
  playTones([
    { freq: 280, at: 0, dur: 0.14, type: 'sawtooth' },
    { freq: 220, at: 0.13, dur: 0.16, type: 'sawtooth' }
  ]);
}

export function vibrateAccepted() {
  if (navigator.vibrate) navigator.vibrate(40);
}

export function vibrateWarning() {
  if (navigator.vibrate) navigator.vibrate([45, 40, 45]);
}

export function vibrateRejected() {
  if (navigator.vibrate) navigator.vibrate([90, 55, 90]);
}

export function runScannerFeedback(resultType) {
  if (resultType === 'accepted') {
    playScanAccepted();
    vibrateAccepted();
    return;
  }
  if (resultType === 'already_scanned') {
    playScanWarning();
    vibrateWarning();
    return;
  }
  if (resultType === 'offline_pending') {
    playScanWarning();
    vibrateAccepted();
    return;
  }
  if (resultType === 'conflict') {
    playScanWarning();
    vibrateWarning();
    return;
  }
  playScanRejected();
  vibrateRejected();
}

