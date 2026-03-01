/**
 * @module agents/enemy-brain
 * @description Per-type enemy AI for SURGE.
 *
 * Each enemy type has a distinct behavior function that creates
 * unique gameplay pressure (LoL Swarm design philosophy):
 *
 *   Drifter — lazy homing with sine wobble.
 *     Threat: attrition. Swarms overwhelm players who stand still.
 *     Counter: keep moving, mow them down with spread/pierce.
 *
 *   Dasher — FSM: idle → telegraph → charge → recover.
 *     Threat: burst. Fast charges punish predictable movement.
 *     Counter: watch the telegraph flash, sidestep or dash.
 *
 *   Sprayer — stationary turret that fires bullet fans.
 *     Threat: area denial. Fans of bullets restrict safe zones.
 *     Counter: close the distance and burst it down between volleys.
 *
 * Called once per tick via updateEnemyBrains(dt).
 */

import world from '../core/ecs.js';
import { normalize, angleTo } from '../core/physics.js';
import { spawnEnemyBullet } from '../game/projectiles.js';
import { getPlayerPos } from '../game/player.js';
import { ENEMIES } from '../config/balance.js';

// ─── Behavior Dispatch ──────────────────────────────────────

/**
 * Behavior function registry, keyed by enemy type string.
 * Each handler signature: (id, pos, vel, enemy, dt, playerPos)
 * @type {Record<string, Function>}
 */
const BEHAVIORS = {
  drifter:       updateDrifter,
  dasher:        updateDasher,
  sprayer:       updateSprayer,
  orbitor:       updateOrbitor,
  splitter:      updateSplitter,
  splitter_child:updateSplitterChild,
  shielder:      updateShielder,
};

/**
 * Update all enemy AI for one tick.
 * Iterates every entity with (pos, vel, enemy) components
 * and dispatches to the correct type-specific brain.
 *
 * @param {number} dt - Delta time in seconds
 */
export function updateEnemyBrains(dt) {
  const playerPos = getPlayerPos();
  if (!playerPos) return; // no player — enemies idle

  const ids = world.query('pos', 'vel', 'enemy');

  for (const id of ids) {
    const pos = world.get(id, 'pos');
    const vel = world.get(id, 'vel');
    const enemy = world.get(id, 'enemy');

    const behaviorFn = BEHAVIORS[enemy.type];
    if (behaviorFn) {
      behaviorFn(id, pos, vel, enemy, dt, playerPos);
    }
  }
}

// ─── Drifter AI ─────────────────────────────────────────────

/**
 * Drifter: lazy homing swarm mob.
 *
 * Behavior:
 *   1. Move slowly toward the player each frame.
 *   2. Apply a perpendicular sine-wave wobble for visual variety.
 *   3. Each drifter has a random swarm offset so groups don't stack
 *      into a single pixel — this makes swarms feel organic.
 *
 * The wobble makes drifters harder to hit head-on with narrow shots,
 * rewarding spread-shot and pierce upgrades.
 *
 * @param {number} id         - Entity ID
 * @param {Object} pos        - Position component {x, y}
 * @param {Object} vel        - Velocity component {x, y}
 * @param {Object} enemy      - Enemy component
 * @param {number} dt         - Delta time (seconds)
 * @param {Object} playerPos  - Player position {x, y}
 */
function updateDrifter(id, pos, vel, enemy, dt, playerPos) {
  const bp = enemy.behaviorParams;

  // Advance wobble phase
  bp.wobblePhase += bp.wobbleFreq * dt;

  // ── Homing vector toward player (with swarm offset) ──
  const targetX = playerPos.x + bp.swarmOffset;
  const targetY = playerPos.y + bp.swarmOffset * 0.7;

  const dx = targetX - pos.x;
  const dy = targetY - pos.y;
  const dir = normalize(dx, dy);

  // ── Perpendicular wobble vector ──
  // Rotate direction 90° to get perpendicular axis
  const wobbleStrength = Math.sin(bp.wobblePhase) * bp.wobbleAmp;
  const perpX = -dir.y * wobbleStrength;
  const perpY = dir.x * wobbleStrength;

  // ── Final velocity: homing + wobble ──
  vel.x = dir.x * enemy.speed + perpX;
  vel.y = dir.y * enemy.speed + perpY;

  // Apply movement
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

// ─── Dasher AI ──────────────────────────────────────────────

/**
 * Dasher: FSM-driven charge attacker.
 *
 * State machine:
 *   idle → telegraph → charge → recover → idle
 *
 * idle:      Slowly approach the player (closing distance).
 *            Transitions to 'telegraph' when within engagement range.
 *
 * telegraph: Stop moving, flash warning for 0.6s.
 *            Locks the charge direction toward player's CURRENT position.
 *            Visual cue gives the player time to react.
 *
 * charge:    Dash in the locked direction at high speed for 0.3s.
 *            Does NOT track player — rewards prediction/sidestepping.
 *            The diamond shape stretches during the charge.
 *
 * recover:   Brief pause (1s) after the charge ends.
 *            Vulnerable window — rewards aggressive counterplay.
 *
 * @param {number} id
 * @param {Object} pos
 * @param {Object} vel
 * @param {Object} enemy
 * @param {number} dt
 * @param {Object} playerPos
 */
function updateDasher(id, pos, vel, enemy, dt, playerPos) {
  const bp = enemy.behaviorParams;

  switch (enemy.state) {

    // ── IDLE: slow approach, waiting to engage ──
    case 'idle': {
      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const distToPlayer = Math.sqrt(dx * dx + dy * dy);
      const dir = normalize(dx, dy);

      // Slow approach at base speed
      vel.x = dir.x * enemy.speed;
      vel.y = dir.y * enemy.speed;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Reset visual stretch
      bp.stretchFactor = 1.0;

      // Transition: close enough to telegraph a charge
      // Engage at ~80px range (roughly 1/3 arena width)
      if (distToPlayer < 80) {
        enemy.state = 'telegraph';
        enemy.stateTimer = bp.telegraphTime;

        // Lock charge direction toward player's current position
        bp.chargeDirX = dir.x;
        bp.chargeDirY = dir.y;
      }
      break;
    }

    // ── TELEGRAPH: stop and flash warning ──
    case 'telegraph': {
      // Halt movement — the dasher "winds up"
      vel.x = 0;
      vel.y = 0;

      // Countdown
      enemy.stateTimer -= dt;

      // Slight visual "coil" — shrink then stretch
      bp.stretchFactor = 0.7 + 0.3 * (1 - enemy.stateTimer / bp.telegraphTime);

      if (enemy.stateTimer <= 0) {
        enemy.state = 'charge';
        enemy.stateTimer = bp.chargeTime;
      }
      break;
    }

    // ── CHARGE: fast dash in locked direction ──
    case 'charge': {
      vel.x = bp.chargeDirX * bp.chargeSpeed;
      vel.y = bp.chargeDirY * bp.chargeSpeed;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      // Visual stretch during charge (elongate in charge direction)
      bp.stretchFactor = 2.0;

      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'recover';
        enemy.stateTimer = bp.recoverTime;
        bp.stretchFactor = 1.0;
      }
      break;
    }

    // ── RECOVER: brief pause after charge ──
    case 'recover': {
      // Slow to a stop (decelerate)
      vel.x *= 0.9;
      vel.y *= 0.9;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      bp.stretchFactor = 1.0;

      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
        enemy.stateTimer = 0;
      }
      break;
    }

    // Defensive fallback
    default:
      enemy.state = 'idle';
      break;
  }
}

// ─── Sprayer AI ─────────────────────────────────────────────

/**
 * Sprayer: stationary turret with fan-fire volleys.
 *
 * Behavior:
 *   1. Does NOT move (speed = 0 in config). Planted like a seed.
 *   2. Barrel continuously rotates to track the player.
 *   3. Every fireRate seconds, fires a fan of bullets centered
 *      on the barrel angle (spreadAngle across bulletCount shots).
 *
 * The fan pattern creates expanding "walls" of bullets that
 * restrict movement. Players must weave between the gaps or
 * rush in to destroy the sprayer during its cooldown window.
 *
 * @param {number} id
 * @param {Object} pos
 * @param {Object} vel
 * @param {Object} enemy
 * @param {number} dt
 * @param {Object} playerPos
 */
function updateSprayer(id, pos, vel, enemy, dt, playerPos) {
  const bp = enemy.behaviorParams;

  // ── Stationary — clear velocity ──
  vel.x = 0;
  vel.y = 0;

  // ── Track player with barrel ──
  const targetAngle = angleTo(pos.x, pos.y, playerPos.x, playerPos.y);

  // Smooth barrel rotation (lerp toward target for responsive feel)
  let angleDiff = targetAngle - bp.barrelAngle;

  // Normalize angle difference to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const rotationSpeed = 3.0; // radians per second
  bp.barrelAngle += angleDiff * Math.min(1, rotationSpeed * dt);

  // ── Fire timer ──
  bp.fireTimer -= dt;

  if (bp.fireTimer <= 0) {
    bp.fireTimer = bp.fireRate;
    _sprayerFire(pos, bp);
  }
}

/**
 * Fire a fan of enemy bullets from the sprayer.
 *
 * Bullet pattern: evenly spaced across spreadAngle, centered on barrel.
 * Example with 5 bullets and 60° spread:
 *   angles = [-30°, -15°, 0°, +15°, +30°]
 *
 * @private
 * @param {Object} pos - Sprayer position {x, y}
 * @param {Object} bp  - Sprayer behavior params
 */
function _sprayerFire(pos, bp) {
  const count = bp.bulletCount;
  const halfSpread = bp.spreadAngle / 2;

  for (let i = 0; i < count; i++) {
    // Evenly distribute across the spread arc
    const t = count === 1 ? 0 : (i / (count - 1)) - 0.5; // -0.5 to +0.5
    const angle = bp.barrelAngle + t * bp.spreadAngle;

    const vx = Math.cos(angle) * bp.bulletSpeed;
    const vy = Math.sin(angle) * bp.bulletSpeed;

    spawnEnemyBullet(pos.x, pos.y, vx, vy, 1, 2);
  }
}

// ─── Orbitor AI ─────────────────────────────────────────────

/**
 * Orbitor: circles the player at a fixed radius and fires inward.
 *
 * Behavior:
 *   1. Maintain orbit at ~orbitRadius px from the player.
 *   2. Slowly rotate orbitAngle over time.
 *   3. Move toward the desired orbit position each tick.
 *   4. Every fireRate seconds, fire a single bullet toward the player.
 *
 * @param {number} id
 * @param {Object} pos
 * @param {Object} vel
 * @param {Object} enemy
 * @param {number} dt
 * @param {Object} playerPos
 */
function updateOrbitor(id, pos, vel, enemy, dt, playerPos) {
  const bp = enemy.behaviorParams;

  // Advance orbit angle
  bp.orbitAngle += bp.orbitSpeed * dt;

  // Desired position on orbit circle around player
  const targetX = playerPos.x + Math.cos(bp.orbitAngle) * bp.orbitRadius;
  const targetY = playerPos.y + Math.sin(bp.orbitAngle) * bp.orbitRadius;

  // Move toward desired orbit position
  const dx = targetX - pos.x;
  const dy = targetY - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  // Use higher speed to keep up when far from orbit position
  const moveSpeed = Math.min(enemy.speed * 3, dist / dt);
  vel.x = (dx / dist) * moveSpeed;
  vel.y = (dy / dist) * moveSpeed;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  // ── Fire toward player ──
  bp.fireTimer -= dt;
  if (bp.fireTimer <= 0) {
    bp.fireTimer = bp.fireRate;
    const adx = playerPos.x - pos.x;
    const ady = playerPos.y - pos.y;
    const adist = Math.sqrt(adx * adx + ady * ady) || 1;
    const bvx = (adx / adist) * bp.bulletSpeed;
    const bvy = (ady / adist) * bp.bulletSpeed;
    spawnEnemyBullet(pos.x, pos.y, bvx, bvy, 1, 2);
  }
}

// ─── Splitter AI ────────────────────────────────────────────

/**
 * Splitter: slow homing toward the player.
 * Relies on contact damage. On death the enemy system handles spawning children.
 *
 * @param {number} id
 * @param {Object} pos
 * @param {Object} vel
 * @param {Object} enemy
 * @param {number} dt
 * @param {Object} playerPos
 */
function updateSplitter(id, pos, vel, enemy, dt, playerPos) {
  const dx = playerPos.x - pos.x;
  const dy = playerPos.y - pos.y;
  const dir = normalize(dx, dy);

  vel.x = dir.x * enemy.speed;
  vel.y = dir.y * enemy.speed;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

/**
 * Splitter child: faster homing toward the player.
 * Same simple behavior as the parent but quicker.
 */
function updateSplitterChild(id, pos, vel, enemy, dt, playerPos) {
  const dx = playerPos.x - pos.x;
  const dy = playerPos.y - pos.y;
  const dir = normalize(dx, dy);

  vel.x = dir.x * enemy.speed;
  vel.y = dir.y * enemy.speed;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

// ─── Shielder AI ────────────────────────────────────────────

/**
 * Shielder: escorts the nearest non-shielder enemy, staying behind it
 * relative to the player. Projects a damage-reduction aura.
 *
 * Behavior:
 *   1. Find nearest alive non-shielder enemy.
 *   2. Position itself behind that ally (offset away from player).
 *   3. If escort dies, find a new one next tick.
 *
 * The shield aura damage reduction is applied in the collision/damage
 * system by checking proximity to living shielders (see damageEnemy).
 *
 * @param {number} id
 * @param {Object} pos
 * @param {Object} vel
 * @param {Object} enemy
 * @param {number} dt
 * @param {Object} playerPos
 */
function updateShielder(id, pos, vel, enemy, dt, playerPos) {
  const bp = enemy.behaviorParams;

  // ── Find or validate escort target ──
  let escortValid = bp.escortTarget >= 0 && world.alive(bp.escortTarget);
  if (escortValid) {
    const escortEnemy = world.get(bp.escortTarget, 'enemy');
    if (!escortEnemy || escortEnemy.type === 'shielder') escortValid = false;
  }

  if (!escortValid) {
    bp.escortTarget = _findNearestNonShielder(id, pos);
  }

  // ── Move toward escort (or fall back to player homing) ──
  if (bp.escortTarget >= 0 && world.alive(bp.escortTarget)) {
    const allyPos = world.get(bp.escortTarget, 'pos');

    // Offset: place shielder behind ally, away from player
    const adx = allyPos.x - playerPos.x;
    const ady = allyPos.y - playerPos.y;
    const adist = Math.sqrt(adx * adx + ady * ady) || 1;
    const offsetDist = 12;
    const targetX = allyPos.x + (adx / adist) * offsetDist;
    const targetY = allyPos.y + (ady / adist) * offsetDist;

    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    const dir = normalize(dx, dy);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const moveSpeed = Math.min(enemy.speed * 2, dist / dt);
    vel.x = dir.x * moveSpeed;
    vel.y = dir.y * moveSpeed;
  } else {
    // No ally to escort — fall back to slow homing toward player
    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dir = normalize(dx, dy);
    vel.x = dir.x * enemy.speed;
    vel.y = dir.y * enemy.speed;
  }

  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

/**
 * Find the nearest living non-shielder enemy to the given position.
 * @private
 * @param {number} selfId - The shielder's own entity ID (to exclude)
 * @param {Object} pos    - The shielder's position
 * @returns {number} Entity ID of nearest ally, or -1
 */
function _findNearestNonShielder(selfId, pos) {
  const ids = world.query('pos', 'enemy');
  let bestId = -1;
  let bestDist = Infinity;

  for (const eid of ids) {
    if (eid === selfId) continue;
    const e = world.get(eid, 'enemy');
    if (!e || e.type === 'shielder') continue;
    const epos = world.get(eid, 'pos');
    const dx = epos.x - pos.x;
    const dy = epos.y - pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestId = eid;
    }
  }

  return bestId;
}

// ─── Shield Aura Query ──────────────────────────────────────

/**
 * Check whether the given position is within any living shielder's aura.
 * Returns the damage multiplier (1.0 = no shield, 0.5 = shielded).
 * Intended to be called from the damage/collision system.
 *
 * @param {number} x
 * @param {number} y
 * @returns {number} Damage multiplier (0..1)
 */
export function getShieldAuraMultiplier(x, y) {
  const ids = world.query('pos', 'enemy');
  for (const id of ids) {
    const e = world.get(id, 'enemy');
    if (!e || e.type !== 'shielder') continue;
    const sp = world.get(id, 'pos');
    const dx = sp.x - x;
    const dy = sp.y - y;
    if (dx * dx + dy * dy <= e.behaviorParams.shieldRadius * e.behaviorParams.shieldRadius) {
      return e.behaviorParams.shieldDamageReduction; // 0.5
    }
  }
  return 1.0;
}

// ─── Default Export ─────────────────────────────────────────

export default { updateEnemyBrains, getShieldAuraMultiplier };
