/**
 * @module ui/touch-controls
 * @description Canvas-rendered virtual joystick + ability button for mobile.
 *
 * Renders on top of the game canvas — no DOM overlays.
 * Uses the input system's existing touch state as data source.
 */

import { SCREEN } from '../config/balance.js';
import { getColor } from '../config/palettes.js';

// ─── State ───────────────────────────────────────────────────

const state = {
  /** Is a touch device? (auto-detected) */
  isTouch: false,
  /** Joystick base position */
  baseX: 0,
  baseY: 0,
  /** Joystick thumb position */
  thumbX: 0,
  thumbY: 0,
  /** Is joystick active? */
  joystickActive: false,
  /** Dash button state */
  dashActive: false,
  /** Dash cooldown ratio (0-1) */
  dashCooldownRatio: 0,
};

const JOYSTICK_BASE_RADIUS = 24;
const JOYSTICK_THUMB_RADIUS = 10;
const DASH_BUTTON_RADIUS = 18;
const DASH_BUTTON_X = SCREEN.WIDTH - 35;
const DASH_BUTTON_Y = SCREEN.HEIGHT - 50;

// ─── Public API ──────────────────────────────────────────────

/**
 * Detect if running on a touch device.
 */
export function detectTouch() {
  state.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/**
 * Update touch control state from input system data.
 * Call each frame.
 * @param {object} input — pollInput() result
 * @param {object} playerData — player ECS component (for dash cooldown)
 */
export function updateTouchControls(input, playerData) {
  if (!state.isTouch) return;

  state.joystickActive = input._touchActive || false;
  if (state.joystickActive) {
    state.baseX = input._touchBaseX || SCREEN.WIDTH * 0.25;
    state.baseY = input._touchBaseY || SCREEN.HEIGHT * 0.75;
    state.thumbX = state.baseX + (input.moveX || 0) * JOYSTICK_BASE_RADIUS;
    state.thumbY = state.baseY + (input.moveY || 0) * JOYSTICK_BASE_RADIUS;
  }

  state.dashActive = input.action;

  if (playerData) {
    const cd = playerData.dashCooldownTimer || 0;
    const maxCd = playerData.dashCooldown || 1;
    state.dashCooldownRatio = Math.max(0, 1 - cd / maxCd);
  }
}

/**
 * Render touch controls overlay on the canvas.
 * Only renders on touch devices.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderTouchControls(ctx) {
  if (!state.isTouch) return;

  // ── Joystick ──
  if (state.joystickActive) {
    // Base circle
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = getColor(15);
    ctx.beginPath();
    ctx.arc(state.baseX, state.baseY, JOYSTICK_BASE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Base ring
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = getColor(15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(state.baseX, state.baseY, JOYSTICK_BASE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Thumb
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = getColor(10);
    ctx.beginPath();
    ctx.arc(state.thumbX, state.thumbY, JOYSTICK_THUMB_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Dash Button ──
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = getColor(3);
  ctx.beginPath();
  ctx.arc(DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Cooldown fill
  if (state.dashCooldownRatio < 1) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = getColor(12);
    ctx.beginPath();
    ctx.moveTo(DASH_BUTTON_X, DASH_BUTTON_Y);
    ctx.arc(
      DASH_BUTTON_X, DASH_BUTTON_Y,
      DASH_BUTTON_RADIUS,
      -Math.PI / 2,
      -Math.PI / 2 + state.dashCooldownRatio * Math.PI * 2
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // Ready pulse
    const pulse = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = getColor(10);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Button border
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = getColor(15);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(DASH_BUTTON_X, DASH_BUTTON_Y, DASH_BUTTON_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Label
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = getColor(15);
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DASH', DASH_BUTTON_X, DASH_BUTTON_Y + 2);

  // Auto-fire indicator
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = getColor(10);
  ctx.font = '4px monospace';
  ctx.fillText('AUTO', DASH_BUTTON_X, DASH_BUTTON_Y - DASH_BUTTON_RADIUS - 4);

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export { state as touchState };
