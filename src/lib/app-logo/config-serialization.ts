/**
 * Config serialization: bidirectional conversion between the UI-level ColumnState
 * (flat, slider-friendly) and the export-level AppLogoConfig (structured, spec-compliant).
 *
 * Also handles URL hash encoding/decoding and Svelte snippet generation.
 */

import { LEFTIUM_GRADIENT, APP_LOGO_DEFAULTS, DEFAULT_EMOJI_STYLE } from './defaults.js';
import { generateFaviconHtml, type AppInfo } from './generate-favicon-set.js';
import type {
	AppLogoConfig,
	AppLogoProps,
	CornerShape,
	GradientConfig,
	IconColorMode
} from './types.js';

// ─── ColumnState: flat UI-level state for one column (logo or favicon) ───

export interface ColumnState {
	icon: string;
	iconColor: string;
	iconColorModeKey: string;
	hueValue: number;
	saturationValue: number;
	iconSize: number;
	iconOffsetX: number;
	iconOffsetY: number;
	iconRotation: number;
	iconMirrorH: boolean;
	iconMirrorV: boolean;
	grayscaleLightness: number;
	cornerRadius: number;
	cornerK: number;
	solidColor: string;
	useGradient: boolean;
	gradientAngle: number;
	gradientPosition: number;
	gradientScale: number;
}

export const DEFAULT_STATE: ColumnState = {
	icon: 'fxemoji:rocket',
	iconColor: '#ffffff',
	iconColorModeKey: 'auto',
	hueValue: 210,
	saturationValue: 70,
	iconSize: 80,
	iconOffsetX: 0,
	iconOffsetY: 0,
	iconRotation: 0,
	iconMirrorH: false,
	iconMirrorV: false,
	grayscaleLightness: 100,
	cornerRadius: 50,
	cornerK: 2,
	solidColor: '#0029c1',
	useGradient: true,
	gradientAngle: 45,
	gradientPosition: 0,
	gradientScale: 1
};

export const DEFAULT_LOCKS: Record<keyof ColumnState, boolean> = {
	icon: true,
	iconColor: true,
	iconColorModeKey: true,
	hueValue: true,
	saturationValue: true,
	iconSize: true,
	iconOffsetX: true,
	iconOffsetY: true,
	iconRotation: true,
	iconMirrorH: true,
	iconMirrorV: true,
	grayscaleLightness: true,
	cornerRadius: true,
	cornerK: true,
	solidColor: true,
	useGradient: true,
	gradientAngle: true,
	gradientPosition: true,
	gradientScale: true
};

// ─── Corner K ↔ CornerShape conversion ──────────────────────────────────

/** Map a CornerShape keyword to its K value */
const SHAPE_TO_K: Record<string, number> = {
	round: 1,
	squircle: 2,
	square: 10,
	bevel: 0,
	scoop: -1,
	notch: -10
};

export function cornerKToShape(k: number): CornerShape {
	if (k === 1) return 'round';
	if (k === 0) return 'bevel';
	return `superellipse(${k})` as CornerShape;
}

export function cornerShapeToK(shape: CornerShape): number {
	if (shape in SHAPE_TO_K) return SHAPE_TO_K[shape];
	const match = shape.match(/^superellipse\((.+)\)$/);
	if (match) return parseFloat(match[1]);
	return 1; // fallback to round
}

export function cornerKLabel(k: number): string {
	if (k === -10) return 'notch';
	if (k === -1) return 'scoop';
	if (k === 0) return 'bevel';
	if (k === 1) return 'round';
	if (k === 2) return 'squircle';
	if (k === 10) return 'square';
	return `K=${k}`;
}

// ─── IconColorMode ↔ flat fields conversion ─────────────────────────────

export function iconColorModeFromFlat(key: string, hue: number, saturation: number): IconColorMode {
	if (key === 'hue') return { hue, saturation };
	return key as IconColorMode;
}

export function iconColorModeToFlat(mode: IconColorMode): {
	key: string;
	hue: number;
	saturation: number;
} {
	if (typeof mode === 'object' && 'hue' in mode) {
		return {
			key: 'hue',
			hue: mode.hue,
			saturation: mode.saturation ?? 70
		};
	}
	return { key: mode as string, hue: 210, saturation: 70 };
}

// ─── Background ↔ flat fields conversion ────────────────────────────────

export function backgroundFromFlat(col: ColumnState): string | GradientConfig {
	if (!col.useGradient) return col.solidColor;
	return {
		...LEFTIUM_GRADIENT,
		angle: col.gradientAngle,
		position: col.gradientPosition,
		scale: col.gradientScale
	} satisfies GradientConfig;
}

function backgroundToFlat(
	bg: AppLogoProps['background']
): Pick<
	ColumnState,
	'solidColor' | 'useGradient' | 'gradientAngle' | 'gradientPosition' | 'gradientScale'
> {
	if (typeof bg === 'string') {
		return {
			solidColor: bg,
			useGradient: false,
			gradientAngle: DEFAULT_STATE.gradientAngle,
			gradientPosition: DEFAULT_STATE.gradientPosition,
			gradientScale: DEFAULT_STATE.gradientScale
		};
	}
	if (bg && typeof bg === 'object') {
		return {
			solidColor: bg.colors?.[0] ?? DEFAULT_STATE.solidColor,
			useGradient: true,
			gradientAngle: bg.angle ?? DEFAULT_STATE.gradientAngle,
			gradientPosition: bg.position ?? DEFAULT_STATE.gradientPosition,
			gradientScale: bg.scale ?? DEFAULT_STATE.gradientScale
		};
	}
	// undefined / default
	return {
		solidColor: DEFAULT_STATE.solidColor,
		useGradient: DEFAULT_STATE.useGradient,
		gradientAngle: DEFAULT_STATE.gradientAngle,
		gradientPosition: DEFAULT_STATE.gradientPosition,
		gradientScale: DEFAULT_STATE.gradientScale
	};
}

// ─── ColumnState → AppLogoConfig ────────────────────────────────────────

/**
 * Build an AppLogoConfig from the logo and effective favicon ColumnState.
 * Also accepts the lock state to determine which favicon fields are overrides.
 */
export function buildFullConfig(
	logoState: ColumnState,
	effectiveFaviconState: ColumnState,
	lockState: Record<keyof ColumnState, boolean>,
	emojiStyle?: string
): AppLogoConfig {
	const logoColorMode = iconColorModeFromFlat(
		logoState.iconColorModeKey,
		logoState.hueValue,
		logoState.saturationValue
	);
	const favColorMode = iconColorModeFromFlat(
		effectiveFaviconState.iconColorModeKey,
		effectiveFaviconState.hueValue,
		effectiveFaviconState.saturationValue
	);

	const config: AppLogoConfig = {
		icon: logoState.icon,
		iconColor: logoState.iconColor,
		iconColorMode: logoColorMode,
		background: backgroundFromFlat(logoState),
		cornerRadius: logoState.cornerRadius,
		cornerShape: cornerKToShape(logoState.cornerK),
		logo: {
			iconSize: logoState.iconSize,
			iconOffsetX: logoState.iconOffsetX,
			iconOffsetY: logoState.iconOffsetY,
			iconRotation: logoState.iconRotation,
			iconMirrorH: logoState.iconMirrorH,
			iconMirrorV: logoState.iconMirrorV,
			grayscaleLightness: logoState.grayscaleLightness
		},
		favicon: {
			icon: effectiveFaviconState.icon,
			iconColor: effectiveFaviconState.iconColor,
			iconColorMode: favColorMode,
			background: backgroundFromFlat(effectiveFaviconState),
			cornerRadius: effectiveFaviconState.cornerRadius,
			cornerShape: cornerKToShape(effectiveFaviconState.cornerK),
			iconSize: effectiveFaviconState.iconSize,
			iconOffsetX: effectiveFaviconState.iconOffsetX,
			iconOffsetY: effectiveFaviconState.iconOffsetY,
			iconRotation: effectiveFaviconState.iconRotation,
			iconMirrorH: effectiveFaviconState.iconMirrorH,
			iconMirrorV: effectiveFaviconState.iconMirrorV,
			grayscaleLightness: effectiveFaviconState.grayscaleLightness
		}
	};

	// Only include emojiStyle if it differs from default
	if (emojiStyle && emojiStyle !== DEFAULT_EMOJI_STYLE) {
		config.emojiStyle = emojiStyle;
	}

	return config;
}

/**
 * Build a single-variant AppLogoConfig for export/rendering.
 */
export function buildVariantConfig(
	col: ColumnState,
	variant: 'logo' | 'favicon',
	emojiStyle?: string
): AppLogoConfig {
	const colorMode = iconColorModeFromFlat(col.iconColorModeKey, col.hueValue, col.saturationValue);
	const config: AppLogoConfig = {
		icon: col.icon,
		iconColor: col.iconColor,
		iconColorMode: colorMode,
		background: backgroundFromFlat(col),
		cornerRadius: col.cornerRadius,
		cornerShape: cornerKToShape(col.cornerK),
		[variant]: {
			iconSize: col.iconSize,
			iconOffsetX: col.iconOffsetX,
			iconOffsetY: col.iconOffsetY,
			iconRotation: col.iconRotation,
			iconMirrorH: col.iconMirrorH,
			iconMirrorV: col.iconMirrorV,
			grayscaleLightness: col.grayscaleLightness
		}
	};

	if (emojiStyle && emojiStyle !== DEFAULT_EMOJI_STYLE) {
		config.emojiStyle = emojiStyle;
	}

	return config;
}

// ─── AppLogoConfig → ColumnState (import / URL decode) ──────────────────

/**
 * Convert an AppLogoConfig back to ColumnState + lock state.
 * Shared fields populate the logo column. Favicon overrides populate
 * the favicon column and unlock the corresponding locks.
 */
export function configToUIState(config: AppLogoConfig): {
	logo: ColumnState;
	favicon: ColumnState;
	locks: Record<keyof ColumnState, boolean>;
	emojiStyle: string;
} {
	// Build logo state from shared config fields
	const colorFlat = iconColorModeToFlat(config.iconColorMode ?? 'auto');
	const bgFlat = backgroundToFlat(config.background);

	const logoState: ColumnState = {
		icon: config.icon,
		iconColor: config.iconColor ?? DEFAULT_STATE.iconColor,
		iconColorModeKey: colorFlat.key,
		hueValue: colorFlat.hue,
		saturationValue: colorFlat.saturation,
		iconSize: config.logo?.iconSize ?? DEFAULT_STATE.iconSize,
		iconOffsetX: config.logo?.iconOffsetX ?? DEFAULT_STATE.iconOffsetX,
		iconOffsetY: config.logo?.iconOffsetY ?? DEFAULT_STATE.iconOffsetY,
		iconRotation: config.logo?.iconRotation ?? DEFAULT_STATE.iconRotation,
		iconMirrorH: config.logo?.iconMirrorH ?? DEFAULT_STATE.iconMirrorH,
		iconMirrorV: config.logo?.iconMirrorV ?? DEFAULT_STATE.iconMirrorV,
		grayscaleLightness: config.logo?.grayscaleLightness ?? DEFAULT_STATE.grayscaleLightness,
		cornerRadius: config.cornerRadius ?? DEFAULT_STATE.cornerRadius,
		cornerK: cornerShapeToK(config.cornerShape ?? 'round'),
		...bgFlat
	};

	// Start with all locks locked, favicon = copy of logo
	const locks: Record<keyof ColumnState, boolean> = { ...DEFAULT_LOCKS };
	const faviconState: ColumnState = { ...logoState };

	// Apply favicon overrides — each override unlocks the corresponding field
	if (config.favicon) {
		const fav = config.favicon;

		if (fav.icon !== undefined && fav.icon !== logoState.icon) {
			faviconState.icon = fav.icon;
			locks.icon = false;
		}

		if (fav.iconColor !== undefined && fav.iconColor !== logoState.iconColor) {
			faviconState.iconColor = fav.iconColor;
			locks.iconColor = false;
		}

		if (fav.iconColorMode !== undefined) {
			const favColorFlat = iconColorModeToFlat(fav.iconColorMode);
			if (
				favColorFlat.key !== logoState.iconColorModeKey ||
				favColorFlat.hue !== logoState.hueValue ||
				favColorFlat.saturation !== logoState.saturationValue
			) {
				faviconState.iconColorModeKey = favColorFlat.key;
				faviconState.hueValue = favColorFlat.hue;
				faviconState.saturationValue = favColorFlat.saturation;
				locks.iconColorModeKey = false;
				locks.hueValue = false;
				locks.saturationValue = false;
			}
		}

		if (fav.iconSize !== undefined && fav.iconSize !== logoState.iconSize) {
			faviconState.iconSize = fav.iconSize;
			locks.iconSize = false;
		}

		if (fav.iconOffsetX !== undefined && fav.iconOffsetX !== logoState.iconOffsetX) {
			faviconState.iconOffsetX = fav.iconOffsetX;
			locks.iconOffsetX = false;
		}

		if (fav.iconOffsetY !== undefined && fav.iconOffsetY !== logoState.iconOffsetY) {
			faviconState.iconOffsetY = fav.iconOffsetY;
			locks.iconOffsetY = false;
		}

		if (fav.iconRotation !== undefined && fav.iconRotation !== logoState.iconRotation) {
			faviconState.iconRotation = fav.iconRotation;
			locks.iconRotation = false;
		}

		if (fav.iconMirrorH !== undefined && fav.iconMirrorH !== logoState.iconMirrorH) {
			faviconState.iconMirrorH = fav.iconMirrorH;
			locks.iconMirrorH = false;
		}

		if (fav.iconMirrorV !== undefined && fav.iconMirrorV !== logoState.iconMirrorV) {
			faviconState.iconMirrorV = fav.iconMirrorV;
			locks.iconMirrorV = false;
		}

		if (
			fav.grayscaleLightness !== undefined &&
			fav.grayscaleLightness !== logoState.grayscaleLightness
		) {
			faviconState.grayscaleLightness = fav.grayscaleLightness;
			locks.grayscaleLightness = false;
		}

		if (fav.cornerRadius !== undefined && fav.cornerRadius !== logoState.cornerRadius) {
			faviconState.cornerRadius = fav.cornerRadius;
			locks.cornerRadius = false;
		}

		if (fav.cornerShape !== undefined) {
			const favK = cornerShapeToK(fav.cornerShape);
			if (favK !== logoState.cornerK) {
				faviconState.cornerK = favK;
				locks.cornerK = false;
			}
		}

		if (fav.background !== undefined) {
			const favBgFlat = backgroundToFlat(fav.background);
			if (
				favBgFlat.solidColor !== logoState.solidColor ||
				favBgFlat.useGradient !== logoState.useGradient ||
				favBgFlat.gradientAngle !== logoState.gradientAngle ||
				favBgFlat.gradientPosition !== logoState.gradientPosition ||
				favBgFlat.gradientScale !== logoState.gradientScale
			) {
				faviconState.solidColor = favBgFlat.solidColor;
				faviconState.useGradient = favBgFlat.useGradient;
				faviconState.gradientAngle = favBgFlat.gradientAngle;
				faviconState.gradientPosition = favBgFlat.gradientPosition;
				faviconState.gradientScale = favBgFlat.gradientScale;
				locks.solidColor = false;
				locks.useGradient = false;
				locks.gradientAngle = false;
				locks.gradientPosition = false;
				locks.gradientScale = false;
			}
		}
	}

	return {
		logo: logoState,
		favicon: faviconState,
		locks,
		emojiStyle: config.emojiStyle ?? DEFAULT_EMOJI_STYLE
	};
}

// ─── URL hash encoding/decoding ─────────────────────────────────────────

/**
 * Encode a config object to a base64url string for URL hash.
 * Uses TextEncoder for Unicode safety (emoji icon names, non-ASCII app names).
 */
export function encodeConfigToHash(config: AppLogoConfig): string {
	const json = JSON.stringify(config);
	const bytes = new TextEncoder().encode(json);
	// Manual base64 from Uint8Array
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	const base64 = btoa(binary);
	// URL-safe: + → -, / → _, strip trailing =
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url string from URL hash back to AppLogoConfig.
 * Returns null if decoding fails.
 */
export function decodeConfigFromHash(hash: string): AppLogoConfig | null {
	try {
		// Restore standard base64: - → +, _ → /
		let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
		// Restore padding
		while (base64.length % 4) base64 += '=';
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		const json = new TextDecoder().decode(bytes);
		const parsed = JSON.parse(json);
		// Basic validation: must have icon field
		if (!parsed || typeof parsed.icon !== 'string') return null;
		return parsed as AppLogoConfig;
	} catch {
		return null;
	}
}

// ─── Svelte snippet generation ──────────────────────────────────────────

/**
 * Generate a minimal <AppLogo> Svelte snippet with only non-default props.
 */
export function generateSvelteSnippet(config: AppLogoConfig): string {
	const props: string[] = [];

	// Compare against defaults
	if (config.icon !== APP_LOGO_DEFAULTS.icon) {
		props.push(`\ticon="${config.icon}"`);
	}

	if (config.iconColor && config.iconColor !== APP_LOGO_DEFAULTS.iconColor) {
		props.push(`\ticonColor="${config.iconColor}"`);
	}

	if (config.iconColorMode) {
		const mode = config.iconColorMode;
		if (typeof mode === 'string' && mode !== APP_LOGO_DEFAULTS.iconColorMode) {
			props.push(`\ticonColorMode="${mode}"`);
		} else if (typeof mode === 'object' && 'hue' in mode) {
			const satPart =
				mode.saturation !== undefined && mode.saturation !== 70
					? `, saturation: ${mode.saturation}`
					: '';
			props.push(`\ticonColorMode={{ hue: ${mode.hue}${satPart} }}`);
		}
	}

	// Logo-specific props (from logo override)
	const logoOverride = config.logo;
	if (logoOverride) {
		if (
			logoOverride.iconSize !== undefined &&
			logoOverride.iconSize !== APP_LOGO_DEFAULTS.iconSize
		) {
			props.push(`\ticonSize={${logoOverride.iconSize}}`);
		}
		if (
			logoOverride.iconOffsetX !== undefined &&
			logoOverride.iconOffsetX !== APP_LOGO_DEFAULTS.iconOffsetX
		) {
			props.push(`\ticonOffsetX={${logoOverride.iconOffsetX}}`);
		}
		if (
			logoOverride.iconOffsetY !== undefined &&
			logoOverride.iconOffsetY !== APP_LOGO_DEFAULTS.iconOffsetY
		) {
			props.push(`\ticonOffsetY={${logoOverride.iconOffsetY}}`);
		}
		if (
			logoOverride.iconRotation !== undefined &&
			logoOverride.iconRotation !== APP_LOGO_DEFAULTS.iconRotation
		) {
			props.push(`\ticonRotation={${logoOverride.iconRotation}}`);
		}
		if (logoOverride.iconMirrorH) {
			props.push(`\ticonMirrorH`);
		}
		if (logoOverride.iconMirrorV) {
			props.push(`\ticonMirrorV`);
		}
		if (logoOverride.grayscaleLightness !== undefined && logoOverride.grayscaleLightness !== 100) {
			props.push(`\tgrayscaleLightness={${logoOverride.grayscaleLightness}}`);
		}
	}

	if (config.cornerRadius !== undefined && config.cornerRadius !== APP_LOGO_DEFAULTS.cornerRadius) {
		props.push(`\tcornerRadius={${config.cornerRadius}}`);
	}

	if (config.cornerShape !== undefined && config.cornerShape !== APP_LOGO_DEFAULTS.cornerShape) {
		props.push(`\tcornerShape="${config.cornerShape}"`);
	}

	// Background
	if (config.background !== undefined) {
		if (typeof config.background === 'string') {
			props.push(`\tbackground="${config.background}"`);
		} else if (typeof config.background === 'object') {
			const bg = config.background;
			const def = APP_LOGO_DEFAULTS.background;
			// Check if it differs from default gradient
			const isSameAsDefault =
				JSON.stringify(bg.colors) === JSON.stringify(def.colors) &&
				JSON.stringify(bg.stops) === JSON.stringify(def.stops) &&
				(bg.angle ?? 45) === (def.angle ?? 45) &&
				(bg.position ?? 0) === (def.position ?? 0) &&
				(bg.scale ?? 1) === (def.scale ?? 1);
			if (!isSameAsDefault) {
				const parts: string[] = [];
				parts.push(`colors: ${JSON.stringify(bg.colors)}`);
				if (bg.stops) parts.push(`stops: ${JSON.stringify(bg.stops)}`);
				if (bg.angle !== undefined) parts.push(`angle: ${bg.angle}`);
				if (bg.position !== undefined && bg.position !== 0) parts.push(`position: ${bg.position}`);
				if (bg.scale !== undefined && bg.scale !== 1) parts.push(`scale: ${bg.scale}`);
				props.push(`\tbackground={{ ${parts.join(', ')} }}`);
			}
		}
	}

	const propsStr = props.length > 0 ? `\n${props.join('\n')}\n` : ' ';

	let snippet = `<script>\n\timport { AppLogo } from '@leftium/logo';\n</script>\n\n<AppLogo${propsStr}/>`;

	// Add favicon override comment if favicon differs
	if (config.favicon) {
		const favOverrides: string[] = [];
		const fav = config.favicon;
		if (fav.iconSize !== undefined) favOverrides.push(`iconSize={${fav.iconSize}}`);
		if (fav.iconOffsetX !== undefined && fav.iconOffsetX !== 0)
			favOverrides.push(`iconOffsetX={${fav.iconOffsetX}}`);
		if (fav.iconOffsetY !== undefined && fav.iconOffsetY !== 0)
			favOverrides.push(`iconOffsetY={${fav.iconOffsetY}}`);
		if (fav.iconRotation !== undefined && fav.iconRotation !== 0)
			favOverrides.push(`iconRotation={${fav.iconRotation}}`);
		if (fav.iconMirrorH) favOverrides.push(`iconMirrorH`);
		if (fav.iconMirrorV) favOverrides.push(`iconMirrorV`);
		if (fav.cornerRadius !== undefined && fav.cornerRadius !== config.cornerRadius)
			favOverrides.push(`cornerRadius={${fav.cornerRadius}}`);
		if (fav.cornerShape !== undefined && fav.cornerShape !== config.cornerShape)
			favOverrides.push(`cornerShape="${fav.cornerShape}"`);
		if (fav.icon !== undefined && fav.icon !== config.icon) favOverrides.push(`icon="${fav.icon}"`);
		if (fav.iconColor !== undefined && fav.iconColor !== config.iconColor)
			favOverrides.push(`iconColor="${fav.iconColor}"`);
		if (
			fav.grayscaleLightness !== undefined &&
			fav.grayscaleLightness !== (config.logo?.grayscaleLightness ?? 100)
		)
			favOverrides.push(`grayscaleLightness={${fav.grayscaleLightness}}`);

		// Filter out favicon overrides that match the logo
		const meaningfulOverrides = favOverrides.filter((o) => {
			// Each override is already only added when it differs, so all are meaningful
			return true;
		});

		if (meaningfulOverrides.length > 0) {
			snippet += `\n\n<!-- Favicon variant uses different settings:\n     ${meaningfulOverrides.join(', ')} -->`;
		}
	}

	return snippet;
}

/**
 * Generate the HTML favicon snippet for clipboard copy.
 * Re-exports the existing function for convenience.
 */
export function generateHtmlSnippet(appInfo: AppInfo): string {
	return generateFaviconHtml(appInfo);
}
