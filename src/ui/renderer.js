/**
 * @module ui/renderer
 * @description Canvas 2D rendering pipeline for SURGE.
 *
 * Retro handheld aesthetic:
 *  - Renders at 240×400 logical pixels
 *  - Scales up to fill device screen (nearest-neighbor for pixel-art feel)
 *  - All drawing is procedural — geometric shapes, no sprites
 *  - 16-color palette enforcement
 *
 * Inspired by GBC/GBA aesthetics + LoL Swarm's clean particle work.
 */

import { SCREEN, ARENA, VISUAL } from '../config/balance.js';
import { getColor } from '../config/palettes.js';

/** @type {HTMLCanvasElement} */
let canvas = null;
/** @type {CanvasRenderingContext2D} */
let ctx = null;
/** Device pixel ratio for sharp text rendering */
let dpr = 1;

// ─── Screen Shake State ──────────────────────────────────────

const shake = { x: 0, y: 0, intensity: 0 };

// ─── Flash State ─────────────────────────────────────────────

let flashTimer = 0;
let flashColor = '#ffffff';

// ─── Initialization ──────────────────────────────────────────

/**
 * Initialize the renderer.
 * @param {HTMLCanvasElement} canvasEl
 * @returns {CanvasRenderingContext2D}
 */
export function initRenderer(canvasEl) {
  canvas = canvasEl;
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = SCREEN.WIDTH * dpr;
  canvas.height = SCREEN.HEIGHT * dpr;
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false; // Crisp shapes
  return ctx;
}

/**
 * Get the rendering context.
 * @returns {CanvasRenderingContext2D}
 */
export function getCtx() {
  return ctx;
}

// ─── Frame Lifecycle ─────────────────────────────────────────

/**
 * Begin a new render frame — clear and apply transforms.
 */
export function beginFrame() {
  ctx.save();

  // Apply screen shake offset
  if (shake.intensity > 0.1) {
    shake.x = (Math.random() - 0.5) * 2 * shake.intensity;
    shake.y = (Math.random() - 0.5) * 2 * shake.intensity;
    shake.intensity *= VISUAL.SCREEN_SHAKE_DECAY;
    ctx.translate(shake.x, shake.y);
  } else {
    shake.intensity = 0;
    shake.x = 0;
    shake.y = 0;
  }

  // Clear
  ctx.fillStyle = getColor(0);
  ctx.fillRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);

  return ctx;
}

/**
 * End the render frame — apply post-processing.
 */
export function endFrame() {
  // Vignette overlay for depth
  drawVignette();

  // Flash overlay
  if (flashTimer > 0) {
    ctx.globalAlpha = flashTimer / VISUAL.FLASH_DURATION;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);
    ctx.globalAlpha = 1;
    flashTimer -= 1 / 60; // approximate
  }

  ctx.restore();
}

// ─── Effects ─────────────────────────────────────────────────

/**
 * Trigger a screen shake.
 * @param {number} [intensity] - Shake magnitude in pixels
 */
export function triggerShake(intensity = VISUAL.SCREEN_SHAKE_INTENSITY) {
  shake.intensity = Math.max(shake.intensity, intensity);
}

/**
 * Trigger a full-screen flash.
 * @param {string} [color='#ffffff']
 */
export function triggerFlash(color = '#ffffff') {
  flashTimer = VISUAL.FLASH_DURATION;
  flashColor = color;
}

// ─── Arena Drawing ───────────────────────────────────────────

/**
 * Draw the arena background grid.
 */
export function drawArena() {
  const gridColor = getColor(2);
  const gridSpacing = 16;

  // Grid dots instead of lines for cleaner look
  ctx.fillStyle = gridColor;
  ctx.globalAlpha = 0.25;
  for (let gx = ARENA.LEFT; gx <= ARENA.RIGHT; gx += gridSpacing) {
    for (let gy = ARENA.TOP; gy <= ARENA.BOTTOM; gy += gridSpacing) {
      ctx.fillRect(gx, gy, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // Faint glow ring around arena border
  ctx.shadowColor = getColor(2);
  ctx.shadowBlur = 6;
  ctx.strokeStyle = getColor(2);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.strokeRect(ARENA.LEFT, ARENA.TOP, ARENA.WIDTH, ARENA.HEIGHT);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // Arena border
  ctx.strokeStyle = getColor(2);
  ctx.lineWidth = 1;
  ctx.strokeRect(ARENA.LEFT, ARENA.TOP, ARENA.WIDTH, ARENA.HEIGHT);
}

// ─── Glow & Vignette ────────────────────────────────────────

/**
 * Draw a soft glow effect using a radial gradient.
 * @param {number} x @param {number} y
 * @param {number} radius
 * @param {string|number} color
 * @param {number} alpha - 0..1
 */
export function drawGlow(x, y, radius, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const c = typeof color === 'number' ? getColor(color) : color;
  grad.addColorStop(0, c);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Cached vignette gradient (reset on resize) */
let _vignetteGrad = null;

/**
 * Draw a subtle vignette overlay that darkens screen edges.
 */
export function drawVignette() {
  if (!_vignetteGrad) {
    const cx = SCREEN.WIDTH / 2;
    const cy = SCREEN.HEIGHT / 2;
    const r = Math.max(SCREEN.WIDTH, SCREEN.HEIGHT) * 0.7;
    _vignetteGrad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
    _vignetteGrad.addColorStop(0, 'transparent');
    _vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
  }
  ctx.fillStyle = _vignetteGrad;
  ctx.fillRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);
}

// ─── Shape Drawing Primitives ────────────────────────────────

/**
 * Draw a filled circle.
 * @param {number} x @param {number} y @param {number} r - Circle
 * @param {string|number} color - Hex string or palette index
 */
export function drawCircle(x, y, r, color) {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a stroked circle.
 */
export function drawCircleOutline(x, y, r, color, lineWidth = 1) {
  ctx.strokeStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Draw a triangle (player ship shape).
 * @param {number} x @param {number} y - Center
 * @param {number} size - From center to tip
 * @param {number} angle - Rotation in radians (0 = pointing right)
 * @param {string|number} color
 */
export function drawTriangle(x, y, size, angle, color) {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);            // Tip
  ctx.lineTo(-size * 0.6, -size * 0.5);
  ctx.lineTo(-size * 0.6, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a diamond (rhombus) shape.
 */
export function drawDiamond(x, y, w, h, color) {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a regular polygon.
 * @param {number} x @param {number} y @param {number} r
 * @param {number} sides
 * @param {number} angle - Starting angle
 * @param {string|number} color
 */
export function drawPolygon(x, y, r, sides, angle, color) {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (Math.PI * 2 * i) / sides;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a line segment.
 */
export function drawLine(x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draw a filled rectangle.
 */
export function drawRect(x, y, w, h, color) {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.fillRect(x, y, w, h);
}

/**
 * Draw text (monospace bitmap style).
 * @param {string} text
 * @param {number} x @param {number} y
 * @param {string|number} color
 * @param {number} [size=8]
 * @param {string} [align='left']
 */
export function drawText(text, x, y, color, size = VISUAL.FONT_SIZE, align = 'left') {
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

// ─── Particle Rendering ─────────────────────────────────────

/**
 * Draw a particle (tiny square for performance).
 * @param {number} x @param {number} y
 * @param {number} size
 * @param {string|number} color
 * @param {number} alpha - 0..1
 */
export function drawParticle(x, y, size, color, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = typeof color === 'number' ? getColor(color) : color;
  ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
  ctx.globalAlpha = 1;
}

/**
 * Draw a health bar.
 * @param {number} x @param {number} y - Top-left
 * @param {number} w @param {number} h
 * @param {number} ratio - 0..1
 * @param {string} fgColor
 * @param {string} bgColor
 */
export function drawHealthBar(x, y, w, h, ratio, fgColor, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fgColor;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
}

// ─── Canvas Resize ───────────────────────────────────────────

/**
 * Resize canvas to fill window while maintaining aspect ratio.
 * Uses CSS scaling for pixel-perfect rendering.
 */
export function resizeCanvas() {
  if (!canvas) return;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;
  const scale = Math.min(windowW / SCREEN.WIDTH, windowH / SCREEN.HEIGHT);

  canvas.style.width = `${SCREEN.WIDTH * scale}px`;
  canvas.style.height = `${SCREEN.HEIGHT * scale}px`;

  // Re-apply DPR scaling after any resize that resets canvas
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = SCREEN.WIDTH * dpr;
  canvas.height = SCREEN.HEIGHT * dpr;
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  _vignetteGrad = null; // invalidate cached gradient
}

export default {
  initRenderer, getCtx,
  beginFrame, endFrame,
  triggerShake, triggerFlash,
  drawArena, drawGlow, drawVignette,
  drawCircle, drawCircleOutline,
  drawTriangle, drawDiamond, drawPolygon,
  drawLine, drawRect, drawText, drawParticle, drawHealthBar,
  resizeCanvas,
};
