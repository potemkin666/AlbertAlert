import {
  clean,
  incidentKeywords,
  terrorismKeywords,
  matchesKeywords,
  normaliseSourceTier,
  normaliseReliabilityProfile,
  normaliseIncidentTrack,
  inferReliabilityProfile,
  inferIncidentTrack,
  isTerrorRelevantIncident
} from './taxonomy.mjs';
import { laneLabels } from './ui-data.mjs';

export function formatAgeFrom(dateLike) {
  if (!dateLike) return 'age unknown';
  const stamp = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(stamp.getTime())) return 'age unknown';
  const diffMinutes = Math.max(0, Math.round((Date.now() - stamp.getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function severityLabel(severity) {
  return clean(severity).charAt(0).toUpperCase() + clean(severity).slice(1);
}

export function regionLabel(region) {
  return region === 'uk' ? 'UK' : 'EU';
}

export function inferGeoPoint(alert, geoLookup = []) {
  const haystack = `${clean(alert.location)} ${clean(alert.title)} ${clean(alert.summary)}`.toLowerCase();
  const match = geoLookup.find((entry) => entry.terms.some((term) => haystack.includes(term)));
  if (match) return { lat: match.lat, lng: match.lng };
  return null;
}

export function keywordMatches(alert) {
  return matchesKeywords(`${alert.title} ${alert.summary} ${alert.aiSummary}`, incidentKeywords);
}

export function terrorismMatches(alert) {
  return matchesKeywords(`${alert.title} ${alert.summary} ${alert.aiSummary} ${alert.sourceExtract}`, terrorismKeywords);
}

export function isTerrorRelevant(alert) {
  if (typeof alert.isTerrorRelevant === 'boolean') return alert.isTerrorRelevant;
  return isTerrorRelevantIncident(
    {
      lane: alert.lane,
      sourceTier: alert.sourceTier,
      reliabilityProfile: alert.reliabilityProfile,
      isOfficial: alert.isOfficial,
      source: alert.source,
      sourceUrl: alert.sourceUrl,
      title: alert.title
    },
    {
      title: alert.title,
      summary: alert.summary,
      sourceExtract: alert.sourceExtract
    }
  );
}

function looksGenericSummary(text) {
  const summary = clean(text).toLowerCase();
  return !summary ||
    summary.includes('matched the incident watch logic') ||
    summary.includes('the immediate value is source validation') ||
    summary.includes('should be read as') ||
    summary.includes('contextual monitoring item');
}

function articleBodyBits(alert) {
  const base = clean(alert.sourceExtract || (alert.summary && alert.summary !== alert.title ? alert.summary : ''));
  return base
    .split(/(?<=[.!?])\s+|\s{2,}/)
    .map((part) => clean(part))
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .slice(0, 14);
}

function buildIncidentSummary(alert) {
  const bodyBits = articleBodyBits(alert);
  if (bodyBits.length) {
    return bodyBits.join(' ');
  }
  return alert.title;
}

function extractPeopleInvolved(alert) {
  if (Array.isArray(alert.peopleInvolved) && alert.peopleInvolved.length) {
    return alert.peopleInvolved;
  }
  const sourceText = clean(alert.sourceExtract || alert.summary || '');
  const sentences = sourceText.split(/(?<=[.!?])\s+/).map((part) => clean(part)).filter(Boolean);
  const blocked = [
    'The Telegraph', 'The Guardian', 'Daily Mail', 'The Sun', 'Reuters', 'Europol', 'Eurojust', 'GOV.UK',
    'Counter Terrorism Policing', 'Crown Prosecution Service', 'Bank Of America', 'United Kingdom', 'Middle East',
    "St James's Hospital", 'St James Hospital', 'Paris', 'Leeds', 'Europe', 'Iran', 'Lebanon', 'Israel',
    'France', 'Iranian', 'Proxies', 'Foiled', 'Terror', 'Attack'
  ];
  const matches = [...sourceText.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})\b/g)]
    .map((match) => clean(match[1]))
    .filter((name, index, all) => all.indexOf(name) === index)
    .filter((name) => !blocked.includes(name))
    .filter((name) => name.split(' ').every((word) => !blocked.includes(word)));

  const people = matches.slice(0, 4).map((name) => {
    const context = sentences.find((sentence) => sentence.includes(name));
    return context ? `${name}: ${context}` : name;
  });

  return people.length ? people : [];
}

export function effectiveSummary(alert) {
  return looksGenericSummary(alert.aiSummary) ? buildIncidentSummary(alert) : alert.aiSummary;
}

function alertPublishedTime(alert) {
  const raw = clean(alert.publishedAt || alert.happenedWhen || alert.time);
  if (!raw) return 0;
  const stamp = new Date(raw);
  return Number.isNaN(stamp.getTime()) ? 0 : stamp.getTime();
}

function alertAgeHours(alert) {
  const publishedTime = alertPublishedTime(alert);
  if (!publishedTime) return Infinity;
  return Math.max(0, (Date.now() - publishedTime) / 3600000);
}

function freshnessBucketForAlert(alert) {
  if (Number.isFinite(alert.freshnessBucket)) return alert.freshnessBucket;
  const ageHours = alertAgeHours(alert);
  if (alert.lane === 'incidents') {
    if (ageHours <= 2) return 5;
    if (ageHours <= 6) return 4;
    if (ageHours <= 12) return 3;
    if (ageHours <= 24) return 2;
    if (ageHours <= 72) return 1;
    return 0;
  }
  if (ageHours <= 24) return 3;
  if (ageHours <= 72) return 2;
  if (ageHours <= 168) return 1;
  return 0;
}

function sourceTierRank(alert) {
  const tier = normaliseSourceTier(alert.sourceTier);
  if (tier === 'trigger') return 4;
  if (tier === 'corroboration') return 3;
  if (tier === 'context') return 2;
  if (tier === 'research') return 1;
  return 0;
}

export function resolvedIncidentTrack(alert) {
  return normaliseIncidentTrack(alert.incidentTrack) || inferIncidentTrack({
    ...alert,
    lane: ['incidents', 'context', 'sanctions', 'oversight', 'border', 'prevention'].includes(alert.lane) ? alert.lane : 'incidents',
    text: `${clean(alert.title)} ${clean(alert.summary)} ${clean(alert.sourceExtract)}`
  });
}

export function resolvedReliabilityProfile(alert) {
  return normaliseReliabilityProfile(alert.reliabilityProfile) || inferReliabilityProfile({
    ...alert,
    sourceTier: normaliseSourceTier(alert.sourceTier),
    isOfficial: !!alert.isOfficial,
    lane: ['incidents', 'context', 'sanctions', 'oversight', 'border', 'prevention'].includes(alert.lane) ? alert.lane : 'incidents',
    source: clean(alert.source) || 'Unknown source'
  });
}

function incidentScore(alert) {
  if (Number.isFinite(alert.priorityScore)) return alert.priorityScore;
  if (!isTerrorRelevant(alert)) return -1;
  const matches = keywordMatches(alert);
  let score = matches.length;
  if (alert.lane === 'incidents') score += 3;
  if (alert.severity === 'critical') score += 3;
  if (alert.severity === 'high') score += 2;
  if (alert.major) score += 2;
  const profile = resolvedReliabilityProfile(alert);
  if (profile === 'official_ct') score += 3;
  else if (profile === 'official_general') score += 2.5;
  else if (profile === 'major_media') score += 1.5;
  else if (profile === 'tabloid') score -= 1;
  return score;
}

function incidentTrackRank(alert) {
  const track = resolvedIncidentTrack(alert);
  if (track === 'live') return 2;
  if (track === 'case') return 1;
  return 0;
}

export function isLiveIncidentCandidate(alert) {
  if (alert.lane !== 'incidents') return false;
  if (!isTerrorRelevant(alert)) return false;
  const tier = normaliseSourceTier(alert.sourceTier);
  if (tier === 'context' || tier === 'research') return false;
  const incidentTrack = resolvedIncidentTrack(alert);
  if (incidentTrack && incidentTrack !== 'live') return false;
  if (alertAgeHours(alert) > 72) return false;
  if (alert.freshUntil) {
    const freshUntil = new Date(alert.freshUntil);
    if (!Number.isNaN(freshUntil.getTime()) && freshUntil.getTime() < Date.now()) return false;
  }
  if (alert.eventType && ['sanctions_update', 'oversight_update', 'border_security_update', 'prevention_update', 'context_update'].includes(alert.eventType)) return false;
  if (alert.needsHumanReview && !alert.isOfficial && (alert.confidenceScore || 0) < 0.75) return false;
  return incidentScore(alert) >= 6;
}

export function quarantineReason(alert) {
  const terrorHits = Array.isArray(alert.terrorismHits) && alert.terrorismHits.length ? alert.terrorismHits : terrorismMatches(alert);
  const incidentHits = keywordMatches(alert);
  if (alert.needsHumanReview) return 'Needs human review';
  if (!isTerrorRelevant(alert) && incidentHits.length) return 'Incident wording without clear terrorism signal';
  if (!alert.isOfficial && Number(alert.confidenceScore || 0) > 0 && Number(alert.confidenceScore || 0) < 0.8) return 'Secondary source with weak confidence';
  if (!terrorHits.length && incidentHits.length >= 2) return 'Keyword-led match from a broad source';
  if (normaliseSourceTier(alert.sourceTier) !== 'trigger' && alert.lane === 'incidents') return 'Non-trigger source awaiting corroboration';
  return 'Borderline incident relevance';
}

export function isQuarantineCandidate(alert) {
  if (alert.lane !== 'incidents') return false;
  if (isLiveIncidentCandidate(alert)) return false;
  const incidentHits = keywordMatches(alert);
  const terrorHits = Array.isArray(alert.terrorismHits) && alert.terrorismHits.length ? alert.terrorismHits : terrorismMatches(alert);
  const confidence = Number(alert.confidenceScore || 0);
  const tier = normaliseSourceTier(alert.sourceTier);
  const notClearlyTerror = !isTerrorRelevant(alert) && incidentHits.length > 0;
  const weakSecondarySignal = !alert.isOfficial && ((confidence > 0 && confidence < 0.8) || alert.needsHumanReview);
  const broadSourceKeywordMatch = tier !== 'trigger' && incidentHits.length >= 2;
  const thinTerrorCase = terrorHits.length > 0 && incidentScore(alert) < 6;
  return notClearlyTerror || weakSecondarySignal || broadSourceKeywordMatch || thinTerrorCase;
}

export function sortAlertsByFreshness(alertList) {
  const ranking = { critical: 4, high: 3, elevated: 2, moderate: 1 };
  return [...alertList].sort((a, b) => {
    const freshnessGap = freshnessBucketForAlert(b) - freshnessBucketForAlert(a);
    if (freshnessGap !== 0) return freshnessGap;
    const trackGap = incidentTrackRank(b) - incidentTrackRank(a);
    if (trackGap !== 0) return trackGap;
    const tierGap = sourceTierRank(b) - sourceTierRank(a);
    if (tierGap !== 0) return tierGap;
    const timeGap = alertPublishedTime(b) - alertPublishedTime(a);
    if (timeGap !== 0) return timeGap;
    const scoreGap = incidentScore(b) - incidentScore(a);
    if (scoreGap !== 0) return scoreGap;
    if (!!a.major !== !!b.major) return a.major ? -1 : 1;
    return ranking[b.severity] - ranking[a.severity];
  });
}

export function isStrictTopAlertCandidate(alert) {
  return isLiveIncidentCandidate(alert)
    && normaliseSourceTier(alert.sourceTier) === 'trigger'
    && normaliseReliabilityProfile(alert.reliabilityProfile) === 'official_ct';
}

export function contextLabel(alert) {
  if (alert.lane === 'incidents' && resolvedIncidentTrack(alert) === 'case') return 'Case / Prosecution';
  if (alert.lane === 'context') return 'Context / Corroboration';
  return laneLabels[alert.lane] || alert.lane;
}

function reliabilityLabel(profile) {
  const labels = {
    official_ct: 'Official CT',
    official_general: 'Official',
    official_context: 'Official context',
    major_media: 'Major media',
    general_media: 'General media',
    tabloid: 'Tabloid',
    specialist_research: 'Specialist research'
  };
  return labels[profile] || 'Unknown';
}

function clockDisplay(dateLike) {
  if (!dateLike) return 'unconfirmed';
  const stamp = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(stamp.getTime())) return 'unconfirmed';
  const diffMinutes = Math.max(0, Math.round((Date.now() - stamp.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h ago` : `${days}d ago`;
}

function sceneClockStamp(dateLike) {
  if (!dateLike) return 'Timestamp unconfirmed';
  const stamp = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(stamp.getTime())) return 'Timestamp unconfirmed';
  return stamp.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function isOfficialProfile(profile) {
  return clean(profile).startsWith('official_');
}

function sourceStack(alert) {
  const corroborating = Array.isArray(alert.corroboratingSources) ? alert.corroboratingSources : [];
  return [
    {
      source: alert.source,
      sourceUrl: alert.sourceUrl,
      publishedAt: alert.publishedAt,
      reliabilityProfile: resolvedReliabilityProfile(alert),
      sourceTier: normaliseSourceTier(alert.sourceTier),
      isPrimary: true
    },
    ...corroborating.map((entry) => ({
      ...entry,
      isPrimary: false
    }))
  ].filter((entry) => clean(entry.publishedAt));
}

export function buildSceneClock(alert) {
  const stack = sourceStack(alert);
  const timed = stack
    .map((entry) => ({ ...entry, timeMs: new Date(entry.publishedAt).getTime() }))
    .filter((entry) => Number.isFinite(entry.timeMs));
  const firstReport = timed.length ? timed.reduce((min, entry) => (entry.timeMs < min.timeMs ? entry : min)) : null;
  const lastOfficial = timed.filter((entry) => isOfficialProfile(entry.reliabilityProfile)).sort((a, b) => b.timeMs - a.timeMs)[0] || null;
  const lastCorroboration = timed.filter((entry) => !entry.isPrimary).sort((a, b) => b.timeMs - a.timeMs)[0] || null;
  return { firstReport, lastOfficial, lastCorroboration };
}

export function renderSceneClock(alert) {
  const clock = buildSceneClock(alert);
  const items = [
    { label: 'Since first report', entry: clock.firstReport, fallback: 'No report timestamp confirmed yet.' },
    { label: 'Since last official update', entry: clock.lastOfficial, fallback: 'No official update has been attached yet.' },
    { label: 'Since last corroboration', entry: clock.lastCorroboration, fallback: 'No corroborating source has landed yet.' }
  ];
  return `<div class="scene-clock-grid">${items.map(({ label, entry, fallback }) => `
    <article class="scene-clock-item">
      <strong>${label}</strong>
      <p>${entry ? `${clockDisplay(entry.publishedAt)} | ${sceneClockStamp(entry.publishedAt)}${entry.source ? ` | ${entry.source}` : ''}` : fallback}</p>
    </article>`).join('')}</div>`;
}

export function buildAuditBlock(alert) {
  const terrorTerms = Array.isArray(alert.terrorismHits) && alert.terrorismHits.length ? alert.terrorismHits : terrorismMatches(alert);
  const age = alert.publishedAt ? formatAgeFrom(alert.publishedAt) : 'age unknown';
  return [
    `SOURCE TIER: ${normaliseSourceTier(alert.sourceTier) || 'unclassified'}`,
    `RELIABILITY PROFILE: ${reliabilityLabel(resolvedReliabilityProfile(alert))}`,
    `AGE: ${age}`,
    `LANE REASON: ${clean(alert.laneReason) || contextLabel(alert)}`,
    terrorTerms.length ? `TERROR TERMS HIT: ${terrorTerms.join(', ')}` : 'TERROR TERMS HIT: none',
    `CORROBORATION COUNT: ${Number(alert.corroborationCount || 0)}`
  ].join('\n');
}

export function renderCorroboratingSources(alert) {
  const sources = Array.isArray(alert.corroboratingSources) ? alert.corroboratingSources : [];
  if (!sources.length) {
    return "<p class='panel-copy'>No additional corroborating sources are attached to this incident yet.</p>";
  }
  return `<div class="corroboration-list">${sources.map((entry) => `
    <article class="corroboration-item">
      <a href="${entry.sourceUrl}" target="_blank" rel="noreferrer">${entry.source}</a>
      <p>${reliabilityLabel(normaliseReliabilityProfile(entry.reliabilityProfile))} | ${clean(entry.sourceTier) || 'source tier unknown'} | ${clean(entry.publishedAt) ? formatAgeFrom(entry.publishedAt) : 'age unknown'}</p>
    </article>`).join('')}</div>`;
}

export function buildBriefing(alert, summaryText) {
  const matches = Array.isArray(alert.terrorismHits) && alert.terrorismHits.length ? alert.terrorismHits : terrorismMatches(alert);
  const peopleInvolved = extractPeopleInvolved(alert);
  const sceneClock = buildSceneClock(alert);
  return [
    `WHAT: ${alert.title}`,
    `WHERE: ${alert.location}`,
    `WHEN: ${alert.happenedWhen || alert.time}`,
    `SOURCE: ${alert.source}`,
    `CONFIDENCE: ${alert.confidence}`,
    `LANE: ${laneLabels[alert.lane] || alert.lane}`,
    alert.lane === 'incidents' && resolvedIncidentTrack(alert) ? `INCIDENT TRACK: ${resolvedIncidentTrack(alert) === 'live' ? 'Live incident' : 'Case / prosecution'}` : '',
    alert.eventType ? `EVENT TYPE: ${clean(alert.eventType).replace(/_/g, ' ')}` : '',
    alert.geoPrecision ? `GEO PRECISION: ${alert.geoPrecision}` : '',
    Number(alert.corroborationCount || 0) ? `CORROBORATION COUNT: ${alert.corroborationCount}` : '',
    '',
    'SCENE CLOCK:',
    `FIRST REPORT: ${sceneClock.firstReport ? `${clockDisplay(sceneClock.firstReport.publishedAt)} | ${sceneClockStamp(sceneClock.firstReport.publishedAt)}` : 'Unconfirmed'}`,
    `LAST OFFICIAL UPDATE: ${sceneClock.lastOfficial ? `${clockDisplay(sceneClock.lastOfficial.publishedAt)} | ${sceneClockStamp(sceneClock.lastOfficial.publishedAt)}` : 'No official update yet'}`,
    `LAST CORROBORATION: ${sceneClock.lastCorroboration ? `${clockDisplay(sceneClock.lastCorroboration.publishedAt)} | ${sceneClockStamp(sceneClock.lastCorroboration.publishedAt)}` : 'No corroboration yet'}`,
    '',
    peopleInvolved.length ? ['PEOPLE INVOLVED:', ...peopleInvolved, ''] : [],
    'SUMMARY:',
    summaryText,
    '',
    matches.length ? `TRIGGER KEYWORDS: ${matches.join(', ')}` : '',
    `ORIGINAL LINK: ${alert.sourceUrl}`
  ].flat().filter(Boolean).join('\n');
}

export function normaliseAlert(alert, index, geoLookup = []) {
  const geoPoint = inferGeoPoint(alert, geoLookup);
  const lane = ['incidents', 'context', 'sanctions', 'oversight', 'border', 'prevention'].includes(alert.lane) ? alert.lane : 'incidents';
  const sourceTier = normaliseSourceTier(alert.sourceTier);
  const reliabilityProfile = normaliseReliabilityProfile(alert.reliabilityProfile) || inferReliabilityProfile({
    ...alert,
    sourceTier,
    isOfficial: !!alert.isOfficial,
    lane,
    source: clean(alert.source) || 'Unknown source'
  });
  const incidentTrack = normaliseIncidentTrack(alert.incidentTrack) || inferIncidentTrack({
    ...alert,
    lane,
    text: `${clean(alert.title)} ${clean(alert.summary)} ${clean(alert.sourceExtract)}`
  });
  return {
    id: clean(alert.id) || `live-${index}`,
    title: clean(alert.title) || 'Untitled source item',
    location: clean(alert.location) || (alert.region === 'uk' ? 'United Kingdom' : 'Europe'),
    region: alert.region === 'uk' ? 'uk' : 'europe',
    lane,
    severity: ['critical', 'high', 'elevated', 'moderate'].includes(alert.severity) ? alert.severity : 'moderate',
    status: clean(alert.status) || 'Update',
    actor: clean(alert.actor) || clean(alert.source),
    subject: clean(alert.subject) || clean(alert.source),
    happenedWhen: clean(alert.happenedWhen) || clean(alert.time),
    confidence: clean(alert.confidence) || 'Source update',
    summary: clean(alert.summary) || clean(alert.title),
    aiSummary: clean(alert.aiSummary) || clean(alert.summary) || clean(alert.title),
    sourceExtract: clean(alert.sourceExtract),
    peopleInvolved: Array.isArray(alert.peopleInvolved) ? alert.peopleInvolved.filter(Boolean) : [],
    source: clean(alert.source) || 'Unknown source',
    sourceUrl: clean(alert.sourceUrl) || '#',
    time: clean(alert.time) || clean(alert.happenedWhen) || 'Now',
    lat: Number.isFinite(alert.lat) ? alert.lat : (geoPoint?.lat ?? (alert.region === 'uk' ? 54.5 : 54)),
    lng: Number.isFinite(alert.lng) ? alert.lng : (geoPoint?.lng ?? (alert.region === 'uk' ? -2.5 : 15)),
    major: !!alert.major,
    eventType: clean(alert.eventType),
    geoPrecision: clean(alert.geoPrecision),
    isOfficial: !!alert.isOfficial,
    sourceTier,
    reliabilityProfile,
    incidentTrack,
    isDuplicateOf: clean(alert.isDuplicateOf),
    freshUntil: clean(alert.freshUntil),
    needsHumanReview: !!alert.needsHumanReview,
    priorityScore: Number.isFinite(alert.priorityScore) ? alert.priorityScore : null,
    confidenceScore: Number.isFinite(alert.confidenceScore) ? alert.confidenceScore : null,
    publishedAt: clean(alert.publishedAt),
    freshnessBucket: Number.isFinite(alert.freshnessBucket) ? alert.freshnessBucket : null,
    terrorismHits: Array.isArray(alert.terrorismHits) ? alert.terrorismHits.filter(Boolean) : [],
    isTerrorRelevant: typeof alert.isTerrorRelevant === 'boolean' ? alert.isTerrorRelevant : null,
    laneReason: clean(alert.laneReason),
    corroboratingSources: Array.isArray(alert.corroboratingSources) ? alert.corroboratingSources.filter(Boolean).map((entry) => ({
      source: clean(entry.source),
      sourceUrl: clean(entry.sourceUrl),
      sourceTier: normaliseSourceTier(entry.sourceTier),
      reliabilityProfile: normaliseReliabilityProfile(entry.reliabilityProfile),
      publishedAt: clean(entry.publishedAt),
      confidence: clean(entry.confidence)
    })) : [],
    corroborationCount: Number.isFinite(alert.corroborationCount) ? alert.corroborationCount : 0
  };
}
