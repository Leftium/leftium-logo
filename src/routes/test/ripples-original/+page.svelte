<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripples as RipplesModified } from '$lib/webgl-ripples/webgl-ripples.js';
	import logoSquare from '$lib/assets/logo-parts/square.svg?inline';

	let modifiedContainer: HTMLDivElement;
	let originalContainer: HTMLDivElement;
	let ripplesModified: RipplesModified | null = null;
	let originalRipples: any = null;

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
			if (typeof window !== 'undefined' && (window as any).Ripples && originalContainer) {
				try {
					const Ripples = (window as any).Ripples;
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
			<div class="status">✅ Working</div>
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
			<div class="status" id="original-status">⏳ Loading...</div>
		</div>
	</div>

	<div class="instructions">
		<h3>Test Details:</h3>
		<ul>
			<li>Left: Modified ES module version with SSR safety and transparent border handling</li>
			<li>Right: Completely unmodified main.js loaded via script tag</li>
			<li>Both use the same configuration (resolution: 256, dropRadius: 20, perturbance: 0.03)</li>
			<li>Check browser console for any errors from the original version</li>
		</ul>

		<div class="note">
			<strong>Note:</strong> The original main.js uses global variables and direct DOM manipulation.
			It may have issues with modern build tools and SSR environments.
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.demo-container {
		padding: 40px;
		font-family: sans-serif;
		max-width: 1200px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #333;
	}

	.comparison {
		display: flex;
		gap: 60px;
		justify-content: center;
		margin: 40px 0;
		flex-wrap: wrap;
	}

	.test-section {
		text-align: center;
		position: relative;
	}

	.test-section h2 {
		color: #444;
		margin-bottom: 10px;
	}

	.test-section p {
		color: #666;
		margin-bottom: 20px;
		font-size: 14px;
	}

	.ripple-container {
		width: 400px;
		height: 400px;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		border: 2px solid #ddd;
		position: relative;
		margin-bottom: 20px;
	}

	button {
		padding: 10px 20px;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	button:hover {
		background: #0052a3;
	}

	button:active {
		transform: translateY(1px);
	}

	.status {
		margin-top: 10px;
		font-weight: bold;
		color: #28a745;
	}

	.instructions {
		background: #f5f5f5;
		padding: 20px;
		border-radius: 8px;
		margin-top: 40px;
	}

	.instructions h3 {
		margin-top: 0;
		color: #333;
	}

	.instructions ul {
		margin: 10px 0;
		padding-left: 20px;
	}

	.instructions li {
		margin: 5px 0;
		color: #555;
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
