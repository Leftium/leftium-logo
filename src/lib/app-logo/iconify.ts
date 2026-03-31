import { detectIconSource } from './defaults.js';
import type { IconSourceType } from './types.js';

/** Cached Iconify SVG strings keyed by icon ID */
const iconCache = new Map<string, string>();

/**
 * Resolved icon data ready for rendering/export.
 */
export interface ResolvedIcon {
	/** The raw SVG markup (without the outer <svg> wrapper for Iconify/data-url/svg sources) */
	svgContent: string;
	/** The viewBox of the original icon SVG */
	viewBox: string;
	/** Whether the icon uses currentColor (monochrome) vs hardcoded colors (multicolor) */
	isMonochrome: boolean;
	/** The detected source type */
	sourceType: IconSourceType;
}

/**
 * Fetch an Iconify icon SVG by its ID (e.g. "mdi:rocket-launch").
 * Results are cached in memory for the session.
 */
async function fetchIconifySvg(iconId: string): Promise<string> {
	const cached = iconCache.get(iconId);
	if (cached) return cached;

	const [prefix, name] = iconId.split(':');
	if (!prefix || !name) {
		throw new Error(`Invalid Iconify icon ID: "${iconId}". Expected format: "prefix:name"`);
	}

	const url = `https://api.iconify.design/${prefix}/${name}.svg`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch icon "${iconId}": ${response.status} ${response.statusText}`);
	}

	const svg = await response.text();
	iconCache.set(iconId, svg);
	return svg;
}

/**
 * Decode a data URL to an SVG string.
 * Supports both base64 and plain-text encoded data URLs.
 */
function decodeDataUrl(dataUrl: string): string {
	// data:image/svg+xml;base64,PHN2Zy...
	// data:image/svg+xml,%3Csvg...
	// data:image/svg+xml;utf8,<svg...
	const commaIndex = dataUrl.indexOf(',');
	if (commaIndex === -1) {
		throw new Error('Invalid data URL: no comma separator found');
	}

	const meta = dataUrl.substring(0, commaIndex);
	const data = dataUrl.substring(commaIndex + 1);

	if (meta.includes(';base64')) {
		return atob(data);
	}

	// URL-encoded or UTF-8
	return decodeURIComponent(data);
}

/**
 * Parse viewBox from an SVG string. Falls back to "0 0 24 24" (Iconify default).
 */
function parseViewBox(svg: string): string {
	const match = svg.match(/viewBox=["']([^"']+)["']/);
	return match?.[1] ?? '0 0 24 24';
}

/**
 * Extract the inner content of an SVG element (everything between <svg> and </svg>).
 */
function extractSvgContent(svg: string): string {
	// Remove the outer <svg ...> and </svg> tags
	const openTagEnd = svg.indexOf('>');
	const closeTagStart = svg.lastIndexOf('</svg>');
	if (openTagEnd === -1 || closeTagStart === -1) {
		return svg; // Return as-is if we can't parse
	}
	return svg.substring(openTagEnd + 1, closeTagStart).trim();
}

/**
 * Detect whether an SVG is monochrome (uses currentColor) or multicolor (hardcoded fills).
 *
 * Heuristic: if the SVG contains "currentColor" it's monochrome.
 * If it contains hardcoded color values (hex, rgb, named colors) in fill/stroke attributes,
 * it's multicolor.
 */
function detectMonochrome(svg: string): boolean {
	// If it explicitly uses currentColor, it's monochrome
	if (svg.includes('currentColor')) return true;

	// Check for hardcoded fill/stroke colors (hex, rgb, named colors)
	// If we find fill or stroke with a value that's not "none" or "currentColor", it's multicolor
	const colorAttrPattern = /(?:fill|stroke)=["'](?!none|currentColor)([^"']+)["']/gi;
	const hasHardcodedColors = colorAttrPattern.test(svg);

	// Also check for fill/stroke in style attributes
	const styleColorPattern = /(?:fill|stroke)\s*:\s*(?!none|currentColor)([^;"']+)/gi;
	const hasStyleColors = styleColorPattern.test(svg);

	if (hasHardcodedColors || hasStyleColors) return false;

	// No colors found at all -- treat as monochrome (will use currentColor behavior)
	return true;
}

/**
 * Resolve an icon prop value to SVG data ready for rendering.
 *
 * Handles all 4 source types: Iconify ID, emoji, inline SVG, data URL.
 * For emoji, returns a special SVG text element instead of path data.
 */
export async function resolveIcon(icon: string): Promise<ResolvedIcon> {
	const sourceType = detectIconSource(icon);

	switch (sourceType) {
		case 'iconify': {
			const svg = await fetchIconifySvg(icon);
			return {
				svgContent: extractSvgContent(svg),
				viewBox: parseViewBox(svg),
				isMonochrome: detectMonochrome(svg),
				sourceType
			};
		}

		case 'data-url': {
			const svg = decodeDataUrl(icon);
			return {
				svgContent: extractSvgContent(svg),
				viewBox: parseViewBox(svg),
				isMonochrome: detectMonochrome(svg),
				sourceType
			};
		}

		case 'svg': {
			const svg = icon.trim();
			return {
				svgContent: extractSvgContent(svg),
				viewBox: parseViewBox(svg),
				isMonochrome: detectMonochrome(svg),
				sourceType
			};
		}

		case 'emoji': {
			// For emoji, we create a text-based SVG element
			// The viewBox is set to a standard size; the emoji is centered
			return {
				svgContent: `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${icon}</text>`,
				viewBox: '0 0 100 100',
				isMonochrome: false,
				sourceType
			};
		}
	}
}
