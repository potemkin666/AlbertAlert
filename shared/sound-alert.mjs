/**
 * Sound-alert module — plays a subtle audio cue when a critical-severity
 * alert enters the feed while the browser tab is backgrounded.
 *
 * Three configurable tones, synthesised via the Web Audio API:
 *   • klaxon  — two-tone alternating pulse
 *   • chime   — gentle rising arpeggio
 *   • newintel — short spoken-style tone burst ("new intel" feel)
 *
 * Setting stored in localStorage as the string value of the chosen tone
 * (or 'off' to disable).  Default is 'off'.
 */

const STORAGE_KEY = 'albertalert.soundAlert';
const VALID_TONES = Object.freeze(['off', 'klaxon', 'chime', 'newintel']);
const DEFAULT_TONE = 'off';
const VOLUME = 0.25;

/* ── Persistence ── */

export function loadSoundPreference() {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    return VALID_TONES.includes(raw) ? raw : DEFAULT_TONE;
  } catch { return DEFAULT_TONE; }
}

export function saveSoundPreference(value) {
  const safe = VALID_TONES.includes(value) ? value : DEFAULT_TONE;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, safe);
  } catch { /* quota / private-browsing — silently ignore */ }
  return safe;
}

/* ── Detection helpers ── */

export function isTabHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function hasCriticalAlert(alerts) {
  if (!Array.isArray(alerts)) return false;
  return alerts.some(
    (a) => a && String(a.severity || '').toLowerCase() === 'critical'
  );
}

export function hasNewCriticalAlerts(previousAlerts, currentAlerts) {
  if (!Array.isArray(currentAlerts)) return false;
  const previousIds = new Set(
    (Array.isArray(previousAlerts) ? previousAlerts : [])
      .filter((a) => a && String(a.severity || '').toLowerCase() === 'critical')
      .map((a) => a.id)
  );
  return currentAlerts.some(
    (a) =>
      a &&
      String(a.severity || '').toLowerCase() === 'critical' &&
      !previousIds.has(a.id)
  );
}

/**
 * Determine whether an alert sound should play right now.
 * All four conditions must hold:
 *   1. Sound preference is not 'off'
 *   2. Tab is currently hidden (backgrounded)
 *   3. There are new critical-severity alerts not present in the previous set
 *   4. Web Audio API is available
 */
export function shouldPlayAlert({
  preference,
  previousAlerts,
  currentAlerts,
  tabHidden
}) {
  if (!preference || preference === 'off') return false;
  if (!tabHidden) return false;
  if (!hasNewCriticalAlerts(previousAlerts, currentAlerts)) return false;
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return false;
  return true;
}

/* ── Tone synthesis ── */

function getAudioContext() {
  const Ctx = typeof AudioContext !== 'undefined'
    ? AudioContext
    : typeof globalThis.webkitAudioContext !== 'undefined'
      ? globalThis.webkitAudioContext
      : null;
  return Ctx ? new Ctx() : null;
}

function playKlaxon(ctx) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(VOLUME, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.6);
  gain.connect(ctx.destination);

  // Two alternating tones
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, now + i * 0.15);
    osc.connect(gain);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.12);
  }
}

function playChime(ctx) {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(VOLUME, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.3);
  });
}

function playNewIntel(ctx) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(VOLUME * 0.8, now);
  gain.gain.linearRampToValueAtTime(VOLUME, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + 0.4);
  gain.connect(ctx.destination);

  // Short rising burst — two quick tones
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(600, now);
  osc1.frequency.linearRampToValueAtTime(900, now + 0.15);
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.15);

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(900, now + 0.18);
  osc2.frequency.linearRampToValueAtTime(1100, now + 0.35);
  osc2.connect(gain);
  osc2.start(now + 0.18);
  osc2.stop(now + 0.35);
}

const TONE_PLAYERS = Object.freeze({
  klaxon: playKlaxon,
  chime: playChime,
  newintel: playNewIntel
});

/**
 * Play the requested alert tone.  Returns true if playback started.
 */
export function playAlertSound(tone) {
  const player = TONE_PLAYERS[tone];
  if (!player) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    player(ctx);
    return true;
  } catch {
    return false;
  }
}

/* ── Convenience: one-call entry point for the feed-poll callback ── */

/**
 * Call after every feed poll.  Plays sound when conditions are met.
 */
export function checkAndPlayAlert({ previousAlerts, currentAlerts }) {
  const preference = loadSoundPreference();
  const tabHidden = isTabHidden();
  if (shouldPlayAlert({ preference, previousAlerts, currentAlerts, tabHidden })) {
    playAlertSound(preference);
  }
}

/* ── Exports for testing ── */
export { STORAGE_KEY as _STORAGE_KEY, VALID_TONES as _VALID_TONES };
