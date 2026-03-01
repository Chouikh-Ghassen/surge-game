/**
 * @module ui/hud
 * Minimal in-game HUD for SURGE — health bar, wave counter, score, XP bar.
 * All drawing happens on the canvas; no DOM overlays for performance.
 */

import { SCREEN, PLAYER } from '../config/balance.js';
import { getColor } from '../config/palettes.js';

// ─── HUD State ───────────────────────────────────────────────

const hud = {
  score: 0,
  wave: 0,
  hp: PLAYER.MAX_HP,
  maxHp: PLAYER.MAX_HP,
  xp: 0,
  xpToNext: 100,
  comboCount: 0,
  comboTimer: 0,
  /** Flash messages (e.g. "WAVE 3!", "LEVEL UP!") */
  flash: null,
  flashTimer: 0,
  /** Kill feed entries */
  killFeed: [],
  /** Active upgrade stacks {id: stack} — set externally each frame */
  upgrades: {},
  /** Dash cooldown ratio 0-1 (1 = ready) */
  dashReady: 1,
  /** Enemy count on screen */
  enemyCount: 0,
  /** Level number */
  level: 1,
};

// ─── Public API ──────────────────────────────────────────────

/**
 * Update HUD-related timers.
 * @param {number} dt
 */
export function updateHud(dt) {
  // Combo decay
  if (hud.comboTimer > 0) {
    hud.comboTimer -= dt;
    if (hud.comboTimer <= 0) {
      hud.comboCount = 0;
    }
  }

  // Flash message decay
  if (hud.flashTimer > 0) {
    hud.flashTimer -= dt;
    if (hud.flashTimer <= 0) {
      hud.flash = null;
    }
  }

  // Kill feed decay
  for (let i = hud.killFeed.length - 1; i >= 0; i--) {
    hud.killFeed[i].timer -= dt;
    if (hud.killFeed[i].timer <= 0) {
      hud.killFeed.splice(i, 1);
    }
  }
}

/**
 * Set player health for the HUD.
 * @param {number} hp
 * @param {number} maxHp
 */
export function setHudHealth(hp, maxHp) {
  hud.hp = hp;
  hud.maxHp = maxHp;
}

/**
 * Set the current score.
 * @param {number} score
 */
export function setHudScore(score) {
  hud.score = score;
}

/**
 * Set the current wave number.
 * @param {number} wave
 */
export function setHudWave(wave) {
  hud.wave = wave;
}

/**
 * Set XP bar values.
 * @param {number} xp
 * @param {number} xpToNext
 */
export function setHudXp(xp, xpToNext) {
  hud.xp = xp;
  hud.xpToNext = xpToNext;
}

/**
 * Increment the combo counter and reset timer.
 */
export function incrementCombo() {
  hud.comboCount++;
  hud.comboTimer = 2.0; // 2 second combo window
}

/**
 * Show a flash message (auto-fades).
 * @param {string} msg
 * @param {number} [duration=1.5]
 */
export function showFlash(msg, duration = 1.5) {
  hud.flash = msg;
  hud.flashTimer = duration;
}

/**
 * Add to the kill feed.
 * @param {string} text
 */
export function addKillFeed(text) {
  hud.killFeed.push({ text, timer: 1.5 });
  if (hud.killFeed.length > 5) hud.killFeed.shift();
}

/**
 * Reset HUD state for a new run.
 */
export function resetHud() {
  hud.score = 0;
  hud.wave = 0;
  hud.hp = PLAYER.MAX_HP;
  hud.maxHp = PLAYER.MAX_HP;
  hud.xp = 0;
  hud.xpToNext = 100;
  hud.comboCount = 0;
  hud.comboTimer = 0;
  hud.flash = null;
  hud.flashTimer = 0;
  hud.killFeed = [];
  hud.upgrades = {};
  hud.dashReady = 1;
  hud.enemyCount = 0;
  hud.level = 1;
}

/**
 * Set the active upgrades for the HUD to display.
 * @param {Record<string, number>} stacks
 */
export function setHudUpgrades(stacks) {
  hud.upgrades = stacks;
}

/**
 * Set dash cooldown readiness (0 = on cooldown, 1 = ready).
 * @param {number} ratio
 */
export function setHudDash(ratio) {
  hud.dashReady = ratio;
}

/**
 * Set current enemy count for HUD display.
 * @param {number} count
 */
export function setHudEnemyCount(count) {
  hud.enemyCount = count;
}

/**
 * Set current level.
 * @param {number} lv
 */
export function setHudLevel(lv) {
  hud.level = lv;
}

// ─── Render ──────────────────────────────────────────────────

/**
 * Draw the entire HUD overlay.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderHud(ctx) {
  const W = SCREEN.WIDTH;
  const H = SCREEN.HEIGHT;

  // ── Health bar (top-left) ──
  _drawHealthBar(ctx, 4, 4, 80, 6);

  // ── Wave counter (top-center) ──
  ctx.fillStyle = getColor(15); // white
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${hud.wave}`, W / 2, 10);

  // ── Score (top-right) ──
  ctx.textAlign = 'right';
  ctx.fillText(`${hud.score}`, W - 4, 10);

  // ── Level indicator (below wave) ──
  ctx.fillStyle = getColor(12);
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`LV ${hud.level}`, W / 2, 17);

  // ── Combo counter (left under health) ──
  if (hud.comboCount > 1) {
    const alpha = Math.min(1, hud.comboTimer);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = getColor(9); // yellow
    ctx.textAlign = 'left';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`${hud.comboCount}x COMBO`, 4, 20);
    ctx.globalAlpha = 1;
  }

  // ── Enemy count (top-right, under score) ──
  if (hud.enemyCount > 0) {
    ctx.fillStyle = getColor(6); // red-ish
    ctx.font = '5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`×${hud.enemyCount}`, W - 4, 17);
  }

  // ── Dash Cooldown indicator (left side, below combo) ──
  _drawDashIndicator(ctx, 4, 25);

  // ── Upgrade Icons (bottom-left, above XP) ──
  _drawUpgradeIcons(ctx, 4, H - 16);

  // ── XP bar (bottom) ──
  _drawXpBar(ctx, 20, H - 8, W - 40, 3);

  // ── Flash message (centered) ──
  if (hud.flash) {
    const alpha = Math.min(1, hud.flashTimer * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = getColor(15); // white
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hud.flash, W / 2, H / 3);
    ctx.globalAlpha = 1;
  }

  // ── Kill feed (right side) ──
  ctx.textAlign = 'right';
  ctx.font = '5px monospace';
  for (let i = 0; i < hud.killFeed.length; i++) {
    const entry = hud.killFeed[i];
    const alpha = Math.min(1, entry.timer * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = getColor(10); // green-ish
    ctx.fillText(entry.text, W - 4, 24 + i * 7);
  }
  ctx.globalAlpha = 1;

  // Reset text alignment
  ctx.textAlign = 'left';
}

// ─── Private drawing helpers ─────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function _drawHealthBar(ctx, x, y, w, h) {
  const ratio = Math.max(0, hud.hp / hud.maxHp);

  // Background
  ctx.fillStyle = getColor(1); // dark
  ctx.fillRect(x, y, w, h);

  // Fill — color shifts from green → yellow → red
  let color;
  if (ratio > 0.6) color = getColor(10);      // green
  else if (ratio > 0.3) color = getColor(9);   // yellow
  else color = getColor(6);                     // red

  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * ratio, h);

  // Border
  ctx.strokeStyle = getColor(15);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  // HP text
  ctx.fillStyle = getColor(15);
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${hud.hp}/${hud.maxHp}`, x + w / 2, y + h - 0.5);
  ctx.textAlign = 'left';
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function _drawXpBar(ctx, x, y, w, h) {
  const ratio = hud.xpToNext > 0 ? Math.min(1, hud.xp / hud.xpToNext) : 0;

  // Background
  ctx.fillStyle = getColor(1);
  ctx.fillRect(x, y, w, h);

  // Fill
  ctx.fillStyle = getColor(12); // blue/cyan
  ctx.fillRect(x, y, w * ratio, h);

  // Border
  ctx.strokeStyle = getColor(3);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);
}

/**
 * Draw dash readiness indicator — a small arc that fills as cooldown recharges.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function _drawDashIndicator(ctx, x, y) {
  const r = 4;
  const cx = x + r;
  const cy = y + r;

  // Background arc
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = getColor(3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Fill arc
  if (hud.dashReady >= 1) {
    // Ready — pulse green
    const pulse = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = getColor(10);
  } else {
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = getColor(9);
  }
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + hud.dashReady * Math.PI * 2);
  ctx.stroke();

  // Label
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = getColor(15);
  ctx.font = '3px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DSH', cx, cy + 1.5);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

/**
 * Draw small icons for active upgrades (compact strip).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function _drawUpgradeIcons(ctx, x, y) {
  const ICON_CHARS = {
    spread_shot: 'S', pierce: 'P', fire_rate: 'F', damage: 'D',
    homing: 'H', ricochet: 'R', shield: '■', dash_cd: '»',
    slow_aura: '~', regen: '+', armor: 'A',
    magnet: 'M', nuke: '★', decoy: '△', scanner: '◎',
  };

  const active = Object.entries(hud.upgrades).filter(([, v]) => v > 0);
  if (active.length === 0) return;

  let ox = x;
  ctx.font = '5px monospace';

  for (const [id, stack] of active) {
    const ch = ICON_CHARS[id] || '?';

    // Icon background
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = getColor(2);
    ctx.fillRect(ox, y, 8, 7);

    // Icon character
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = getColor(10);
    ctx.textAlign = 'center';
    ctx.fillText(ch, ox + 4, y + 5.5);

    // Stack count (bottom-right)
    if (stack > 1) {
      ctx.fillStyle = getColor(9);
      ctx.font = '3px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${stack}`, ox + 8, y + 7);
      ctx.font = '5px monospace';
    }

    ox += 9;
    if (ox > SCREEN.WIDTH - 30) break; // Don't overflow
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export { hud };
