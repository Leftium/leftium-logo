<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripples as RipplesModified } from '$lib/webgl-ripples/webgl-ripples.js';
	import logoSquare from '$lib/assets/logo-parts/square.svg?inline';

	let modifiedContainer: HTMLDivElement;
	let originalContainer: HTMLDivElement;
	let ripplesModified: RipplesModified | null = null;
	let originalRipples: unknown = null;

	onMount(() => {
		// Initialize modified version
		if (modifiedContainer) {
			try {
				ripplesModified = new RipplesModified(modifiedContainer, {
					resolution: 512,
					dropRadius: 20,
					perturbance: 0.04,
					interactive: true
				});
			} catch (e) {
				console.error('Error creating modified ripples:', e);
			}
		}

		// Load the original unmodified version via script tag
		(async function () {
			await import('$lib/webgl-ripples/webgl-ripples-original.js');
			// The original version creates a global Ripples constructor
			if (
				typeof window !== 'undefined' &&
				(window as { Ripples?: unknown }).Ripples &&
				originalContainer
			) {
				try {
					const Ripples = (window as { Ripples?: unknown }).Ripples;
					originalRipples = new Ripples(originalContainer, {
						resolution: 512,
						dropRadius: 20,
						perturbance: 0.04,
						interactive: true
					});
					console.log('Original ripples initialized:', originalRipples);
				} catch (e) {
					console.error('Error creating original ripples:', e);
				}
			} else {
				console.error('Ripples constructor not found on window');
			}
		})();

		// Cleanup on unmount
		return () => {
			if (ripplesModified) {
				ripplesModified.destroy();
			}
			if (originalRipples && originalRipples.destroy) {
				originalRipples.destroy();
			}
		};
	});

	function dropModified() {
		if (ripplesModified && modifiedContainer) {
			const x = modifiedContainer.offsetWidth / 2;
			const y = modifiedContainer.offsetHeight / 2;
			ripplesModified.drop(x, y, 40, 0.08);
		}
	}

	function dropOriginal() {
		if (originalRipples && originalRipples.drop) {
			originalRipples.drop(
				originalContainer.offsetWidth / 2,
				originalContainer.offsetHeight / 2,
				40,
				0.08
			);
		}
	}
</script>

<svelte:head>
	<!-- In case the original needs any global setup -->
</svelte:head>

<div class="demo-container">
	<h1>WebGL Ripples - Original Unmodified Version</h1>

	<div class="comparison">
		<div class="test-section">
			<h2>Modified Version (ES Module)</h2>
			<p>SSR-safe, handles transparent borders</p>
			<div
				class="ripple-container"
				bind:this={modifiedContainer}
				style:background-image={`url("${logoSquare}")`}
			></div>
			<button onclick={dropModified}>Manual Drop</button>
		</div>

		<div class="test-section">
			<h2>Original main.js (Unmodified)</h2>
			<p>Raw JavaScript, global Ripples constructor</p>
			<div
				class="ripple-container"
				bind:this={originalContainer}
				style:background-image={`url("${logoSquare}")`}
			></div>
			<button onclick={dropOriginal}>Manual Drop</button>
		</div>
	</div>

	<div class="instructions">
		<h3>Test Details:</h3>
		<ul>
			<li>Left: Modified ES module version with SSR safety and transparent border handling</li>
			<li>Right: Original unmodified main.js loaded via script tag</li>
			<li>Both use the same configuration (resolution: 512, dropRadius: 20, perturbance: 0.04)</li>
			<li>Both read from the same SVG background (square.svg with merged gradient)</li>
			<li>Click "Manual Drop" to trigger ripple effects at center</li>
		</ul>

		<div class="note">
			<strong>Fixed:</strong> The SVG gradient has been merged to eliminate 404 errors while maintaining
			identical visual appearance. The original library uses global variables and direct DOM manipulation,
			which may have compatibility issues with modern build tools.
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.demo-container {
		padding: 20px 15px;
		font-family: sans-serif;
		max-width: 100%;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #333;
		font-size: 1.5rem;
		margin-bottom: 20px;
	}

	.comparison {
		display: flex;
		flex-direction: column;
		gap: 30px;
		justify-content: center;
		margin: 20px 0;
		align-items: center;
	}

	.test-section {
		text-align: center;
		position: relative;
		width: 100%;
		max-width: 320px;
	}

	.test-section h2 {
		color: #444;
		margin-bottom: 8px;
		font-size: 1.1rem;
	}

	.test-section p {
		color: #666;
		margin-bottom: 15px;
		font-size: 13px;
	}

	.ripple-container {
		width: 100%;
		max-width: 280px;
		height: 280px;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		border: 2px solid #ddd;
		position: relative;
		margin: 0 auto 15px auto;
	}

	/* Desktop styles */
	@media (min-width: 768px) {
		.demo-container {
			padding: 40px;
			max-width: 1200px;
		}

		h1 {
			font-size: 2rem;
			margin-bottom: 30px;
		}

		.comparison {
			flex-direction: row;
			gap: 60px;
			margin: 40px 0;
		}

		.test-section {
			max-width: none;
		}

		.test-section h2 {
			font-size: 1.5rem;
			margin-bottom: 10px;
		}

		.test-section p {
			font-size: 14px;
			margin-bottom: 20px;
		}

		.ripple-container {
			width: 400px;
			height: 400px;
			max-width: none;
			margin: 0 auto 20px auto;
		}
	}

	button {
		padding: 12px 24px;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		touch-action: manipulation;
		min-height: 44px;
	}

	button:hover {
		background: #0052a3;
	}

	button:active {
		transform: translateY(1px);
	}

	.instructions {
		background: #f5f5f5;
		padding: 15px;
		border-radius: 8px;
		margin-top: 30px;
		font-size: 14px;
	}

	@media (min-width: 768px) {
		button {
			padding: 10px 20px;
			min-height: auto;
		}

		.instructions {
			padding: 20px;
			margin-top: 40px;
			font-size: inherit;
		}
	}

	.instructions h3 {
		margin-top: 0;
		color: #333;
		font-size: 1rem;
	}

	.instructions ul {
		margin: 8px 0;
		padding-left: 16px;
	}

	.instructions li {
		margin: 4px 0;
		color: #555;
		font-size: 13px;
		line-height: 1.4;
	}

	@media (min-width: 768px) {
		.instructions h3 {
			font-size: 1.2rem;
		}

		.instructions ul {
			margin: 10px 0;
			padding-left: 20px;
		}

		.instructions li {
			margin: 5px 0;
			font-size: 14px;
			line-height: 1.5;
		}
	}

	.note {
		margin-top: 20px;
		padding: 15px;
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 4px;
		color: #856404;
	}
</style>
