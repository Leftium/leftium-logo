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

import { generateCornerPath } from '$lib/app-logo/squircle.js';

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

// Ligature positioning — squircle mode (true Lamé squircle boundary)
const LIG_SQRC_W = 405.2;
const LIG_SQRC_H = 613.6;
const LIG_SQRC_L = 121.4;
const LIG_SQRC_T = -19.8;
const BLUR_PAD_SQRC = 46.0;

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
 * Build an SVG `<clipPath>` for the squircle, offset by (ox, oy) within the canvas.
 * Uses `generateCornerPath` for the true Lamé curve, then translates to position.
 */
function squircleClipPath(gridPx: number, ox: number, oy: number, clipId: string): string {
	const pathD = generateCornerPath(gridPx, 50, 'squircle');
	return `<clipPath id="${clipId}"><path d="${pathD}" transform="translate(${r(ox)},${r(oy)})"/></clipPath>`;
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
