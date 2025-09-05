<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
	import { dev } from '$app/environment';

	let clickCount = $state(0);
	let lastEventType = $state('');
</script>

<svelte:head>
	<title>LeftiumLogo onClick Callback Test</title>
</svelte:head>

<div class="test-container">
	<h1>LeftiumLogo onClick Callback Test</h1>

	<div class="demo-section">
		<h2>Logo with onClick Callback</h2>
		<p>
			Click the logo to see the callback in action. It will prevent default and stop propagation.
		</p>

		<div class="logo-wrapper">
			<LeftiumLogo
				animated={!dev}
				boundingBox="square"
				size="200px"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					clickCount++;
					lastEventType = event.type;
					console.log('Logo clicked!', { event, clickCount });
				}}
			/>
		</div>

		<div class="stats">
			<p><strong>Clicks:</strong> {clickCount}</p>
			<p><strong>Last Event:</strong> {lastEventType}</p>
		</div>
	</div>

	<div class="demo-section">
		<h2>Without Callback (for comparison)</h2>
		<p>This logo doesn't have the onClick callback - it uses the default behavior.</p>

		<div class="logo-wrapper">
			<LeftiumLogo animated={!dev} boundingBox="square" size="200px" />
		</div>
	</div>

	<div class="instructions">
		<h3>Test Instructions:</h3>
		<ul>
			<li>Click the first logo - it should increment the counter and log to console</li>
			<li>Click the second logo - it should toggle animation normally</li>
			<li>Both logos should still toggle their animation state when clicked</li>
			<li>The callback runs before the internal animation toggle logic</li>
		</ul>
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.test-container {
		padding: 20px;
		font-family: sans-serif;
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 30px;
	}

	.demo-section {
		margin-bottom: 40px;
		padding: 20px;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		background: #fafafa;
	}

	h2 {
		color: #444;
		margin-bottom: 10px;
	}

	p {
		color: #666;
		margin-bottom: 20px;
	}

	.logo-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		background: white;
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.stats {
		background: white;
		padding: 15px;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.stats p {
		margin: 5px 0;
		font-family: monospace;
	}

	.instructions {
		background: #f0f8ff;
		padding: 20px;
		border-radius: 8px;
		border: 1px solid #b8daff;
	}

	.instructions h3 {
		margin-top: 0;
		color: #004085;
	}

	.instructions ul {
		margin: 10px 0;
		padding-left: 20px;
	}

	.instructions li {
		margin: 5px 0;
		color: #004085;
	}
</style>
