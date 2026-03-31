/**
 * Superellipse / corner-shape path generation.
 *
 * Follows the CSS Borders Level 4 specification for corner-shape rendering.
 * Maps CornerShape keywords to superellipse parameters and generates SVG paths.
 *
 * The CSS spec defines the curve parametrically:
 *   K = 2^abs(curvature)
 *   For T in [0, 1]: point = mapPointToCorner(T^K, (1-T)^K)
 *
 * @see https://drafts.csswg.org/css-borders-4/#corner-shape-rendering
 */

import type { CornerShape } from './types.js';

/** Number of line segments to sample per corner arc. */
const SEGMENTS = 64;

/**
 * Map a CornerShape keyword or superellipse(n) to its numeric curvature parameter.
 *
 * CSS spec keyword -> superellipse parameter:
 *   round       -> 1    (standard elliptical arc)
 *   squircle    -> 2    (iOS-style continuous curvature)
 *   square      -> Infinity  (sharp 90 deg corner)
 *   bevel       -> 0    (straight diagonal cut)
 *   scoop       -> -1   (inward concave curve)
 *   notch       -> -Infinity (inward right-angle cut)
 */
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
			// superellipse(n) -- parse the numeric value
			const match = shape.match(/^superellipse\((.+)\)$/);
			if (match) {
				const val = match[1].trim();
				if (val === 'infinity') return Infinity;
				if (val === '-infinity') return -Infinity;
				const n = Number(val);
				if (!isNaN(n)) return n;
			}
			return 1; // fallback to round
		}
	}
}

/**
 * Generate an SVG path `d` attribute for a rounded rectangle with a
 * superellipse corner shape.
 *
 * The curve for each corner is sampled parametrically per the CSS Borders L4 spec:
 *   K = 2^abs(curvature)
 *   point(T) = mapPointToCorner(T^K, (1-T)^K) for T in [0, 1]
 *
 * For convex shapes (curvature > 0), the curve bulges outward.
 * For concave shapes (curvature < 0), the center reference flips to the
 * outer corner, creating inward "scoop" curves.
 *
 * @param size - Square side length in pixels
 * @param cornerRadius - Corner radius as percentage (0-50)
 * @param cornerShape - CornerShape keyword or superellipse(n)
 * @returns SVG path `d` string
 */
export function generateCornerPath(
	size: number,
	cornerRadius: number,
	cornerShape: CornerShape
): string {
	// No rounding needed
	if (cornerRadius <= 0) {
		return `M0,0 H${size} V${size} H0 Z`;
	}

	const curvature = cornerShapeToK(cornerShape);

	// square (Infinity): sharp corners, radius is ignored
	if (curvature === Infinity) {
		return `M0,0 H${size} V${size} H0 Z`;
	}

	// Convert percentage to pixels, clamped to half the side
	const r = Math.min((cornerRadius / 100) * size, size / 2);

	// notch (-Infinity): inward right-angle cut at each corner.
	// Goes from tangent point on one edge INWARD to the corner-region center,
	// then back out to the tangent point on the other edge (concave square corner).
	if (curvature === -Infinity) {
		return [
			`M${rd(r)},0`,
			`H${rd(size - r)}`,
			// top-right: inward to center of corner region, then out
			`L${rd(size - r)},${rd(r)}`,
			`L${rd(size)},${rd(r)}`,
			`V${rd(size - r)}`,
			// bottom-right: inward to center, then out
			`L${rd(size - r)},${rd(size - r)}`,
			`L${rd(size - r)},${rd(size)}`,
			`H${rd(r)}`,
			// bottom-left: inward to center, then out
			`L${rd(r)},${rd(size - r)}`,
			`L0,${rd(size - r)}`,
			`V${rd(r)}`,
			// top-left: inward to center, then out
			`L${rd(r)},${rd(r)}`,
			`L${rd(r)},0`,
			`Z`
		].join(' ');
	}

	// bevel (0): straight diagonal cut from tangent to tangent
	if (curvature === 0) {
		return [
			`M${rd(r)},0`,
			`H${rd(size - r)}`,
			`L${rd(size)},${rd(r)}`,
			`V${rd(size - r)}`,
			`L${rd(size - r)},${rd(size)}`,
			`H${rd(r)}`,
			`L0,${rd(size - r)}`,
			`V${rd(r)}`,
			`Z`
		].join(' ');
	}

	// round (1): use SVG arc commands for a perfect quarter-ellipse.
	// This matches what browsers render for border-radius and is exact,
	// unlike the parametric approximation.
	if (curvature === 1) {
		return [
			`M${rd(r)},0`,
			`H${rd(size - r)}`,
			`A${rd(r)},${rd(r)} 0 0 1 ${rd(size)},${rd(r)}`,
			`V${rd(size - r)}`,
			`A${rd(r)},${rd(r)} 0 0 1 ${rd(size - r)},${rd(size)}`,
			`H${rd(r)}`,
			`A${rd(r)},${rd(r)} 0 0 1 0,${rd(size - r)}`,
			`V${rd(r)}`,
			`A${rd(r)},${rd(r)} 0 0 1 ${rd(r)},0`,
			`Z`
		].join(' ');
	}

	// Parametric superellipse curve.
	// K = 2^abs(curvature) per the CSS spec: "Let K be 0.5^(-abs(curvature))"
	const K = Math.pow(2, Math.abs(curvature));
	// Invert: for the outline path (not clip-out), convex shapes use outer corner as ref
	const useOuterAsRef = curvature > 0;

	// Sample the corner arc and return SVG line-to commands.
	//
	// The CSS spec generates a "clip-out" path (what to REMOVE from the rect).
	// Since we generate the OUTLINE path (what to KEEP), we invert the reference:
	// - Convex (squircle, round): curveCenter = outerCorner (curve bows outward)
	// - Concave (scoop): curveCenter = cornerCenter (curve bows inward)
	//
	// The parametric curve maps (T^K, (1-T)^K) through mapPointToCorner,
	// which scales by vectors from curveCenter to the two tangent points.

	const parts: string[] = [`M${rd(size - r)},0`];

	// Top-right corner: start=(size-r, 0), end=(size, r), outer=(size, 0), center=(size-r, r)
	parts.push(sampleCorner(size - r, 0, size, r, size, 0, size - r, r, K, useOuterAsRef));

	// Right edge
	parts.push(`L${rd(size)},${rd(size - r)}`);

	// Bottom-right corner: start=(size, size-r), end=(size-r, size), outer=(size, size), center=(size-r, size-r)
	parts.push(
		sampleCorner(size, size - r, size - r, size, size, size, size - r, size - r, K, useOuterAsRef)
	);

	// Bottom edge
	parts.push(`L${rd(r)},${rd(size)}`);

	// Bottom-left corner: start=(r, size), end=(0, size-r), outer=(0, size), center=(r, size-r)
	parts.push(sampleCorner(r, size, 0, size - r, 0, size, r, size - r, K, useOuterAsRef));

	// Left edge
	parts.push(`L0,${rd(r)}`);

	// Top-left corner: start=(0, r), end=(r, 0), outer=(0, 0), center=(r, r)
	parts.push(sampleCorner(0, r, r, 0, 0, 0, r, r, K, useOuterAsRef));

	parts.push('Z');
	return parts.join(' ');
}

/**
 * Sample a superellipse corner arc as SVG line-to commands.
 *
 * @param sx, sy - Start point (tangent point on the "start" edge)
 * @param ex, ey - End point (tangent point on the "end" edge)
 * @param ox, oy - Outer corner point (the actual rectangle corner)
 * @param cx, cy - Center point (diagonally opposite the outer corner within the corner region)
 * @param K - Exponent: 2^abs(curvature)
 * @param useOuterAsRef - Whether to use outer corner as the curve reference point
 */
function sampleCorner(
	sx: number,
	sy: number,
	ex: number,
	ey: number,
	ox: number,
	oy: number,
	cx: number,
	cy: number,
	K: number,
	useOuterAsRef: boolean
): string {
	// For convex shapes (outline path), use outer corner so curve bows outward.
	// For concave shapes (outline path), use inner center so curve bows inward.
	const refX = useOuterAsRef ? ox : cx;
	const refY = useOuterAsRef ? oy : cy;

	// Vectors from curveCenter to the tangent points
	const toEndX = ex - refX;
	const toEndY = ey - refY;
	const toStartX = sx - refX;
	const toStartY = sy - refY;

	const cmds: string[] = [];

	// Sample T from 0 to 1 (exclusive of 0 since we're already at start)
	for (let i = 1; i <= SEGMENTS; i++) {
		const t = i / SEGMENTS;
		const xParam = Math.pow(t, K);
		const yParam = Math.pow(1 - t, K);

		// mapPointToCorner(xParam, yParam):
		//   refPoint + toEnd * xParam + toStart * yParam
		const px = refX + toEndX * xParam + toStartX * yParam;
		const py = refY + toEndY * xParam + toStartY * yParam;
		cmds.push(`L${rd(px)},${rd(py)}`);
	}

	return cmds.join(' ');
}

/**
 * Round a number to 2 decimal places for clean SVG output.
 */
function rd(n: number): number {
	return Math.round(n * 100) / 100;
}
