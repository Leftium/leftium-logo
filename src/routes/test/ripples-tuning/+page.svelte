<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripples } from '$lib/webgl-ripples/webgl-ripples.js';
	import logoSquare from '$lib/assets/logo-parts/square.svg?inline';

	let containers: { [key: string]: HTMLDivElement | null } = {
		large: null,
		medium: null,
		small: null,
		tiny: null
	};
	let ripplesInstances: { [key: string]: Ripples | null } = {};
	let autoDropInterval: number | null = null;

	// Tunable parameters
	let wavePropagation = 2.0;
	let dampening = 0.997;
	let perturbance = 0.04;
	let dropRadius = 12;

	// Control parameters
	let dropFrequency = 3000;
	let isPaused = false;
	let isAutoDropping = true;

	// Preset configurations
	const presets = {
		Classic: { wavePropagation: 2.0, dampening: 0.995, perturbance: 0.03, dropRadius: 20 },
		Sharp: { wavePropagation: 2.0, dampening: 0.98, perturbance: 0.05, dropRadius: 15 },
		Gentle: { wavePropagation: 1.5, dampening: 0.999, perturbance: 0.02, dropRadius: 25 },
		Aggressive: { wavePropagation: 2.0, dampening: 0.97, perturbance: 0.07, dropRadius: 10 },
		Smooth: { wavePropagation: 1.8, dampening: 0.9975, perturbance: 0.015, dropRadius: 30 }
	};

	function applyPreset(preset: keyof typeof presets) {
		const config = presets[preset];
		// Update parameters from preset
		wavePropagation = config.wavePropagation;
		dampening = config.dampening;
		perturbance = config.perturbance;
		dropRadius = config.dropRadius;
		recreateRipples();

		// Auto-drop to demonstrate the preset
		setTimeout(() => {
			manualDrop();
		}, 100);
	}

	function updateRipples() {
		Object.values(ripplesInstances).forEach((ripples) => {
			if (ripples) {
				ripples.set('perturbance', perturbance);
				ripples.set('dropRadius', dropRadius);
			}
		});
	}

	function recreateRipples() {
		// Destroy all existing instances
		Object.values(ripplesInstances).forEach((ripples) => {
			if (ripples) {
				ripples.destroy();
			}
		});
		ripplesInstances = {};

		// Create new instances for each container
		const sizes = { large: 512, medium: 256, small: 128, tiny: 64 };
		Object.entries(containers).forEach(([size, container]) => {
			if (container) {
				console.log(
					`Creating ripples for ${size} (${container.offsetWidth}x${container.offsetHeight})`
				);
				ripplesInstances[size] = new Ripples(container, {
					resolution: sizes[size] || 256,
					interactive: true,
					wavePropagation,
					dampening,
					perturbance,
					dropRadius
				});
			} else {
				console.log(`No container found for ${size}`);
			}
		});
	}

	function togglePause() {
		Object.values(ripplesInstances).forEach((ripples) => {
			if (ripples) {
				if (isPaused) {
					ripples.play();
				} else {
					ripples.pause();
				}
			}
		});
		isPaused = !isPaused;
	}

	function resetRipples() {
		Object.values(ripplesInstances).forEach((ripples) => {
			if (ripples) {
				ripples.reset();
			}
		});
	}

	function toggleAutoDrop() {
		if (isAutoDropping) {
			if (autoDropInterval) {
				clearInterval(autoDropInterval);
				autoDropInterval = null;
			}
			isAutoDropping = false;
		} else {
			startAutoDrop();
			isAutoDropping = true;
		}
	}

	function startAutoDrop() {
		if (autoDropInterval) {
			clearInterval(autoDropInterval);
		}

		autoDropInterval = setInterval(() => {
			if (!isPaused) {
				Object.entries(ripplesInstances).forEach(([size, ripples]) => {
					const container = containers[size];
					if (ripples && container) {
						const x = Math.random() * container.offsetWidth;
						const y = Math.random() * container.offsetHeight;
						const radius = dropRadius + Math.random() * dropRadius * 0.5;
						const strength = 0.05 + Math.random() * 0.05;
						ripples.drop(x, y, radius, strength);
					}
				});
			}
		}, dropFrequency);
	}

	onMount(() => {
		recreateRipples();
		startAutoDrop();

		return () => {
			if (autoDropInterval) {
				clearInterval(autoDropInterval);
			}
			Object.values(ripplesInstances).forEach((ripples) => {
				if (ripples) {
					ripples.destroy();
				}
			});
		};
	});

	function manualDrop() {
		Object.entries(ripplesInstances).forEach(([size, ripples]) => {
			const container = containers[size];
			if (ripples && container) {
				const x = container.offsetWidth / 2;
				const y = container.offsetHeight / 2;
				ripples.drop(x, y, dropRadius * 1.5, 0.12);
			}
		});
	}
</script>

<div class="demo-container">
	<h1>WebGL Ripples - Tuning Parameters</h1>

	<div class="logos-section">
		<div class="logo-containers">
			<div class="logo-item">
				<div
					class="ripple-container large"
					bind:this={containers.large}
					style:background-image={`url("${logoSquare}")`}
				></div>
				<span class="size-label">500px</span>
			</div>

			<div class="logo-item">
				<div
					class="ripple-container medium"
					bind:this={containers.medium}
					style:background-image={`url("${logoSquare}")`}
				></div>
				<span class="size-label">250px</span>
			</div>

			<div class="logo-item">
				<div
					class="ripple-container small"
					bind:this={containers.small}
					style:background-image={`url("${logoSquare}")`}
				></div>
				<span class="size-label">125px</span>
			</div>

			<div class="logo-item">
				<div
					class="ripple-container tiny"
					bind:this={containers.tiny}
					style:background-image={`url("${logoSquare}")`}
				></div>
				<span class="size-label">62px</span>
			</div>
		</div>
	</div>

	<div class="controls">
		<h2>Animation Controls</h2>

		<div class="control-group">
			<label>
				Drop Frequency: {dropFrequency}ms
				<input type="range" min="500" max="5000" step="100" bind:value={dropFrequency} />
			</label>
		</div>

		<div class="control-buttons">
			<button on:click={manualDrop} class="manual-btn">Manual Drop</button>
			<button on:click={togglePause} class:active={isPaused}>
				{isPaused ? 'Resume' : 'Pause'}
			</button>
			<button on:click={resetRipples} class="reset-btn">Reset</button>
			<button on:click={toggleAutoDrop} class:active={isAutoDropping}>
				{isAutoDropping ? 'Stop Auto' : 'Start Auto'}
			</button>
		</div>

		<h2>Fine Tuning</h2>

		<div class="control-group">
			<label>
				Wave Speed: {wavePropagation.toFixed(1)}
				<span class="hint">(propagation speed)</span>
				<input
					type="range"
					bind:value={wavePropagation}
					min="0.1"
					max="2.0"
					step="0.1"
					on:change={recreateRipples}
				/>
			</label>
		</div>

		<div class="control-group">
			<label>
				Dampening: {dampening.toFixed(3)}
				<span class="hint">(0.999 = long lasting)</span>
				<input
					type="range"
					bind:value={dampening}
					min="0.99"
					max="0.999"
					step="0.001"
					on:change={recreateRipples}
				/>
			</label>
		</div>

		<div class="control-group">
			<label>
				Perturbance: {perturbance.toFixed(2)}
				<span class="hint">(distortion amount)</span>
				<input
					type="range"
					min="0.01"
					max="1.0"
					step="0.01"
					bind:value={perturbance}
					on:input={updateRipples}
				/>
			</label>
		</div>

		<div class="control-group">
			<label>
				Drop Radius: {dropRadius}
				<span class="hint">(initial ripple size)</span>
				<input
					type="range"
					bind:value={dropRadius}
					min="2"
					max="40"
					step="1"
					on:change={recreateRipples}
				/>
			</label>
		</div>

		<h2>Presets</h2>
		<div class="preset-buttons">
			{#each Object.keys(presets) as key (key)}
				<button on:click={() => applyPreset(key)}>{key}</button>
			{/each}
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.demo-container {
		padding: 20px;
		font-family: sans-serif;
		max-width: 1400px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 30px;
	}

	h2 {
		color: #555;
		margin: 20px 0 15px;
		font-size: 18px;
	}

	.logos-section {
		margin-bottom: 40px;
	}

	.logo-containers {
		display: flex;
		gap: 30px;
		justify-content: center;
		align-items: flex-end;
		margin-bottom: 30px;
		flex-wrap: wrap;
	}

	.logo-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.size-label {
		font-size: 12px;
		color: #666;
		font-weight: 500;
	}

	.ripple-container {
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		border: 2px solid #ddd;
		position: relative;
	}

	.ripple-container.large {
		width: 500px;
		height: 500px;
	}

	.ripple-container.medium {
		width: 250px;
		height: 250px;
	}

	.ripple-container.small {
		width: 125px;
		height: 125px;
	}

	.ripple-container.tiny {
		width: 62px;
		height: 62px;
	}

	.controls {
		max-width: 800px;
		margin: 0 auto;
	}

	.preset-buttons {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		margin-bottom: 30px;
	}

	.preset-buttons button {
		padding: 10px;
		background: #f0f0f0;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.preset-buttons button:hover {
		background: #e0e0e0;
	}

	.control-group {
		margin-bottom: 20px;
	}

	.control-group label {
		display: block;
		color: #333;
		font-size: 14px;
		font-weight: 500;
	}

	.hint {
		color: #888;
		font-size: 12px;
		font-weight: normal;
		margin-left: 8px;
	}

	input[type='range'] {
		width: 100%;
		margin-top: 8px;
	}

	/* Custom range slider styles */
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		background: #ddd;
		outline: none;
		border-radius: 3px;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: #0066cc;
		cursor: pointer;
		border-radius: 50%;
	}

	input[type='range']::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #0066cc;
		cursor: pointer;
		border-radius: 50%;
		border: none;
	}

	.control-buttons {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 20px;
	}

	.control-buttons button {
		padding: 8px 12px;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.control-buttons button:hover {
		background: #0052a3;
	}

	.control-buttons button.active {
		background: #28a745;
	}

	.control-buttons button.active:hover {
		background: #218838;
	}

	.control-buttons button.reset-btn {
		background: #dc3545;
	}

	.control-buttons button.reset-btn:hover {
		background: #c82333;
	}

	.manual-btn {
		background: #6f42c1;
	}

	.manual-btn:hover {
		background: #5a2d91;
	}

	/* Hide 500px logo when it won't fit to prevent horizontal scrolling */
	@media (max-width: 540px) {
		.ripple-container.large,
		.ripple-container.large + .size-label {
			display: none;
		}
	}
</style>
