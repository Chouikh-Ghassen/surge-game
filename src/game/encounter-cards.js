/**
 * @module game/encounter-cards
 * @description Encounter Card Manager — selects and modifies cards for waves.
 *
 * Provides:
 *  - pickCards(wave, mode, budget)     → picks cards for a wave
 *  - applyModifier(card, modifierKey)  → creates modified card copy
 *  - getIntensityBudget(wave)          → max total intensity for a wave
 *  - getEligibleCards(wave)            → filters by minWave
 *
 * Used by all three Director modes.
 */

import { CARD_DECK, CARD_MAP, MODIFIERS, getEligibleCards } from '../config/cards.js';

// ─── Intensity Budget Scaling ────────────────────────────────

/**
 * Get the maximum total intensity budget for a given wave.
 * Scales up as waves progress, with boss-wave spikes.
 * @param {number} wave
 * @returns {number}
 */
export function getIntensityBudget(wave) {
  const base = 3 + wave * 0.8;
  const bossBump = (wave % 10 === 0) ? 4 : 0;
  return Math.min(20, Math.floor(base + bossBump));
}

// ─── Card Selection ──────────────────────────────────────────

/**
 * Pick encounter cards for a wave within an intensity budget.
 *
 * @param {number} wave
 * @param {'classic'|'adaptive'|'llm'} mode
 * @param {number} [budget] — intensity budget override
 * @param {Function} [rng=Math.random] — RNG function (0..1) for deterministic picks
 * @returns {string[]} — array of card IDs
 */
export function pickCards(wave, mode, budget, rng = Math.random) {
  const maxBudget = budget ?? getIntensityBudget(wave);
  const eligible = getEligibleCards(wave);

  if (eligible.length === 0) return [];

  // Boss waves get their boss card first
  if (wave % 10 === 0) {
    const bossCards = eligible.filter(c => c.tags.includes('boss'));
    if (bossCards.length > 0) {
      const boss = bossCards[Math.floor(rng() * bossCards.length)];
      const remaining = maxBudget - boss.intensity;
      const extras = _fillBudget(eligible, remaining, [boss.id], rng);
      return [boss.id, ...extras];
    }
  }

  return _fillBudget(eligible, maxBudget, [], rng);
}

/**
 * Fill a budget with cards greedily.
 * @param {import('../config/cards.js').EncounterCard[]} eligible
 * @param {number} budget
 * @param {string[]} exclude — card IDs already picked
 * @param {Function} rng
 * @returns {string[]}
 */
function _fillBudget(eligible, budget, exclude, rng) {
  const result = [];
  let remaining = budget;

  // Shuffle eligible cards
  const shuffled = [...eligible].sort(() => rng() - 0.5);

  for (const card of shuffled) {
    if (remaining <= 0) break;
    if (exclude.includes(card.id)) continue;
    if (card.intensity <= remaining) {
      result.push(card.id);
      remaining -= card.intensity;
    }
  }

  // Ensure at least one card
  if (result.length === 0 && eligible.length > 0) {
    const fallback = shuffled.find(c => !exclude.includes(c.id)) || shuffled[0];
    result.push(fallback.id);
  }

  return result;
}

// ─── Card Modification ───────────────────────────────────────

/**
 * Create a modified copy of a card with a modifier applied.
 * Does NOT mutate the original card.
 *
 * @param {string} cardId — card ID
 * @param {string} modifierKey — key from MODIFIERS
 * @returns {import('../config/cards.js').EncounterCard|null}
 */
export function applyModifier(cardId, modifierKey) {
  const card = CARD_MAP.get(cardId);
  const mod = MODIFIERS[modifierKey];
  if (!card || !mod) return null;

  const modified = {
    ...card,
    id: `${card.id}:${modifierKey}`,
    name: `${mod.label} ${card.name}`,
    enemies: card.enemies.map(group => {
      const copy = { ...group };
      if (mod.countMult) copy.count = Math.ceil(copy.count * mod.countMult);
      return copy;
    }),
    intensity: Math.min(10, card.intensity + 1),
    tags: [...card.tags, modifierKey],
    _modifier: mod,
  };

  return modified;
}

// ─── Utilities ───────────────────────────────────────────────

/**
 * Get card stats for telemetry/reporting.
 * @returns {{ total: number, byTag: Record<string, number>, byIntensity: Record<string, number> }}
 */
export function getDeckStats() {
  const byTag = {};
  const byIntensity = {};

  for (const card of CARD_DECK) {
    for (const tag of card.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
    byIntensity[card.intensity] = (byIntensity[card.intensity] || 0) + 1;
  }

  return { total: CARD_DECK.length, byTag, byIntensity };
}

export default { pickCards, applyModifier, getIntensityBudget, getEligibleCards, getDeckStats };
