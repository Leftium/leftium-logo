/**
 * Generate a self-contained SVG for the Leftium favicon.
 *
 * Renders the rotated "L" ligature (filled white polygon) on the
 * Leftium brand gradient, with either a square or squircle shape.
 */

import { generateCornerPath } from '$lib/app-logo/squircle.js';
import { generateLPolygonPoints } from './l-ligature.js';

// ─── Leftium brand gradient ─────────────────────────────────────────────────

const GRAD_STOPS = [
	{ offset: 0, color: '#0029c1' },
	{ offset: 0.29, color: '#3973ff' },
	{ offset: 1, color: '#0029c1' }
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaviconConfig {
	/** Output size in pixels. Default: 128 */
	size?: number;
	/** Use squircle shape. Default: false (square) */
	squircle?: boolean;
	/** Ligature scale (1 = default fit). Default: 0.7 */
	ligatureScale?: number;
	/** Ligature horizontal offset as fraction of container. Default: 0 */
	ligatureOffsetX?: number;
	/** Ligature vertical offset as fraction of container. Default: 0 */
	ligatureOffsetY?: number;
}

// ─── SVG Generation ──────────────────────────────────────────────────────────

/**
 * Generate a self-contained SVG string for the Leftium favicon.
 */
export function generateFaviconSvg(config: FaviconConfig = {}): string {
	const {
		size = 128,
		squircle = false,
		ligatureScale = 0.7,
		ligatureOffsetX = 0,
		ligatureOffsetY = 0
	} = config;

	// ── Background shape ─────────────────────────────────────────────────────
	let bgPath: string;
	if (squircle) {
		// Squircle: 50% radius, K=2 superellipse
		bgPath = generateCornerPath(size, 50, 'squircle');
	} else {
		bgPath = `M0,0 H${size} V${size} H0 Z`;
	}

	// ── Gradient (45° diagonal, bottom-left to top-right) ────────────────────
	const gradStops = GRAD_STOPS.map(
		(s) => `<stop offset="${s.offset * 100}%" stop-color="${s.color}"/>`
	).join('\n      ');

	// ── L ligature polygon ───────────────────────────────────────────────────
	const polygonPoints = generateLPolygonPoints(
		size,
		ligatureScale,
		ligatureOffsetX,
		ligatureOffsetY
	);

	// ── Assemble SVG ─────────────────────────────────────────────────────────
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      ${gradStops}
    </linearGradient>
    <clipPath id="shape">
      <path d="${bgPath}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)" clip-path="url(#shape)"/>
  <polygon points="${polygonPoints}" fill="white" clip-path="url(#shape)"/>
</svg>`;
}

// ─── PNG / WebP rasterizer ───────────────────────────────────────────────────

/**
 * Rasterize the favicon to a PNG or WebP Blob.
 * Browser-only (requires canvas + Image).
 */
export async function generateFaviconPng(
	config: FaviconConfig,
	format: 'png' | 'webp' = 'png'
): Promise<Blob> {
	const svg = generateFaviconSvg(config);
	const size = config.size ?? 128;

	return new Promise<Blob>((resolve, reject) => {
		const img = new Image();
		const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas 2d context'));
					return;
				}

				ctx.drawImage(img, 0, 0, size, size);

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
