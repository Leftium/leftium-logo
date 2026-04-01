<script lang="ts">
	import type { AppLogoProps, GradientConfig } from './app-logo/types.js';
	import { APP_LOGO_DEFAULTS, DEFAULT_EMOJI_STYLE } from './app-logo/defaults.js';
	import { resolveIcon, type ResolvedIcon } from './app-logo/iconify.js';
	import { applyColorMode } from './app-logo/color-transform.js';
	import { generateCornerPath } from './app-logo/squircle.js';

	let {
		icon = APP_LOGO_DEFAULTS.icon,
		iconColor = APP_LOGO_DEFAULTS.iconColor,
		iconColorMode = APP_LOGO_DEFAULTS.iconColorMode,
		iconSize = APP_LOGO_DEFAULTS.iconSize,
		iconOffsetX = APP_LOGO_DEFAULTS.iconOffsetX,
		iconOffsetY = APP_LOGO_DEFAULTS.iconOffsetY,
		iconRotation = APP_LOGO_DEFAULTS.iconRotation,
		iconMirrorH = APP_LOGO_DEFAULTS.iconMirrorH,
		iconMirrorV = APP_LOGO_DEFAULTS.iconMirrorV,
		grayscaleLightness = 100,
		cornerRadius = APP_LOGO_DEFAULTS.cornerRadius,
		cornerShape = APP_LOGO_DEFAULTS.cornerShape,
		background = APP_LOGO_DEFAULTS.background as AppLogoProps['background'],
		size = APP_LOGO_DEFAULTS.size,
		emojiStyle = DEFAULT_EMOJI_STYLE
	}: AppLogoProps & { emojiStyle?: string } = $props();

	// Resolved icon state — use $state.raw since this is replaced, not mutated
	let resolved: ResolvedIcon | null = $state.raw(null);

	// Fetch icon when the icon prop changes
	$effect(() => {
		const currentIcon = icon;
		const currentEmojiStyle = emojiStyle;
		resolved = null;

		resolveIcon(currentIcon, currentEmojiStyle).then((result) => {
			// Only update if icon/emojiStyle hasn't changed while we were fetching
			if (icon === currentIcon && emojiStyle === currentEmojiStyle) {
				resolved = result;
			}
		});
	});

	// Apply color transformation to the resolved SVG content
	let coloredSvgContent = $derived.by(() => {
		const r = resolved;
		if (!r) return '';
		return applyColorMode(
			r.svgContent,
			r.isMonochrome,
			iconColorMode,
			iconColor,
			grayscaleLightness
		);
	});

	// Build the full inline SVG with viewBox and 100% sizing
	let iconHtml = $derived.by(() => {
		const r = resolved;
		if (!r) return '';
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r.viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${coloredSvgContent}</svg>`;
	});

	// Build background CSS from either a solid color string or GradientConfig
	let backgroundStyle = $derived.by(() => {
		if (typeof background === 'string') {
			return `background-color: ${background};`;
		}

		// GradientConfig
		const grad = background as GradientConfig;
		const angle = grad.angle ?? 45;
		const position = grad.position ?? 0;
		const scale = grad.scale ?? 1;

		// Transform stop positions to account for position and scale.
		// Default stops span 0% to 100%. Scale compresses/expands them,
		// and position shifts them along the axis.
		const colorStops = grad.colors
			.map((color, i) => {
				const baseOffset = grad.stops?.[i] ?? i / (grad.colors.length - 1);
				// Scale around center (0.5), then shift by position
				const adjusted = (baseOffset - 0.5) / scale + 0.5 - position / 200;
				return `${color} ${(adjusted * 100).toFixed(1)}%`;
			})
			.join(', ');

		return `background-image: linear-gradient(${angle}deg, ${colorStops});`;
	});

	// Compute CSS clip-path for non-'round' corner shapes
	let clipPathStyle = $derived.by(() => {
		if (cornerShape === 'round' || !cornerRadius) return undefined;
		const pathD = generateCornerPath(size, cornerRadius, cornerShape);
		return `path('${pathD}')`;
	});

	// Icon wrapper transform for offset, rotation, and mirror
	let iconTransform = $derived.by(() => {
		const parts: string[] = [];
		if (iconOffsetX || iconOffsetY) {
			parts.push(`translate(${iconOffsetX}%, ${iconOffsetY}%)`);
		}
		if (iconRotation) {
			parts.push(`rotate(${iconRotation}deg)`);
		}
		if (iconMirrorH || iconMirrorV) {
			parts.push(`scale(${iconMirrorH ? -1 : 1}, ${iconMirrorV ? -1 : 1})`);
		}
		return parts.length > 0 ? parts.join(' ') : undefined;
	});
</script>

<div class="app-logo" style:width="{size}px" style:height="{size}px">
	<div
		class="app-logo-square"
		style="{backgroundStyle} {cornerShape === 'round' ? `border-radius: ${cornerRadius}%;` : ''}"
		style:clip-path={clipPathStyle}
	>
		{#if iconHtml}
			<div
				class="app-logo-icon"
				style:width="{iconSize}%"
				style:height="{iconSize}%"
				style:transform={iconTransform}
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html iconHtml}
			</div>
		{/if}
	</div>
</div>

<style>
	.app-logo {
		display: inline-block;
	}

	.app-logo-square {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.app-logo-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		overflow: hidden;
	}

	.app-logo-icon :global(svg) {
		display: block;
	}
</style>
