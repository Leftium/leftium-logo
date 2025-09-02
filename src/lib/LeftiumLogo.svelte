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
		boundingBox?: 'square' | 'default' | 'encircled';
	}

	let {
		size = '100%',
		animated = true,
		toggleAnimationWithShift = false,
		ripplesOptions: ripplesOptionsProp = {},
		boundingBox = 'default'
	}: Props = $props();

	let ripples: Ripples | null;
	let animatedElements: Element[];
	let animate: (time: number) => void;

	const logoAnimation: Attachment = (element) => {
		animatedElements = [...element.children].filter((child) => child.classList.contains('animate'));
		const ripplesElement = element.getElementsByClassName('ripples')[0] as HTMLElement | undefined;
		const resolution = !ripplesElement ? 512 : Math.min(512, ripplesElement.offsetWidth / 2); // Apply ripples to the container but confine them to the content area
		const DEFAULT_RIPPLES_OPTIONS = {
			resolution,
			dropRadius: 20,
			perturbance: 0.01
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
									const newResolution = Math.min(512, currentWidth / 2);
									const newRippleOptions = {
										...rippleOptions,
										resolution: newResolution
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
				if (time - lastDropTime > 1500) {
					lastDropTime = time;
					const x = Math.random() * ripplesElement.offsetWidth;
					const y = Math.random() * ripplesElement.offsetHeight;
					const strength = 0.1 + Math.random() * 0.04;
					ripples.drop(x, y, rippleOptions.dropRadius, strength);
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

<logo-container style:--size={size} class={boundingBox} role="none">
	<grid-logo {@attach logoAnimation}>
		<img src={logoShadow} class="animate shadow" alt="" />
		<img src={logoGlow} class="glow" alt="" />
		<div
			class="ripples square"
			style:background-image="url({logoSquare})"
			onclick={handleClick}
			onkeydown={handleClick}
			role="button"
			tabindex="0"
			aria-label="Toggle logo animation"
		></div>
		<img src={logoLigature} class="animate ligature" alt="" />
	</grid-logo>
</logo-container>

<style>
	/* Container that defines the bounding box */
	logo-container {
		display: inline-block;
		position: relative;
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		overflow: visible;
	}

	/* Square bounding box mode - size matches the square */
	logo-container.square {
		width: var(--size);
		height: var(--size);
	}

	/* Default bounding box mode - average between square and encircled */
	logo-container.default {
		width: calc(var(--size) * 1.2519); /* Average of 1.0 and 1.5037 */
		height: calc(var(--size) * 1.2519);
	}

	/* Encircled bounding box mode - size for full logo with padding */
	logo-container.encircled {
		width: calc(var(--size) * 1.5037); /* 800/532 ratio */
		height: calc(var(--size) * 1.5037);
	}

	/* Grid that holds all the logo elements */
	grid-logo {
		position: absolute;
		display: grid;
		place-items: center;
		/* Always size based on the square dimensions */
		width: var(--size);
		height: var(--size);
	}

	/* Position grid differently based on bounding box mode */
	.square grid-logo {
		left: 0;
		top: 0;
	}

	.default grid-logo {
		/* Center the square within the default bounds */
		/* Default is average between square (0 offset) and encircled (134px offset) */
		/* 67px offset at 532px scale */
		left: calc(var(--size) * 0.1259); /* 67/532 ratio */
		top: calc(var(--size) * 0.1259);
	}

	.encircled grid-logo {
		/* Center the square within the encircled bounds */
		/* (800 - 532) / 2 = 134px offset at 800px scale */
		left: calc(var(--size) * 0.2518); /* 134/532 ratio */
		top: calc(var(--size) * 0.2518);
	}

	/* Individual logo elements positioned relative to the square */
	grid-logo > * {
		position: absolute;
		grid-column: 1 / 2;
		grid-row: 1 / 2;
		will-change: auto;
	}

	/* Square - base element at 532x532 */
	.square {
		width: 100%;
		height: 100%;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		z-index: 2;
		cursor: pointer;
		outline: none;
	}

	.square:focus {
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
		left: calc(100% * 134 / 532);
		top: calc(100% * -65 / 532);
		z-index: 3;
		pointer-events: none;
	}
</style>
