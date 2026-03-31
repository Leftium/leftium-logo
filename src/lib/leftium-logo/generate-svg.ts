/**
 * Generate a self-contained static SVG for the Leftium logo.
 *
 * Replicates the LeftiumLogo.svelte layout geometry as pure SVG,
 * with all assets inlined as base64 data URIs.
 */

// ─── Raw SVG asset strings (imported at build time via ?raw) ─────────────────
import squareSvgRaw from '$lib/assets/logo-parts/square.svg?raw';
import glowSvgRaw from '$lib/assets/logo-parts/glow.svg?raw';
import glowSquircleSvgRaw from '$lib/assets/logo-parts/glow-squircle.svg?raw';
import ligatureSvgRaw from '$lib/assets/logo-parts/ligature.svg?raw';
import shadowSvgRaw from '$lib/assets/logo-parts/shadow.svg?raw';

// ─── Geometry constants (mirrored from LeftiumLogo.svelte) ───────────────────

// The inner grid (grid-logo) is always 532×532 in "native" units.
const GRID = 532;

// Glow is 647×647, centered on the square (overflows by 57.5 on each side)
const GLOW_W = 647;
const GLOW_OFFSET = -57.5; // (647-532)/2 = 57.5

// Ligature positioning — square mode
const LIG_ORIG_W = 440;
const LIG_ORIG_H = 666;
const LIG_ORIG_L = 133.5;
const LIG_ORIG_T = -65.75;
const BLUR_PAD_ORIG = 50;

// Ligature positioning — squircle mode
const LIG_SQRC_W = 425.2;
const LIG_SQRC_H = 643.6;
const LIG_SQRC_L = 129.5;
const LIG_SQRC_T = -47.6;
const BLUR_PAD_SQRC = 48.3;

// Bounding box scaling factors for the grid within the output canvas.
// CSS: grid width = canvas / scale_factor, centered.
const BBOX_SCALE: Record<BoundingBox, number> = {
	square: 1,
	default: 1.2519,
	encircled: 1.5037,
	cropped: 1 // handled separately — non-square canvas
};

// Squircle encircled gets an extra 1.04× scale-up
const ENCIRCLED_SQUIRCLE_EXTRA = 1.04;

// Cropped mode dimensions (from LeftiumLogo.svelte CSS comments)
// Container aspect ratio ≈ 0.8906 (height/width = 1/0.8906)
const CROPPED_ASPECT = 1 / 0.8906; // height = width * this
const CROPPED_GRID_W_FRAC = 0.782; // grid is 78.2% of container width
const CROPPED_LEFT_FRAC = 0.0844; // 8.44% from left
const CROPPED_TOP_FRAC = 0.1523; // 15.23% from top

// Squircle clip polygon points (percentages → will be scaled to px).
// This is the same polygon as LeftiumLogo.svelte SQUIRCLE_CLIP but converted
// to absolute pixel coordinates at render time.
const SQUIRCLE_POLY_PCTS: [number, number][] = [
	[50, 0],
	[53.05, 0],
	[55.96, 0],
	[58.74, 0],
	[61.38, 0],
	[63.89, 0],
	[66.27, 0],
	[68.54, 0.01],
	[70.69, 0.01],
	[72.73, 0.02],
	[74.66, 0.03],
	[76.48, 0.04],
	[78.21, 0.06],
	[79.84, 0.09],
	[81.37, 0.11],
	[82.82, 0.15],
	[84.18, 0.2],
	[85.46, 0.25],
	[86.66, 0.31],
	[87.78, 0.39],
	[88.83, 0.48],
	[89.81, 0.58],
	[90.73, 0.7],
	[91.58, 0.83],
	[92.37, 0.99],
	[93.11, 1.16],
	[93.79, 1.36],
	[94.41, 1.58],
	[94.99, 1.83],
	[95.53, 2.11],
	[96.02, 2.41],
	[96.47, 2.75],
	[96.88, 3.13],
	[97.25, 3.53],
	[97.59, 3.98],
	[97.89, 4.47],
	[98.17, 5.01],
	[98.42, 5.59],
	[98.64, 6.21],
	[98.84, 6.89],
	[99.01, 7.63],
	[99.17, 8.42],
	[99.3, 9.27],
	[99.42, 10.19],
	[99.52, 11.17],
	[99.61, 12.22],
	[99.69, 13.34],
	[99.75, 14.54],
	[99.8, 15.82],
	[99.85, 17.18],
	[99.89, 18.63],
	[99.91, 20.16],
	[99.94, 21.79],
	[99.96, 23.52],
	[99.97, 25.34],
	[99.98, 27.27],
	[99.99, 29.31],
	[99.99, 31.46],
	[100, 33.73],
	[100, 36.11],
	[100, 38.62],
	[100, 41.26],
	[100, 44.04],
	[100, 46.95],
	[100, 50],
	[100, 50],
	[100, 53.05],
	[100, 55.96],
	[100, 58.74],
	[100, 61.38],
	[100, 63.89],
	[100, 66.27],
	[99.99, 68.54],
	[99.99, 70.69],
	[99.98, 72.73],
	[99.97, 74.66],
	[99.96, 76.48],
	[99.94, 78.21],
	[99.91, 79.84],
	[99.89, 81.37],
	[99.85, 82.82],
	[99.8, 84.18],
	[99.75, 85.46],
	[99.69, 86.66],
	[99.61, 87.78],
	[99.52, 88.83],
	[99.42, 89.81],
	[99.3, 90.73],
	[99.17, 91.58],
	[99.01, 92.37],
	[98.84, 93.11],
	[98.64, 93.79],
	[98.42, 94.41],
	[98.17, 94.99],
	[97.89, 95.53],
	[97.59, 96.02],
	[97.25, 96.47],
	[96.88, 96.88],
	[96.47, 97.25],
	[96.02, 97.59],
	[95.53, 97.89],
	[94.99, 98.17],
	[94.41, 98.42],
	[93.79, 98.64],
	[93.11, 98.84],
	[92.37, 99.01],
	[91.58, 99.17],
	[90.73, 99.3],
	[89.81, 99.42],
	[88.83, 99.52],
	[87.78, 99.61],
	[86.66, 99.69],
	[85.46, 99.75],
	[84.18, 99.8],
	[82.82, 99.85],
	[81.37, 99.89],
	[79.84, 99.91],
	[78.21, 99.94],
	[76.48, 99.96],
	[74.66, 99.97],
	[72.73, 99.98],
	[70.69, 99.99],
	[68.54, 99.99],
	[66.27, 100],
	[63.89, 100],
	[61.38, 100],
	[58.74, 100],
	[55.96, 100],
	[53.05, 100],
	[50, 100],
	[50, 100],
	[46.95, 100],
	[44.04, 100],
	[41.26, 100],
	[38.62, 100],
	[36.11, 100],
	[33.73, 100],
	[31.46, 99.99],
	[29.31, 99.99],
	[27.27, 99.98],
	[25.34, 99.97],
	[23.52, 99.96],
	[21.79, 99.94],
	[20.16, 99.91],
	[18.63, 99.89],
	[17.18, 99.85],
	[15.82, 99.8],
	[14.54, 99.75],
	[13.34, 99.69],
	[12.22, 99.61],
	[11.17, 99.52],
	[10.19, 99.42],
	[9.27, 99.3],
	[8.42, 99.17],
	[7.63, 99.01],
	[6.89, 98.84],
	[6.21, 98.64],
	[5.59, 98.42],
	[5.01, 98.17],
	[4.47, 97.89],
	[3.98, 97.59],
	[3.53, 97.25],
	[3.13, 96.88],
	[2.75, 96.47],
	[2.41, 96.02],
	[2.11, 95.53],
	[1.83, 94.99],
	[1.58, 94.41],
	[1.36, 93.79],
	[1.16, 93.11],
	[0.99, 92.37],
	[0.83, 91.58],
	[0.7, 90.73],
	[0.58, 89.81],
	[0.48, 88.83],
	[0.39, 87.78],
	[0.31, 86.66],
	[0.25, 85.46],
	[0.2, 84.18],
	[0.15, 82.82],
	[0.11, 81.37],
	[0.09, 79.84],
	[0.06, 78.21],
	[0.04, 76.48],
	[0.03, 74.66],
	[0.02, 72.73],
	[0.01, 70.69],
	[0.01, 68.54],
	[0, 66.27],
	[0, 63.89],
	[0, 61.38],
	[0, 58.74],
	[0, 55.96],
	[0, 53.05],
	[0, 50],
	[0, 50],
	[0, 46.95],
	[0, 44.04],
	[0, 41.26],
	[0, 38.62],
	[0, 36.11],
	[0, 33.73],
	[0.01, 31.46],
	[0.01, 29.31],
	[0.02, 27.27],
	[0.03, 25.34],
	[0.04, 23.52],
	[0.06, 21.79],
	[0.09, 20.16],
	[0.11, 18.63],
	[0.15, 17.18],
	[0.2, 15.82],
	[0.25, 14.54],
	[0.31, 13.34],
	[0.39, 12.22],
	[0.48, 11.17],
	[0.58, 10.19],
	[0.7, 9.27],
	[0.83, 8.42],
	[0.99, 7.63],
	[1.16, 6.89],
	[1.36, 6.21],
	[1.58, 5.59],
	[1.83, 5.01],
	[2.11, 4.47],
	[2.41, 3.98],
	[2.75, 3.53],
	[3.13, 3.13],
	[3.53, 2.75],
	[3.98, 2.41],
	[4.47, 2.11],
	[5.01, 1.83],
	[5.59, 1.58],
	[6.21, 1.36],
	[6.89, 1.16],
	[7.63, 0.99],
	[8.42, 0.83],
	[9.27, 0.7],
	[10.19, 0.58],
	[11.17, 0.48],
	[12.22, 0.39],
	[13.34, 0.31],
	[14.54, 0.25],
	[15.82, 0.2],
	[17.18, 0.15],
	[18.63, 0.11],
	[20.16, 0.09],
	[21.79, 0.06],
	[23.52, 0.04],
	[25.34, 0.03],
	[27.27, 0.02],
	[29.31, 0.01],
	[31.46, 0.01],
	[33.73, 0],
	[36.11, 0],
	[38.62, 0],
	[41.26, 0],
	[44.04, 0],
	[46.95, 0],
	[50, 0]
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type BoundingBox = 'square' | 'default' | 'encircled' | 'cropped';

export interface LeftiumLogoConfig {
	/** Output canvas width in pixels. For 'cropped' mode the height will differ. Default: 800 */
	size?: number;
	/** Corner shape of the blue square. Default: true (squircle) */
	squircle?: boolean;
	/** Bounding box mode. Default: 'default' */
	boundingBox?: BoundingBox;
	/** Background fill. 'transparent' or a CSS color string e.g. '#ffffff'. Default: 'transparent' */
	background?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Encode a raw SVG string as a base64 data URI */
function svgToDataUri(svgRaw: string): string {
	// btoa works in both browser and modern Node/Bun
	const b64 = btoa(unescape(encodeURIComponent(svgRaw)));
	return `data:image/svg+xml;base64,${b64}`;
}

/** Round to 4 decimal places to keep SVG compact */
function r(n: number): number {
	return Math.round(n * 10000) / 10000;
}

/**
 * Convert the squircle polygon (% coords) to absolute px points
 * offset by (ox, oy) within the SVG canvas.
 */
function squircleClipPath(gridPx: number, ox: number, oy: number, clipId: string): string {
	const pts = SQUIRCLE_POLY_PCTS.map(
		([px, py]) => `${r(ox + (px / 100) * gridPx)},${r(oy + (py / 100) * gridPx)}`
	).join(' ');
	return `<clipPath id="${clipId}"><polygon points="${pts}"/></clipPath>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate a complete, self-contained SVG string for the static Leftium logo.
 *
 * All asset SVGs are inlined as base64 data URIs so the output is a single
 * portable file with no external dependencies.
 */
export function generateLeftiumLogoSvg(config: LeftiumLogoConfig = {}): string {
	const {
		size = 800,
		squircle = true,
		boundingBox = 'default',
		background = 'transparent'
	} = config;

	// ── Choose ligature/shadow constants based on squircle mode ──────────────
	const ligW = squircle ? LIG_SQRC_W : LIG_ORIG_W;
	const ligH = squircle ? LIG_SQRC_H : LIG_ORIG_H;
	const ligL = squircle ? LIG_SQRC_L : LIG_ORIG_L;
	const ligT = squircle ? LIG_SQRC_T : LIG_ORIG_T;
	const blurPad = squircle ? BLUR_PAD_SQRC : BLUR_PAD_ORIG;

	const shadW = ligW + blurPad * 2;
	const shadH = ligH + blurPad * 2;
	const shadL = ligL - blurPad;
	const shadT = ligT - blurPad;

	// ── Compute canvas size and grid position ─────────────────────────────────
	let canvasW: number;
	let canvasH: number;
	let gridPx: number; // rendered size of the 532-unit grid
	let gridX: number; // left offset of grid on canvas
	let gridY: number; // top offset of grid on canvas

	if (boundingBox === 'cropped') {
		canvasW = size;
		canvasH = r(size * CROPPED_ASPECT);
		gridPx = r(size * CROPPED_GRID_W_FRAC);
		gridX = r(size * CROPPED_LEFT_FRAC);
		gridY = r(canvasH * CROPPED_TOP_FRAC);
	} else {
		canvasW = size;
		canvasH = size;
		let scale = BBOX_SCALE[boundingBox];
		if (boundingBox === 'encircled' && squircle) scale = scale / ENCIRCLED_SQUIRCLE_EXTRA;
		gridPx = r(size / scale);
		gridX = r((size - gridPx) / 2);
		gridY = r((size - gridPx) / 2);
	}

	// Scale factor: native grid (532) → rendered pixels
	const s = gridPx / GRID;

	// ── Asset data URIs ───────────────────────────────────────────────────────
	const squareUri = svgToDataUri(squareSvgRaw);
	const glowUri = svgToDataUri(squircle ? glowSquircleSvgRaw : glowSvgRaw);
	const ligUri = svgToDataUri(ligatureSvgRaw);
	const shadUri = svgToDataUri(shadowSvgRaw);

	// ── Element positions (all in canvas px coords) ───────────────────────────

	// Square: fills the full grid
	const sqX = gridX;
	const sqY = gridY;
	const sqW = gridPx;
	const sqH = gridPx;

	// Glow: 647/532 × gridPx, centered (overflows grid on all sides)
	const glowPx = r((GLOW_W / GRID) * gridPx);
	const glowX = r(gridX + (GLOW_OFFSET / GRID) * gridPx);
	const glowY = r(gridY + (GLOW_OFFSET / GRID) * gridPx);

	// Shadow: scaled from native 532 coords
	const shadXpx = r(gridX + (shadL / GRID) * gridPx);
	const shadYpx = r(gridY + (shadT / GRID) * gridPx);
	const shadWpx = r((shadW / GRID) * gridPx);
	const shadHpx = r((shadH / GRID) * gridPx);

	// Ligature: scaled from native 532 coords
	const ligXpx = r(gridX + (ligL / GRID) * gridPx);
	const ligYpx = r(gridY + (ligT / GRID) * gridPx);
	const ligWpx = r((ligW / GRID) * gridPx);
	const ligHpx = r((ligH / GRID) * gridPx);

	// ── Build SVG defs (background rect + optional squircle clip) ─────────────
	const defs: string[] = [];
	let squareClipAttr = '';

	if (squircle) {
		const clipId = 'leftium-squircle-clip';
		defs.push(squircleClipPath(gridPx, gridX, gridY, clipId));
		squareClipAttr = ` clip-path="url(#${clipId})"`;
	}

	const defsBlock = defs.length ? `\n  <defs>\n    ${defs.join('\n    ')}\n  </defs>` : '';

	// ── Background ────────────────────────────────────────────────────────────
	const bgEl =
		background === 'transparent'
			? ''
			: `\n  <rect width="${canvasW}" height="${canvasH}" fill="${background}"/>`;

	// ── Assemble SVG ──────────────────────────────────────────────────────────
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">${defsBlock}${bgEl}
  <!-- shadow (z=0) -->
  <image href="${shadUri}" x="${shadXpx}" y="${shadYpx}" width="${shadWpx}" height="${shadHpx}"/>
  <!-- glow (z=1) -->
  <image href="${glowUri}" x="${glowX}" y="${glowY}" width="${glowPx}" height="${glowPx}"/>
  <!-- square (z=2)${squircle ? ', squircle-clipped' : ''} -->
  <image href="${squareUri}" x="${sqX}" y="${sqY}" width="${sqW}" height="${sqH}"${squareClipAttr}/>
  <!-- ligature (z=3) -->
  <image href="${ligUri}" x="${ligXpx}" y="${ligYpx}" width="${ligWpx}" height="${ligHpx}"/>
</svg>`;
}

// ─── PNG / WebP rasteriser ────────────────────────────────────────────────────

/**
 * Rasterise the Leftium logo to a PNG or WebP Blob.
 * Browser-only (requires canvas + Image).
 */
export async function generateLeftiumLogoPng(
	config: LeftiumLogoConfig,
	format: 'png' | 'webp' = 'png'
): Promise<Blob> {
	const svg = generateLeftiumLogoSvg(config);
	const size = config.size ?? 800;
	const { squircle = true, boundingBox = 'default' } = config;

	const canvasW = size;
	const canvasH = boundingBox === 'cropped' ? Math.round(size * (1 / 0.8906)) : size;

	return new Promise<Blob>((resolve, reject) => {
		const img = new Image();
		const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = canvasW;
				canvas.height = canvasH;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas 2d context'));
					return;
				}

				ctx.drawImage(img, 0, 0, canvasW, canvasH);

				canvas.toBlob(
					(outBlob) => {
						URL.revokeObjectURL(url);
						if (outBlob) resolve(outBlob);
						else reject(new Error('Canvas toBlob returned null'));
					},
					format === 'webp' ? 'image/webp' : 'image/png'
				);
			} catch (err) {
				URL.revokeObjectURL(url);
				reject(err);
			}
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG into Image element'));
		};

		img.src = url;
	});
}
