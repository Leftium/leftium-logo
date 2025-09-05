<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
</script>

<div class="demo-container">
	<div class="test-section">
		<h3>Inline Text Alignment</h3>
		<div class="inline-test">
			Text before
			<LeftiumLogo size="30px" boundingBox="square" />
			text after (square)
		</div>
		<div class="inline-test">
			Text before
			<LeftiumLogo size="24px" boundingBox="default" />
			text after (default)
		</div>
		<div class="inline-test">
			Text before
			<LeftiumLogo size="20px" boundingBox="encircled" />
			text after (encircled)
		</div>
	</div>

	<h2>Bounding Box Test</h2>

	<div class="test-section">
		<h3>Square Bounding Box</h3>
		<div class="test-row">
			<div class="layout-box">
				<LeftiumLogo size="200px" boundingBox="square" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="150px" boundingBox="square" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="100px" boundingBox="square" />
			</div>
		</div>
		<p>Red box shows layout bounds matching just the blue square</p>
	</div>

	<div class="test-section">
		<h3>Default Bounding Box</h3>
		<div class="test-row">
			<div class="layout-box">
				<LeftiumLogo size="160px" boundingBox="default" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="120px" boundingBox="default" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="80px" boundingBox="default" />
			</div>
		</div>
		<p>Red box shows layout bounds at average between square and encircled</p>
	</div>

	<div class="test-section">
		<h3>Encircled Bounding Box</h3>
		<div class="test-row">
			<div class="layout-box">
				<LeftiumLogo size="133px" boundingBox="encircled" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="100px" boundingBox="encircled" />
			</div>
			<div class="layout-box">
				<LeftiumLogo size="66px" boundingBox="encircled" />
			</div>
		</div>
		<p>Red box shows layout bounds for full logo with padding (800x800 canvas)</p>
	</div>
</div>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	.demo-container {
		padding: 40px;
		font-family: sans-serif;
	}

	.test-section {
		margin: 40px 0;
	}

	.test-row {
		display: flex;
		gap: 40px;
		align-items: center;
		margin: 20px 0;
	}

	.layout-box {
		border: 2px dashed #ff0000;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #f0f0f0;
	}

	.inline-test {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px;
		background: #fff;
		border: 1px solid #ddd;
		margin: 10px 0;
	}

	h3 {
		color: #333;
		margin-bottom: 10px;
	}

	p {
		color: #666;
		font-size: 14px;
		margin-top: 10px;
	}
</style>
