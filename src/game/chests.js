/**
 * @module game/chests
 * @description Chest pickup system for SURGE.
 *
 * Chests spawn randomly during gameplay (wave clear, elite/boss kills).
 * The player walks over them to collect rewards: coins, XP, or health.
 * Chests float, bob gently, and sparkle before despawning after a timeout.
 */

import world from '../core/ecs.js';
import bus from '../core/events.js';
import { SCREEN, ARENA } from '../config/balance.js';
import { getColor } from '../config/palettes.js';
import { getPlayerPos, getPlayerId, healPlayer } from './player.js';
import { circleVsCircle } from '../core/physics.js';
import { spawnExplosion } from './particles.js';

// ─── Config ──────────────────────────────────────────────────

const CHEST = Object.freeze({
  RADIUS:       7,
  PICKUP_RADIUS: 14,       // Player picks up within this range
  LIFETIME:     12,         // Seconds before despawn
  BOB_SPEED:    3.0,        // Vertical bob frequency
  BOB_AMP:      1.5,        // Vertical bob amplitude (px)
  SPARKLE_RATE: 0.4,        // Seconds between sparkle particles

  // Spawn chances (cumulative probability)
  SPAWN_ON_WAVE_CLEAR:  0.35,  // 35% chance on wave clear
  SPAWN_ON_ELITE_KILL:  0.25,  // 25% chance on elite kill
  SPAWN_ON_BOSS_KILL:   1.0,   // 100% chance on boss kill
});

/**
 * Chest reward tiers. Weighted random selection.
 */
const REWARD_TABLE = [
  { type: 'coins', amount: 10,  weight: 40, label: '+10 💰' },
  { type: 'coins', amount: 25,  weight: 25, label: '+25 💰' },
  { type: 'coins', amount: 50,  weight: 10, label: '+50 💰' },
  { type: 'xp',    amount: 30,  weight: 30, label: '+30 XP' },
  { type: 'xp',    amount: 75,  weight: 15, label: '+75 XP' },
  { type: 'heal',  amount: 1,   weight: 20, label: '+1 ❤' },
  { type: 'heal',  amount: 2,   weight: 5,  label: '+2 ❤' },
];

const TOTAL_WEIGHT = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);

// ─── State ───────────────────────────────────────────────────

/** @type {Map<number, { timer: number, sparkleTimer: number, bobPhase: number, baseY: number, reward: object }>} */
const chests = new Map();

// ─── Public API ──────────────────────────────────────────────

/**
 * Try to spawn a chest at a given position.
 * @param {number} x
 * @param {number} y
 * @param {'wave'|'elite'|'boss'} source — what triggered the spawn attempt
 * @returns {number|null} Entity ID if spawned, null otherwise
 */
export function trySpawnChest(x, y, source) {
  let chance = 0;
  if (source === 'wave')  chance = CHEST.SPAWN_ON_WAVE_CLEAR;
  if (source === 'elite') chance = CHEST.SPAWN_ON_ELITE_KILL;
  if (source === 'boss')  chance = CHEST.SPAWN_ON_BOSS_KILL;

  if (Math.random() > chance) return null;
  return spawnChest(x, y);
}

/**
 * Force-spawn a chest at (x, y).
 * @param {number} x
 * @param {number} y
 * @returns {number} Entity ID
 */
export function spawnChest(x, y) {
  // Clamp to arena bounds
  x = Math.max(ARENA.LEFT + CHEST.RADIUS, Math.min(ARENA.RIGHT - CHEST.RADIUS, x));
  y = Math.max(ARENA.TOP + CHEST.RADIUS, Math.min(ARENA.BOTTOM - CHEST.RADIUS, y));

  const id = world.create();
  world.add(id, 'pos', { x, y });
  world.add(id, 'tag', { type: 'chest' });

  const reward = _rollReward();
  chests.set(id, {
    timer: CHEST.LIFETIME,
    sparkleTimer: 0,
    bobPhase: Math.random() * Math.PI * 2,
    baseY: y,
    reward,
  });

  bus.emit('chest:spawn', id, x, y);
  return id;
}

/**
 * Update all chests: bob animation, sparkles, lifetime, pickup detection.
 * @param {number} dt — delta time
 * @param {{ addCoins: Function, addXp: Function }} callbacks
 */
export function updateChests(dt, callbacks) {
  const playerId = getPlayerId();
  const playerPos = playerId != null ? getPlayerPos() : null;

  for (const [id, data] of chests) {
    if (!world.alive(id)) {
      chests.delete(id);
      continue;
    }

    // Lifetime countdown
    data.timer -= dt;
    if (data.timer <= 0) {
      // Despawn with a small fizzle
      const pos = world.get(id, 'pos');
      spawnExplosion(pos.x, pos.y, getColor(3), 4);
      world.destroy(id);
      chests.delete(id);
      continue;
    }

    // Bob animation
    data.bobPhase += CHEST.BOB_SPEED * dt;
    const pos = world.get(id, 'pos');
    pos.y = data.baseY + Math.sin(data.bobPhase) * CHEST.BOB_AMP;

    // Pickup detection
    if (playerPos) {
      if (circleVsCircle(playerPos.x, playerPos.y, 6, pos.x, pos.y, CHEST.PICKUP_RADIUS)) {
        _collectChest(id, data, callbacks);
        continue;
      }
    }
  }
}

/**
 * Render all active chests.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderChests(ctx) {
  for (const [id, data] of chests) {
    if (!world.alive(id)) continue;
    const pos = world.get(id, 'pos');

    // Blink when about to despawn (last 3 seconds)
    if (data.timer < 3 && Math.floor(data.timer * 6) % 2 === 0) continue;

    const x = pos.x;
    const y = pos.y;
    const r = CHEST.RADIUS;

    // Glow aura
    ctx.globalAlpha = 0.15 + 0.05 * Math.sin(data.bobPhase * 2);
    ctx.fillStyle = getColor(9); // yellow glow
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();

    // Chest body (rounded box look via overlapping rects)
    ctx.globalAlpha = 1;
    ctx.fillStyle = getColor(4); // brown/dark
    ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 1.2);

    // Lid (top half, slightly lighter)
    ctx.fillStyle = getColor(9); // gold
    ctx.fillRect(x - r, y - r * 0.6, r * 2, r * 0.5);

    // Clasp (center dot)
    ctx.fillStyle = getColor(15); // white
    ctx.fillRect(x - 1, y - r * 0.2, 2, 2);

    // Border
    ctx.strokeStyle = getColor(1);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - r, y - r * 0.6, r * 2, r * 1.2);

    // Sparkle particles (small stars)
    data.sparkleTimer += 0.016; // approximate, we don't have dt here
    if (data.sparkleTimer >= CHEST.SPARKLE_RATE) {
      data.sparkleTimer = 0;
      // Tiny star drawn inline
      const sx = x + (Math.random() - 0.5) * r * 3;
      const sy = y + (Math.random() - 0.5) * r * 3;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = getColor(9);
      ctx.fillRect(sx - 0.5, sy - 0.5, 1, 1);
    }

    ctx.globalAlpha = 1;
  }
}

/**
 * Get the number of active chests.
 * @returns {number}
 */
export function getChestCount() {
  return chests.size;
}

/**
 * Clear all chests (on run reset).
 */
export function clearChests() {
  for (const [id] of chests) {
    if (world.alive(id)) world.destroy(id);
  }
  chests.clear();
}

// ─── Internal ────────────────────────────────────────────────

function _collectChest(id, data, callbacks) {
  const pos = world.get(id, 'pos');
  const reward = data.reward;

  // Apply reward
  if (reward.type === 'coins' && callbacks.addCoins) {
    callbacks.addCoins(reward.amount);
  } else if (reward.type === 'xp' && callbacks.addXp) {
    callbacks.addXp(reward.amount);
  } else if (reward.type === 'heal') {
    healPlayer(reward.amount);
  }

  // Celebration particles
  spawnExplosion(pos.x, pos.y, getColor(9), 12);

  // Emit event for HUD flash
  bus.emit('chest:collected', { reward, x: pos.x, y: pos.y });

  // Destroy entity
  world.destroy(id);
  chests.delete(id);
}

function _rollReward() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const entry of REWARD_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return { ...entry };
  }
  return { ...REWARD_TABLE[0] };
}

export default { trySpawnChest, spawnChest, updateChests, renderChests, getChestCount, clearChests };
