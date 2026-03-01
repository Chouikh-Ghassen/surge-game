/**
 * @module agents/director
 * @description The AI Director — heart of SURGE's adaptive difficulty.
 *
 * Three modes:
 *   Mode 1 (Classic):  Pre-authored wave sequence, deterministic per seed
 *   Mode 2 (Adaptive): Rule-based + softmax bandit, reads player stress
 *   Mode 3 (LLM):      Queries LLM every 3 waves, falls back to Adaptive
 *
 * Phase 1 implements Mode 1 (Classic) only.
 *
 * The Director doesn't spawn enemies directly — it picks Encounter Cards,
 * which describe what to spawn. This is the unit of reasoning.
 */

import { DIRECTOR, ENEMIES } from '../config/balance.js';
import world from '../core/ecs.js';
import bus from '../core/events.js';
import { spawnEnemy, getEnemyCount } from '../game/enemies.js';
import { getRandomSpawnPoint, getPincerSpawnPoints, getSurroundSpawnPoints } from '../game/arena.js';
import { CARD_DECK as FULL_DECK, CARD_MAP, getCard as getCardDef, getEligibleCards } from '../config/cards.js';
import { pickCards, getIntensityBudget } from '../game/encounter-cards.js';

// ─── Director State ──────────────────────────────────────────

const state = {
  /** Current mode: 'classic' | 'adaptive' | 'llm' */
  mode: 'classic',
  /** Current wave number (1-based) */
  wave: 0,
  /** Is a wave currently active? */
  waveActive: false,
  /** Current stress score (0-100) */
  stress: 0,
  /** Spawn queue for current wave */
  spawnQueue: [],
  /** Timer for next spawn in queue */
  spawnTimer: 0,
  /** Cards played this wave */
  currentCards: [],
  /** History of decisions */
  history: [],
  /** Wave pause timer (between waves) */
  pauseTimer: 0,
  /** Total enemies spawned this wave */
  waveEnemiesSpawned: 0,
  /** Total enemies killed this wave */
  waveEnemiesKilled: 0,
  /** Is the game in upgrade selection phase? */
  upgradePhase: false,
  /** RNG seed for deterministic Classic mode */
  seed: 0,
  /** Seeded RNG state */
  _rng: null,
  /** Boss active flag */
  bossActive: false,
  /** Run in progress? */
  running: false,
};

// ─── Seeded RNG (Mulberry32) ─────────────────────────────────

/**
 * Simple seeded PRNG (Mulberry32).
 * Produces deterministic sequences for Classic mode replay.
 * @param {number} seed
 * @returns {() => number} Returns 0..1
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Encounter Cards now imported from src/config/cards.js ───
// The full ~40-card deck + encounter manager are in:
//   src/config/cards.js       (CARD_DECK, CARD_MAP, getCard, getEligibleCards)
//   src/game/encounter-cards.js (pickCards, getIntensityBudget, applyModifier)

// ─── Classic Mode Wave Sequence (Expanded for Phase 2) ──────

/**
 * Pre-authored wave→cards mapping for Classic mode.
 * Provides a curated experience without AI.
 * Uses the full card deck including Orbitor, Splitter, Shielder.
 */
const CLASSIC_SEQUENCE = {
  1:  ['drifter_trickle'],
  2:  ['drifter_pack'],
  3:  ['single_dasher', 'drifter_trickle'],
  4:  ['dasher_pair', 'drifter_line'],
  5:  ['sprayer_post', 'drifter_pack'],
  6:  ['orbitor_ring', 'drifter_trickle'],
  7:  ['flanking_dashers', 'splitter_pair'],
  8:  ['drifter_swarm', 'shielded_pack'],
  9:  ['sprayer_crossfire', 'orbitor_ring'],
  10: ['boss_swarm_king'],
  11: ['turret_alley', 'splitter_chain'],
  12: ['dasher_squad', 'orbitor_cage'],
  13: ['mixed_assault', 'shield_wall'],
  14: ['drifter_flood', 'splitter_pair'],
  15: ['hell_wave', 'orbitor_constellation'],
  16: ['flanking_dashers', 'sprayer_crossfire'],
  17: ['dasher_squad', 'splitter_wave'],
  18: ['elite_orbitor', 'drifter_swarm'],
  19: ['shielded_crossfire', 'mixed_assault'],
  20: ['boss_blitz_captain'],
  21: ['drifter_flood', 'sprayer_crossfire'],
  22: ['hell_wave', 'orbital_assault'],
  23: ['turret_alley', 'flanking_dashers'],
  24: ['splitter_rush', 'shielded_crossfire'],
  25: ['fortress', 'hell_wave'],
  26: ['dasher_squad', 'drifter_flood'],
  27: ['chaos', 'turret_alley'],
  28: ['apocalypse', 'shield_wall'],
  29: ['hell_wave', 'dasher_squad'],
  30: ['boss_hivemind'],
};

// Card lookup now via CARD_MAP from src/config/cards.js

/**
 * Get a card by ID (re-exported for backwards compat).
 * @param {string} id
 * @returns {EncounterCard|undefined}
 */
export function getCard(id) {
  return CARD_MAP.get(id);
}

// ─── Director Public API ─────────────────────────────────────

/**
 * Initialize the Director for a new run.
 * @param {object} options
 * @param {string} [options.mode='classic'] - 'classic' | 'adaptive' | 'llm'
 * @param {number} [options.seed] - RNG seed (random if omitted)
 */
export function initDirector(options = {}) {
  state.mode = options.mode || 'classic';
  state.wave = 0;
  state.waveActive = false;
  state.stress = 0;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.currentCards = [];
  state.history = [];
  state.pauseTimer = 0;
  state.waveEnemiesSpawned = 0;
  state.waveEnemiesKilled = 0;
  state.upgradePhase = false;
  state.bossActive = false;
  state.running = true;

  state.seed = options.seed ?? (Math.random() * 0xFFFFFFFF) | 0;
  state._rng = mulberry32(state.seed);

  // Listen for enemy deaths
  bus.on('enemy:death', _onEnemyDeath);

  bus.emit('director:init', { mode: state.mode, seed: state.seed });
}

/**
 * Start the next wave.
 */
export function startNextWave() {
  if (!state.running) return;

  state.wave++;
  state.waveActive = true;
  state.waveEnemiesSpawned = 0;
  state.waveEnemiesKilled = 0;
  state.spawnQueue = [];
  state.spawnTimer = 0;

  // Pick cards based on mode
  let cardIds;
  if (state.mode === 'classic') {
    cardIds = _classicPick(state.wave);
  } else {
    // Adaptive/LLM will be implemented in Phase 3/4
    cardIds = _classicPick(state.wave);
  }

  state.currentCards = cardIds;

  // Build spawn queue from cards
  for (const cardId of cardIds) {
    const card = CARD_MAP.get(cardId);
    if (!card) continue;
    _enqueueCard(card);
  }

  const decision = {
    wave: state.wave,
    cards: cardIds,
    mode: state.mode,
    stress: state.stress,
  };
  state.history.push(decision);

  bus.emit('wave:start', state.wave);
  bus.emit('director:decision', decision);
}

/**
 * Update the Director each frame.
 * Handles spawn queue processing and wave transitions.
 * @param {number} dt
 */
export function updateDirector(dt) {
  if (!state.running) return;

  // ── Between-wave pause ──
  if (!state.waveActive && state.wave > 0 && !state.upgradePhase) {
    state.pauseTimer -= dt;
    if (state.pauseTimer <= 0) {
      // Check upgrade phase
      if (state.wave % DIRECTOR.WAVES_PER_UPGRADE === 0) {
        state.upgradePhase = true;
        bus.emit('upgrade:offered', state.wave);
        return;
      }
      startNextWave();
    }
    return;
  }

  if (state.upgradePhase) return;

  // ── Process spawn queue ──
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const spawn = state.spawnQueue.shift();
      _executeSpawn(spawn);
      state.spawnTimer = DIRECTOR.SPAWN_DELAY_BASE;
    }
  }

  // ── Check wave clear ──
  if (state.waveActive && state.spawnQueue.length === 0 && getEnemyCount() === 0) {
    _onWaveClear();
  }
}

/**
 * Signal that the player has picked an upgrade (end upgrade phase).
 */
export function onUpgradePicked() {
  state.upgradePhase = false;
  startNextWave();
}

/**
 * Get current Director state (for UI, telemetry).
 * @returns {object}
 */
export function getDirectorState() {
  return { ...state, spawnQueue: undefined, _rng: undefined };
}

/**
 * Shutdown the Director.
 */
export function shutdownDirector() {
  state.running = false;
  bus.off('enemy:death', _onEnemyDeath);
}

// ─── Internal ────────────────────────────────────────────────

/**
 * Classic mode: look up pre-authored card sequence.
 * Falls back to budget-based picking from the full deck via encounter-cards.js
 * @param {number} wave
 * @returns {string[]}
 */
function _classicPick(wave) {
  if (CLASSIC_SEQUENCE[wave]) {
    return CLASSIC_SEQUENCE[wave];
  }
  // Beyond wave 30 — use the encounter-cards budget system
  return pickCards(wave, 'classic', getIntensityBudget(wave), state._rng);
}

/**
 * Build spawn queue from an encounter card.
 * @param {EncounterCard} card
 */
function _enqueueCard(card) {
  for (const group of card.enemies) {
    const positions = _getFormationPositions(card.formation, group.count);
    for (let i = 0; i < group.count; i++) {
      state.spawnQueue.push({
        type: group.type,
        x: positions[i]?.x ?? getRandomSpawnPoint().x,
        y: positions[i]?.y ?? getRandomSpawnPoint().y,
        elite: group.elite || false,
        boss: group.boss || false,
      });
    }
  }
}

/**
 * Get spawn positions for a formation type.
 * @param {string} formation
 * @param {number} count
 * @returns {Array<{x: number, y: number}>}
 */
function _getFormationPositions(formation, count) {
  switch (formation) {
    case 'pincer':
      return getPincerSpawnPoints(count);
    case 'surround':
      return getSurroundSpawnPoints(count);
    case 'line': {
      const origin = getRandomSpawnPoint();
      const points = [];
      const step = 16; // pixels between each enemy in the line
      for (let i = 0; i < count; i++) {
        points.push({
          x: origin.x + (i - (count - 1) / 2) * step,
          y: origin.y,
        });
      }
      return points;
    }
    case 'cluster': {
      const origin = getRandomSpawnPoint();
      const points = [];
      for (let i = 0; i < count; i++) {
        points.push({
          x: origin.x + (Math.random() - 0.5) * 30,
          y: origin.y + (Math.random() - 0.5) * 30,
        });
      }
      return points;
    }
    case 'random':
    default:
      return Array.from({ length: count }, () => getRandomSpawnPoint());
  }
}

/**
 * Execute a single spawn from the queue.
 * @param {object} spawn - { type, x, y, elite, boss }
 */
function _executeSpawn(spawn) {
  spawnEnemy(spawn.type, spawn.x, spawn.y, {
    elite: spawn.elite,
    boss: spawn.boss,
  });
  state.waveEnemiesSpawned++;
}

/**
 * Handle enemy death event.
 */
function _onEnemyDeath() {
  state.waveEnemiesKilled++;
}

/**
 * Handle wave clear.
 */
function _onWaveClear() {
  state.waveActive = false;
  state.pauseTimer = DIRECTOR.WAVE_CLEAR_PAUSE;
  bus.emit('wave:clear', state.wave);

  // Check for boss wave clear
  if (state.wave % DIRECTOR.BOSS_WAVE_INTERVAL === 0) {
    state.bossActive = false;
  }

  // Check victory
  if (state.wave >= DIRECTOR.MAX_WAVE) {
    state.running = false;
    bus.emit('game:victory', { wave: state.wave });
  }
}

// ─── Exports ─────────────────────────────────────────────────

export { state as directorState, FULL_DECK as CARD_DECK };
export default {
  initDirector, startNextWave, updateDirector, onUpgradePicked,
  getDirectorState, shutdownDirector, getCard, CARD_DECK: FULL_DECK,
};
