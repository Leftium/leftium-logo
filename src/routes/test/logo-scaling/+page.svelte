<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
	import { toggleAnimation } from '$lib/LeftiumLogo.svelte';
	import { onMount } from 'svelte';

	// Logo sizes to test
	const logoSizes = [50, 100, 200, 400, 800];

	let showScalingInfo = true;
	let showLigature = false;
	let logoRefs: { [key: number]: LeftiumLogo } = {};

	// Calculate the scaling parameters that LeftiumLogo uses internally
	function calculateScalingParams(elementSize: number) {
		// Resolution calculation: min(512, max(128, elementSize * 0.8))
		const resolution = Math.min(512, Math.max(128, elementSize * 0.8));

		// Drop radius scaling: Linear interpolation from 62px:2px to 800px:23.36px, capped at 20px
		const scaledDropRadius = Math.min(
			20,
			Math.max(2, 2 + ((elementSize - 62) / (800 - 62)) * 21.36)
		);

		// Wave propagation scaling: 2.0 at 500px down to 0.2 at 125px, clamped at 0.2
		const scaledWavePropagation = Math.max(
			0.2,
			Math.min(2.0, 2.0 - ((500 - elementSize) / (500 - 125)) * 1.5)
		);

		// Calculate percentages for comparison
		const dropRadiusPercent = ((scaledDropRadius / elementSize) * 100).toFixed(1);
		const wavePercent = ((scaledWavePropagation / 2.0) * 100).toFixed(1);

		return {
			resolution,
			dropRadius: scaledDropRadius,
			wavePropagation: scaledWavePropagation,
			dropRadiusPercent,
			wavePercent
		};
	}

	// Function to trigger manual drop on all logos
	function triggerManualDrop() {
		// The ripples library listens for mousedown events to create drops
		const rippleElements = document.querySelectorAll('.logo-test-item .ripples');
		console.log(`Found ${rippleElements.length} ripple elements`);

		rippleElements.forEach((element, index) => {
			if (element instanceof HTMLElement) {
				const rect = element.getBoundingClientRect();
				// Create a mousedown event at the center of the element
				const event = new MouseEvent('mousedown', {
					bubbles: true,
					cancelable: true,
					view: window,
					clientX: rect.left + rect.width / 2,
					clientY: rect.top + rect.height / 2
				});

				// Small delay between drops for visual effect
				setTimeout(() => {
					element.dispatchEvent(event);
				}, index * 50);
			}
		});
	}

	// Function to toggle animation on all logos - now uses global state!
	function toggleAllAnimations() {
		// Much simpler with global state - no DOM manipulation needed
		toggleAnimation();
	}

	onMount(() => {
		// Initial setup if needed
	});
</script>

<svelte:head>
	<title>LeftiumLogo Scaling Test</title>
</svelte:head>

<div class="test-container">
	<h1>LeftiumLogo Scaling Comparison</h1>
	<p class="description">
		This page compares the LeftiumLogo component at different sizes to validate the scaling
		algorithms for drop radius, wave propagation, and resolution.
	</p>

	<div class="instructions">
		<h3>Testing Instructions:</h3>
		<ul>
			<li><strong>Click any logo</strong> to create a ripple effect</li>
			<li><strong>Shift+Click any logo</strong> to toggle animation on/off</li>
			<li><strong>Manual Drop All</strong> creates ripples on all logos simultaneously</li>
			<li><strong>Toggle All Animations</strong> starts/stops all logo animations</li>
			<li>
				Observe how ripple size and wave speed scale proportionally across different logo sizes
			</li>
		</ul>

		<h3>Scaling Algorithm Details:</h3>
		<div class="algorithm-info">
			<div class="algorithm-section">
				<h4>Drop Radius Scaling</h4>
				<p>Linear interpolation: 62px→2px to 800px→23.36px (capped at 20px)</p>
				<code>Math.min(20, Math.max(2, 2 + ((size - 62) / (800 - 62)) * 21.36))</code>
			</div>
			<div class="algorithm-section">
				<h4>Wave Propagation Scaling</h4>
				<p>2.0 at 500px down to 0.2 at 125px (clamped at 0.2)</p>
				<code>Math.max(0.2, Math.min(2.0, 2.0 - ((500 - size) / (500 - 125)) * 1.5))</code>
			</div>
			<div class="algorithm-section">
				<h4>Resolution Optimization</h4>
				<p>Higher density for small sizes, performance cap for large sizes</p>
				<code>Math.min(512, Math.max(128, size * 0.8))</code>
			</div>
		</div>
	</div>

	<div class="controls">
		<button class="control-btn" on:click={triggerManualDrop}>Manual Drop All</button>
		<button class="control-btn" on:click={toggleAllAnimations}>Toggle All Animations</button>

		<label class="checkbox-label">
			<input type="checkbox" bind:checked={showScalingInfo} />
			Show Scaling Info
		</label>

		<label class="checkbox-label">
			<input type="checkbox" bind:checked={showLigature} />
			Show Ligature
		</label>
	</div>

	<!-- Main logo grid -->
	<div class="logo-grid">
		{#each logoSizes.slice(0, -1) as size}
			{@const scalingParams = calculateScalingParams(size)}
			<div class="logo-test-item {size >= 400 ? 'large-size' : 'small-size'}">
				<div class="logo-content">
					<div class="logo-info">
						<div class="size-label">{size}px</div>

						{#if showScalingInfo}
							<div class="scaling-info">
								<div class="param-row">
									<span class="param-label">Resolution:</span>
									<span class="param-value">{scalingParams.resolution}px</span>
								</div>
								<div class="param-row">
									<span class="param-label">Drop Radius:</span>
									<span class="param-value"
										>{scalingParams.dropRadius.toFixed(1)}px ({scalingParams.dropRadiusPercent}%)</span
									>
								</div>
								<div class="param-row">
									<span class="param-label">Wave Propagation:</span>
									<span class="param-value">{scalingParams.wavePropagation.toFixed(1)}x</span>
								</div>
							</div>
						{/if}
					</div>

					<div class="logo-wrapper" class:hide-ligature={!showLigature}>
						<LeftiumLogo
							bind:this={logoRefs[size]}
							size="{size}px"
							toggleAnimationWithShift={true}
							boundingBox="square"
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Large logo on its own row -->
	<div class="large-logo-row">
		{#each [800] as size}
			{@const scalingParams = calculateScalingParams(size)}
			<div class="logo-test-item large">
				<div class="logo-content">
					<div class="logo-info">
						<div class="size-label">{size}px</div>

						{#if showScalingInfo}
							<div class="scaling-info">
								<div class="param-row">
									<span class="param-label">Resolution:</span>
									<span class="param-value">{scalingParams.resolution}px</span>
								</div>
								<div class="param-row">
									<span class="param-label">Drop Radius:</span>
									<span class="param-value"
										>{scalingParams.dropRadius.toFixed(1)}px ({scalingParams.dropRadiusPercent}%)</span
									>
								</div>
								<div class="param-row">
									<span class="param-label">Wave Propagation:</span>
									<span class="param-value">{scalingParams.wavePropagation.toFixed(1)}x</span>
								</div>
							</div>
						{/if}
					</div>

					<div class="logo-wrapper" class:hide-ligature={!showLigature}>
						<LeftiumLogo
							bind:this={logoRefs[size]}
							size="{size}px"
							toggleAnimationWithShift={true}
							boundingBox="square"
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.test-container {
		padding: 20px;
		font-family: sans-serif;
		max-width: 1200px;
		margin: 0 auto;
		min-height: 100vh;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 10px;
	}

	.description {
		text-align: center;
		color: #666;
		margin-bottom: 30px;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.controls {
		display: flex;
		gap: 20px;
		align-items: center;
		justify-content: center;
		margin-bottom: 40px;
		flex-wrap: wrap;
	}

	.control-btn {
		padding: 10px 20px;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.control-btn:hover {
		background: #0052a3;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: #333;
		cursor: pointer;
	}

	.large-logo-row {
		display: flex;
		justify-content: center;
		margin-bottom: 40px;
		padding: 0;
	}

	.logo-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 35px;
		margin-bottom: 50px;
		align-items: start;
		justify-items: start;
		padding: 0;
	}

	.logo-test-item {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		padding: 20px;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		background: #fafafa;
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		overflow: visible;
		box-sizing: border-box;
	}

	.logo-test-item.large {
		max-width: 800px;
	}

	.logo-content {
		display: flex;
		align-items: flex-start;
		gap: 20px;
		width: 100%;
		overflow: visible;
	}

	.logo-info {
		flex-shrink: 0;
		min-width: 180px;
		max-width: 220px;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.size-label {
		font-size: 24px;
		font-weight: 600;
		color: #333;
		margin: 0;
	}

	.logo-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: visible;
		padding: 10px;
		position: relative;
		border-radius: 8px;
		min-width: 0; /* Allows flex item to shrink below content size */
	}

	/* Left-align logos at wider breakpoints for horizontal layout */
	@media (min-width: 769px) {
		.logo-wrapper {
			justify-content: flex-start;
		}
	}

	/* Hide the ligature element when checkbox is checked */
	.logo-wrapper.hide-ligature :global(.ligature) {
		display: none !important;
	}

	/* Also hide the shadow that outlines the ligature */
	.logo-wrapper.hide-ligature :global(.shadow) {
		display: none !important;
	}

	.scaling-info {
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 12px;
		font-size: 12px;
		width: fit-content;
		max-width: 100%;
	}

	.param-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.param-row:last-child {
		margin-bottom: 0;
	}

	.param-label {
		color: #666;
		font-weight: 500;
	}

	.param-value {
		color: #333;
		font-weight: 600;
		font-family: monospace;
	}

	.instructions {
		background: #f0f8ff;
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 25px;
		border: 1px solid #b8daff;
	}

	.instructions h3 {
		margin-top: 0;
		color: #004085;
		margin-bottom: 12px;
		font-size: 16px;
	}

	.instructions ul {
		margin: 0;
		padding-left: 20px;
	}

	.instructions li {
		margin: 6px 0;
		color: #004085;
		font-size: 14px;
	}

	.instructions h3:nth-child(3) {
		margin-top: 20px;
		color: #333;
		font-size: 16px;
	}

	.algorithm-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
	}

	.algorithm-section {
		background: white;
		padding: 15px;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.algorithm-section h4 {
		margin-top: 0;
		margin-bottom: 8px;
		color: #333;
		font-size: 14px;
	}

	.algorithm-section p {
		margin: 0 0 8px 0;
		font-size: 12px;
		color: #666;
	}

	.algorithm-section code {
		display: block;
		background: #f8f8f8;
		padding: 8px;
		border-radius: 3px;
		font-size: 11px;
		color: #333;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.controls {
			flex-direction: column;
			gap: 15px;
		}

		.algorithm-info {
			grid-template-columns: 1fr;
		}

		.test-container {
			padding: 15px;
		}

		.logo-grid,
		.large-logo-row {
			padding: 0 10px;
		}

		/* Hide large logos when they won't fit to prevent horizontal scrolling */
		@media (max-width: 440px) {
			.logo-test-item.large-size,
			.large-logo-row {
				display: none;
			}
		}

		@media (max-width: 768px) {
			.controls {
				flex-direction: column;
				gap: 15px;
			}

			.algorithm-info {
				grid-template-columns: 1fr;
			}

			.test-container {
				padding: 15px;
			}

			.logo-grid,
			.large-logo-row {
				padding: 0 10px;
			}
		}
	}

	@media (max-width: 700px) {
		.logo-grid {
			grid-template-columns: 1fr;
			gap: 30px;
		}

		.logo-test-item {
			min-height: 350px;
		}

		.logo-test-item.large {
			min-height: 400px;
		}
	}

	@media (max-width: 768px) {
		.controls {
			flex-direction: column;
			gap: 15px;
		}

		.algorithm-info {
			grid-template-columns: 1fr;
		}

		.test-container {
			padding: 15px;
		}

		.logo-grid,
		.large-logo-row {
			padding: 0 10px;
		}

		.logo-content {
			flex-direction: column;
			gap: 20px;
			align-items: center;
		}

		.logo-info {
			min-width: auto;
			max-width: 100%;
			width: auto;
			text-align: center;
		}

		.scaling-info {
			width: 100%;
			max-width: 300px;
		}

		.size-label {
			font-size: 20px;
		}

		.logo-wrapper {
			min-height: 150px;
		}
	}
</style>
