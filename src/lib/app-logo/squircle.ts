/**
 * Superellipse / corner-shape path generation.
 *
 * Uses the trigonometric Lamé parametrisation for SVG outline paths.
 * This is the only approach that is both edge-tangent (no cusps at shared
 * tangent points) and exactly traces the correct Lamé curve shape.
 *
 * The Lamé curve for a superellipse of parameter `p`:
 *   |a|^(2·|p|) + |b|^(2·|p|) = 1
 *
 * Sampled as:  θ ∈ [π/2 → 0],  e = 1/|p|
 *   a(θ) = cos(θ)^e   (0 → 1, toward end tangent)
 *   b(θ) = sin(θ)^e   (1 → 0, toward start tangent)
 *   point = centre + a·(end−centre) + b·(start−centre)
 *
 * The arc departs start tangent to the start edge and arrives at end tangent
 * to the end edge — so no cusps even when adjacent arcs meet at 50% radius.
 *
 * Exponent mapping — two-sided, continuous at param=0:
 *
 *   param ≥ 0:  e = 2^(1−param)      (exponential shrink, matches CSS K=2^param)
 *   param < 0:  e = 2 − 2·param = 2·(1+|param|)  (linear grow)
 *
 *   Both branches give e=2 at param=0 (bevel). The negative side grows more slowly
 *   than the mirrored positive side, matching Chrome's usable range of -16 to +16.
 *
 *   param = −10 → e=22    → near-notch  (a+b≈0.001)
 *   param = −3  → e=8     → deep scoop  (a+b=0.125)
 *   param = −1  → e=4     → scoop       (a+b=0.5)
 *   param =  0  → e=2     → bevel       (a+b=1.0)
 *   param = +1  → e=1     → round       (a+b=1.414, exact arc)
 *   param = +2  → e=0.5   → squircle    (a+b=1.682)
 *   param = +10 → e≈0.002 → near-square (a+b=1.999)
 *
 * Positive param: arc bows toward outer corner → convex rounding.
 * Negative param: arc bows toward inner centre → concave scoop shapes.
 *
 * @see https://drafts.csswg.org/css-borders-4/#corner-shape-rendering
 */

import type { CornerShape } from './types.js';

/** Segments per corner arc. */
const SEGMENTS = 64;

export function cornerShapeToK(shape: CornerShape): number {
	switch (shape) {
		case 'round':
			return 1;
		case 'squircle':
			return 2;
		case 'square':
			return Infinity;
		case 'bevel':
			return 0;
		case 'scoop':
			return -1;
		case 'notch':
			return -Infinity;
		default: {
			const match = shape.match(/^superellipse\((.+)\)$/);
			if (match) {
				const val = match[1].trim();
				if (val === 'infinity') return Infinity;
				if (val === '-infinity') return -Infinity;
				const n = Number(val);
				if (!isNaN(n)) return n;
			}
			return 1;
		}
	}
}

export function generateCornerPath(
	size: number,
	cornerRadius: number,
	cornerShape: CornerShape
): string {
	if (cornerRadius <= 0) return squarePath(size);

	const param = cornerShapeToK(cornerShape);
	const r = Math.min((cornerRadius / 100) * size, size / 2);

	// ── Degenerate / exact cases ───────────────────────────────────────────────

	if (!isFinite(param)) return param > 0 ? squarePath(size) : notchPath(size, r);

	// param=0: e=2 → bevel (|a|+|b|=1, straight diagonal)
	if (param === 0) return bevelPath(size, r);

	// param=1: exact SVG quarter-ellipse arc (round)
	if (param === 1) return roundPath(size, r);

	// ── Trig Lamé ──────────────────────────────────────────────────────────────
	// e = 2^(1-p)  for p ≥ 0   → e shrinks exponentially: bevel→circle→squircle→square
	// e = 2-2p     for p < 0   → e grows linearly:         bevel→scoop→notch
	// Both give e=2 at p=0 (bevel). Continuous, no special case needed at p=-1.
	const e = param >= 0 ? Math.pow(2, 1 - param) : 2 - 2 * param;

	const parts: string[] = [`M${rd(size - r)},0`];

	// Top-right:    centre=(size−r, r)
	parts.push(sampleArc(size - r, 0, size, r, size - r, r, r, e));
	parts.push(`L${rd(size)},${rd(size - r)}`);

	// Bottom-right: centre=(size−r, size−r)
	parts.push(sampleArc(size, size - r, size - r, size, size - r, size - r, r, e));
	parts.push(`L${rd(r)},${rd(size)}`);

	// Bottom-left:  centre=(r, size−r)
	parts.push(sampleArc(r, size, 0, size - r, r, size - r, r, e));
	parts.push(`L0,${rd(r)}`);

	// Top-left:     centre=(r, r)
	parts.push(sampleArc(0, r, r, 0, r, r, r, e));

	parts.push('Z');
	return parts.join(' ');
}

/**
 * Sample one corner arc via the trigonometric Lamé parametrisation.
 *
 * θ: π/2 → 0,  a = cos(θ)^e,  b = sin(θ)^e
 * point = centre + a·(end−centre) + b·(start−centre)
 *
 * Traces |a|^(2/e) + |b|^(2/e) = 1 exactly.
 * Departs start tangent to the start edge; arrives at end tangent to end edge.
 */
function sampleArc(
	sx: number,
	sy: number,
	ex: number,
	ey: number,
	cx: number,
	cy: number,
	r: number,
	e: number
): string {
	const ux = (ex - cx) / r,
		uy = (ey - cy) / r;
	const vx = (sx - cx) / r,
		vy = (sy - cy) / r;
	const cmds: string[] = [];
	for (let i = 1; i <= SEGMENTS; i++) {
		const theta = (1 - i / SEGMENTS) * (Math.PI / 2);
		const a = Math.pow(Math.cos(theta), e);
		const b = Math.pow(Math.sin(theta), e);
		cmds.push(`L${rd(cx + r * (ux * a + vx * b))},${rd(cy + r * (uy * a + vy * b))}`);
	}
	return cmds.join(' ');
}

// ── Exact path helpers ────────────────────────────────────────────────────────

function squarePath(size: number): string {
	return `M0,0 H${size} V${size} H0 Z`;
}

function roundPath(size: number, r: number): string {
	return [
		`M${rd(r)},0 H${rd(size - r)}`,
		`A${rd(r)},${rd(r)} 0 0 1 ${rd(size)},${rd(r)}`,
		`V${rd(size - r)}`,
		`A${rd(r)},${rd(r)} 0 0 1 ${rd(size - r)},${rd(size)}`,
		`H${rd(r)}`,
		`A${rd(r)},${rd(r)} 0 0 1 0,${rd(size - r)}`,
		`V${rd(r)}`,
		`A${rd(r)},${rd(r)} 0 0 1 ${rd(r)},0 Z`
	].join(' ');
}

function bevelPath(size: number, r: number): string {
	return [
		`M${rd(r)},0 H${rd(size - r)}`,
		`L${rd(size)},${rd(r)} V${rd(size - r)}`,
		`L${rd(size - r)},${rd(size)} H${rd(r)}`,
		`L0,${rd(size - r)} V${rd(r)} Z`
	].join(' ');
}

function notchPath(size: number, r: number): string {
	return [
		`M${rd(r)},0 H${rd(size - r)}`,
		`L${rd(size - r)},${rd(r)} L${rd(size)},${rd(r)}`,
		`V${rd(size - r)} L${rd(size - r)},${rd(size - r)}`,
		`L${rd(size - r)},${rd(size)} H${rd(r)}`,
		`L${rd(r)},${rd(size - r)} L0,${rd(size - r)}`,
		`V${rd(r)} L${rd(r)},${rd(r)} L${rd(r)},0 Z`
	].join(' ');
}

function rd(n: number): number {
	return Math.round(n * 100) / 100;
}
