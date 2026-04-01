import { detectIconSource, DEFAULT_EMOJI_STYLE } from './defaults.js';
import type { IconSourceType } from './types.js';

/** Cached Iconify SVG strings keyed by icon ID */
const iconCache = new Map<string, string>();

/** Cached emoji slug resolution keyed by `${prefix}:${emoji}` */
const emojiSlugCache = new Map<string, string | null>();

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

// ─── Emoji → Iconify slug resolution ────────────────────────────────────

/**
 * Convert an emoji string to its Unicode codepoint sequence (e.g. "🚀" → "1f680").
 * Strips variation selectors (U+FE0E, U+FE0F).
 */
function emojiToCodepoints(emoji: string): string {
	const codepoints: string[] = [];
	for (const codePoint of emoji) {
		const cp = codePoint.codePointAt(0);
		if (cp === undefined) continue;
		// Skip variation selectors
		if (cp === 0xfe0e || cp === 0xfe0f) continue;
		codepoints.push(cp.toString(16));
	}
	return codepoints.join('-');
}

/**
 * Resolve an emoji to its Iconify icon slug within a given set.
 *
 * Strategy A: Use the Iconify search API, which accepts emoji characters
 * directly and returns matching icon names.
 *
 * Returns the icon name (slug) or null if not found.
 * Results are cached by `${prefix}:${emoji}`.
 */
export async function resolveEmojiSlug(emoji: string, prefix: string): Promise<string | null> {
	const cacheKey = `${prefix}:${emoji}`;
	const cached = emojiSlugCache.get(cacheKey);
	if (cached !== undefined) return cached;

	try {
		// Strategy A: Iconify search API
		const encoded = encodeURIComponent(emoji);
		const url = `https://api.iconify.design/search?query=${encoded}&prefix=${prefix}&limit=1`;
		const response = await fetch(url);

		if (response.ok) {
			const data = await response.json();
			// Response format: { icons: ["prefix:name", ...] }
			if (data.icons && data.icons.length > 0) {
				const fullId: string = data.icons[0];
				// Extract just the name part (after the prefix:)
				const colonIndex = fullId.indexOf(':');
				const slug = colonIndex >= 0 ? fullId.substring(colonIndex + 1) : fullId;
				emojiSlugCache.set(cacheKey, slug);
				return slug;
			}
		}

		// Strategy B fallback: Try codepoint-based name (many sets use this)
		const codepoints = emojiToCodepoints(emoji);
		if (codepoints) {
			// Try fetching directly — if it exists, the codepoint IS the name
			const directUrl = `https://api.iconify.design/${prefix}/${codepoints}.svg`;
			const directResponse = await fetch(directUrl, { method: 'HEAD' });
			if (directResponse.ok) {
				emojiSlugCache.set(cacheKey, codepoints);
				return codepoints;
			}
		}

		// Not found
		emojiSlugCache.set(cacheKey, null);
		return null;
	} catch {
		// Network error — don't cache failures
		return null;
	}
}

// ─── Emoji → human-readable name resolution ────────────────────────────

/** Cached emoji name resolution keyed by emoji character */
const emojiNameCache = new Map<string, string | null>();

/**
 * Resolve an emoji character to a human-readable name using the Iconify API.
 *
 * Queries the Iconify JSON API with the emoji's codepoint. If the codepoint
 * is an alias, the parent name is the canonical human-readable name (e.g.
 * "rocket", "fire", "wrapped-gift"). If it's a direct icon entry, the icon
 * key itself is used.
 *
 * Falls back to `null` if the name can't be resolved.
 *
 * @param emoji - The emoji character (e.g. "🚀")
 * @param prefix - Iconify emoji set prefix (default: "twemoji")
 */
export async function resolveEmojiName(
	emoji: string,
	prefix: string = 'twemoji'
): Promise<string | null> {
	const cached = emojiNameCache.get(emoji);
	if (cached !== undefined) return cached;

	try {
		const codepoints = emojiToCodepoints(emoji);
		if (!codepoints) {
			emojiNameCache.set(emoji, null);
			return null;
		}

		// Query the Iconify JSON API for this codepoint
		const url = `https://api.iconify.design/${prefix}.json?icons=${codepoints}`;
		const response = await fetch(url);

		if (response.ok) {
			const data = await response.json();

			// Check aliases first: codepoint → parent (human-readable name)
			if (data.aliases?.[codepoints]?.parent) {
				const name = data.aliases[codepoints].parent;
				emojiNameCache.set(emoji, name);
				return name;
			}

			// If the codepoint itself is a direct icon entry, use it
			// (some sets might use the codepoint as the canonical name)
			if (data.icons?.[codepoints]) {
				emojiNameCache.set(emoji, codepoints);
				return codepoints;
			}

			// Check if there are any icons at all (API might have resolved differently)
			const iconKeys = Object.keys(data.icons || {});
			if (iconKeys.length > 0) {
				const name = iconKeys[0];
				emojiNameCache.set(emoji, name);
				return name;
			}
		}

		emojiNameCache.set(emoji, null);
		return null;
	} catch {
		// Network error — don't cache
		return null;
	}
}

// ─── Main resolution ────────────────────────────────────────────────────

/**
 * Resolve an icon prop value to SVG data ready for rendering.
 *
 * Handles all 4 source types: Iconify ID, emoji, inline SVG, data URL.
 * For emoji, auto-maps to an Iconify emoji set unless emojiStyle is 'native'.
 *
 * @param icon - The icon prop value
 * @param emojiStyle - Iconify emoji set prefix (default: DEFAULT_EMOJI_STYLE).
 *                     Use 'native' to disable auto-mapping and render as <text>.
 */
export async function resolveIcon(
	icon: string,
	emojiStyle: string = DEFAULT_EMOJI_STYLE
): Promise<ResolvedIcon> {
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
			// Auto-map emoji to Iconify SVG icon
			if (emojiStyle !== 'native') {
				const slug = await resolveEmojiSlug(icon, emojiStyle);
				if (slug) {
					const iconId = `${emojiStyle}:${slug}`;
					const svg = await fetchIconifySvg(iconId);
					return {
						svgContent: extractSvgContent(svg),
						viewBox: parseViewBox(svg),
						isMonochrome: detectMonochrome(svg),
						sourceType: 'iconify' // Resolved as Iconify, even though input was emoji
					};
				}
			}

			// Fallback: platform-native <text> rendering
			return {
				svgContent: `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="80" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${icon}</text>`,
				viewBox: '0 0 100 100',
				isMonochrome: false,
				sourceType
			};
		}
	}
}
