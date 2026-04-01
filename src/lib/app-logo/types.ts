// Icon color transformation modes
// Phase 1: 'auto' | 'original' | 'monochrome'
// Phase 2 adds: 'grayscale' | 'grayscale-tint' | { hue, saturation? }
export type IconColorMode =
	| 'auto' // Monochrome icons -> use iconColor; multicolor -> keep original
	| 'original' // Keep all colors exactly as-is (even currentColor)
	| 'monochrome' // Replace all fills/strokes with iconColor (flat silhouette)
	| 'grayscale' // Convert each color to its luminance-equivalent gray
	| 'grayscale-tint' // Grayscale first, then tint toward iconColor
	| { hue: number; saturation?: number }; // Remap all colors to a target hue (0-360)

// Follows CSS <corner-shape-value> from CSS Borders Level 4
// Phase 1: only 'round' is rendered; others are defined for future use
export type CornerShape =
	| 'round' // superellipse(1) -- standard circular arc (CSS border-radius)
	| 'squircle' // superellipse(2) -- smooth iOS-style continuous curvature
	| 'square' // superellipse(inf) -- sharp corners (ignores border-radius)
	| 'bevel' // superellipse(0) -- straight diagonal cut
	| 'scoop' // superellipse(-1) -- inward concave curve
	| 'notch' // superellipse(-inf) -- inward right-angle cut
	| `superellipse(${number})`; // arbitrary curvature value

export interface GradientConfig {
	colors: string[]; // stop colors, e.g. ["#0029c1", "#3973ff", "#0029c1"]
	stops?: number[]; // stop positions 0-1, e.g. [0, 0.29, 1]
	angle?: number; // CSS gradient angle in degrees (clockwise from top), default: 45
	// Phase 2:
	position?: number; // shift gradient along its axis, as % (-100 to 100)
	scale?: number; // scale gradient length relative to square diagonal
}

export interface AppLogoProps {
	// --- Icon ---
	icon?: string; // Iconify ID, emoji, SVG string, or data URL
	iconColor?: string; // CSS color, default: "#ffffff"
	iconColorMode?: IconColorMode; // how to treat icon colors, default: "auto"
	iconSize?: number; // % of square side, default: 60
	iconOffsetX?: number; // % horizontal offset from center, default: 0
	iconOffsetY?: number; // % vertical offset from center, default: 0
	iconRotation?: number; // degrees clockwise, default: 0 (Phase 2)
	iconMirrorH?: boolean; // flip icon horizontally, default: false
	iconMirrorV?: boolean; // flip icon vertically, default: false
	grayscaleLightness?: number; // lightness multiplier for grayscale modes, default: 100 (%)

	// --- Square ---
	cornerRadius?: number; // CSS border-radius as %, default: 0. Range: 0-50
	cornerShape?: CornerShape; // CSS <corner-shape-value>, default: "round"
	background?: string | GradientConfig; // solid CSS color or gradient config

	// --- Layout ---
	size?: number; // rendered CSS size in px, default: 512
}

export interface AppLogoConfig {
	// Shared defaults
	icon: string;
	iconColor?: string;
	iconColorMode?: IconColorMode;
	background?: AppLogoProps['background'];
	cornerRadius?: number;
	cornerShape?: CornerShape;

	// Emoji rendering
	emojiStyle?: string; // Iconify emoji set prefix (e.g. "twemoji", "noto")
	// Default: "twemoji". Set to "native" to disable auto-mapping.

	// Per-output overrides
	logo?: Partial<AppLogoProps>;
	favicon?: Partial<AppLogoProps>;
}

/** Detected source type of the icon prop value */
export type IconSourceType = 'iconify' | 'emoji' | 'svg' | 'data-url';
