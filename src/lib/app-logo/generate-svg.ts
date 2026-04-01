import type { AppLogoConfig, AppLogoProps, CornerShape, GradientConfig } from './types.js';
import { APP_LOGO_DEFAULTS, DEFAULT_EMOJI_STYLE } from './defaults.js';
import { resolveIcon } from './iconify.js';
import { applyColorMode } from './color-transform.js';
import { generateCornerPath } from './squircle.js';

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
		iconMirrorH: overrides?.iconMirrorH ?? APP_LOGO_DEFAULTS.iconMirrorH,
		iconMirrorV: overrides?.iconMirrorV ?? APP_LOGO_DEFAULTS.iconMirrorV,
		grayscaleLightness: overrides?.grayscaleLightness ?? 100,
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
 *
 * @param angleDeg - CSS gradient angle in degrees
 * @param position - Shift gradient along its axis as % (-100 to 100), default 0
 * @param scale - Scale gradient length (1 = full span, 0.5 = half, 2 = double), default 1
 */
function angleToGradientCoords(
	angleDeg: number,
	position: number = 0,
	scale: number = 1
): {
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

	// Half-length of the gradient vector, scaled
	const halfLen = 50 * scale;

	// Position shift along the gradient axis (% of full span)
	const shiftX = dx * (position / 100) * 50;
	const shiftY = dy * (position / 100) * 50;

	// Center point, shifted by position
	const cx = 50 + shiftX;
	const cy = 50 + shiftY;

	// Start and end points
	const x1 = Math.round(cx - dx * halfLen);
	const y1 = Math.round(cy - dy * halfLen);
	const x2 = Math.round(cx + dx * halfLen);
	const y2 = Math.round(cy + dy * halfLen);

	return { x1: `${x1}%`, y1: `${y1}%`, x2: `${x2}%`, y2: `${y2}%` };
}

/**
 * Build a <linearGradient> element for the gradient background.
 * Returns the element without wrapping <defs>.
 */
function buildGradientElement(gradient: GradientConfig, id: string): string {
	const angle = gradient.angle ?? 45;
	const position = gradient.position ?? 0;
	const scale = gradient.scale ?? 1;
	const coords = angleToGradientCoords(angle, position, scale);

	const stops = gradient.colors
		.map((color, i) => {
			const offset = gradient.stops ? gradient.stops[i] : i / (gradient.colors.length - 1);
			return `<stop offset="${(offset * 100).toFixed(1)}%" stop-color="${color}"/>`;
		})
		.join('\n      ');

	return `<linearGradient id="${id}" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">
      ${stops}
    </linearGradient>`;
}

/**
 * Build the background element (solid color or gradient fill).
 *
 * For 'round' corners, uses a standard <rect> with rx/ry.
 * For other corner shapes, uses a <path> with the superellipse curve.
 */
function buildBackground(
	background: string | GradientConfig,
	size: number,
	cornerRadius: number,
	cornerShape: CornerShape,
	gradientId: string
): { defs: string; element: string } {
	const fill = typeof background === 'string' ? background : `url(#${gradientId})`;

	// For 'round' shape, use standard rect with rx/ry (cleaner SVG)
	if (cornerShape === 'round') {
		const rx =
			cornerRadius > 0
				? ` rx="${(cornerRadius / 100) * size}" ry="${(cornerRadius / 100) * size}"`
				: '';
		return {
			defs: '',
			element: `<rect width="${size}" height="${size}"${rx} fill="${fill}"/>`
		};
	}

	// For other shapes, generate the superellipse path
	const pathD = generateCornerPath(size, cornerRadius, cornerShape);
	const clipId = 'app-logo-clip';

	return {
		defs: `<clipPath id="${clipId}"><path d="${pathD}"/></clipPath>`,
		element: `<rect width="${size}" height="${size}" fill="${fill}" clip-path="url(#${clipId})"/>`
	};
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
	iconOffsetY: number,
	iconRotation: number,
	iconMirrorH: boolean = false,
	iconMirrorV: boolean = false
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

	// Rotation around the icon's center
	const rotateAttr =
		iconRotation !== 0
			? ` rotate(${iconRotation}, ${(renderedW / 2).toFixed(2)}, ${(renderedH / 2).toFixed(2)})`
			: '';

	// Mirror (flip) around the icon's center
	let mirrorAttr = '';
	if (iconMirrorH || iconMirrorV) {
		const sx = iconMirrorH ? -1 : 1;
		const sy = iconMirrorV ? -1 : 1;
		const cx = renderedW / 2;
		const cy = renderedH / 2;
		mirrorAttr = ` translate(${cx.toFixed(2)}, ${cy.toFixed(2)}) scale(${sx}, ${sy}) translate(${(-cx).toFixed(2)}, ${(-cy).toFixed(2)})`;
	}

	return `<g transform="translate(${tx.toFixed(2)}, ${ty.toFixed(2)})${rotateAttr}${mirrorAttr} scale(${scale.toFixed(4)}) translate(${-vbX}, ${-vbY})">
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

	// Resolve icon (pass emojiStyle for emoji auto-mapping)
	const emojiStyle = config.emojiStyle ?? DEFAULT_EMOJI_STYLE;
	const resolved = await resolveIcon(props.icon, emojiStyle);

	// Apply color mode (supports all IconColorMode values)
	const coloredContent = applyColorMode(
		resolved.svgContent,
		resolved.isMonochrome,
		props.iconColorMode,
		props.iconColor,
		props.grayscaleLightness
	);

	// Build SVG parts
	const isGradient = typeof props.background !== 'string';
	const gradientEl = isGradient
		? buildGradientElement(props.background as GradientConfig, gradientId)
		: '';
	const bg = buildBackground(
		props.background,
		size,
		props.cornerRadius,
		props.cornerShape,
		gradientId
	);
	const iconLayer = buildIconLayer(
		coloredContent,
		resolved.viewBox,
		size,
		props.iconSize,
		props.iconOffsetX,
		props.iconOffsetY,
		props.iconRotation,
		props.iconMirrorH,
		props.iconMirrorV
	);

	// Combine all defs (gradient + clip path)
	const allDefs = [gradientEl, bg.defs].filter(Boolean).join('\n    ');
	const defsBlock = allDefs ? `<defs>\n    ${allDefs}\n  </defs>` : '';

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defsBlock}
  ${bg.element}
  ${iconLayer}
</svg>`;
}
