<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
</script>

<div class="demo-container">
	<h2>Debug Test</h2>

	<div class="test">
		<h3>Testing with explicit size="200px" and boundingBox="square"</h3>
		<div class="layout-box">
			<LeftiumLogo size="200px" animated={false} boundingBox="square" />
		</div>
	</div>

	<div class="test">
		<h3>Testing with a simple colored div for comparison</h3>
		<div class="layout-box">
			<div style="width: 200px; height: 200px; background: blue;"></div>
		</div>
	</div>
</div>

<style>
	.demo-container {
		padding: 40px;
		font-family: sans-serif;
	}

	.layout-box {
		border: 2px dashed #ff0000;
		display: inline-block;
		background: #f0f0f0;
		margin: 20px 0;
	}

	.test {
		margin: 20px 0;
	}
</style>
