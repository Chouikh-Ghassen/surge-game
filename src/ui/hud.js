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
  /** LLM overlay data */
  llmOverlay: { visible: true, mode: '', cards: [], rationale: '', tip: '' },
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
  hud.llmOverlay = { visible: hud.llmOverlay.visible, mode: '', cards: [], rationale: '', tip: '' };
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

/**
 * Update LLM overlay data (call each frame or on director change).
 * @param {{ mode: string, cards: string[], rationale: string, tip: string }} data
 */
export function setLlmOverlay(data) {
  hud.llmOverlay.mode = data.mode || '';
  hud.llmOverlay.cards = data.cards || [];
  hud.llmOverlay.rationale = data.rationale || '';
  hud.llmOverlay.tip = data.tip || '';
}

/**
 * Toggle LLM overlay visibility.
 * @param {boolean} visible
 */
export function setLlmOverlayVisible(visible) {
  hud.llmOverlay.visible = visible;
}

/**
 * Get LLM overlay visibility state.
 * @returns {boolean}
 */
export function isLlmOverlayVisible() {
  return hud.llmOverlay.visible;
}

// ─── Render ──────────────────────────────────────────────────

/**
 * Draw the entire HUD overlay.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderHud(ctx) {
  const W = SCREEN.WIDTH;
  const H = SCREEN.HEIGHT;

  // ── Health bar (top-left) with label ──
  _drawLabel(ctx, 4, 3, 'HP');
  _drawHealthBar(ctx, 18, 4, 70, 8);

  // ── Wave counter (top-center) ──
  _drawOutlinedText(ctx, `WAVE ${hud.wave}`, W / 2, 11, {
    font: 'bold 8px monospace', color: 15, align: 'center',
  });

  // ── Score (top-right) ──
  _drawLabel(ctx, W - 52, 3, 'SCORE');
  _drawOutlinedText(ctx, `${hud.score}`, W - 4, 11, {
    font: 'bold 8px monospace', color: 15, align: 'right',
  });

  // ── Level indicator (below wave) ──
  _drawOutlinedText(ctx, `LEVEL ${hud.level}`, W / 2, 20, {
    font: 'bold 6px monospace', color: 12, align: 'center',
  });

  // ── Combo counter (left under health) ──
  if (hud.comboCount > 1) {
    const alpha = Math.min(1, hud.comboTimer);
    ctx.globalAlpha = alpha;
    _drawOutlinedText(ctx, `${hud.comboCount}x COMBO`, 4, 22, {
      font: 'bold 8px monospace', color: 9, align: 'left',
    });
    ctx.globalAlpha = 1;
  }

  // ── Enemy count (top-right, under score) ──
  if (hud.enemyCount > 0) {
    _drawOutlinedText(ctx, `ENEMIES: ${hud.enemyCount}`, W - 4, 20, {
      font: 'bold 6px monospace', color: 6, align: 'right',
    });
  }

  // ── Dash Cooldown indicator (left side, below combo) ──
  _drawDashIndicator(ctx, 4, 27);

  // ── Upgrade Icons (bottom-left, above XP) ──
  _drawUpgradeIcons(ctx, 4, H - 20);

  // ── XP bar (bottom) with label ──
  _drawLabel(ctx, 4, H - 8, 'XP');
  _drawXpBar(ctx, 18, H - 8, W - 22, 5);

  // ── Flash message (centered) ──
  if (hud.flash) {
    const alpha = Math.min(1, hud.flashTimer * 2);
    ctx.globalAlpha = alpha;
    _drawOutlinedText(ctx, hud.flash, W / 2, H / 3, {
      font: 'bold 14px monospace', color: 15, align: 'center', shadow: 6,
    });
    ctx.globalAlpha = 1;
  }

  // ── Kill feed (right side) ──
  for (let i = 0; i < hud.killFeed.length; i++) {
    const entry = hud.killFeed[i];
    const alpha = Math.min(1, entry.timer * 2);
    ctx.globalAlpha = alpha;
    _drawOutlinedText(ctx, entry.text, W - 4, 28 + i * 8, {
      font: 'bold 6px monospace', color: 10, align: 'right',
    });
  }
  ctx.globalAlpha = 1;

  // Reset text alignment
  ctx.textAlign = 'left';
}

// ─── Private drawing helpers ─────────────────────────────────

/**
 * Draw outlined text for maximum readability on any background.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {{ font?: string, color?: number, align?: string, shadow?: number }} opts
 */
function _drawOutlinedText(ctx, text, x, y, opts = {}) {
  const font = opts.font || 'bold 7px monospace';
  const color = opts.color ?? 15;
  const align = opts.align || 'left';
  const shadowBlur = opts.shadow ?? 3;

  ctx.font = font;
  ctx.textAlign = align;

  // Dark outline (4-direction offset)
  ctx.fillStyle = getColor(0);
  ctx.fillText(text, x - 1, y);
  ctx.fillText(text, x + 1, y);
  ctx.fillText(text, x, y - 1);
  ctx.fillText(text, x, y + 1);

  // Main text with optional glow
  if (shadowBlur > 0) {
    ctx.shadowColor = getColor(0);
    ctx.shadowBlur = shadowBlur;
  }
  ctx.fillStyle = getColor(color);
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/**
 * Draw a small label tag (e.g. "HP", "XP", "SCORE").
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} label
 */
function _drawLabel(ctx, x, y, label) {
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = getColor(0);
  ctx.fillText(label, x + 1, y + 6);
  ctx.fillStyle = getColor(12); // accent
  ctx.fillText(label, x, y + 5);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function _drawHealthBar(ctx, x, y, w, h) {
  const ratio = Math.max(0, hud.hp / hud.maxHp);

  // Low health pulsing red warning glow
  if (ratio <= 0.3 && hud.hp > 0) {
    const pulse = 0.1 + 0.15 * Math.abs(Math.sin(Date.now() * 0.005));
    ctx.globalAlpha = pulse;
    ctx.shadowColor = getColor(6);
    ctx.shadowBlur = 8;
    ctx.fillStyle = getColor(6);
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Background
  ctx.fillStyle = getColor(1); // dark
  ctx.fillRect(x, y, w, h);

  // Fill — color shifts from green → yellow → red
  let color;
  if (ratio > 0.6) color = getColor(10);      // green
  else if (ratio > 0.3) color = getColor(9);   // yellow
  else color = getColor(6);                     // red

  // Segmented fill — one segment per HP point
  const segW = w / hud.maxHp;
  const gap = 1;
  for (let i = 0; i < hud.hp; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(x + i * segW + gap * 0.5, y, segW - gap, h);
  }

  // Border
  ctx.strokeStyle = getColor(15);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  // HP text (centered inside bar, with outline)
  _drawOutlinedText(ctx, `${hud.hp} / ${hud.maxHp}`, x + w / 2, y + h - 1, {
    font: 'bold 6px monospace', color: 15, align: 'center', shadow: 0,
  });
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

  // Fill with gradient
  const fillW = w * ratio;
  if (fillW > 0) {
    const grad = ctx.createLinearGradient(x, y, x + fillW, y);
    grad.addColorStop(0, getColor(4));
    grad.addColorStop(1, getColor(12));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, fillW, h);
  }

  // Border
  ctx.strokeStyle = getColor(3);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  // XP text (centered inside bar)
  const pct = Math.floor(ratio * 100);
  _drawOutlinedText(ctx, `${hud.xp}/${hud.xpToNext} (${pct}%)`, x + w / 2, y + h - 0.5, {
    font: 'bold 4px monospace', color: 15, align: 'center', shadow: 0,
  });
}

/**
 * Draw dash readiness indicator — a small arc that fills as cooldown recharges.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function _drawDashIndicator(ctx, x, y) {
  const r = 6;
  const cx = x + r;
  const cy = y + r;

  // Background arc
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = getColor(3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Fill arc
  if (hud.dashReady >= 1) {
    // Ready — pulse green
    const pulse = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = getColor(10);
  } else {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = getColor(9);
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + hud.dashReady * Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // "DASH" label next to the indicator
  const readyText = hud.dashReady >= 1 ? 'DASH ✓' : 'DASH';
  _drawOutlinedText(ctx, readyText, cx + r + 3, cy + 2, {
    font: 'bold 5px monospace',
    color: hud.dashReady >= 1 ? 10 : 9,
    align: 'left',
    shadow: 0,
  });
}

/**
 * Draw small icons for active upgrades (compact strip).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 */
function _drawUpgradeIcons(ctx, x, y) {
  // Short readable names for each upgrade
  const ICON_LABELS = {
    spread_shot: 'SPRD', pierce: 'PRC', fire_rate: 'RATE', damage: 'DMG',
    homing: 'HOME', ricochet: 'RICO', shield: 'SHLD', dash_cd: 'DASH+',
    slow_aura: 'SLOW', regen: 'REGEN', armor: 'ARMR',
    magnet: 'MAG', nuke: 'NUKE', decoy: 'DECY', scanner: 'SCAN',
  };

  const active = Object.entries(hud.upgrades).filter(([, v]) => v > 0);
  if (active.length === 0) return;

  // Row label
  _drawLabel(ctx, x, y - 8, 'UPGRADES');

  let ox = x;

  for (const [id, stack] of active) {
    const label = ICON_LABELS[id] || id.slice(0, 4).toUpperCase();
    const tagW = Math.max(16, label.length * 4 + 6);

    // Tag background
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = getColor(1);
    ctx.fillRect(ox, y, tagW, 9);
    ctx.strokeStyle = getColor(3);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ox, y, tagW, 9);
    ctx.globalAlpha = 1;

    // Label text
    _drawOutlinedText(ctx, stack > 1 ? `${label}×${stack}` : label, ox + tagW / 2, y + 7, {
      font: 'bold 5px monospace', color: 10, align: 'center', shadow: 0,
    });

    ox += tagW + 2;
    if (ox > SCREEN.WIDTH - 20) break;
  }

  ctx.textAlign = 'left';
}

/**
 * Get the current LLM overlay data for external DOM rendering.
 * @returns {{ visible: boolean, mode: string, cards: string[], rationale: string, tip: string }}
 */
export function getLlmOverlayData() {
  return { ...hud.llmOverlay };
}

export { hud };
