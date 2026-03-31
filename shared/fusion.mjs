import crypto from 'node:crypto';
import { clean } from './taxonomy.mjs';

const fusionStopwords = new Set([
  'the', 'a', 'an', 'and', 'of', 'to', 'in', 'for', 'on', 'with', 'from', 'at', 'by', 'over', 'under',
  'after', 'before', 'into', 'outside', 'inside', 'near', 'amid', 'during', 'update', 'updates', 'live',
  'breaking', 'latest', 'terror', 'terrorism', 'attack', 'attacks', 'incident', 'incidents', 'plot', 'plots',
  'threat', 'threats', 'suspect', 'suspects', 'arrest', 'arrested', 'charges', 'charged', 'case', 'court',
  'police', 'officials', 'official', 'man', 'woman', 'group'
]);

export function sameStoryKey(item) {
  return clean(item.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|and|of|to|in|for|on|with|from)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stableFusionTerms(item) {
  const titleTokens = sameStoryKey({ title: item.title })
    .split(' ')
    .filter(Boolean)
    .filter((token) => token.length >= 4 && !fusionStopwords.has(token));

  const summaryTokens = clean(`${item.summary || ''} ${item.sourceExtract || ''}`)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length >= 5 && !fusionStopwords.has(token));

  return [...new Set([...titleTokens, ...summaryTokens])]
    .sort()
    .slice(0, 10);
}

export function fusedIncidentIdFor(item) {
  const signature = [
    clean(item.location).toLowerCase(),
    clean(item.eventType).toLowerCase(),
    clean(item.incidentTrack).toLowerCase(),
    ...stableFusionTerms(item)
  ]
    .filter(Boolean)
    .join('|');

  const fallback = clean(`${item.title} ${item.location} ${item.eventType} ${item.incidentTrack}`).toLowerCase();
  const digest = crypto.createHash('sha1').update(signature || fallback).digest('hex').slice(0, 16);
  return `fusion-${digest}`;
}

export function sourceReferenceFor(alert) {
  return {
    fusedIncidentId: alert.fusedIncidentId,
    source: alert.source,
    sourceUrl: alert.sourceUrl,
    sourceTier: alert.sourceTier,
    reliabilityProfile: alert.reliabilityProfile,
    publishedAt: alert.publishedAt,
    confidence: alert.confidence
  };
}

export function mergeCorroboratingSources(primary, secondary) {
  const merged = [
    ...(Array.isArray(primary.corroboratingSources) ? primary.corroboratingSources : []),
    sourceReferenceFor(secondary)
  ];
  const seen = new Set();
  return merged
    .filter((entry) => clean(entry.source) && clean(entry.sourceUrl))
    .filter((entry) => {
      const key = `${clean(entry.source).toLowerCase()}|${clean(entry.sourceUrl).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime() || 0;
      const timeB = new Date(b.publishedAt).getTime() || 0;
      return timeB - timeA;
    });
}
