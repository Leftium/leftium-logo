<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { Ripples, type RipplesOptions } from '$lib/webgl-ripples/webgl-ripples.js';

	import logoGlow from '$lib/assets/logo-parts/glow.webp';
	import logoLigature from '$lib/assets/logo-parts/ligature.webp';
	import logoShadow from '$lib/assets/logo-parts/shadow.webp';
	import logoSquare from '$lib/assets/logo-parts/square.webp';

	interface Props {
		size?: string;
		animated?: boolean;
		toggleAnimationWithShift?: boolean;
		ripplesOptions?: RipplesOptions;
		boundingBox?: 'square' | 'default' | 'cropped' | 'encircled';
		class?: string;
		[key: string]: any; // Allow any additional props
	}

	let {
		size = '100%',
		animated = true,
		toggleAnimationWithShift = false,
		ripplesOptions: ripplesOptionsProp = {},
		boundingBox = 'default',
		class: className = '',
		...restProps
	}: Props = $props();

	let ripples: Ripples | null;
	let animatedElements: Element[];
	let animate: (time: number) => void;

	const logoAnimation: Attachment = (element) => {
		animatedElements = [...element.children].filter((child) => child.classList.contains('animate'));
		const ripplesElement = element.getElementsByClassName('ripples')[0] as HTMLElement | undefined;

		// Higher resolution for smaller sizes to avoid blurriness
		// For small logos, use closer to 1:1 ratio, for large logos cap at 512
		const elementSize = ripplesElement?.offsetWidth || 100;
		const resolution = !ripplesElement ? 512 : Math.min(512, Math.max(128, elementSize * 0.8));

		// Scale drop radius based on element size: 15px at 500px down to 2px at 62px
		// Linear interpolation from 62px:2px to 800px:23.36px, capped at 20px
		// Formula: 2 + ((elementSize - 62) / (800 - 62)) * (23.36 - 2)
		const scaledDropRadius = Math.min(
			20,
			Math.max(2, 2 + ((elementSize - 62) / (800 - 62)) * 21.36)
		);

		// Scale wave propagation based on element size: 2.0 at 500px down to 0.5 at 125px
		// Linear interpolation for sizes 500px down to 125px, then clamp at 0.5 for smaller
		const scaledWavePropagation = Math.max(
			0.5,
			Math.min(2.0, 2.0 - ((500 - elementSize) / (500 - 125)) * 1.5)
		);

		const DEFAULT_RIPPLES_OPTIONS = {
			resolution,
			dropRadius: scaledDropRadius,
			perturbance: 0.04,
			// Ripple tuning parameters
			wavePropagation: scaledWavePropagation,
			dampening: 0.997 // Ripple dampening (0.999 = very long lasting, 0.995 = normal, 0.99 = quick fade)
		};
		const rippleOptions = { ...DEFAULT_RIPPLES_OPTIONS, ...ripplesOptionsProp };

		// Set up ResizeObserver to handle component resizing
		let resizeObserver: ResizeObserver | null = null;
		let lastWidth = ripplesElement?.offsetWidth;
		let lastHeight = ripplesElement?.offsetHeight;
		let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

		if (ripplesElement && typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => {
				const currentWidth = ripplesElement.offsetWidth;
				const currentHeight = ripplesElement.offsetHeight;

				// Only recreate if size actually changed significantly (more than 5px)
				const widthChanged = Math.abs(currentWidth - (lastWidth || 0)) > 5;
				const heightChanged = Math.abs(currentHeight - (lastHeight || 0)) > 5;

				if (widthChanged || heightChanged) {
					lastWidth = currentWidth;
					lastHeight = currentHeight;

					// Debounce the recreation to avoid too many WebGL contexts
					if (resizeTimeout) {
						clearTimeout(resizeTimeout);
					}

					resizeTimeout = setTimeout(() => {
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
									// Higher resolution for smaller sizes to avoid blurriness
									const newResolution = Math.min(512, Math.max(128, currentWidth * 0.8));
									// Scale drop radius and wave propagation for new size
									// Linear interpolation from 62px:2px to 800px:23.36px, capped at 20px
									const newScaledDropRadius = Math.min(
										20,
										Math.max(2, 2 + ((currentWidth - 62) / (800 - 62)) * 21.36)
									);
									const newScaledWavePropagation = Math.max(
										0.5,
										Math.min(2.0, 2.0 - ((500 - currentWidth) / (500 - 125)) * 1.5)
									);
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
					}, 100); // 100ms debounce
				}
			});
			resizeObserver.observe(ripplesElement);
		}

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
					const autoDropRadius = Math.min(
						20,
						Math.max(2, 2 + ((currentSize - 62) / (800 - 62)) * 21.36)
					);
					// Scale strength based on size - gentler ripples for smaller logos
					const sizeFactor = Math.min(1, currentSize / 200);
					const strength = (0.1 + Math.random() * 0.04) * sizeFactor;
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
					// Shadow is 540x766, need to scale movement to match original animation
					// Original: 4% of 800px = 32px. For shadow: 32px / 540px = 5.93%
					const scaleX = 800 / 540;
					const scaleY = 800 / 766;
					(el as HTMLElement).style.transform = `translate(${dx * scaleX}%, ${dy * scaleY}%)`;
				} else if (el.classList.contains('ligature')) {
					// Ligature is 440x666, need to scale movement to match original animation
					// Original: 4% of 800px = 32px. For ligature: 32px / 440px = 7.27%
					const scaleX = 800 / 440;
					const scaleY = 800 / 666;
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
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	};

	function handleClick(event: MouseEvent | KeyboardEvent) {
		// For keyboard events, only respond to Enter key
		if ('key' in event && event.key !== 'Enter') {
			return;
		}

		// Shift key controls whether click drops or toggles animation.
		if (toggleAnimationWithShift !== event.shiftKey) {
			return;
		}

		animated = !animated;

		if (animated) {
			// Remove transitions before starting animation
			for (const el of animatedElements) {
				(el as HTMLElement).style.transition = '';
			}
			// Start animation
			if (animate) {
				requestAnimationFrame(animate);
			}
		} else {
			// Stop animation - destroy ripples and reset transforms
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
</script>

<logo-container style:--size={size} class="{boundingBox} {className}" role="none" {...restProps}>
	<grid-logo {@attach logoAnimation}>
		<img class="animate shadow" alt="" src={logoShadow} />
		<img class="glow" alt="" src={logoGlow} />
		<div
			class="ripples square"
			style:background-image="url({logoSquare})"
			onclick={handleClick}
			onkeydown={handleClick}
			role="button"
			tabindex="0"
			aria-label="Toggle logo animation"
		></div>
		<img class="animate ligature" alt="" src={logoLigature} />
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
	}

	/* Square mode - square container */
	logo-container.square {
		aspect-ratio: 1;
	}

	/* Default mode - square container */
	logo-container.default {
		aspect-ratio: 1;
	}

	/* Encircled mode - square container */
	logo-container.encircled {
		aspect-ratio: 1;
	}

	/* Cropped mode - match ellipse aspect ratio: 723.08875/812.58868 ≈ 0.8906 */
	logo-container.cropped {
		aspect-ratio: 0.8906;
	}

	/* Grid that holds all the logo elements */
	grid-logo {
		position: absolute;
		display: grid;
		place-items: center;
		width: 100%; /* Default width, will be overridden for default/encircled modes */
		aspect-ratio: 1;

		img {
			/* Prevent PicoCSS styles. */
			max-width: unset !important;
		}
	}

	/* Square bounding box mode - grid fills the container */
	logo-container.square grid-logo {
		width: 100%;
		left: 0;
		top: 0;
	}

	/* Default bounding box mode - grid is scaled down to leave some padding */
	logo-container.default grid-logo {
		/* Grid is 1/1.2519 = 79.88% of container to account for padding */
		width: calc(100% / 1.2519);
		/* Center within container */
		left: calc((100% - 100% / 1.2519) / 2);
		top: calc((100% - 100% / 1.2519) / 2);
	}

	/* Encircled bounding box mode - grid is scaled down more to leave full padding */
	logo-container.encircled grid-logo {
		/* Grid is 1/1.5037 = 66.5% of container (532/800) */
		width: calc(100% / 1.5037);
		/* Center within container */
		left: calc((100% - 100% / 1.5037) / 2);
		top: calc((100% - 100% / 1.5037) / 2);
	}

	/* Cropped bounding box mode - grid scaled to fit ellipse average dimension */
	logo-container.cropped grid-logo {
		/* Scale based on ellipse average dimension: (679.5+763.6)/2 = 721.55 -> 532/721.55 ≈ 0.737 */
		width: calc(100% / (1 / 0.737));
		/* Center within container */
		left: calc((100% - 100% / (1 / 0.737)) / 2);
		top: calc((100% - 100% / (1 / 0.737)) / 2);
	}

	/* Individual logo elements positioned relative to the square */
	grid-logo > * {
		position: absolute;
		grid-column: 1 / 2;
		grid-row: 1 / 2;
		will-change: auto;
	}

	/* Square image - base element at 532x532 */
	.ripples.square {
		width: 100%;
		aspect-ratio: 1;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		z-index: 2;
		cursor: pointer;
		outline: none;

		/* Prevent PicoCSS [role=button] styles. */
		padding: 0 !important;
		border: none !important;
		border-radius: 0 !important;
		outline: none !important;
		box-shadow: none !important;
	}

	.ripples.square:focus {
		outline: none;
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

	/* Shadow - 540x766, positioned to outline the ligature */
	.shadow {
		width: calc(100% * 540 / 532);
		height: calc(100% * 766 / 532);
		/* Shadow should be centered on ligature */
		/* Ligature is 440x666, shadow is 540x766 */
		/* Shadow is (540-440)/2 = 50px wider on each side, (766-666)/2 = 50px taller on each side */
		left: calc(100% * (133 - 50) / 532); /* Center shadow on ligature */
		top: calc(100% * (-66 - 50) / 532);
		z-index: 0;
		/* Shadow should not capture clicks */
		pointer-events: none;
	}

	/* Ligature - 440x666, positioned based on SVG */
	.ligature {
		width: calc(100% * 440 / 532);
		height: calc(100% * 666 / 532);
		/* Ligature extends to the right and below the square */
		/* Looking at the SVG path, the ligature starts at top-left and extends right and down */
		left: calc(100% * 133.5 / 532);
		top: calc(100% * -65.75 / 532);
		z-index: 3;
		pointer-events: none;
	}
</style>
