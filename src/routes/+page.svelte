<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';

	let boundingBox: 'square' | 'default' | 'encircled' = $state('default');
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
			<input type="radio" bind:group={boundingBox} value="encircled" />
			Encircled (spacious)
		</label>
	</div>
	<div>View the <a href="https://github.com/Leftium/leftium-logo">source code</a>!</div>

	<LeftiumLogo size="calc(min(60svh, 60svw))" {boundingBox}></LeftiumLogo>
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
</style>
