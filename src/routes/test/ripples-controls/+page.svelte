<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripples } from '$lib/webgl-ripples/webgl-ripples.js';
	import logoSquare from '$lib/assets/logo-parts/square.webp';

	let container: HTMLDivElement;
	let ripples: Ripples | null = null;
	let autoDropInterval: number | null = null;
	let dropFrequency = 1000; // milliseconds
	let isPaused = false;
	let isAutoDropping = false;

	onMount(() => {
		if (container) {
			try {
				ripples = new Ripples(container, {
					resolution: 256,
					dropRadius: 20,
					perturbance: 0.03,
					interactive: true
				});
			} catch (e) {
				console.error('Error creating ripples:', e);
			}
		}

		return () => {
			if (ripples) {
				ripples.destroy();
			}
			if (autoDropInterval) {
				clearInterval(autoDropInterval);
			}
		};
	});

	function togglePause() {
		if (!ripples) return;

		if (isPaused) {
			ripples.play();
			isPaused = false;
		} else {
			ripples.pause();
			isPaused = true;
		}
	}

	function resetRipples() {
		if (ripples) {
			ripples.reset();
		}
	}

	function manualDrop() {
		if (ripples && container) {
			const x = Math.random() * container.offsetWidth;
			const y = Math.random() * container.offsetHeight;
			ripples.drop(x, y, 40, 0.08);
		}
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
			if (ripples && container && !isPaused) {
				const x = Math.random() * container.offsetWidth;
				const y = Math.random() * container.offsetHeight;
				const radius = 20 + Math.random() * 30;
				const strength = 0.03 + Math.random() * 0.05;
				ripples.drop(x, y, radius, strength);
			}
		}, dropFrequency);
	}

	function updateFrequency() {
		if (isAutoDropping) {
			startAutoDrop();
		}
	}

	$: (dropFrequency, updateFrequency());
</script>

<div class="demo-container">
	<h1>Ripple Controls Test</h1>

	<div class="controls">
		<div class="control-group">
			<label for="frequency">Drop Frequency: {dropFrequency}ms</label>
			<input
				id="frequency"
				type="range"
				min="100"
				max="3000"
				step="100"
				bind:value={dropFrequency}
			/>
		</div>

		<div class="control-group">
			<button onclick={togglePause} class:active={isPaused}>
				{isPaused ? 'Resume' : 'Pause'} Ripples
			</button>
		</div>

		<div class="control-group">
			<button onclick={resetRipples} class="reset-btn">Reset Ripples</button>
		</div>

		<div class="control-group">
			<button onclick={toggleAutoDrop} class:active={isAutoDropping}>
				{isAutoDropping ? 'Stop' : 'Start'} Auto Drops
			</button>
		</div>

		<div class="control-group">
			<button onclick={manualDrop} class="manual-btn">Manual Drop</button>
		</div>
	</div>

	<div class="ripple-demo">
		<div
			class="ripple-container"
			bind:this={container}
			style:background-image="url({logoSquare})"
		></div>
	</div>

	<div class="instructions">
		<h3>Controls:</h3>
		<ul>
			<li><strong>Frequency Slider:</strong> Adjust auto-drop timing (100ms - 3000ms)</li>
			<li><strong>Pause/Resume:</strong> Stop/start all ripple animations</li>
			<li><strong>Reset:</strong> Clear all existing ripples</li>
			<li><strong>Auto Drops:</strong> Toggle automatic random drops</li>
			<li><strong>Manual Drop:</strong> Create single random drop</li>
			<li><strong>Interactive:</strong> Move mouse over image or click for ripples</li>
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
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 30px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		justify-content: center;
		margin-bottom: 30px;
		padding: 20px;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.control-group label {
		font-size: 14px;
		font-weight: 500;
		color: #555;
		text-align: center;
	}

	input[type='range'] {
		width: 150px;
		height: 6px;
		border-radius: 3px;
		background: #ddd;
		outline: none;
		-webkit-appearance: none;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #0066cc;
		cursor: pointer;
	}

	input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #0066cc;
		cursor: pointer;
		border: none;
	}

	button {
		padding: 10px 16px;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
		min-width: 100px;
	}

	button:hover {
		background: #0052a3;
		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0);
	}

	button.active {
		background: #28a745;
	}

	button.active:hover {
		background: #218838;
	}

	button.reset-btn {
		background: #dc3545;
	}

	button.reset-btn:hover {
		background: #c82333;
	}

	button.manual-btn {
		background: #6f42c1;
	}

	button.manual-btn:hover {
		background: #5a2d91;
	}

	.ripple-demo {
		display: flex;
		justify-content: center;
		margin-bottom: 30px;
	}

	.ripple-container {
		width: 500px;
		height: 500px;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		border: 3px solid #ddd;
		border-radius: 8px;
		position: relative;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.instructions {
		background: #f5f5f5;
		padding: 20px;
		border-radius: 8px;
		border-left: 4px solid #0066cc;
	}

	.instructions h3 {
		margin-top: 0;
		color: #333;
		margin-bottom: 15px;
	}

	.instructions ul {
		margin: 0;
		padding-left: 20px;
	}

	.instructions li {
		margin: 8px 0;
		color: #555;
		line-height: 1.4;
	}

	.instructions strong {
		color: #333;
	}
</style>
