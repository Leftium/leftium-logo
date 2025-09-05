<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
	import { toggleAnimation, setAnimated } from '$lib/LeftiumLogo.svelte';
	import { dev } from '$app/environment';

	let clickCount = $state(0);
	let manualDropCount = $state(0);

	// Override default to start animated for demo purposes
	setAnimated(true);

	function handleGlobalToggle() {
		toggleAnimation();
		clickCount++;
	}

	function triggerManualDropOnAll() {
		// Create drops on all ripple elements simultaneously
		const rippleElements = document.querySelectorAll('.ripples');
		console.log(`Triggering drops on ${rippleElements.length} logos`);

		rippleElements.forEach((element, index) => {
			if (element instanceof HTMLElement) {
				const rect = element.getBoundingClientRect();
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
				}, index * 25);
			}
		});

		manualDropCount++;
	}
</script>

<svelte:head>
	<title>Synchronized LeftiumLogo Animation Test</title>
</svelte:head>

<div class="test-container">
	<h1>Synchronized LeftiumLogo Animation</h1>
	<p class="description">
		All LeftiumLogo instances now share a single global animation state. Click any logo or use the
		controls below to affect ALL logos simultaneously!
	</p>

	<div class="global-controls">
		<h2>Global Animation Controls</h2>
		<div class="control-buttons">
			<button onclick={handleGlobalToggle} class="toggle-btn"> Toggle All </button>
			<button onclick={triggerManualDropOnAll} class="drop-btn"> Manual Drop All </button>
		</div>

		<div class="stats">
			<p><strong>Global Toggles:</strong> {clickCount}</p>
			<p><strong>Manual Drops:</strong> {manualDropCount}</p>
		</div>
	</div>

	<div class="logo-grid">
		<div class="logo-section">
			<h3>Different Sizes</h3>
			<div class="size-demos">
				<div class="logo-item">
					<span class="label">Large (300px)</span>
					<LeftiumLogo size="300px" boundingBox="square" />
				</div>
				<div class="logo-item">
					<span class="label">Medium (200px)</span>
					<LeftiumLogo size="200px" boundingBox="square" />
				</div>
				<div class="logo-item">
					<span class="label">Small (100px)</span>
					<LeftiumLogo size="100px" boundingBox="square" />
				</div>
				<div class="logo-item">
					<span class="label">Tiny (50px)</span>
					<LeftiumLogo size="50px" boundingBox="square" />
				</div>
			</div>
		</div>

		<div class="logo-section">
			<h3>Different Bounding Boxes</h3>
			<div class="bounding-demos">
				<div class="logo-item">
					<span class="label">Square</span>
					<LeftiumLogo size="150px" boundingBox="square" />
				</div>
				<div class="logo-item">
					<span class="label">Default</span>
					<LeftiumLogo size="150px" boundingBox="default" />
				</div>
				<div class="logo-item">
					<span class="label">Cropped</span>
					<LeftiumLogo size="150px" boundingBox="cropped" />
				</div>
				<div class="logo-item">
					<span class="label">Encircled</span>
					<LeftiumLogo size="150px" boundingBox="encircled" />
				</div>
			</div>
		</div>

		<div class="logo-section">
			<h3>Custom onClick Callbacks</h3>
			<div class="callback-demos">
				<div class="logo-item">
					<span class="label">Prevents Default</span>
					<LeftiumLogo
						size="120px"
						boundingBox="square"
						onClick={(event) => {
							event.preventDefault();
							console.log('Prevented default on logo click');
						}}
					/>
				</div>
				<div class="logo-item">
					<span class="label">Logs to Console</span>
					<LeftiumLogo
						size="120px"
						boundingBox="square"
						onClick={(event) => {
							console.log('Custom callback executed!', {
								type: event.type
							});
						}}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="instructions">
		<h3>Test Instructions:</h3>
		<ul>
			<li><strong>Click any logo</strong> - All logos will toggle animation state together</li>
			<li><strong>Use global controls</strong> - Buttons affect all logos simultaneously</li>
			<li><strong>Manual Drop All</strong> - Creates ripples on all logos with a wave effect</li>
			<li>
				<strong>Check browser console</strong> - Some logos have custom onClick callbacks that log
			</li>
			<li><strong>Notice perfect synchronization</strong> - All animations start/stop together</li>
		</ul>

		<div class="technical-note">
			<h4>Technical Implementation:</h4>
			<p>
				All LeftiumLogo instances now share a simple variable and control functions exported from
				the component's module. This eliminates the need for DOM event coordination and provides
				true reactive synchronization across all instances.
			</p>
		</div>
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

	.global-controls {
		background: #f0f8ff;
		padding: 20px;
		border-radius: 8px;
		margin-bottom: 40px;
		border: 1px solid #b8daff;
	}

	.global-controls h2 {
		margin-top: 0;
		color: #004085;
		margin-bottom: 15px;
	}

	.control-buttons {
		display: flex;
		gap: 15px;
		flex-wrap: wrap;
		margin-bottom: 20px;
		justify-content: center;
	}

	.control-buttons button {
		padding: 12px 20px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.toggle-btn {
		background: #6f42c1;
		color: white;
	}

	.toggle-btn:hover {
		background: #5a2d91;
		transform: translateY(-1px);
	}

	.drop-btn {
		background: #0066cc;
		color: white;
	}

	.drop-btn:hover {
		background: #0052a3;
		transform: translateY(-1px);
	}

	.stats {
		background: white;
		padding: 15px;
		border-radius: 4px;
		border: 1px solid #ddd;
		text-align: center;
	}

	.stats p {
		margin: 5px 0;
		font-family: monospace;
		color: #333;
	}

	.logo-grid {
		display: grid;
		gap: 40px;
		margin-bottom: 40px;
	}

	.logo-section {
		background: #fafafa;
		padding: 25px;
		border-radius: 8px;
		border: 2px solid #e0e0e0;
	}

	.logo-section h3 {
		margin-top: 0;
		color: #333;
		text-align: center;
		margin-bottom: 20px;
	}

	.size-demos {
		display: flex;
		gap: 30px;
		justify-content: center;
		align-items: flex-start;
		flex-wrap: wrap;
	}

	.bounding-demos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 30px;
		justify-items: center;
	}

	.callback-demos {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		justify-items: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.logo-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
		padding: 15px;
		background: white;
		border-radius: 6px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.callback-demos .logo-item {
		padding: 20px 25px;
	}

	.label {
		font-size: 14px;
		font-weight: 600;
		color: #555;
		text-align: center;
	}

	.instructions {
		background: #f8f9fa;
		padding: 25px;
		border-radius: 8px;
		border: 1px solid #dee2e6;
	}

	.instructions h3 {
		margin-top: 0;
		color: #495057;
		margin-bottom: 15px;
	}

	.instructions ul {
		margin: 15px 0;
		padding-left: 20px;
	}

	.instructions li {
		margin: 8px 0;
		color: #495057;
		line-height: 1.4;
	}

	.technical-note {
		margin-top: 20px;
		padding: 15px;
		background: #e9ecef;
		border-radius: 4px;
		border-left: 4px solid #6f42c1;
	}

	.technical-note h4 {
		margin-top: 0;
		margin-bottom: 10px;
		color: #495057;
	}

	.technical-note p {
		margin: 0;
		color: #6c757d;
		line-height: 1.4;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.control-buttons {
			flex-direction: column;
			align-items: center;
		}

		.size-demos {
			flex-direction: column;
			align-items: center;
		}

		.bounding-demos,
		.callback-demos {
			grid-template-columns: 1fr;
		}

		.test-container {
			padding: 15px;
		}
	}
</style>
