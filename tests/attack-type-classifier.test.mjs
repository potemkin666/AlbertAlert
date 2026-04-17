import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAttackType,
  attackTypeLabel,
  attackTypeDisplayLabel,
  attackTypeIcon,
  _ATTACK_TYPES,
  _CONFIDENCE_THRESHOLD,
  _CATEGORY_DICTIONARIES,
  _alertText,
  _scoreCategoryTerms,
  _ATTACK_TYPE_ICONS,
  _ATTACK_TYPE_LABELS
} from '../shared/attack-type-classifier.mjs';

describe('attack-type-classifier: constants', () => {
  it('ATTACK_TYPES has five values', () => {
    assert.equal(_ATTACK_TYPES.length, 5);
    assert.deepEqual([..._ATTACK_TYPES], ['vehicle', 'blade', 'ied', 'shooter', 'unknown']);
  });

  it('ATTACK_TYPES is frozen', () => {
    assert.ok(Object.isFrozen(_ATTACK_TYPES));
  });

  it('CONFIDENCE_THRESHOLD is a positive number', () => {
    assert.ok(_CONFIDENCE_THRESHOLD > 0);
  });

  it('CATEGORY_DICTIONARIES covers four attack types', () => {
    const types = _CATEGORY_DICTIONARIES.map((d) => d.type);
    assert.deepEqual(types, ['vehicle', 'blade', 'ied', 'shooter']);
  });

  it('every dictionary entry has term and weight', () => {
    for (const { terms } of _CATEGORY_DICTIONARIES) {
      for (const entry of terms) {
        assert.ok(typeof entry.term === 'string' && entry.term.length > 0);
        assert.ok(typeof entry.weight === 'number' && entry.weight > 0);
      }
    }
  });

  it('ATTACK_TYPE_ICONS has entries for vehicle/blade/ied/shooter', () => {
    assert.ok(_ATTACK_TYPE_ICONS.vehicle);
    assert.ok(_ATTACK_TYPE_ICONS.blade);
    assert.ok(_ATTACK_TYPE_ICONS.ied);
    assert.ok(_ATTACK_TYPE_ICONS.shooter);
  });

  it('ATTACK_TYPE_LABELS has entries for all five types', () => {
    for (const type of _ATTACK_TYPES) {
      assert.ok(_ATTACK_TYPE_LABELS[type], `Missing label for ${type}`);
    }
  });
});

describe('attack-type-classifier: alertText', () => {
  it('combines title, summary, aiSummary, sourceExtract, location', () => {
    const text = _alertText({
      title: 'Title',
      summary: 'Summary',
      aiSummary: 'AI summary',
      sourceExtract: 'Extract',
      location: 'London'
    });
    assert.ok(text.includes('title'));
    assert.ok(text.includes('summary'));
    assert.ok(text.includes('ai summary'));
    assert.ok(text.includes('extract'));
    assert.ok(text.includes('london'));
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(_alertText(null), '');
    assert.equal(_alertText(undefined), '');
  });

  it('handles alert with only title', () => {
    const text = _alertText({ title: 'Stabbing in Paris' });
    assert.ok(text.includes('stabbing in paris'));
  });
});

describe('attack-type-classifier: scoreCategoryTerms', () => {
  it('scores matching terms', () => {
    const terms = [{ term: 'bomb', weight: 5 }, { term: 'explosion', weight: 5 }];
    const score = _scoreCategoryTerms('a bomb caused an explosion', terms);
    assert.equal(score, 10);
  });

  it('returns 0 for no matches', () => {
    const terms = [{ term: 'bomb', weight: 5 }];
    assert.equal(_scoreCategoryTerms('a quiet day', terms), 0);
  });

  it('enforces word-boundary for short terms', () => {
    const terms = [{ term: 'bomb', weight: 5 }];
    assert.equal(_scoreCategoryTerms('bombastic news', terms), 0);
    assert.equal(_scoreCategoryTerms('a bomb went off', terms), 5);
  });

  it('allows partial match for long terms', () => {
    const terms = [{ term: 'improvised explosive device', weight: 10 }];
    assert.equal(_scoreCategoryTerms('police found an improvised explosive device', terms), 10);
  });
});

describe('attack-type-classifier: classifyAttackType', () => {
  it('classifies vehicle attack', () => {
    const result = classifyAttackType({
      title: 'Vehicle ramming attack in Berlin market',
      summary: 'A truck drove into crowd at Christmas market'
    });
    assert.equal(result.type, 'vehicle');
    assert.ok(result.scores.vehicle >= _CONFIDENCE_THRESHOLD);
  });

  it('classifies blade attack', () => {
    const result = classifyAttackType({
      title: 'Knife attack at London Bridge',
      summary: 'Man stabbed multiple people in stabbing spree'
    });
    assert.equal(result.type, 'blade');
    assert.ok(result.scores.blade >= _CONFIDENCE_THRESHOLD);
  });

  it('classifies IED attack', () => {
    const result = classifyAttackType({
      title: 'Bomb detonated near government building',
      summary: 'An improvised explosive device was detonated causing extensive damage'
    });
    assert.equal(result.type, 'ied');
    assert.ok(result.scores.ied >= _CONFIDENCE_THRESHOLD);
  });

  it('classifies shooter attack', () => {
    const result = classifyAttackType({
      title: 'Mass shooting at shopping centre',
      summary: 'Gunman opened fire with automatic weapon, active shooter situation'
    });
    assert.equal(result.type, 'shooter');
    assert.ok(result.scores.shooter >= _CONFIDENCE_THRESHOLD);
  });

  it('returns unknown for unrelated text', () => {
    const result = classifyAttackType({
      title: 'New policy on border control',
      summary: 'Government announces updated regulations'
    });
    assert.equal(result.type, 'unknown');
  });

  it('returns unknown for empty alert', () => {
    assert.equal(classifyAttackType({}).type, 'unknown');
  });

  it('returns unknown for null', () => {
    assert.equal(classifyAttackType(null).type, 'unknown');
  });

  // French language tests
  it('classifies French blade attack', () => {
    const result = classifyAttackType({
      title: 'Attaque au couteau à Paris',
      summary: 'Un homme a poignardé plusieurs personnes'
    });
    assert.equal(result.type, 'blade');
  });

  it('classifies French IED attack', () => {
    const result = classifyAttackType({
      title: 'Attentat à la bombe à Lyon',
      summary: 'Un engin explosif improvisé a explosé dans la rue'
    });
    assert.equal(result.type, 'ied');
  });

  // German language tests
  it('classifies German blade attack', () => {
    const result = classifyAttackType({
      title: 'Messerangriff in München',
      summary: 'Messerattacke am Hauptbahnhof'
    });
    assert.equal(result.type, 'blade');
  });

  // Spanish language tests
  it('classifies Spanish shooter attack', () => {
    const result = classifyAttackType({
      title: 'Tiroteo masivo en Madrid',
      summary: 'El tiroteador abrió fuego'
    });
    assert.equal(result.type, 'shooter');
  });

  // Italian language tests
  it('classifies Italian vehicle attack', () => {
    const result = classifyAttackType({
      title: 'Attacco con veicolo a Milano',
      summary: 'Auto sulla folla nel centro'
    });
    assert.equal(result.type, 'vehicle');
  });

  // Edge cases
  it('picks the highest-scoring category when multiple match', () => {
    // Both knife and shooting keywords, but shooting is stronger
    const result = classifyAttackType({
      title: 'Active shooter with knife also found',
      summary: 'Mass shooting, gunman opened fire, shots fired, a knife was also found at scene'
    });
    assert.equal(result.type, 'shooter');
  });

  it('handles very short text', () => {
    const result = classifyAttackType({ title: 'Bomb' });
    // Just "bomb" alone scores 5, below threshold of 6
    assert.equal(result.type, 'unknown');
  });

  it('handles text with only a single strong keyword', () => {
    const result = classifyAttackType({ title: 'Knife attack reported' });
    assert.equal(result.type, 'blade');
  });
});

describe('attack-type-classifier: attackTypeLabel', () => {
  it('returns type string for vehicle', () => {
    assert.equal(attackTypeLabel({ title: 'Vehicle ramming attack' }), 'vehicle');
  });

  it('returns unknown for generic text', () => {
    assert.equal(attackTypeLabel({ title: 'Political update' }), 'unknown');
  });
});

describe('attack-type-classifier: attackTypeDisplayLabel', () => {
  it('returns human-readable labels', () => {
    assert.equal(attackTypeDisplayLabel('vehicle'), 'Vehicle');
    assert.equal(attackTypeDisplayLabel('blade'), 'Blade');
    assert.equal(attackTypeDisplayLabel('ied'), 'IED');
    assert.equal(attackTypeDisplayLabel('shooter'), 'Shooter');
    assert.equal(attackTypeDisplayLabel('unknown'), 'Unknown');
  });

  it('returns Unknown for invalid type', () => {
    assert.equal(attackTypeDisplayLabel('invalid'), 'Unknown');
    assert.equal(attackTypeDisplayLabel(null), 'Unknown');
  });
});

describe('attack-type-classifier: attackTypeIcon', () => {
  it('returns emoji for each known type', () => {
    assert.ok(attackTypeIcon('vehicle').length > 0);
    assert.ok(attackTypeIcon('blade').length > 0);
    assert.ok(attackTypeIcon('ied').length > 0);
    assert.ok(attackTypeIcon('shooter').length > 0);
  });

  it('returns empty string for unknown', () => {
    assert.equal(attackTypeIcon('unknown'), '');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(attackTypeIcon(null), '');
    assert.equal(attackTypeIcon(undefined), '');
  });
});
