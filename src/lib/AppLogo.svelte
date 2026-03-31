<script lang="ts">
	import type { AppLogoProps, GradientConfig } from './app-logo/types.js';
	import { APP_LOGO_DEFAULTS } from './app-logo/defaults.js';
	import { resolveIcon, applyColorMode, type ResolvedIcon } from './app-logo/iconify.js';

	let {
		icon = APP_LOGO_DEFAULTS.icon,
		iconColor = APP_LOGO_DEFAULTS.iconColor,
		iconColorMode = APP_LOGO_DEFAULTS.iconColorMode,
		iconSize = APP_LOGO_DEFAULTS.iconSize,
		iconOffsetX = APP_LOGO_DEFAULTS.iconOffsetX,
		iconOffsetY = APP_LOGO_DEFAULTS.iconOffsetY,
		iconRotation = APP_LOGO_DEFAULTS.iconRotation,
		cornerRadius = APP_LOGO_DEFAULTS.cornerRadius,
		background = APP_LOGO_DEFAULTS.background as AppLogoProps['background'],
		size = APP_LOGO_DEFAULTS.size
	}: AppLogoProps = $props();

	// Resolved icon state — use $state.raw since this is replaced, not mutated
	let resolved: ResolvedIcon | null = $state.raw(null);

	// Fetch icon when the icon prop changes
	$effect(() => {
		const currentIcon = icon;
		resolved = null;

		resolveIcon(currentIcon!).then((result) => {
			// Only update if icon hasn't changed while we were fetching
			if (icon === currentIcon) {
				resolved = result;
			}
		});
	});

	// Normalize color mode: Phase 2 object modes fall back to 'auto'
	let effectiveColorMode: 'auto' | 'original' | 'monochrome' = $derived(
		typeof iconColorMode === 'object'
			? 'auto'
			: iconColorMode === 'original' || iconColorMode === 'monochrome'
				? iconColorMode
				: 'auto'
	);

	// Apply color transformation to the resolved SVG content
	let coloredSvgContent = $derived.by(() => {
		const r = resolved;
		if (!r) return '';
		return applyColorMode(r.svgContent, r.isMonochrome, effectiveColorMode, iconColor!);
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
		const colorStops = grad.colors
			.map((color, i) => {
				if (grad.stops && grad.stops[i] !== undefined) {
					return `${color} ${grad.stops[i] * 100}%`;
				}
				return color;
			})
			.join(', ');

		return `background-image: linear-gradient(${angle}deg, ${colorStops});`;
	});

	// Icon wrapper transform for offset and rotation
	let iconTransform = $derived.by(() => {
		const parts: string[] = [];
		if (iconOffsetX || iconOffsetY) {
			parts.push(`translate(${iconOffsetX}%, ${iconOffsetY}%)`);
		}
		if (iconRotation) {
			parts.push(`rotate(${iconRotation}deg)`);
		}
		return parts.length > 0 ? parts.join(' ') : undefined;
	});
</script>

<div class="app-logo" style:width="{size}px" style:height="{size}px">
	<div class="app-logo-square" style="{backgroundStyle} border-radius: {cornerRadius}%;">
		{#if iconHtml}
			<div
				class="app-logo-icon"
				style:width="{iconSize}%"
				style:height="{iconSize}%"
				style:transform={iconTransform}
			>
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
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
