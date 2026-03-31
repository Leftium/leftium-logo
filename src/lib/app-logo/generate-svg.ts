import type { AppLogoConfig, AppLogoProps, GradientConfig } from './types.js';
import { APP_LOGO_DEFAULTS } from './defaults.js';
import { resolveIcon, applyColorMode } from './iconify.js';

/**
 * Resolve merged props from an AppLogoConfig + variant.
 */
function resolveProps(config: AppLogoConfig, variant?: 'logo' | 'favicon'): Required<AppLogoProps> {
	const overrides = variant === 'favicon' ? config.favicon : config.logo;
	return {
		icon: overrides?.icon ?? config.icon ?? APP_LOGO_DEFAULTS.icon,
		iconColor: overrides?.iconColor ?? config.iconColor ?? APP_LOGO_DEFAULTS.iconColor,
		iconColorMode:
			overrides?.iconColorMode ?? config.iconColorMode ?? APP_LOGO_DEFAULTS.iconColorMode,
		iconSize: overrides?.iconSize ?? APP_LOGO_DEFAULTS.iconSize,
		iconOffsetX: overrides?.iconOffsetX ?? APP_LOGO_DEFAULTS.iconOffsetX,
		iconOffsetY: overrides?.iconOffsetY ?? APP_LOGO_DEFAULTS.iconOffsetY,
		iconRotation: overrides?.iconRotation ?? APP_LOGO_DEFAULTS.iconRotation,
		cornerRadius: overrides?.cornerRadius ?? config.cornerRadius ?? APP_LOGO_DEFAULTS.cornerRadius,
		cornerShape: overrides?.cornerShape ?? config.cornerShape ?? APP_LOGO_DEFAULTS.cornerShape,
		background: overrides?.background ?? config.background ?? APP_LOGO_DEFAULTS.background,
		size: overrides?.size ?? APP_LOGO_DEFAULTS.size
	};
}

/**
 * Convert a CSS gradient angle (degrees, clockwise from top) to SVG linearGradient coordinates.
 *
 * CSS: 0deg = bottom-to-top, 90deg = left-to-right, 180deg = top-to-bottom
 * SVG: x1,y1 = start point, x2,y2 = end point (as percentages)
 */
function angleToGradientCoords(angleDeg: number): {
	x1: string;
	y1: string;
	x2: string;
	y2: string;
} {
	// CSS gradient angles: 0deg = to top, 90deg = to right, clockwise.
	// The gradient line runs FROM the opposite side TO the angle direction.
	// In SVG coords (Y-axis down): convert CSS angle to SVG start/end points.
	const rad = (angleDeg * Math.PI) / 180;

	// Direction vector: CSS 0deg = up (dx=0, dy=-1 in SVG), rotates clockwise
	const dx = Math.sin(rad);
	const dy = -Math.cos(rad);

	// Start point is opposite to the direction, end point is in the direction
	// Map to 0-100% range, centered at 50%
	const x1 = Math.round(50 - dx * 50);
	const y1 = Math.round(50 - dy * 50);
	const x2 = Math.round(50 + dx * 50);
	const y2 = Math.round(50 + dy * 50);

	return { x1: `${x1}%`, y1: `${y1}%`, x2: `${x2}%`, y2: `${y2}%` };
}

/**
 * Build an SVG <defs> block for the gradient background.
 */
function buildGradientDefs(gradient: GradientConfig, id: string): string {
	const angle = gradient.angle ?? 45;
	const coords = angleToGradientCoords(angle);

	const stops = gradient.colors
		.map((color, i) => {
			const offset = gradient.stops ? gradient.stops[i] : i / (gradient.colors.length - 1);
			return `<stop offset="${(offset * 100).toFixed(1)}%" stop-color="${color}"/>`;
		})
		.join('\n    ');

	return `<defs>
    <linearGradient id="${id}" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">
    ${stops}
    </linearGradient>
  </defs>`;
}

/**
 * Build the background rect element (solid color or gradient fill).
 */
function buildBackgroundRect(
	background: string | GradientConfig,
	size: number,
	cornerRadius: number,
	gradientId: string
): string {
	const fill = typeof background === 'string' ? background : `url(#${gradientId})`;
	const rx =
		cornerRadius > 0
			? ` rx="${(cornerRadius / 100) * size}" ry="${(cornerRadius / 100) * size}"`
			: '';

	return `<rect width="${size}" height="${size}"${rx} fill="${fill}"/>`;
}

/**
 * Build the icon layer as an SVG group, positioned and scaled within the square.
 */
function buildIconLayer(
	svgContent: string,
	viewBox: string,
	size: number,
	iconSize: number,
	iconOffsetX: number,
	iconOffsetY: number
): string {
	// Parse viewBox
	const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);

	// Icon pixel size
	const iconPx = (iconSize / 100) * size;

	// Scale factor to fit icon into iconPx
	const scale = iconPx / Math.max(vbW, vbH);

	// Actual rendered dimensions (preserving aspect ratio)
	const renderedW = vbW * scale;
	const renderedH = vbH * scale;

	// Center position with offset
	const offsetXPx = (iconOffsetX / 100) * size;
	const offsetYPx = (iconOffsetY / 100) * size;
	const tx = (size - renderedW) / 2 + offsetXPx;
	const ty = (size - renderedH) / 2 + offsetYPx;

	return `<g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${-vbX}, ${-vbY})">
    ${svgContent}
  </g>`;
}

/**
 * Generate a complete SVG string for an AppLogo configuration.
 *
 * @param config - The AppLogo configuration
 * @param variant - 'logo' or 'favicon' to use per-output overrides
 * @returns Complete SVG string
 */
export async function generateAppLogoSvg(
	config: AppLogoConfig,
	variant?: 'logo' | 'favicon'
): Promise<string> {
	const props = resolveProps(config, variant);
	const size = props.size;
	const gradientId = 'app-logo-bg';

	// Resolve icon
	const resolved = await resolveIcon(props.icon);

	// Apply color mode (Phase 1: only auto/original/monochrome)
	const colorMode =
		typeof props.iconColorMode === 'string'
			? (props.iconColorMode as 'auto' | 'original' | 'monochrome')
			: 'auto'; // Phase 2 object modes fall back to auto
	const coloredContent = applyColorMode(
		resolved.svgContent,
		resolved.isMonochrome,
		colorMode,
		props.iconColor
	);

	// Build SVG parts
	const isGradient = typeof props.background !== 'string';
	const defs = isGradient ? buildGradientDefs(props.background as GradientConfig, gradientId) : '';
	const bgRect = buildBackgroundRect(props.background, size, props.cornerRadius, gradientId);
	const iconLayer = buildIconLayer(
		coloredContent,
		resolved.viewBox,
		size,
		props.iconSize,
		props.iconOffsetX,
		props.iconOffsetY
	);

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs}
  ${bgRect}
  ${iconLayer}
</svg>`;
}

// Re-export resolveProps for use by generate-png and the component
export { resolveProps };
