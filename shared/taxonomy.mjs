const sourceTopicTerms = [
  'counterterrorism.police.uk',
  'actioncounters',
  'terrorism-threat-levels',
  '/terrorism',
  '/counter-terrorism',
  '/counterterrorism',
  '/terrorist',
  'counter-terrorism-register',
  'terrorism-convictions-monitor',
  'proscribed-terror',
  'sanctions-against-terrorism',
  'terrorist-list',
  'terror offences',
  'terrorism offences'
];

export const incidentKeywords = [
  'terror', 'terrorism', 'attack', 'attacks', 'bomb', 'bombing', 'explosion', 'explosive', 'device',
  'ramming', 'stabbing', 'shooting', 'hostage', 'plot', 'suspect', 'arrest', 'arrested', 'charged',
  'charged with', 'parcel', 'radicalised', 'extremist', 'isis', 'islamic state', 'al-qaeda', 'threat'
];

export const terrorismKeywords = [
  'terror', 'terrorism', 'counter-terror', 'counter terrorism', 'terrorist', 'extremist', 'extremism',
  'radicalised', 'radicalized', 'radicalisation', 'radicalization', 'jihadist', 'jihad', 'isis',
  'islamic state', 'al-qaeda', 'far-right extremist', 'far right extremist', 'neo-nazi',
  'proscribed organisation', 'proscribed organization', 'bomb hoax', 'ira', 'dissident republican',
  'loyalist paramilitary', 'terror offences', 'terrorism offences', 'terrorist propaganda'
];

export const criticalKeywords = ['attack', 'bomb', 'bombing', 'explosion', 'explosive', 'ramming', 'shooting', 'stabbing', 'hostage'];
export const highKeywords = ['plot', 'charged', 'arrest', 'arrested', 'parcel', 'raid', 'disrupt', 'suspect'];

export const majorMediaProviders = new Set([
  'Reuters', 'The Guardian', 'BBC News', 'Associated Press', 'AP News', 'The Telegraph',
  'Financial Times', 'France 24', 'DW', 'Politico Europe', 'Euronews', 'Brussels Times',
  'The Independent', 'Irish Times', 'Politico', 'Kyiv Post', 'RFE/RL'
]);

export const tabloidProviders = new Set([
  'The Sun', 'Daily Mail', 'Daily Record', 'Belfast Telegraph', 'iNews'
]);

export function clean(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z][a-z])/g, '$1. $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesKeywords(text, words = incidentKeywords) {
  const haystack = clean(text).toLowerCase();
  return words.filter((word) => haystack.includes(word));
}

export function normaliseSourceTier(value) {
  const tier = clean(value).toLowerCase();
  return ['trigger', 'corroboration', 'context', 'research'].includes(tier) ? tier : '';
}

export function normaliseReliabilityProfile(value) {
  const profile = clean(value).toLowerCase();
  return ['official_ct', 'official_general', 'official_context', 'major_media', 'general_media', 'tabloid', 'specialist_research'].includes(profile) ? profile : '';
}

export function normaliseIncidentTrack(value) {
  const track = clean(value).toLowerCase();
  return ['live', 'case'].includes(track) ? track : '';
}

export function sourceHasTerrorTopic(input) {
  const text = typeof input === 'string'
    ? clean(input).toLowerCase()
    : clean(`${input?.name || ''} ${input?.endpoint || ''} ${input?.sourceUrl || ''} ${input?.title || ''}`).toLowerCase();
  return sourceTopicTerms.some((term) => text.includes(term));
}

export function inferSourceTier(metadata) {
  const declaredTier = normaliseSourceTier(metadata.sourceTier);
  if (declaredTier) return declaredTier;
  if (metadata.lane === 'incidents') {
    if (sourceHasTerrorTopic(metadata)) return (metadata.isTrustedOfficial || metadata.isOfficial) ? 'trigger' : 'corroboration';
    return 'corroboration';
  }
  if (metadata.lane === 'sanctions' || metadata.lane === 'oversight' || metadata.lane === 'border') return 'context';
  return (metadata.isTrustedOfficial || metadata.isOfficial) ? 'context' : 'research';
}

export function inferReliabilityProfile(metadata, sourceTier = inferSourceTier(metadata)) {
  const declaredProfile = normaliseReliabilityProfile(metadata.reliabilityProfile);
  if (declaredProfile) return declaredProfile;
  const provider = clean(metadata.provider || metadata.source);
  if (sourceTier === 'trigger') return 'official_ct';
  if ((metadata.isTrustedOfficial || metadata.isOfficial) && metadata.lane === 'incidents') return 'official_general';
  if (metadata.isTrustedOfficial || metadata.isOfficial) return 'official_context';
  if (tabloidProviders.has(provider)) return 'tabloid';
  if (majorMediaProviders.has(provider)) return 'major_media';
  if (sourceTier === 'research' || metadata.lane === 'prevention') return 'specialist_research';
  return 'general_media';
}

export function inferIncidentTrack(metadata) {
  const declared = normaliseIncidentTrack(metadata.incidentTrack);
  if (declared) return declared;
  if (metadata.lane && metadata.lane !== 'incidents') return '';
  const eventType = clean(metadata.eventType).toLowerCase();
  if (['charge', 'arrest', 'sentencing', 'recognition', 'feature'].includes(eventType)) return 'case';
  if (['active_attack', 'disrupted_plot', 'threat_update'].includes(eventType)) return 'live';
  const lower = clean(metadata.text).toLowerCase();
  if (lower.includes('police cordon') || lower.includes('evacuated') || lower.includes('explosive device') || lower.includes('ongoing')) return 'live';
  return metadata.lane === 'incidents' ? 'case' : '';
}

export function isTerrorRelevantIncident(metadata, item) {
  if (metadata.lane !== 'incidents') return true;
  const reliabilityProfile = inferReliabilityProfile(metadata);
  const text = clean(`${item?.title || ''} ${item?.summary || ''} ${item?.sourceExtract || ''}`).toLowerCase();
  const terrorHits = matchesKeywords(text, terrorismKeywords);
  const incidentHits = matchesKeywords(text, incidentKeywords);
  const terrorTopic = sourceHasTerrorTopic(metadata);
  if (reliabilityProfile === 'official_ct') return terrorHits.length >= 1 || (terrorTopic && incidentHits.length >= 1);
  if (reliabilityProfile === 'official_general') return terrorHits.length >= 1 && incidentHits.length >= 1;
  if (reliabilityProfile === 'major_media') return terrorHits.length >= 1 && incidentHits.length >= 2;
  if (reliabilityProfile === 'general_media') return terrorHits.length >= 2 && incidentHits.length >= 2;
  if (reliabilityProfile === 'tabloid') return terrorHits.length >= 2 && incidentHits.length >= 3;
  if (reliabilityProfile === 'specialist_research') return terrorHits.length >= 2 || terrorTopic;
  return terrorHits.length > 0;
}
