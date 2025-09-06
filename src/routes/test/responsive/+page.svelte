<script lang="ts">
	import LeftiumLogo from '$lib/LeftiumLogo.svelte';
</script>

<div class="demo-container">
	<h2>Responsive Test - aspect-ratio maintains square shape</h2>

	<div class="test-section">
		<h3>100% width in non-square containers</h3>
		<div class="container wide">
			<LeftiumLogo size="100%" boundingBox="square" />
			<div class="label">Wide container (400x200px) - Logo stays square</div>
		</div>

		<div class="container tall">
			<LeftiumLogo size="100%" boundingBox="square" />
			<div class="label">Tall container (200x400px) - Logo stays square</div>
		</div>

		<div class="container square">
			<LeftiumLogo size="100%" boundingBox="square" />
			<div class="label">Square container (300x300px) - Perfect fit</div>
		</div>
	</div>

	<div class="test-section">
		<h3>Different bounding boxes at 100%</h3>
		<div class="container medium">
			<LeftiumLogo size="100%" boundingBox="square" />
			<div class="label">Square bounding</div>
		</div>

		<div class="container medium">
			<LeftiumLogo size="100%" boundingBox="default" />
			<div class="label">Default bounding</div>
		</div>

		<div class="container medium">
			<LeftiumLogo size="100%" boundingBox="encircled" />
			<div class="label">Encircled bounding</div>
		</div>
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

	.container {
		border: 2px dashed #ff0000;
		background: #f0f0f0;
		margin: 20px 0;
		position: relative;
		display: inline-block;
		vertical-align: top;
		margin-right: 20px;
	}

	.container.wide {
		width: 400px;
		height: 200px;
	}

	.container.tall {
		width: 200px;
		height: 400px;
	}

	.container.square {
		width: 300px;
		height: 300px;
	}

	.container.medium {
		width: 250px;
		height: 350px;
	}

	.label {
		position: absolute;
		bottom: -30px;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 12px;
		color: #666;
		white-space: nowrap;
	}

	h3 {
		color: #333;
		margin-bottom: 10px;
	}

	/* Hide wide container when it won't fit to prevent horizontal scrolling */
	@media (max-width: 440px) {
		.container.wide {
			display: none;
		}
	}
</style>
