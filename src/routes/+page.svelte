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
		<a href={resolve('/logo')}><b>App Logo Generator</b></a>
		&bull;
		<a href={resolve('/logo-leftium')}><b>Leftium Logo Generator</b></a>
		&bull;
		<a href={resolve('/test')}>Test/Demos</a>
		&bull;
		<a href="https://github.com/Leftium/leftium-logo">Source Code</a>
	</div>

	<div class="logo-wrapper {boundingBox}">
		<LeftiumLogo size="calc(min(60svh, 60svw))" {boundingBox} {squircle}></LeftiumLogo>
		{#if boundingBox === 'encircled'}
			<div class="circle-guide"></div>
		{/if}
	</div>
</center>

<style>
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
		position: relative;
		border: 3px dashed red;
		line-height: 0; /* Remove baseline spacing */
	}

	.circle-guide {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		border: 2px dashed green;
		border-radius: 50%;
		pointer-events: none;
		z-index: 10;
		box-sizing: border-box;
	}
</style>
