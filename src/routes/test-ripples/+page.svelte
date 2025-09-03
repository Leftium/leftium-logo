<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripples as RipplesModified } from '$lib/webgl-ripples/webgl-ripples.js';
	import { Ripples as RipplesOriginal } from '$lib/webgl-ripples/webgl-ripples-orig.js';
	import logoSquare from '$lib/assets/logo-parts/square.webp';

	let modifiedContainer: HTMLDivElement;
	let originalContainer: HTMLDivElement;
	let ripplesModified: RipplesModified | null = null;
	let ripplesOriginal: RipplesOriginal | null = null;

	onMount(() => {
		// Initialize modified version
		if (modifiedContainer) {
			try {
				ripplesModified = new RipplesModified(modifiedContainer, {
					resolution: 256,
					dropRadius: 20,
					perturbance: 0.03,
					interactive: true
				});
			} catch (e) {
				console.error('Error creating modified ripples:', e);
			}
		}

		// Initialize original version
		if (originalContainer) {
			try {
				ripplesOriginal = new RipplesOriginal(originalContainer, {
					resolution: 256,
					dropRadius: 20,
					perturbance: 0.03,
					interactive: true
				});
			} catch (e) {
				console.error('Error creating original ripples:', e);
			}
		}

		// Cleanup on unmount
		return () => {
			if (ripplesModified) {
				ripplesModified.destroy();
			}
			if (ripplesOriginal) {
				ripplesOriginal.destroy();
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
		if (ripplesOriginal && originalContainer) {
			const x = originalContainer.offsetWidth / 2;
			const y = originalContainer.offsetHeight / 2;
			ripplesOriginal.drop(x, y, 40, 0.08);
		}
	}
</script>

<div class="demo-container">
	<h1>WebGL Ripples Comparison</h1>

	<div class="comparison">
		<div class="test-section">
			<h2>Modified Version</h2>
			<p>Handles transparent borders, uses contentBounds</p>
			<div
				class="ripple-container"
				bind:this={modifiedContainer}
				style:background-image="url({logoSquare})"
			></div>
			<button onclick={dropModified}>Manual Drop</button>
		</div>

		<div class="test-section">
			<h2>Original Version</h2>
			<p>Standard implementation</p>
			<div
				class="ripple-container"
				bind:this={originalContainer}
				style:background-image="url({logoSquare})"
			></div>
			<button onclick={dropOriginal}>Manual Drop</button>
		</div>
	</div>

	<div class="instructions">
		<h3>Instructions:</h3>
		<ul>
			<li>Move mouse over the images to create small ripples</li>
			<li>Click on the images to create larger ripples</li>
			<li>Use the "Manual Drop" buttons to create centered drops</li>
			<li>Compare how each version handles the ripple effects</li>
		</ul>
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
</style>
