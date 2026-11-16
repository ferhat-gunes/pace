/**
 * soundFx.js - Zero-latency procedural Web Audio sound synthesizer for PACE
 * Generates tactile, joyful Duolingo-style sound effects without any external audio files.
 * Works 100% offline in PWA.
 */

let audioCtx = null;
let soundEnabled = true;

// Initialize sound preference from localStorage
try {
  const saved = localStorage.getItem('pace_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
} catch {}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem('pace_sound_enabled', String(soundEnabled));
  } catch {}
  if (soundEnabled) {
    playPop();
  }
  return soundEnabled;
}

/**
 * 1. Playful "Pop" / "Tap" sound for 3D buttons
 */
export function playPop() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const now = ctx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * 2. Cheerful "Ding / Chime" for completing a habit check-in
 */
export function playSuccess() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.055;
    const duration = 0.22;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

/**
 * 3. Energetic Level-Up / Quest Fanfare
 */
export function playFanfare() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chords = [
    { freq: 523.25, time: 0.0 }, // C5
    { freq: 659.25, time: 0.09 }, // E5
    { freq: 783.99, time: 0.18 }, // G5
    { freq: 1046.5, time: 0.28 }, // C6
    { freq: 1318.51, time: 0.38 }, // E6
  ];

  chords.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + time;
    const duration = 0.35;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.22, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

/**
 * 4. Mystery Gift / Chest Opening Sound
 */
export function playChestOpen() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Sparkling ascending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.28);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);

  setTimeout(playSuccess, 120);
}

/**
 * 5. Gentle Step Sound for + / - buttons
 */
export function playStep(up = true) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const now = ctx.currentTime;
  osc.type = 'sine';
  const startF = up ? 380 : 440;
  const endF = up ? 520 : 320;

  osc.frequency.setValueAtTime(startF, now);
  osc.frequency.exponentialRampToValueAtTime(endF, now + 0.05);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}
