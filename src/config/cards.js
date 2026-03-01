/**
 * @module config/cards
 * @description Full encounter card deck for SURGE.
 *
 * Each card describes a spawn composition the Director can play.
 * Cards are the atomic unit of reasoning for all Director modes.
 *
 * ~40 cards organized by category — used by Classic, Adaptive, and LLM modes.
 */

/**
 * @typedef {Object} EncounterCard
 * @property {string}  id           — Unique card identifier
 * @property {string}  name         — Human-readable name
 * @property {string}  description  — Flavor text / Director rationale
 * @property {Array<{type: string, count: number, elite?: boolean, boss?: boolean}>} enemies
 * @property {'random'|'line'|'pincer'|'surround'|'cluster'} formation
 * @property {number}  intensity    — 1–10 difficulty rating
 * @property {string[]} tags        — Category tags for filtering
 * @property {number}  minWave      — Earliest wave this card can appear
 */

/** @type {EncounterCard[]} */
export const CARD_DECK = [

  // ━━━ SWARM CARDS (Drifter-focused) ━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'drifter_trickle',
    name: 'Drifter Trickle',
    description: 'A handful of drifters float in lazily.',
    enemies: [{ type: 'drifter', count: 4 }],
    formation: 'random',
    intensity: 1,
    tags: ['swarm', 'easy', 'drifter'],
    minWave: 1,
  },
  {
    id: 'drifter_pack',
    name: 'Drifter Pack',
    description: 'A cluster of drifters approaches in formation.',
    enemies: [{ type: 'drifter', count: 8 }],
    formation: 'cluster',
    intensity: 2,
    tags: ['swarm', 'drifter'],
    minWave: 1,
  },
  {
    id: 'drifter_swarm',
    name: 'Drifter Swarm',
    description: 'A full swarm surrounds you from all sides.',
    enemies: [{ type: 'drifter', count: 14 }],
    formation: 'surround',
    intensity: 3,
    tags: ['swarm', 'overwhelming', 'drifter'],
    minWave: 3,
  },
  {
    id: 'drifter_flood',
    name: 'Drifter Flood',
    description: 'The arena floods with drifters.',
    enemies: [{ type: 'drifter', count: 22 }],
    formation: 'surround',
    intensity: 5,
    tags: ['swarm', 'overwhelming', 'drifter'],
    minWave: 8,
  },
  {
    id: 'drifter_line',
    name: 'Drifter Line',
    description: 'A line of drifters marches inward.',
    enemies: [{ type: 'drifter', count: 10 }],
    formation: 'line',
    intensity: 3,
    tags: ['swarm', 'drifter', 'positional'],
    minWave: 4,
  },
  {
    id: 'elite_drifter_pack',
    name: 'Elite Drifter Pack',
    description: 'An elite drifter leads a small pack.',
    enemies: [
      { type: 'drifter', count: 1, elite: true },
      { type: 'drifter', count: 6 },
    ],
    formation: 'cluster',
    intensity: 4,
    tags: ['swarm', 'elite', 'drifter'],
    minWave: 5,
  },

  // ━━━ RUSH CARDS (Dasher-focused) ━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'single_dasher',
    name: 'Lone Dasher',
    description: 'A single dasher charges aggressively.',
    enemies: [{ type: 'dasher', count: 1 }],
    formation: 'random',
    intensity: 2,
    tags: ['rush', 'fast', 'dasher'],
    minWave: 2,
  },
  {
    id: 'dasher_pair',
    name: 'Dasher Duo',
    description: 'Two dashers approach from opposite sides.',
    enemies: [{ type: 'dasher', count: 2 }],
    formation: 'pincer',
    intensity: 3,
    tags: ['rush', 'fast', 'positional', 'dasher'],
    minWave: 3,
  },
  {
    id: 'flanking_dashers',
    name: 'Flanking Dashers',
    description: 'Four dashers execute a coordinated flank.',
    enemies: [{ type: 'dasher', count: 4 }],
    formation: 'pincer',
    intensity: 5,
    tags: ['rush', 'fast', 'positional', 'dasher'],
    minWave: 5,
  },
  {
    id: 'dasher_squad',
    name: 'Dasher Squad',
    description: 'A full squad of dashers closes in.',
    enemies: [{ type: 'dasher', count: 6 }],
    formation: 'surround',
    intensity: 6,
    tags: ['rush', 'fast', 'dasher'],
    minWave: 8,
  },
  {
    id: 'elite_dasher',
    name: 'Elite Dasher',
    description: 'An elite dasher charges twice as fast.',
    enemies: [
      { type: 'dasher', count: 1, elite: true },
      { type: 'dasher', count: 2 },
    ],
    formation: 'pincer',
    intensity: 5,
    tags: ['rush', 'elite', 'dasher'],
    minWave: 6,
  },

  // ━━━ TURRET CARDS (Sprayer-focused) ━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'sprayer_post',
    name: 'Sprayer Turret',
    description: 'A turret sets up and locks on.',
    enemies: [{ type: 'sprayer', count: 1 }],
    formation: 'random',
    intensity: 3,
    tags: ['turret', 'zoning', 'ranged', 'sprayer'],
    minWave: 3,
  },
  {
    id: 'sprayer_crossfire',
    name: 'Sprayer Crossfire',
    description: 'Two turrets create a deadly crossfire.',
    enemies: [{ type: 'sprayer', count: 2 }],
    formation: 'pincer',
    intensity: 5,
    tags: ['turret', 'zoning', 'ranged', 'positional', 'sprayer'],
    minWave: 5,
  },
  {
    id: 'sprayer_battery',
    name: 'Sprayer Battery',
    description: 'Three turrets set up in a line.',
    enemies: [{ type: 'sprayer', count: 3 }],
    formation: 'line',
    intensity: 6,
    tags: ['turret', 'zoning', 'ranged', 'sprayer'],
    minWave: 8,
  },
  {
    id: 'elite_sprayer',
    name: 'Elite Sprayer',
    description: 'An elite turret with wide bullet fan.',
    enemies: [
      { type: 'sprayer', count: 1, elite: true },
      { type: 'sprayer', count: 1 },
    ],
    formation: 'pincer',
    intensity: 5,
    tags: ['turret', 'elite', 'sprayer'],
    minWave: 6,
  },

  // ━━━ ORBIT CARDS (Orbitor-focused) ━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'orbitor_ring',
    name: 'Orbit Ring',
    description: 'Orbitors establish a ring around you.',
    enemies: [{ type: 'orbitor', count: 3 }],
    formation: 'surround',
    intensity: 3,
    tags: ['orbit', 'ranged', 'orbitor'],
    minWave: 4,
  },
  {
    id: 'orbitor_constellation',
    name: 'Constellation',
    description: 'Five orbitors form a tightening constellation.',
    enemies: [{ type: 'orbitor', count: 5 }],
    formation: 'surround',
    intensity: 5,
    tags: ['orbit', 'ranged', 'orbitor'],
    minWave: 7,
  },
  {
    id: 'orbitor_cage',
    name: 'Orbitor Cage',
    description: 'Orbitors with drifter escorts form a cage.',
    enemies: [
      { type: 'orbitor', count: 4 },
      { type: 'drifter', count: 6 },
    ],
    formation: 'surround',
    intensity: 5,
    tags: ['orbit', 'mixed', 'orbitor'],
    minWave: 6,
  },
  {
    id: 'elite_orbitor',
    name: 'Elite Orbitor',
    description: 'An elite orbitor with faster fire rate.',
    enemies: [
      { type: 'orbitor', count: 1, elite: true },
      { type: 'orbitor', count: 2 },
    ],
    formation: 'surround',
    intensity: 5,
    tags: ['orbit', 'elite', 'orbitor'],
    minWave: 8,
  },

  // ━━━ SPLITTER CARDS (Splitter-focused) ━━━━━━━━━━━━━━━━━━━━

  {
    id: 'splitter_pair',
    name: 'Splitter Pair',
    description: 'Two splitters waddle in.',
    enemies: [{ type: 'splitter', count: 2 }],
    formation: 'random',
    intensity: 3,
    tags: ['splitter', 'splitting'],
    minWave: 4,
  },
  {
    id: 'splitter_wave',
    name: 'Splitter Wave',
    description: 'A wave of splitters — kill them fast or drown.',
    enemies: [{ type: 'splitter', count: 5 }],
    formation: 'surround',
    intensity: 5,
    tags: ['splitter', 'splitting', 'overwhelming'],
    minWave: 7,
  },
  {
    id: 'splitter_chain',
    name: 'Chain Splitters',
    description: 'Splitters backed by more splitters. It multiplies.',
    enemies: [{ type: 'splitter', count: 4 }],
    formation: 'pincer',
    intensity: 5,
    tags: ['splitter', 'splitting', 'positional'],
    minWave: 6,
  },
  {
    id: 'splitter_rush',
    name: 'Splitter Rush',
    description: 'Splitters mixed with dashers for pure chaos.',
    enemies: [
      { type: 'splitter', count: 3 },
      { type: 'dasher', count: 2 },
    ],
    formation: 'random',
    intensity: 6,
    tags: ['splitter', 'mixed', 'rush'],
    minWave: 8,
  },

  // ━━━ SHIELD CARDS (Shielder-focused) ━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'shielded_pack',
    name: 'Shielded Pack',
    description: 'A shielder protects a group of drifters.',
    enemies: [
      { type: 'shielder', count: 1 },
      { type: 'drifter', count: 6 },
    ],
    formation: 'cluster',
    intensity: 4,
    tags: ['shield', 'tactical', 'shielder'],
    minWave: 5,
  },
  {
    id: 'shielded_crossfire',
    name: 'Shielded Crossfire',
    description: 'Shielders protect sprayer turrets.',
    enemies: [
      { type: 'shielder', count: 2 },
      { type: 'sprayer', count: 2 },
    ],
    formation: 'pincer',
    intensity: 6,
    tags: ['shield', 'tactical', 'ranged', 'shielder'],
    minWave: 7,
  },
  {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Three shielders form a wall protecting dashers.',
    enemies: [
      { type: 'shielder', count: 3 },
      { type: 'dasher', count: 3 },
    ],
    formation: 'line',
    intensity: 6,
    tags: ['shield', 'tactical', 'rush', 'shielder'],
    minWave: 8,
  },

  // ━━━ MIXED CARDS (Multi-type compositions) ━━━━━━━━━━━━━━━━

  {
    id: 'mixed_assault',
    name: 'Mixed Assault',
    description: 'Drifters and dashers advance together.',
    enemies: [
      { type: 'drifter', count: 6 },
      { type: 'dasher', count: 2 },
    ],
    formation: 'random',
    intensity: 4,
    tags: ['mixed', 'pressure'],
    minWave: 5,
  },
  {
    id: 'turret_alley',
    name: 'Turret Alley',
    description: 'Turrets suppress while drifters close in.',
    enemies: [
      { type: 'sprayer', count: 3 },
      { type: 'drifter', count: 8 },
    ],
    formation: 'random',
    intensity: 6,
    tags: ['mixed', 'zoning', 'swarm'],
    minWave: 8,
  },
  {
    id: 'orbital_assault',
    name: 'Orbital Assault',
    description: 'Orbitors provide cover fire for a dasher rush.',
    enemies: [
      { type: 'orbitor', count: 3 },
      { type: 'dasher', count: 3 },
    ],
    formation: 'surround',
    intensity: 5,
    tags: ['mixed', 'orbit', 'rush'],
    minWave: 7,
  },
  {
    id: 'fortress',
    name: 'Fortress',
    description: 'Shielders protect a turret core while drifters flank.',
    enemies: [
      { type: 'shielder', count: 2 },
      { type: 'sprayer', count: 2 },
      { type: 'drifter', count: 6 },
    ],
    formation: 'cluster',
    intensity: 7,
    tags: ['mixed', 'shield', 'tactical'],
    minWave: 10,
  },
  {
    id: 'chaos',
    name: 'Total Chaos',
    description: 'Everything at once. Survive.',
    enemies: [
      { type: 'drifter', count: 8 },
      { type: 'dasher', count: 3 },
      { type: 'sprayer', count: 2 },
      { type: 'orbitor', count: 2 },
    ],
    formation: 'surround',
    intensity: 7,
    tags: ['mixed', 'overwhelming'],
    minWave: 12,
  },
  {
    id: 'hell_wave',
    name: 'Hell Wave',
    description: 'The Director is done being polite.',
    enemies: [
      { type: 'drifter', count: 15 },
      { type: 'dasher', count: 4 },
      { type: 'sprayer', count: 2 },
      { type: 'splitter', count: 2 },
    ],
    formation: 'surround',
    intensity: 8,
    tags: ['mixed', 'overwhelming', 'endgame'],
    minWave: 15,
  },
  {
    id: 'apocalypse',
    name: 'Apocalypse',
    description: 'Everything. Maximum intensity.',
    enemies: [
      { type: 'drifter', count: 12 },
      { type: 'dasher', count: 4 },
      { type: 'sprayer', count: 3 },
      { type: 'orbitor', count: 3 },
      { type: 'splitter', count: 3 },
      { type: 'shielder', count: 2 },
    ],
    formation: 'surround',
    intensity: 10,
    tags: ['mixed', 'overwhelming', 'endgame'],
    minWave: 20,
  },

  // ━━━ BOSS CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'boss_swarm_king',
    name: 'The Swarm King',
    description: 'A massive drifter leads an army.',
    enemies: [
      { type: 'drifter', count: 1, boss: true },
      { type: 'drifter', count: 8 },
    ],
    formation: 'surround',
    intensity: 8,
    tags: ['boss', 'swarm'],
    minWave: 10,
  },
  {
    id: 'boss_blitz_captain',
    name: 'The Blitz Captain',
    description: 'A massive dasher with relentless charges.',
    enemies: [
      { type: 'dasher', count: 1, boss: true },
      { type: 'dasher', count: 4 },
    ],
    formation: 'surround',
    intensity: 9,
    tags: ['boss', 'rush'],
    minWave: 20,
  },
  {
    id: 'boss_hivemind',
    name: 'The Hivemind',
    description: 'A massive splitter. Kill it and regret it.',
    enemies: [
      { type: 'splitter', count: 1, boss: true },
      { type: 'splitter', count: 4 },
    ],
    formation: 'surround',
    intensity: 9,
    tags: ['boss', 'splitting'],
    minWave: 30,
  },
];

// ─── Modifiers ───────────────────────────────────────────────

/**
 * Modifiers that can be applied to any card to alter its properties.
 * Used by Adaptive and LLM Directors.
 */
export const MODIFIERS = Object.freeze({
  speed:       { label: 'Swift',    enemySpeedMult: 1.25 },
  density:     { label: 'Dense',    countMult: 1.5 },
  armored:     { label: 'Armored',  hpAdd: 1 },
  splitOnDeath:{ label: 'Splitting', splitOnDeath: true },
  darkened:    { label: 'Dark',     visibilityRadius: 100 },
  frenzied:    { label: 'Frenzied', fireRateMult: 0.7 },
});

// ─── Card Map (id → card) ────────────────────────────────────

/** @type {Map<string, EncounterCard>} */
export const CARD_MAP = new Map();
for (const card of CARD_DECK) {
  CARD_MAP.set(card.id, card);
}

/**
 * Get a card by ID.
 * @param {string} id
 * @returns {EncounterCard|undefined}
 */
export function getCard(id) {
  return CARD_MAP.get(id);
}

/**
 * Get all cards eligible for a given wave.
 * @param {number} wave
 * @returns {EncounterCard[]}
 */
export function getEligibleCards(wave) {
  return CARD_DECK.filter(c => c.minWave <= wave);
}

/**
 * Get cards matching specific tags.
 * @param {string[]} tags
 * @param {number} wave
 * @returns {EncounterCard[]}
 */
export function getCardsByTags(tags, wave) {
  return getEligibleCards(wave).filter(c =>
    tags.some(t => c.tags.includes(t))
  );
}

export default CARD_DECK;
