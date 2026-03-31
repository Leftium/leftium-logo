import type { GradientConfig, AppLogoProps, IconSourceType } from './types.js';

/** The Leftium brand gradient: 45deg diagonal, dark blue -> bright blue -> dark blue */
export const LEFTIUM_GRADIENT: GradientConfig = {
	colors: ['#0029c1', '#3973ff', '#0029c1'],
	stops: [0, 0.29, 1],
	angle: 45 // bottom-left -> top-right
};

/** Default emoji icon set for auto-mapping. "native" disables mapping. */
export const DEFAULT_EMOJI_STYLE = 'twemoji';

/** Emoji icon sets that support automatic emoji-to-Iconify name resolution */
export const EMOJI_SETS = [
	// Color sets
	{ prefix: 'twemoji', name: 'Twitter Emoji', monochrome: false },
	{ prefix: 'noto', name: 'Noto Emoji', monochrome: false },
	{ prefix: 'openmoji', name: 'OpenMoji', monochrome: false },
	{ prefix: 'fluent-emoji', name: 'Fluent Emoji', monochrome: false },
	{ prefix: 'fluent-emoji-flat', name: 'Fluent Flat', monochrome: false },
	{ prefix: 'emojione', name: 'Emoji One', monochrome: false },
	{ prefix: 'noto-v1', name: 'Noto v1', monochrome: false },
	{ prefix: 'emojione-v1', name: 'Emoji One v1', monochrome: false },
	// Monochrome sets
	{ prefix: 'emojione-monotone', name: 'Emoji One Mono', monochrome: true },
	{ prefix: 'fluent-emoji-high-contrast', name: 'Fluent HC', monochrome: true }
] as const;

/** Default values for all AppLogo props */
export const APP_LOGO_DEFAULTS: Required<
	Pick<
		AppLogoProps,
		| 'icon'
		| 'iconColor'
		| 'iconColorMode'
		| 'iconSize'
		| 'iconOffsetX'
		| 'iconOffsetY'
		| 'iconRotation'
		| 'cornerRadius'
		| 'cornerShape'
		| 'size'
	>
> & { background: GradientConfig } = {
	icon: 'fxemoji:rocket',
	iconColor: '#ffffff',
	iconColorMode: 'auto',
	iconSize: 60,
	iconOffsetX: 0,
	iconOffsetY: 0,
	iconRotation: 0,
	cornerRadius: 0,
	cornerShape: 'round',
	background: LEFTIUM_GRADIENT,
	size: 512
};

/**
 * Detect icon source type from the icon prop string.
 *
 * - Starts with `<svg` or `<SVG` -> inline SVG
 * - Starts with `data:` -> data URL
 * - Contains `:` (but not `data:`) -> Iconify ID
 * - Otherwise -> Unicode/emoji text
 */
export function detectIconSource(icon: string): IconSourceType {
	const trimmed = icon.trim();
	if (trimmed.startsWith('<svg') || trimmed.startsWith('<SVG')) return 'svg';
	if (trimmed.startsWith('data:')) return 'data-url';
	if (trimmed.includes(':')) return 'iconify';
	return 'emoji';
}
