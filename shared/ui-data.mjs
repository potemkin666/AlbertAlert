export const watchLayerLabels = {
  transport: 'Transport hubs',
  embassy: 'Embassies',
  hospital: 'Hospitals',
  worship: 'Places of worship',
  government: 'Government sites'
};

export const watchGeographySites = [
  { id: 'heathrow-airport', name: 'Heathrow Airport', category: 'transport', lat: 51.4700, lng: -0.4543, region: 'uk', note: 'Major UK aviation hub with national symbolic and economic significance.' },
  { id: 'st-pancras', name: 'St Pancras International', category: 'transport', lat: 51.5314, lng: -0.1261, region: 'uk', note: 'Cross-border rail hub and dense public footfall site in central London.' },
  { id: 'kings-cross', name: "King's Cross Station", category: 'transport', lat: 51.5308, lng: -0.1238, region: 'uk', note: 'Major interchange and historically relevant transport target environment.' },
  { id: 'manchester-airport', name: 'Manchester Airport', category: 'transport', lat: 53.3650, lng: -2.2726, region: 'uk', note: 'High-throughput northern aviation hub with international connectivity.' },
  { id: 'us-embassy-london', name: 'US Embassy London', category: 'embassy', lat: 51.4875, lng: -0.1260, region: 'uk', note: 'High-profile allied diplomatic site with symbolic and protest relevance.' },
  { id: 'israeli-embassy-london', name: 'Israeli Embassy London', category: 'embassy', lat: 51.5009, lng: -0.1926, region: 'uk', note: 'Diplomatic site with elevated risk during Middle East escalation.' },
  { id: 'french-embassy-london', name: 'French Embassy London', category: 'embassy', lat: 51.4952, lng: -0.1527, region: 'uk', note: 'Prominent diplomatic location close to other symbolic central-London assets.' },
  { id: 'st-thomas-hospital', name: "St Thomas' Hospital", category: 'hospital', lat: 51.4981, lng: -0.1187, region: 'uk', note: 'Major London hospital close to Westminster and dense civic activity.' },
  { id: 'royal-london-hospital', name: 'Royal London Hospital', category: 'hospital', lat: 51.5194, lng: -0.0597, region: 'uk', note: 'Large urban trauma hospital in a dense eastern-London environment.' },
  { id: 'st-james-leeds', name: "St James's University Hospital", category: 'hospital', lat: 53.8076, lng: -1.5208, region: 'uk', note: 'Major Leeds hospital with direct relevance to past terrorism-linked reporting.' },
  { id: 'central-synagogue-london', name: 'Central Synagogue London', category: 'worship', lat: 51.5232, lng: -0.1690, region: 'uk', note: 'Representative central-London Jewish communal site for posture awareness.' },
  { id: 'east-london-mosque', name: 'East London Mosque', category: 'worship', lat: 51.5177, lng: -0.0713, region: 'uk', note: 'Large and visible Muslim place of worship in a dense urban area.' },
  { id: 'westminster-abbey', name: 'Westminster Abbey', category: 'worship', lat: 51.4993, lng: -0.1273, region: 'uk', note: 'Nationally symbolic religious site with ceremonial and tourist significance.' },
  { id: 'downing-street', name: '10 Downing Street', category: 'government', lat: 51.5034, lng: -0.1276, region: 'uk', note: 'Prime ministerial office and one of the most symbolic UK government locations.' },
  { id: 'palace-of-westminster', name: 'Palace of Westminster', category: 'government', lat: 51.4995, lng: -0.1248, region: 'uk', note: 'Parliamentary complex with exceptional symbolic and constitutional significance.' },
  { id: 'new-scotland-yard', name: 'New Scotland Yard', category: 'government', lat: 51.4957, lng: -0.1439, region: 'uk', note: 'Metropolitan Police headquarters and visible security/government node.' },
  { id: 'european-parliament-brussels', name: 'European Parliament Brussels', category: 'government', lat: 50.8382, lng: 4.3755, region: 'europe', note: 'High-value EU institutional site and symbolic governance target.' },
  { id: 'berlaymont', name: 'Berlaymont Building', category: 'government', lat: 50.8430, lng: 4.3826, region: 'europe', note: 'European Commission headquarters and key Brussels symbolic site.' },
  { id: 'us-embassy-paris', name: 'US Embassy Paris', category: 'embassy', lat: 48.8696, lng: 2.3176, region: 'europe', note: 'Prominent diplomatic site in central Paris with historic targeting relevance.' },
  { id: 'gare-du-nord', name: 'Gare du Nord', category: 'transport', lat: 48.8809, lng: 2.3553, region: 'europe', note: 'High-footfall international rail station in Paris.' }
];

export const laneLabels = {
  all: 'All lanes',
  incidents: 'Incidents',
  context: 'Context',
  sanctions: 'Sanctions',
  oversight: 'Oversight',
  border: 'Border',
  prevention: 'Prevention'
};

const albertQuoteOpeners = [
  'Stay steady',
  'Hold your nerve',
  'Keep your footing',
  'Move with intent',
  'Trust your training',
  'Lead with calm',
  'Read the room',
  'Think before you surge',
  'Stand tall',
  'Keep the signal clean',
  'Anchor the team',
  'Breathe and reset',
  'Protect the tempo',
  'Let discipline speak',
  'Be harder to shake',
  'Keep your edge',
  'Stay sharp',
  'Hold the line'
];

const albertQuoteClosers = [
  'clear heads make better decisions.',
  'calm beats noise every time.',
  'clarity is faster than panic.',
  'quiet confidence travels further than fear.',
  'steady people steady everyone else.',
  'good judgement starts with one slow breath.',
  'speed matters most after the picture is clear.',
  'strong teams borrow calm from each other.',
  'discipline turns pressure into structure.',
  'presence matters when the room feels thin.',
  'the best brief is the one people can trust.',
  'facts first, ego never.',
  'you do not need chaos to move quickly.',
  'the next right decision is enough.',
  'clean thinking is operational strength.',
  'composure is part of the toolkit.',
  'being grounded helps everyone think straighter.',
  'the room takes its cue from the calmest person.',
  'patience can save minutes that panic would waste.',
  'the strongest posture is controlled, not loud.',
  'small acts of calm change whole situations.',
  'a steady voice can lower the temperature fast.',
  'good work starts with good footing.',
  'confidence lands best when it is quiet.',
  'pressure reveals habits, so keep yours clean.',
  'the mission gets clearer when the mind does too.',
  'control the pace and the pace stops controlling you.',
  'focus is a force multiplier.',
  'one measured pause can beat ten rushed moves.',
  'clarity gives courage somewhere useful to stand.',
  'there is strength in being unhurried on purpose.',
  'order starts with the person who refuses the wobble.',
  'trust grows where calm and competence meet.',
  'restraint is not weakness; it is control.',
  'solid thinking keeps the rest of the machine honest.',
  'good teams feel safer around calm people.',
  'you are allowed to be steady and formidable at once.'
];

export const albertQuotes = Array.from({ length: 666 }, (_, index) => {
  const opener = albertQuoteOpeners[Math.floor(index / albertQuoteClosers.length)];
  const closer = albertQuoteClosers[index % albertQuoteClosers.length];
  return `${opener}. ${closer.charAt(0).toUpperCase()}${closer.slice(1)}`;
});

export const defaultNotes = [
  { title: 'Morning posture', body: 'Maintain focus on transport hubs, symbolic sites, and fast-moving public order environments with terrorism indicators.' },
  { title: 'Cross-border watch', body: 'Track whether any developing European incidents show common method, travel pathway, or propaganda overlap with UK activity.' }
];
