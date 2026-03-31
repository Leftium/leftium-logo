<script lang="ts">
	import AppLogo from '$lib/AppLogo.svelte';
	import { LEFTIUM_GRADIENT } from '$lib/app-logo/defaults.js';
	import { generateAppLogoSvg } from '$lib/app-logo/generate-svg.js';
	import { generateAppLogoPng } from '$lib/app-logo/generate-png.js';
	import type { AppLogoConfig, GradientConfig } from '$lib/app-logo/types.js';

	// --- Interactive control state ---
	let icon = $state('fxemoji:rocket');
	let iconColor = $state('#ffffff');
	let iconColorMode: 'auto' | 'original' | 'monochrome' = $state('auto');
	let iconSize = $state(60);
	let iconOffsetX = $state(0);
	let iconOffsetY = $state(0);
	let cornerRadius = $state(0);
	let solidColor = $state('#0029c1');
	let useGradient = $state(true);

	// Derived background value
	let background = $derived(useGradient ? LEFTIUM_GRADIENT : solidColor);

	// Derived config for export functions
	let exportConfig: AppLogoConfig = $derived({
		icon,
		iconColor,
		iconColorMode,
		background,
		cornerRadius,
		logo: {
			iconSize,
			iconOffsetX,
			iconOffsetY
		}
	});

	// --- Download helpers ---
	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadSvg(svgString: string, filename: string) {
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		downloadBlob(blob, filename);
	}

	async function handleDownloadSvg() {
		const svg = await generateAppLogoSvg(exportConfig);
		downloadSvg(svg, 'app-logo.svg');
	}

	async function handleDownloadPng() {
		const blob = await generateAppLogoPng(exportConfig);
		downloadBlob(blob, 'app-logo.png');
	}
</script>

<main>
	<h1>AppLogo Test</h1>

	<div class="layout">
		<!-- Controls -->
		<section class="controls">
			<h2>Controls</h2>

			<label class="control">
				<span>Icon ID</span>
				<input type="text" bind:value={icon} />
			</label>

			<label class="control">
				<span>Icon Color: {iconColor}</span>
				<input type="color" bind:value={iconColor} />
			</label>

			<label class="control">
				<span>Icon Color Mode: {iconColorMode}</span>
				<select bind:value={iconColorMode}>
					<option value="auto">auto</option>
					<option value="original">original</option>
					<option value="monochrome">monochrome</option>
				</select>
			</label>

			<label class="control">
				<span>Icon Size: {iconSize}%</span>
				<input type="range" min="10" max="100" bind:value={iconSize} />
			</label>

			<label class="control">
				<span>Icon Offset X: {iconOffsetX}</span>
				<input type="range" min="-50" max="50" bind:value={iconOffsetX} />
			</label>

			<label class="control">
				<span>Icon Offset Y: {iconOffsetY}</span>
				<input type="range" min="-50" max="50" bind:value={iconOffsetY} />
			</label>

			<label class="control">
				<span>Corner Radius: {cornerRadius}%</span>
				<input type="range" min="0" max="50" bind:value={cornerRadius} />
			</label>

			<label class="control">
				<span>Background Color: {solidColor}</span>
				<input type="color" bind:value={solidColor} />
			</label>

			<label class="control checkbox">
				<input type="checkbox" bind:checked={useGradient} />
				<span>Use Leftium Gradient</span>
			</label>
		</section>

		<!-- Live Preview -->
		<section class="preview">
			<h2>Preview</h2>
			<div class="preview-container">
				<AppLogo
					{icon}
					{iconColor}
					{iconColorMode}
					{iconSize}
					{iconOffsetX}
					{iconOffsetY}
					{cornerRadius}
					{background}
					size={256}
				/>
			</div>
			<div class="download-buttons">
				<button onclick={handleDownloadSvg}>Download SVG</button>
				<button onclick={handleDownloadPng}>Download PNG</button>
			</div>
		</section>
	</div>

	<!-- Preset Gallery -->
	<section class="gallery">
		<h2>Preset Gallery</h2>
		<div class="gallery-row">
			<div class="preset">
				<AppLogo size={128} />
				<span>Default</span>
			</div>

			<div class="preset">
				<AppLogo
					icon="mdi:rocket-launch"
					iconColor="#ffffff"
					iconColorMode="monochrome"
					background="#e63946"
					size={128}
				/>
				<span>Monochrome on Red</span>
			</div>

			<div class="preset">
				<AppLogo icon="noto:fire" cornerRadius={20} size={128} />
				<span>Rounded Corners</span>
			</div>

			<div class="preset">
				<AppLogo icon="twemoji:star" iconSize={80} background="#2d6a4f" size={128} />
				<span>Large Icon</span>
			</div>

			<div class="preset">
				<AppLogo
					icon="mdi:heart"
					iconSize={40}
					iconOffsetY={-5}
					background="#7b2cbf"
					cornerRadius={50}
					iconColor="#ff69b4"
					iconColorMode="monochrome"
					size={128}
				/>
				<span>Small Offset</span>
			</div>
		</div>
	</section>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.2rem;
	}

	.layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	/* --- Controls --- */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.control span {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.control input[type='text'],
	.control select {
		padding: 0.4rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.control input[type='range'] {
		width: 100%;
	}

	.control input[type='color'] {
		width: 100%;
		height: 2rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 2px;
		cursor: pointer;
	}

	.control.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.control.checkbox input {
		width: 1.1rem;
		height: 1.1rem;
	}

	/* --- Preview --- */
	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.preview-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1rem;
		background: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 20px 20px;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.download-buttons {
		display: flex;
		gap: 0.75rem;
	}

	.download-buttons button {
		padding: 0.5rem 1.25rem;
		background: #0029c1;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	.download-buttons button:hover {
		background: #3973ff;
	}

	/* --- Gallery --- */
	.gallery {
		background: #1a1a2e;
		padding: 1.5rem;
		border-radius: 8px;
	}

	.gallery h2 {
		color: #fff;
		text-align: center;
	}

	.gallery-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1.5rem;
	}

	.preset {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.preset span {
		color: #ccc;
		font-size: 0.8rem;
		text-align: center;
	}
</style>
