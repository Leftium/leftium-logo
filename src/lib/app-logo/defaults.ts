import type { GradientConfig, AppLogoProps, IconSourceType } from './types.js';

/** The Leftium brand gradient: 45deg diagonal, dark blue -> bright blue -> dark blue */
export const LEFTIUM_GRADIENT: GradientConfig = {
	colors: ['#0029c1', '#3973ff', '#0029c1'],
	stops: [0, 0.29, 1],
	angle: 45 // bottom-left -> top-right
};

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
