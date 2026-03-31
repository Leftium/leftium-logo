<script module>
	import { dev } from '$app/environment';
	import { SvelteSet } from 'svelte/reactivity';

	// Simple shared variable - no store needed!
	let globalAnimated = !dev;

	// Export control functions instead of the variable
	export function toggleAnimation() {
		globalAnimated = !globalAnimated;
		updateAllInstances();
	}

	export function setAnimated(value: boolean) {
		globalAnimated = value;
		updateAllInstances();
	}

	// Keep track of all instances for updates
	let instances = new SvelteSet<() => void>();

	function updateAllInstances() {
		instances.forEach((update) => update());
	}

	export function registerInstance(updateFn: () => void) {
		instances.add(updateFn);
		return () => instances.delete(updateFn);
	}
</script>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { Ripples, type RipplesOptions } from '$lib/webgl-ripples/webgl-ripples.js';
	import { generateCornerPolygon } from '$lib/app-logo/squircle.js';

	import logoGlow from '$lib/assets/logo-parts/glow.svg';
	import logoGlowSquircle from '$lib/assets/logo-parts/glow-squircle.svg';
	import logoLigature from '$lib/assets/logo-parts/ligature.svg';
	import logoShadow from '$lib/assets/logo-parts/shadow.svg';
	import logoSquare from '$lib/assets/logo-parts/square.svg?inline';

	interface Props {
		size?: string;
		toggleAnimationWithShift?: boolean;
		ripplesOptions?: RipplesOptions;
		boundingBox?: 'square' | 'default' | 'cropped' | 'encircled';
		squircle?: boolean;
		class?: string;
		onClick?: (event: MouseEvent | KeyboardEvent) => void;
		[key: string]: unknown; // Allow any additional props
	}

	// Squircle clip-path (50% radius, K=2 superellipse) — generated from true Lamé curve
	const SQUIRCLE_CLIP = generateCornerPolygon(50, 'squircle');

	let {
		size = '100%',
		toggleAnimationWithShift = false,
		ripplesOptions: ripplesOptionsProp = {},
		boundingBox = 'default',
		squircle = false,
		class: className = '',
		onClick = undefined,
		...restProps
	}: Props = $props();

	// Ligature positioning: original (square) vs squircle-adjusted base values
	// Square: original positioning where ligature inner corners touch the square corners
	const LIG_ORIG_W = 440;
	const LIG_ORIG_H = 666;
	const LIG_ORIG_L = 133.5;
	const LIG_ORIG_T = -65.75;
	const BLUR_PAD_ORIG = 50; // shadow extends 50px beyond ligature on each side

	// Squircle: scaled to align inner corners with squircle boundary
	// (base 94.46% * 1.023 scale, offset x=-6.5, y=7)
	const LIG_SQRC_W = 425.2;
	const LIG_SQRC_H = 643.6;
	const LIG_SQRC_L = 129.5;
	const LIG_SQRC_T = -47.6;
	const BLUR_PAD_SQRC = 48.3;

	// Select positioning values depending on squircle mode
	let ligW = $derived(squircle ? LIG_SQRC_W : LIG_ORIG_W);
	let ligH = $derived(squircle ? LIG_SQRC_H : LIG_ORIG_H);
	let ligL = $derived(squircle ? LIG_SQRC_L : LIG_ORIG_L);
	let ligT = $derived(squircle ? LIG_SQRC_T : LIG_ORIG_T);

	// Shadow tracks ligature center + blur padding
	let blurPad = $derived(squircle ? BLUR_PAD_SQRC : BLUR_PAD_ORIG);
	let shadW = $derived(ligW + blurPad * 2);
	let shadH = $derived(ligH + blurPad * 2);
	let shadL = $derived(ligL - blurPad);
	let shadT = $derived(ligT - blurPad);

	// Use global animation state shared across ALL instances
	let animated = $state(globalAnimated);

	// Register for updates from other instances
	let unregister = registerInstance(() => {
		animated = globalAnimated;
	});

	// Clean up on destroy
	onDestroy(unregister);

	let ripples: Ripples | null;
	let animatedElements: Element[];
	let animate: (time: number) => void;

	// State for dimension bindings
	let ripplesWidth = $state(0);

	// Reactive effect to handle animation state changes from global store
	$effect(() => {
		if (animated) {
			// Start animation - only if elements are available
			if (animatedElements && animate) {
				for (const el of animatedElements) {
					(el as HTMLElement).style.transition = '';
				}
				requestAnimationFrame(animate);
			}
		} else {
			// Stop animation - only if elements are available
			if (animatedElements) {
				if (ripples) {
					ripples.destroy();
					ripples = null;
				}

				// Reset transforms with smooth transition
				for (const el of animatedElements) {
					(el as HTMLElement).style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
					(el as HTMLElement).style.transform = 'translate(0%, 0%)';
				}
			}
		}
	});

	const logoAnimation: Attachment = (element) => {
		animatedElements = [...element.children].filter((child) => child.classList.contains('animate'));
		const ripplesElement = element.getElementsByTagName('d-ripple')[0] as HTMLElement | undefined;

		// Scaling constants for ripple calculations
		const SCALING_CONSTANTS = {
			// Resolution scaling
			MIN_RESOLUTION: 128,
			MAX_RESOLUTION: 512,
			RESOLUTION_FACTOR: 0.8,

			// Drop radius scaling (linear interpolation from 62px:2px to 800px:23.36px, capped at 20px)
			MIN_DROP_RADIUS: 2,
			MAX_DROP_RADIUS: 20,
			DROP_RADIUS_MIN_SIZE: 62,
			DROP_RADIUS_MAX_SIZE: 800,
			DROP_RADIUS_RANGE: 21.36,

			// Wave propagation scaling (2.0 at 500px down to 0.2 at 125px)
			MIN_WAVE_PROPAGATION: 0.2,
			MAX_WAVE_PROPAGATION: 2.0,
			WAVE_PROP_REFERENCE_SIZE: 500,
			WAVE_PROP_MIN_SIZE: 125,
			WAVE_PROP_FACTOR: 1.5
		};

		// Scaling utility functions
		function calculateResolution(width: number): number {
			return Math.min(
				SCALING_CONSTANTS.MAX_RESOLUTION,
				Math.max(SCALING_CONSTANTS.MIN_RESOLUTION, width * SCALING_CONSTANTS.RESOLUTION_FACTOR)
			);
		}

		function calculateDropRadius(width: number): number {
			return Math.min(
				SCALING_CONSTANTS.MAX_DROP_RADIUS,
				Math.max(
					SCALING_CONSTANTS.MIN_DROP_RADIUS,
					SCALING_CONSTANTS.MIN_DROP_RADIUS +
						((width - SCALING_CONSTANTS.DROP_RADIUS_MIN_SIZE) /
							(SCALING_CONSTANTS.DROP_RADIUS_MAX_SIZE - SCALING_CONSTANTS.DROP_RADIUS_MIN_SIZE)) *
							SCALING_CONSTANTS.DROP_RADIUS_RANGE
				)
			);
		}

		function calculateWavePropagation(width: number): number {
			return Math.max(
				SCALING_CONSTANTS.MIN_WAVE_PROPAGATION,
				Math.min(
					SCALING_CONSTANTS.MAX_WAVE_PROPAGATION,
					SCALING_CONSTANTS.MAX_WAVE_PROPAGATION -
						((SCALING_CONSTANTS.WAVE_PROP_REFERENCE_SIZE - width) /
							(SCALING_CONSTANTS.WAVE_PROP_REFERENCE_SIZE - SCALING_CONSTANTS.WAVE_PROP_MIN_SIZE)) *
							SCALING_CONSTANTS.WAVE_PROP_FACTOR
				)
			);
		}

		// Calculate initial scaling values
		const elementSize = ripplesElement?.offsetWidth || 100;
		const resolution = !ripplesElement
			? SCALING_CONSTANTS.MAX_RESOLUTION
			: calculateResolution(elementSize);
		const scaledDropRadius = calculateDropRadius(elementSize);
		const scaledWavePropagation = calculateWavePropagation(elementSize);

		const DEFAULT_RIPPLES_OPTIONS = {
			resolution,
			dropRadius: scaledDropRadius,
			perturbance: 0.04,
			// Ripple tuning parameters
			wavePropagation: scaledWavePropagation,
			dampening: 0.997 // Ripple dampening (0.999 = very long lasting, 0.995 = normal, 0.99 = quick fade)
		};
		const rippleOptions = { ...DEFAULT_RIPPLES_OPTIONS, ...ripplesOptionsProp };

		// Use Svelte dimension bindings for resize handling
		let lastWidth = ripplesElement?.offsetWidth;
		let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
		let hasExecutedLeading = $state(false);

		// Extract ripples recreation logic for reuse
		function recreateRipples(currentWidth: number) {
			if (animated && ripplesElement) {
				// Destroy old instance first
				if (ripples) {
					try {
						ripples.destroy();
					} catch (e) {
						console.error('Error destroying ripples:', e);
					}
					ripples = null;
				}

				// Wait a frame before creating new instance to ensure cleanup
				requestAnimationFrame(() => {
					if (!ripples && animated && ripplesElement) {
						// Calculate scaled values using utility functions
						const newResolution = calculateResolution(currentWidth);
						const newScaledDropRadius = calculateDropRadius(currentWidth);
						const newScaledWavePropagation = calculateWavePropagation(currentWidth);
						const newRippleOptions = {
							...rippleOptions,
							resolution: newResolution,
							dropRadius: newScaledDropRadius,
							wavePropagation: newScaledWavePropagation
						};

						try {
							ripples = new Ripples(ripplesElement, newRippleOptions);
						} catch (e) {
							console.error('Error creating ripples:', e);
						}
					}
				});
			}
		}

		// Reactive effect to handle dimension changes with leading + trailing edge debouncing
		$effect(() => {
			if (ripplesWidth && animated && ripplesElement) {
				const currentWidth = ripplesWidth;

				// Only recreate if width actually changed significantly (more than 5px)
				const widthChanged = Math.abs(currentWidth - (lastWidth || 0)) > 5;

				if (widthChanged) {
					lastWidth = currentWidth;

					// LEADING EDGE: Execute immediately on first change in sequence
					if (!hasExecutedLeading) {
						hasExecutedLeading = true;
						recreateRipples(currentWidth);
					}

					// TRAILING EDGE: Debounced execution to handle rapid changes
					if (resizeTimeout) {
						clearTimeout(resizeTimeout);
					}

					resizeTimeout = setTimeout(() => {
						recreateRipples(currentWidth);
						hasExecutedLeading = false; // Reset for next change sequence
					}, 100); // 100ms debounce
				}
			}
		});

		let angle = $state(0);
		let lastDropTime = $state(0);
		let lastTime = 0;

		animate = (time: number) => {
			// Exit if we shouldn't be running
			if (!animated) {
				return;
			}
			const deltaTime = lastTime ? time - lastTime : 0;
			lastTime = time;

			// Create ripples if needed (and not already being created by resize)
			if (animated && !ripples && ripplesElement && !resizeTimeout) {
				try {
					ripples = new Ripples(ripplesElement, rippleOptions);
				} catch (e) {
					console.error('Error creating ripples in animation loop:', e);
				}
			}

			// Automatic drops (only when animated)
			if (animated && lastDropTime !== null && ripples && ripplesElement) {
				if (time - lastDropTime > 3000) {
					lastDropTime = time;
					const x = Math.random() * ripplesElement.offsetWidth;
					const y = Math.random() * ripplesElement.offsetHeight;
					// Use scaled drop radius for automatic drops
					const currentSize = ripplesElement.offsetWidth;
					const autoDropRadius = calculateDropRadius(currentSize);
					// Scale strength based on size - ensure minimum visibility for small sizes
					const sizeFactor = Math.max(0.7, Math.min(1, currentSize / 200)); // Never below 70%
					const baseStrength = 0.1 + Math.random() * 0.04;
					const strength = Math.max(0.08, baseStrength * sizeFactor); // Minimum 0.08 for visibility
					ripples.drop(x, y, autoDropRadius, strength);
				}
			}

			// Animate ligature
			angle += deltaTime;

			// Original movement in 0-4 range
			const origX = 2 + 2 * Math.cos(angle / 971 - Math.PI);
			const origY = 2 + 2 * Math.sin(angle / 601 - Math.PI / 2);

			// Rotate -45 degrees: transform the 4x4 square into a diamond
			const dx = animated ? ((origX + origY) * Math.sqrt(2)) / 2 : 0;
			const dy = animated ? ((-origX + origY) * Math.sqrt(2)) / 2 : 0;

			// The animation percentages were designed for the full 800px canvas
			// Now we need to scale them for each element's actual size
			for (const el of animatedElements) {
				if (el.classList.contains('shadow')) {
					// Shadow is 510.1x723.6 (scaled 94.46% for squircle)
					const scaleX = 800 / 510.1;
					const scaleY = 800 / 723.6;
					(el as HTMLElement).style.transform = `translate(${dx * scaleX}%, ${dy * scaleY}%)`;
				} else if (el.classList.contains('ligature')) {
					// Ligature is 415.6x629.1 (scaled 94.46% for squircle)
					const scaleX = 800 / 415.6;
					const scaleY = 800 / 629.1;
					(el as HTMLElement).style.transform = `translate(${dx * scaleX}%, ${dy * scaleY}%)`;
				} else {
					// Default for any other animated elements
					(el as HTMLElement).style.transform = `translate(${dx}%, ${dy}%)`;
				}
			}

			// Only continue animation if animated
			if (animated) {
				requestAnimationFrame(animate);
			}
		};

		// Start animation if initially animated
		if (animated) {
			requestAnimationFrame(animate);
		}

		return function () {
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
			if (ripples) {
				try {
					ripples.destroy();
				} catch (e) {
					console.error('Error destroying ripples on cleanup:', e);
				}
			}
			hasExecutedLeading = false; // Reset leading edge state
		};
	};

	function handleClick(event: MouseEvent | KeyboardEvent) {
		// Call external callback first if provided
		if (onClick) {
			onClick(event);
		}

		// For keyboard events, only respond to Enter key
		if ('key' in event && event.key !== 'Enter') {
			return;
		}

		// Shift key controls whether click drops or toggles animation.
		if (toggleAnimationWithShift !== event.shiftKey) {
			return;
		}

		// Update global state - affects ALL LeftiumLogo instances immediately
		// The reactive effect above will handle the animation start/stop logic
		toggleAnimation();
	}
</script>

<logo-container
	style:--size={size}
	class="{boundingBox} {className}"
	class:squircle
	role="none"
	{...restProps}
>
	<grid-logo {@attach logoAnimation}>
		<img
			class="animate shadow"
			alt=""
			src={logoShadow}
			style="width:calc(100% * {shadW} / 532);height:calc(100% * {shadH} / 532);left:calc(100% * {shadL} / 532);top:calc(100% * {shadT} / 532)"
		/>
		<img class="glow" alt="" src={squircle ? logoGlowSquircle : logoGlow} />
		<d-ripple
			class="square"
			style:background-image={`url("${logoSquare}")`}
			style:clip-path={squircle ? SQUIRCLE_CLIP : 'none'}
			bind:offsetWidth={ripplesWidth}
			onclick={handleClick}
			onkeydown={handleClick}
			role="button"
			tabindex="0"
			aria-label="Toggle logo animation"
		></d-ripple>
		<img
			class="animate ligature"
			alt=""
			src={logoLigature}
			style="width:calc(100% * {ligW} / 532);height:calc(100% * {ligH} / 532);left:calc(100% * {ligL} / 532);top:calc(100% * {ligT} / 532)"
		/>
	</grid-logo>
</logo-container>

<style>
	/* Container that defines the bounding box */
	logo-container {
		display: inline-block;
		position: relative;
		width: var(--size);
		aspect-ratio: 1;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		overflow: visible;

		/* Cropped mode - match ellipse aspect ratio: 723.08875/812.58868 ≈ 0.8906 */
		&.cropped {
			aspect-ratio: 0.8906;
		}

		/* Square bounding box mode - grid fills the container */
		&.square grid-logo {
			width: 100%;
			left: 0;
			top: 0;
		}

		/* Default bounding box mode - grid is scaled down to leave some padding */
		&.default grid-logo {
			/* Grid is 1/1.2519 = 79.88% of container to account for padding */
			width: calc(100% / 1.2519);
			/* Center within container */
			left: calc((100% - 100% / 1.2519) / 2);
			top: calc((100% - 100% / 1.2519) / 2);
		}

		/* Encircled bounding box mode - grid is scaled down more to leave full padding */
		&.encircled grid-logo {
			/* Grid is 1/1.5037 = 66.5% of container (532/800) */
			width: calc(100% / 1.5037);
			/* Center within container */
			left: calc((100% - 100% / 1.5037) / 2);
			top: calc((100% - 100% / 1.5037) / 2);
		}

		/* Squircle + encircled: scale up 1.04x to compensate for smaller ligature */
		&.encircled.squircle grid-logo {
			width: calc(100% / 1.5037 * 1.04);
			left: calc((100% - 100% / 1.5037 * 1.04) / 2);
			top: calc((100% - 100% / 1.5037 * 1.04) / 2);
		}

		/* Cropped bounding box mode - grid scaled and positioned to match reference SVG */
		&.cropped grid-logo {
			/* Square is 1131.371px in a 1447px wide container = 78.2% */
			width: 78.2%;
			/* Position calculations from SVG transforms */
			/* Final square position after transforms: x=122.18, y=247.73 */
			/* Left offset: 122.18/1447 = 8.44% */
			left: 8.44%;
			/* Top offset: 247.73/1626.9 = 15.23% */
			top: 15.23%;
		}
	}

	/* Grid that holds all the logo elements */
	grid-logo {
		position: absolute;
		display: grid;
		place-items: center;
		width: 100%; /* Default width, will be overridden for default/encircled modes */
		aspect-ratio: 1;

		img {
			max-width: unset;
		}

		/* Individual logo elements positioned relative to the square */
		> * {
			position: absolute;
			grid-column: 1 / 2;
			grid-row: 1 / 2;
			will-change: auto;
		}
	}

	/* Square image - base element at 532x532 */
	/* Uses <d-ripple> custom element to avoid classless CSS library interference */
	/* Still needs resets for [role="button"] targeting by classless CSS libraries */
	d-ripple.square {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		z-index: 2;
		cursor: pointer;
		outline: none;

		/* Reset [role="button"] styles from classless CSS libraries */
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		box-shadow: none;
		background-color: transparent;
		color: inherit;
		font: inherit;
		text-align: inherit;
		text-decoration: none;
		line-height: inherit;

		&:focus {
			outline: none;
			box-shadow: none;
		}
	}

	/* Glow - 647x647, centered on square */
	.glow {
		width: calc(100% * 647 / 532);
		height: calc(100% * 647 / 532);
		/* Center it: (647-532)/2 = 57.5px offset at original scale */
		left: calc(100% * -57.5 / 532);
		top: calc(100% * -57.5 / 532);
		z-index: 1;
		/* Glow should not capture clicks */
		pointer-events: none;
	}

	/* Shadow - dimensions/position set via inline style for dynamic ligature adjustment */
	.shadow {
		z-index: 0;
		pointer-events: none;
	}

	/* Ligature - dimensions/position set via inline style */
	.ligature {
		z-index: 3;
		pointer-events: none;
	}
</style>
