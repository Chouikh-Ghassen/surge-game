/**
 * @module game/upgrades
 * @description Full upgrade system for SURGE — 15 upgrades with stacking.
 *
 * Every 3 waves, the player picks 1 of 3 randomly offered upgrades.
 * Upgrades modify player stats directly through the ECS component.
 * Each upgrade can stack up to its maxStack limit.
 */

import { PLAYER, UPGRADES } from '../config/balance.js';
import bus from '../core/events.js';

// ─── Upgrade Definitions ─────────────────────────────────────

/**
 * @typedef {Object} UpgradeDef
 * @property {string}  id          — unique key
 * @property {string}  name        — display name
 * @property {string}  desc        — description text
 * @property {'weapon'|'defense'|'utility'} category
 * @property {number}  maxStack    — max times this can be taken
 * @property {(data: object, stack: number) => void} apply — apply to player component
 */

/** @type {UpgradeDef[]} */
export const UPGRADE_DEFS = [

  // ━━━ WEAPON (6) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'spread_shot',
    name: 'Spread Shot',
    desc: '+1 projectile per volley',
    category: 'weapon',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.upgrades.spreadShot = stack;
    },
  },
  {
    id: 'pierce',
    name: 'Pierce',
    desc: 'Bullets pass through +1 enemy',
    category: 'weapon',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.upgrades.pierce = stack * UPGRADES.PIERCE.extraPiercePerStack;
    },
  },
  {
    id: 'fire_rate',
    name: 'Rapid Fire',
    desc: '+20% fire rate',
    category: 'weapon',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.fireRate = PLAYER.FIRE_RATE * Math.pow(UPGRADES.FIRE_RATE.multiplierPerStack, stack);
    },
  },
  {
    id: 'damage',
    name: 'Heavy Rounds',
    desc: '+25% bullet damage',
    category: 'weapon',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.bulletDamage = PLAYER.BULLET_DAMAGE * Math.pow(UPGRADES.DAMAGE.multiplierPerStack, stack);
    },
  },
  {
    id: 'homing',
    name: 'Homing',
    desc: 'Slight projectile tracking',
    category: 'weapon',
    maxStack: 2,
    apply(data, stack) {
      data.upgrades.homing = stack;
    },
  },
  {
    id: 'ricochet',
    name: 'Ricochet',
    desc: 'Bullets bounce off walls once',
    category: 'weapon',
    maxStack: 1,
    apply(data, stack) {
      data.upgrades.ricochet = stack;
    },
  },

  // ━━━ DEFENSE (5) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'shield',
    name: 'Shield',
    desc: 'Absorb 1 hit, recharge 10s',
    category: 'defense',
    maxStack: 2,
    apply(data, stack) {
      data.upgrades.shield = stack;
      data.upgrades.shieldActive = true;
      data.upgrades.shieldRechargeTime = 10;
      data.upgrades.shieldTimer = 0;
    },
  },
  {
    id: 'dash_cd',
    name: 'Quick Dash',
    desc: '-30% dash cooldown',
    category: 'defense',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.dashCooldown = PLAYER.DASH_COOLDOWN * Math.pow(0.7, stack);
    },
  },
  {
    id: 'slow_aura',
    name: 'Slow Aura',
    desc: 'Nearby enemies -20% speed',
    category: 'defense',
    maxStack: 2,
    apply(data, stack) {
      data.upgrades.slowAura = stack;
      data.upgrades.slowAuraRadius = 60;
      data.upgrades.slowAuraMult = 1 - 0.2 * stack;
    },
  },
  {
    id: 'regen',
    name: 'Regeneration',
    desc: 'Heal 1 HP every 20s',
    category: 'defense',
    maxStack: 2,
    apply(data, stack) {
      data.upgrades.regen = stack;
    },
  },
  {
    id: 'armor',
    name: 'Plating',
    desc: '-1 damage taken (min 1)',
    category: 'defense',
    maxStack: 2,
    apply(data, stack) {
      data.upgrades.armor = stack;
    },
  },

  // ━━━ UTILITY (4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: 'magnet',
    name: 'Magnet',
    desc: '+50% pickup attraction range',
    category: 'utility',
    maxStack: UPGRADES.MAX_STACK,
    apply(data, stack) {
      data.upgrades.magnet = stack;
    },
  },
  {
    id: 'nuke',
    name: 'Nuke',
    desc: 'Screen-clear bomb, once per 5 waves',
    category: 'utility',
    maxStack: 1,
    apply(data, stack) {
      data.upgrades.nuke = stack;
      data.upgrades.nukeReady = true;
    },
  },
  {
    id: 'decoy',
    name: 'Decoy',
    desc: 'Drop aggro decoy for 5s on dash',
    category: 'utility',
    maxStack: 1,
    apply(data, stack) {
      data.upgrades.decoy = stack;
    },
  },
  {
    id: 'scanner',
    name: 'Scanner',
    desc: 'Flash enemy spawn points briefly',
    category: 'utility',
    maxStack: 1,
    apply(data, stack) {
      data.upgrades.scanner = stack;
    },
  },
];

// ─── Upgrade Lookup ──────────────────────────────────────────

/** @type {Map<string, UpgradeDef>} */
const upgradeMap = new Map();
for (const def of UPGRADE_DEFS) {
  upgradeMap.set(def.id, def);
}

/**
 * Get upgrade definition by ID.
 * @param {string} id
 * @returns {UpgradeDef|undefined}
 */
export function getUpgradeDef(id) {
  return upgradeMap.get(id);
}

// ─── Player Upgrade State (per run) ──────────────────────────

/** @type {Record<string, number>} */
let stacks = {};

/**
 * Reset all upgrade stacks for a new run.
 */
export function resetUpgrades() {
  stacks = {};
  for (const def of UPGRADE_DEFS) {
    stacks[def.id] = 0;
  }
}

/**
 * Get current stack count for an upgrade.
 * @param {string} id
 * @returns {number}
 */
export function getStack(id) {
  return stacks[id] || 0;
}

/**
 * Get all current stacks.
 * @returns {Record<string, number>}
 */
export function getAllStacks() {
  return { ...stacks };
}

/**
 * Apply an upgrade to the player and increment its stack.
 * @param {string} id — upgrade ID
 * @param {object} playerData — player ECS component to modify
 * @returns {boolean} — true if applied, false if maxed
 */
export function applyUpgrade(id, playerData) {
  const def = upgradeMap.get(id);
  if (!def) return false;

  if (stacks[id] >= def.maxStack) return false;

  stacks[id]++;
  def.apply(playerData, stacks[id]);

  bus.emit('upgrade:applied', { id, stack: stacks[id], name: def.name });
  return true;
}

// ─── Upgrade Offering ────────────────────────────────────────

/**
 * Pick N random upgrade choices that haven't been maxed out.
 * Ensures no duplicates in the offered set.
 *
 * @param {number} [count=3]
 * @returns {UpgradeDef[]}
 */
export function rollUpgradeChoices(count = UPGRADES.CHOICES_PER_PICK) {
  const available = UPGRADE_DEFS.filter(def => stacks[def.id] < def.maxStack);

  // Shuffle (Fisher-Yates)
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  return available.slice(0, count);
}

// ─── Exports ─────────────────────────────────────────────────

export default {
  UPGRADE_DEFS, getUpgradeDef, resetUpgrades, getStack, getAllStacks,
  applyUpgrade, rollUpgradeChoices,
};
