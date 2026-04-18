/**
 * On-device attack-type classifier.
 *
 * Classifies alert text into one of four attack-type categories —
 * vehicle, blade, IED (improvised explosive device), or shooter —
 * using weighted keyword matching across the alert's title, summary,
 * location, and source extract fields.
 *
 * Multilingual: covers English, French, German, Spanish, and Italian
 * keywords matching the taxonomy.mjs language coverage.
 *
 * Returns 'unknown' when no category reaches the confidence threshold.
 */

const ATTACK_TYPES = Object.freeze(['vehicle', 'blade', 'ied', 'shooter', 'unknown']);

/**
 * Each dictionary entry: { terms: string[], weight: number }
 * Higher weight = stronger signal.  Multi-word phrases get a bonus
 * because they are more specific.
 */
const VEHICLE_TERMS = Object.freeze([
  // English
  { term: 'vehicle ramming', weight: 10 },
  { term: 'car ramming', weight: 10 },
  { term: 'truck attack', weight: 10 },
  { term: 'van attack', weight: 10 },
  { term: 'ramming attack', weight: 9 },
  { term: 'drove into crowd', weight: 9 },
  { term: 'ploughed into', weight: 8 },
  { term: 'plowed into', weight: 8 },
  { term: 'rammed into', weight: 8 },
  { term: 'vehicle attack', weight: 8 },
  { term: 'car attack', weight: 7 },
  { term: 'ramming', weight: 5 },
  { term: 'vehicular', weight: 4 },
  // French
  { term: 'voiture-bélier', weight: 10 },
  { term: 'attaque au véhicule', weight: 9 },
  { term: 'foncé dans la foule', weight: 8 },
  { term: 'véhicule-bélier', weight: 9 },
  // German
  { term: 'fahrzeug-angriff', weight: 9 },
  { term: 'amokfahrt', weight: 9 },
  { term: 'auto-attacke', weight: 8 },
  { term: 'in die menge gefahren', weight: 8 },
  // Spanish
  { term: 'atropello masivo', weight: 9 },
  { term: 'ataque con vehículo', weight: 9 },
  { term: 'embestida', weight: 6 },
  // Italian
  { term: 'attacco con veicolo', weight: 9 },
  { term: 'auto sulla folla', weight: 8 }
]);

const BLADE_TERMS = Object.freeze([
  // English
  { term: 'knife attack', weight: 10 },
  { term: 'stabbing attack', weight: 10 },
  { term: 'machete attack', weight: 10 },
  { term: 'sword attack', weight: 10 },
  { term: 'stabbing spree', weight: 9 },
  { term: 'stabbed', weight: 7 },
  { term: 'stabbing', weight: 7 },
  { term: 'knife', weight: 4 },
  { term: 'machete', weight: 6 },
  { term: 'blade', weight: 4 },
  { term: 'slashing', weight: 6 },
  { term: 'axe attack', weight: 9 },
  // French
  { term: 'attaque au couteau', weight: 10 },
  { term: 'poignardage', weight: 8 },
  { term: 'agression au couteau', weight: 9 },
  { term: 'coup de couteau', weight: 7 },
  // German
  { term: 'messerangriff', weight: 10 },
  { term: 'messerattacke', weight: 10 },
  { term: 'messerstecherei', weight: 8 },
  // Spanish
  { term: 'ataque con cuchillo', weight: 10 },
  { term: 'apuñalamiento', weight: 8 },
  { term: 'apuñalado', weight: 7 },
  // Italian
  { term: 'accoltellamento', weight: 8 },
  { term: 'attacco con coltello', weight: 10 },
  { term: 'accoltellato', weight: 7 }
]);

const IED_TERMS = Object.freeze([
  // English
  { term: 'improvised explosive device', weight: 10 },
  { term: 'car bomb', weight: 10 },
  { term: 'suicide bomb', weight: 10 },
  { term: 'suicide bomber', weight: 10 },
  { term: 'bomb attack', weight: 9 },
  { term: 'pipe bomb', weight: 9 },
  { term: 'nail bomb', weight: 9 },
  { term: 'pressure cooker bomb', weight: 10 },
  { term: 'explosive device', weight: 9 },
  { term: 'detonated', weight: 7 },
  { term: 'detonation', weight: 7 },
  { term: 'explosion', weight: 5 },
  { term: 'explosive', weight: 5 },
  { term: 'bomb', weight: 5 },
  { term: 'bombing', weight: 6 },
  { term: 'ied', weight: 8 },
  { term: 'vest bomb', weight: 10 },
  // French
  { term: 'engin explosif improvisé', weight: 10 },
  { term: 'voiture piégée', weight: 10 },
  { term: 'kamikaze', weight: 8 },
  { term: 'attentat à la bombe', weight: 9 },
  { term: 'explosif', weight: 5 },
  // German
  { term: 'sprengstoffanschlag', weight: 10 },
  { term: 'autobombe', weight: 10 },
  { term: 'sprengstoff', weight: 6 },
  { term: 'selbstmordattentäter', weight: 10 },
  // Spanish
  { term: 'artefacto explosivo', weight: 9 },
  { term: 'coche bomba', weight: 10 },
  { term: 'terrorista suicida', weight: 9 },
  { term: 'explosivo', weight: 5 },
  // Italian
  { term: 'ordigno esplosivo', weight: 9 },
  { term: 'autobomba', weight: 10 },
  { term: 'attentatore suicida', weight: 10 },
  { term: 'esplosivo', weight: 5 }
]);

const SHOOTER_TERMS = Object.freeze([
  // English
  { term: 'mass shooting', weight: 10 },
  { term: 'shooting attack', weight: 10 },
  { term: 'active shooter', weight: 10 },
  { term: 'gun attack', weight: 9 },
  { term: 'gunman', weight: 8 },
  { term: 'gunfire', weight: 7 },
  { term: 'shooting spree', weight: 9 },
  { term: 'shooting', weight: 5 },
  { term: 'shooter', weight: 6 },
  { term: 'opened fire', weight: 8 },
  { term: 'firearms', weight: 4 },
  { term: 'shots fired', weight: 7 },
  { term: 'automatic weapon', weight: 8 },
  { term: 'assault rifle', weight: 7 },
  // French
  { term: 'fusillade', weight: 8 },
  { term: 'tireur', weight: 6 },
  { term: 'tirs', weight: 5 },
  { term: 'attaque armée', weight: 9 },
  // German
  { term: 'schießerei', weight: 8 },
  { term: 'amokläufer', weight: 9 },
  { term: 'schusswaffenangriff', weight: 10 },
  { term: 'schüsse', weight: 5 },
  // Spanish
  { term: 'tiroteo masivo', weight: 10 },
  { term: 'tiroteo', weight: 6 },
  { term: 'tiroteador', weight: 7 },
  // Italian
  { term: 'sparatoria', weight: 7 },
  { term: 'sparatoria di massa', weight: 10 },
  { term: 'strage con armi da fuoco', weight: 10 }
]);

const CATEGORY_DICTIONARIES = Object.freeze([
  { type: 'vehicle', terms: VEHICLE_TERMS },
  { type: 'blade', terms: BLADE_TERMS },
  { type: 'ied', terms: IED_TERMS },
  { type: 'shooter', terms: SHOOTER_TERMS }
]);

/** Minimum total weight for a category to be considered a match. */
const CONFIDENCE_THRESHOLD = 6;

/**
 * Build a searchable text corpus from an alert's text fields.
 * @param {object} alert — normalised or raw alert object
 * @returns {string} lowercased text for keyword matching
 */
function alertText(alert) {
  if (!alert) return '';
  return [
    alert.title,
    alert.summary,
    alert.aiSummary,
    alert.sourceExtract,
    alert.location
  ]
    .filter(Boolean)
    .map((v) => String(v))
    .join(' ')
    .toLowerCase();
}

/**
 * Score an alert's text against a single category dictionary.
 * Uses word-boundary-aware matching for short terms (≤6 chars)
 * and simple inclusion for longer phrases.
 * @param {string} text — lowercased alert corpus
 * @param {Array<{term: string, weight: number}>} dictionary
 * @returns {number} aggregate score
 */
function scoreCategoryTerms(text, dictionary) {
  let total = 0;
  for (const { term, weight } of dictionary) {
    const lower = term.toLowerCase();
    const idx = text.indexOf(lower);
    if (idx === -1) continue;

    // For short terms, require word-boundary to prevent false positives
    // e.g. "bomb" should not match "bombastic"
    if (lower.length <= 6) {
      const before = idx === 0 || /\W/.test(text[idx - 1]);
      const afterIdx = idx + lower.length;
      const after = afterIdx >= text.length || /\W/.test(text[afterIdx]);
      if (!before || !after) continue;
    }

    total += weight;
  }
  return total;
}

/**
 * Classify an alert's text into an attack type.
 *
 * @param {object} alert — alert object with title, summary, etc.
 * @returns {{ type: string, scores: Record<string, number> }}
 *   type: one of 'vehicle' | 'blade' | 'ied' | 'shooter' | 'unknown'
 *   scores: per-category scores for debugging/testing
 */
export function classifyAttackType(alert) {
  const text = alertText(alert);
  if (!text.trim()) return { type: 'unknown', scores: {} };

  const scores = {};
  let bestType = 'unknown';
  let bestScore = 0;

  for (const { type, terms } of CATEGORY_DICTIONARIES) {
    const score = scoreCategoryTerms(text, terms);
    scores[type] = score;
    if (score >= CONFIDENCE_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return { type: bestType, scores };
}

/**
 * Convenience: return just the type string.
 */
export function attackTypeLabel(alert) {
  return classifyAttackType(alert).type;
}

/**
 * Human-readable label for the attack type.
 */
const ATTACK_TYPE_LABELS = Object.freeze({
  vehicle: 'Vehicle',
  blade: 'Blade',
  ied: 'IED',
  shooter: 'Shooter',
  unknown: 'Unknown'
});

export function attackTypeDisplayLabel(type) {
  return ATTACK_TYPE_LABELS[type] || 'Unknown';
}

/**
 * Emoji / unicode icon for the attack type, used as the map dot overlay.
 */
const ATTACK_TYPE_ICONS = Object.freeze({
  vehicle: '🚗',
  blade: '🔪',
  ied: '💣',
  shooter: '🔫'
});

export function attackTypeIcon(type) {
  return ATTACK_TYPE_ICONS[type] || '';
}

/* ── Exports for testing ── */
export {
  ATTACK_TYPES as _ATTACK_TYPES,
  CONFIDENCE_THRESHOLD as _CONFIDENCE_THRESHOLD,
  CATEGORY_DICTIONARIES as _CATEGORY_DICTIONARIES,
  alertText as _alertText,
  scoreCategoryTerms as _scoreCategoryTerms,
  ATTACK_TYPE_ICONS as _ATTACK_TYPE_ICONS,
  ATTACK_TYPE_LABELS as _ATTACK_TYPE_LABELS
};
