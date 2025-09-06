<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
	import { setAnimated } from '$lib/LeftiumLogo.svelte';
	let boundingBox: 'square' | 'default' | 'encircled' | 'cropped' = $state('default');

	// Start animated on main page
	setAnimated(true);
</script>

<center>
	<div class="controls">
		<b>Bounding Box:</b>
		<label>
			<input type="radio" bind:group={boundingBox} value="square" />
			<div>Square<br />(tight)</div>
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="default" />
			<div>Default</div>
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="cropped" />
			<div>Cropped<br /><span style="white-space: nowrap">(non-square)</span></div>
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="encircled" />
			<div>Encircled<br />(roomy)</div>
		</label>
	</div>
	<div>
		Explore the <a href="/test">test/demos</a> and
		<a href="https://github.com/Leftium/leftium-logo">source code</a>!
	</div>

	<div class="logo-wrapper {boundingBox}">
		<LeftiumLogo size="calc(min(60svh, 60svw))" {boundingBox}></LeftiumLogo>
	</div>
</center>

<style>
	center {
		font-family: sans-serif;
		box-sizing: border-box;

		div {
			margin: 20px 0;
		}
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: center;
		align-items: flex-start;
	}

	.controls b {
		flex-basis: 100%;
		text-align: center;
		margin-bottom: 5px;
	}

	label {
		display: flex;
		align-items: baseline;
		gap: 5px;
		flex: 0 0 120px;
		justify-content: flex-start;
		text-align: left;
		line-height: 1.2;
	}

	label input[type='radio'] {
		margin-top: 0.1em;
	}

	label div {
		margin: 0;
	}

	/* Add dashed border around logo for testing */
	.logo-wrapper {
		display: inline-block;
		border: 3px dashed red;
		line-height: 0; /* Remove baseline spacing */
	}
</style>
