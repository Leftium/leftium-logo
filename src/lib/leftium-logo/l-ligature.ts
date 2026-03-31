/**
 * L-only ligature geometry for the Leftium favicon.
 *
 * The "L" is defined on a grid of 5 equal squares:
 *   - Vertical stem: 1 square wide, 5 squares tall
 *   - Horizontal foot: 3 squares wide (2 for L + 1 shared), 1 square tall
 *
 * Unrotated vertices (in grid units, origin at top-left):
 *   (0,0) → (1,0) → (1,4) → (3,4) → (3,5) → (0,5)
 *
 * The shape is then rotated 45° clockwise for the final favicon mark.
 */

// ─── Unrotated L polygon (grid units) ────────────────────────────────────────

/** Vertices of the L shape in grid units before rotation. */
export const L_VERTICES: [number, number][] = [
	[0, 0],
	[1, 0],
	[1, 4],
	[3, 4],
	[3, 5],
	[0, 5]
];

/** Grid columns (unrotated width in grid units). */
export const L_COLS = 3;

/** Grid rows (unrotated height in grid units). */
export const L_ROWS = 5;

// ─── 45° CW rotation ────────────────────────────────────────────────────────

const R = Math.SQRT2 / 2; // cos(45°) = sin(45°)

/** Rotate a point 45° clockwise (in screen/SVG coordinates where Y points down). */
function rotateCW45(x: number, y: number): [number, number] {
	return [x * R - y * R, x * R + y * R];
}

/** Rotated L vertices (in grid units, not yet translated to origin). */
export const L_ROTATED_RAW: [number, number][] = L_VERTICES.map(([x, y]) => rotateCW45(x, y));

// Compute bounding box of the rotated shape
const rxs = L_ROTATED_RAW.map(([x]) => x);
const rys = L_ROTATED_RAW.map(([, y]) => y);
const rMinX = Math.min(...rxs);
const rMinY = Math.min(...rys);
const rMaxX = Math.max(...rxs);
const rMaxY = Math.max(...rys);

/** Width of rotated L bounding box (in grid units). */
export const L_ROTATED_W = rMaxX - rMinX;

/** Height of rotated L bounding box (in grid units). */
export const L_ROTATED_H = rMaxY - rMinY;

/** Rotated L vertices, translated so bounding box starts at (0,0). */
export const L_ROTATED: [number, number][] = L_ROTATED_RAW.map(([x, y]) => [x - rMinX, y - rMinY]);

/** Center of the rotated L bounding box (in grid units, origin-translated). */
export const L_ROTATED_CX = L_ROTATED_W / 2;
export const L_ROTATED_CY = L_ROTATED_H / 2;

// ─── SVG polygon generation ─────────────────────────────────────────────────

/**
 * Generate an SVG `points` attribute string for the rotated L polygon,
 * scaled and positioned within a container.
 *
 * @param containerSize - Side length of the square container (px)
 * @param scale - Scale factor (1 = fill container width)
 * @param offsetX - Horizontal offset as fraction of container (-0.5 to 0.5)
 * @param offsetY - Vertical offset as fraction of container (-0.5 to 0.5)
 * @returns SVG polygon `points` string
 */
export function generateLPolygonPoints(
	containerSize: number,
	scale: number = 1,
	offsetX: number = 0,
	offsetY: number = 0
): string {
	// The rotated L has a certain aspect ratio; scale to fit container
	const maxDim = Math.max(L_ROTATED_W, L_ROTATED_H);
	const baseScale = (containerSize / maxDim) * scale;

	// Scaled dimensions
	const scaledW = L_ROTATED_W * baseScale;
	const scaledH = L_ROTATED_H * baseScale;

	// Center in container, then apply offset
	const tx = (containerSize - scaledW) / 2 + offsetX * containerSize;
	const ty = (containerSize - scaledH) / 2 + offsetY * containerSize;

	return L_ROTATED.map(([x, y]) => `${rd(x * baseScale + tx)},${rd(y * baseScale + ty)}`).join(' ');
}

/** Round to 4 decimal places for clean SVG output. */
function rd(n: number): number {
	return Math.round(n * 10000) / 10000;
}
