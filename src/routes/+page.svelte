<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';

	let boundingBox: 'square' | 'default' | 'encircled' | 'cropped' = $state('default');
</script>

<center>
	<div class="controls">
		<b>Bounding Box:</b>
		<label>
			<input type="radio" bind:group={boundingBox} value="square" />
			Square (tight)
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="default" />
			Default
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="cropped" />
			Cropped
		</label>
		<label>
			<input type="radio" bind:group={boundingBox} value="encircled" />
			Encircled (spacious)
		</label>
	</div>
	<div>
		View the <a href="https://github.com/Leftium/leftium-logo">source code</a> or
		<a href="/test">test pages</a>!
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
		gap: 20px;
		justify-content: center;
	}

	label {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	/* Add dashed border around logo for testing */
	.logo-wrapper {
		display: inline-block;
		border: 3px dashed red;
		aspect-ratio: 1;
	}

	/* Cropped mode - match ellipse aspect ratio */
	.logo-wrapper.cropped {
		aspect-ratio: 0.8906;
	}
</style>
