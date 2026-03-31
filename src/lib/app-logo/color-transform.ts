/**
 * OKLCH-based color transforms for icon color modes.
 *
 * Uses culori for perceptually uniform color manipulation.
 * All transforms operate on individual CSS color strings.
 */

import { parse, converter, formatHex, clampChroma, displayable } from 'culori';
import type { IconColorMode } from './types.js';

const toOklch = converter('oklch');

/**
 * Parse a CSS color string to OKLCH components.
 * Returns null if the color can't be parsed.
 */
function parseToOklch(color: string): { l: number; c: number; h: number; alpha?: number } | null {
	const parsed = parse(color);
	if (!parsed) return null;
	const oklch = toOklch(parsed);
	return {
		l: oklch.l ?? 0,
		c: oklch.c ?? 0,
		h: oklch.h ?? 0,
		alpha: oklch.alpha
	};
}

/**
 * Convert OKLCH components back to a hex color string.
 * Clamps to sRGB gamut.
 */
function oklchToHex(l: number, c: number, h: number, alpha?: number): string {
	let color = { mode: 'oklch' as const, l, c, h, alpha };
	// Clamp to displayable sRGB gamut
	if (!displayable(color)) {
		color = clampChroma(color, 'oklch') as typeof color;
	}
	return formatHex(color);
}

/**
 * Transform a single CSS color to grayscale using OKLCH.
 * Sets chroma to 0, preserving perceptual lightness.
 */
export function toGrayscale(color: string): string {
	const oklch = parseToOklch(color);
	if (!oklch) return color;
	return oklchToHex(oklch.l, 0, 0, oklch.alpha);
}

/**
 * Transform a single CSS color to grayscale, then tint toward a target color.
 *
 * The tint color's hue and chroma influence the result, while the original
 * color's lightness is preserved. This unifies a palette while keeping contrast.
 */
export function toGrayscaleTint(color: string, tintColor: string): string {
	const oklch = parseToOklch(color);
	if (!oklch) return color;

	const tint = parseToOklch(tintColor);
	if (!tint) return color;

	// Use original lightness, tint's hue, and a fraction of tint's chroma
	// Scale chroma by the ratio of original chroma to max, to preserve some variation
	const tintChroma = tint.c * 0.7; // 70% of tint chroma for a softer effect
	return oklchToHex(oklch.l, tintChroma, tint.h, oklch.alpha);
}

/**
 * Remap a single CSS color to a target hue, optionally overriding saturation.
 *
 * Preserves the original lightness. If saturation is provided, it's used as
 * a percentage of the maximum chroma; otherwise, the original chroma is preserved.
 */
export function remapHue(color: string, targetHue: number, targetSaturation?: number): string {
	const oklch = parseToOklch(color);
	if (!oklch) return color;

	const c =
		targetSaturation !== undefined
			? (targetSaturation / 100) * 0.4 // Map 0-100 to 0-0.4 OKLCH chroma range
			: oklch.c;

	return oklchToHex(oklch.l, c, targetHue, oklch.alpha);
}

/**
 * Apply a full IconColorMode transformation to SVG content.
 *
 * Handles all modes: 'auto', 'original', 'monochrome', 'grayscale',
 * 'grayscale-tint', and { hue, saturation? }.
 *
 * Color transforms operate on fill/stroke attribute values and style properties,
 * replacing each color with its transformed equivalent.
 */
export function applyColorMode(
	svgContent: string,
	isMonochrome: boolean,
	colorMode: IconColorMode,
	iconColor: string
): string {
	// Handle simple string modes first
	if (colorMode === 'original') {
		return svgContent;
	}

	if (colorMode === 'auto') {
		if (isMonochrome) {
			return svgContent.replace(/currentColor/g, iconColor);
		}
		return svgContent;
	}

	if (colorMode === 'monochrome') {
		return svgContent
			.replace(/(fill=["'])(?!none)([^"']+)(["'])/gi, `$1${iconColor}$3`)
			.replace(/(stroke=["'])(?!none)([^"']+)(["'])/gi, `$1${iconColor}$3`)
			.replace(/currentColor/g, iconColor);
	}

	// For grayscale, grayscale-tint, and hue remap: transform each color value
	const transformColor = (color: string): string => {
		if (color === 'none' || color === 'inherit' || color === 'transparent') {
			return color;
		}

		// Replace currentColor with iconColor before transforming
		const resolvedColor = color === 'currentColor' ? iconColor : color;

		if (colorMode === 'grayscale') {
			return toGrayscale(resolvedColor);
		}

		if (colorMode === 'grayscale-tint') {
			return toGrayscaleTint(resolvedColor, iconColor);
		}

		// Object mode: { hue, saturation? }
		if (typeof colorMode === 'object') {
			return remapHue(resolvedColor, colorMode.hue, colorMode.saturation);
		}

		return color;
	};

	// Transform fill/stroke attribute values
	let result = svgContent.replace(
		/((?:fill|stroke)=["'])([^"']+)(["'])/gi,
		(_match, prefix, value, suffix) => {
			return `${prefix}${transformColor(value.trim())}${suffix}`;
		}
	);

	// Transform fill/stroke in style attributes
	result = result.replace(/((?:fill|stroke)\s*:\s*)([^;"']+)/gi, (_match, prefix, value) => {
		return `${prefix}${transformColor(value.trim())}`;
	});

	// Also replace any remaining currentColor references
	result = result.replace(/currentColor/g, transformColor('currentColor'));

	return result;
}
