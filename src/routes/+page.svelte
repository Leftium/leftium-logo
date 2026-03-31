<script lang="ts">
	import { resolve } from '$app/paths';
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
	import { setAnimated } from '$lib/LeftiumLogo.svelte';
	let boundingBox: 'square' | 'default' | 'encircled' | 'cropped' = $state('default');
	let squircle = $state(true);

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
		<label class="checkbox-label">
			<input type="checkbox" bind:checked={squircle} />
			Squircle
		</label>
	</div>
	<div>
		<a href={resolve('/generate')}><b>App Logo Generator</b></a>
		&bull;
		<a href={resolve('/test')}>Test/Demos</a>
		&bull;
		<a href="https://github.com/Leftium/leftium-logo">Source Code</a>
	</div>

	<div class="logo-wrapper {boundingBox}">
		<LeftiumLogo size="calc(min(60svh, 60svw))" {boundingBox} {squircle}></LeftiumLogo>
	</div>
</center>

<style>
	:global(body) {
		--nc-content-width: 100vw;
	}

	center {
		div {
			margin: 20px 0;
		}
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: center;
		align-items: center;
	}

	.controls b {
		flex-basis: 100%;
		text-align: center;
		margin-bottom: 5px;
	}

	label {
		display: flex;
		align-items: first baseline;
		gap: 5px;
		flex: 0 0 120px;
		justify-content: flex-start;
		text-align: left;
		line-height: 1.2;
		margin-bottom: 0;
	}

	label input[type='radio'] {
		align-self: center;
	}

	.controls label.checkbox-label {
		flex-basis: auto;
		flex: 0 0 auto;
		align-items: center;
		gap: 5px;
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
