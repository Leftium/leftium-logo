<script lang="ts">
	import {
		generateLeftiumLogoSvg,
		generateLeftiumLogoPng
	} from '$lib/leftium-logo/generate-svg.js';
	import type { BoundingBox, LeftiumLogoConfig } from '$lib/leftium-logo/generate-svg.js';
	import LeftiumLogo, { setAnimated } from '$lib/LeftiumLogo.svelte';
	import {
		generateFaviconSvg,
		generateFaviconPng
	} from '$lib/leftium-logo/generate-favicon-svg.js';
	import type { FaviconConfig } from '$lib/leftium-logo/generate-favicon-svg.js';

	// Disable animation for this page immediately
	setAnimated(false);

	// ─── Logo State ───────────────────────────────────────────────────────────

	let squircle = $state(true);
	let boundingBox = $state<BoundingBox>('default');
	let background = $state('transparent');
	let size = $state(800);
	let copying = $state<string | null>(null);
	let downloading = $state<string | null>(null);

	// ─── Logo Derived ─────────────────────────────────────────────────────────

	let config: LeftiumLogoConfig = $derived({ size, squircle, boundingBox, background });

	// ─── Favicon State ────────────────────────────────────────────────────────

	let faviconSquircle = $state(false);
	let faviconScale = $state(0.7);
	let faviconOffsetX = $state(0);
	let faviconOffsetY = $state(0);
	let faviconSize = $state(128);
	let faviconCopying = $state<string | null>(null);
	let faviconDownloading = $state<string | null>(null);

	// ─── Favicon Derived ──────────────────────────────────────────────────────

	let faviconConfig: FaviconConfig = $derived({
		size: 256,
		squircle: faviconSquircle,
		ligatureScale: faviconScale,
		ligatureOffsetX: faviconOffsetX,
		ligatureOffsetY: faviconOffsetY
	});

	let faviconExportConfig: FaviconConfig = $derived({
		size: faviconSize,
		squircle: faviconSquircle,
		ligatureScale: faviconScale,
		ligatureOffsetX: faviconOffsetX,
		ligatureOffsetY: faviconOffsetY
	});

	// ─── Shared Helpers ──────────────────────────────────────────────────────

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function downloadSvgStr(svgString: string, filename: string) {
		downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), filename);
	}

	async function copyImageToClipboard(blob: Blob) {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	}

	async function copyTextToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
	}

	// ─── Logo Copy functions ──────────────────────────────────────────────────

	async function copyPng() {
		copying = 'png';
		try {
			const blob = await generateLeftiumLogoPng(config, 'png');
			await copyImageToClipboard(blob);
		} catch (err) {
			console.error('Failed to copy PNG:', err);
		} finally {
			setTimeout(() => {
				copying = null;
			}, 1500);
		}
	}

	async function copySvg() {
		copying = 'svg';
		try {
			const svgString = generateLeftiumLogoSvg(config);
			await copyTextToClipboard(svgString);
		} catch (err) {
			console.error('Failed to copy SVG:', err);
		} finally {
			setTimeout(() => {
				copying = null;
			}, 1500);
		}
	}

	async function copyWebp() {
		copying = 'webp';
		try {
			const blob = await generateLeftiumLogoPng(config, 'png');
			await copyImageToClipboard(blob);
		} catch (err) {
			console.error('Failed to copy WebP (as PNG):', err);
		} finally {
			setTimeout(() => {
				copying = null;
			}, 1500);
		}
	}

	// ─── Logo Download functions ──────────────────────────────────────────────

	async function downloadPng() {
		downloading = 'png';
		try {
			const blob = await generateLeftiumLogoPng(config, 'png');
			downloadBlob(blob, 'leftium-logo.png');
		} catch (err) {
			console.error('Failed to download PNG:', err);
		} finally {
			downloading = null;
		}
	}

	async function downloadSvg() {
		downloading = 'svg';
		try {
			const svgString = generateLeftiumLogoSvg(config);
			downloadSvgStr(svgString, 'leftium-logo.svg');
		} catch (err) {
			console.error('Failed to download SVG:', err);
		} finally {
			downloading = null;
		}
	}

	async function downloadWebp() {
		downloading = 'webp';
		try {
			const blob = await generateLeftiumLogoPng(config, 'webp');
			downloadBlob(blob, 'leftium-logo.webp');
		} catch (err) {
			console.error('Failed to download WebP:', err);
		} finally {
			downloading = null;
		}
	}

	// ─── Favicon Copy functions ───────────────────────────────────────────────

	async function faviconCopyPng() {
		faviconCopying = 'png';
		try {
			const blob = await generateFaviconPng(faviconExportConfig, 'png');
			await copyImageToClipboard(blob);
		} catch (err) {
			console.error('Failed to copy favicon PNG:', err);
		} finally {
			setTimeout(() => {
				faviconCopying = null;
			}, 1500);
		}
	}

	async function faviconCopySvg() {
		faviconCopying = 'svg';
		try {
			const svgString = generateFaviconSvg(faviconExportConfig);
			await copyTextToClipboard(svgString);
		} catch (err) {
			console.error('Failed to copy favicon SVG:', err);
		} finally {
			setTimeout(() => {
				faviconCopying = null;
			}, 1500);
		}
	}

	// ─── Favicon Download functions ───────────────────────────────────────────

	async function faviconDownloadPng() {
		faviconDownloading = 'png';
		try {
			const blob = await generateFaviconPng(faviconExportConfig, 'png');
			downloadBlob(blob, `leftium-favicon-${faviconSize}.png`);
		} catch (err) {
			console.error('Failed to download favicon PNG:', err);
		} finally {
			faviconDownloading = null;
		}
	}

	async function faviconDownloadSvg() {
		faviconDownloading = 'svg';
		try {
			const svgString = generateFaviconSvg(faviconExportConfig);
			downloadSvgStr(svgString, 'leftium-favicon.svg');
		} catch (err) {
			console.error('Failed to download favicon SVG:', err);
		} finally {
			faviconDownloading = null;
		}
	}

	// ─── Constants ────────────────────────────────────────────────────────────

	const PRESET_SIZES = [256, 512, 800, 1024, 2048];
	const BOUNDING_BOXES: BoundingBox[] = ['encircled', 'cropped', 'default', 'square'];
	const FAVICON_PRESET_SIZES = [16, 32, 64, 128, 256, 512];
</script>

<svelte:head>
	<title>Leftium Logo & Favicon Generator</title>
</svelte:head>

<main>
	<h1>Leftium Logo & Favicon Generator</h1>

	<div class="two-column">
		<!-- ════════════════════════════════════════════════════════════════════ -->
		<!-- LEFT COLUMN: Logo Generator                                        -->
		<!-- ════════════════════════════════════════════════════════════════════ -->
		<section class="column">
			<h2>Logo</h2>

			<!-- ── Live Preview ──────────────────────────────────────────── -->
			<div class="preview-wrap">
				<div class="preview-outer">
					<div
						class="preview-inner"
						class:white-bg={background === '#ffffff'}
						class:checkerboard={background === 'transparent'}
					>
						<LeftiumLogo size="300px" {squircle} {boundingBox} />
					</div>
				</div>
			</div>

			<!-- ── Controls ─────────────────────────────────────────────── -->
			<div class="controls">
				<table class="controls-table">
					<tbody>
						<!-- Shape -->
						<tr>
							<th>Shape</th>
							<td>
								<label>
									<input type="radio" name="squircle" bind:group={squircle} value={true} />
									squircle
								</label>
								<label>
									<input type="radio" name="squircle" bind:group={squircle} value={false} />
									square
								</label>
							</td>
						</tr>

						<!-- Bounding Box -->
						<tr>
							<th>Bounding Box</th>
							<td>
								{#each BOUNDING_BOXES as bb (bb)}
									<label>
										<input type="radio" name="boundingBox" bind:group={boundingBox} value={bb} />
										{bb}
									</label>
								{/each}
							</td>
						</tr>

						<!-- Background -->
						<tr>
							<th>Background</th>
							<td>
								<label>
									<input
										type="radio"
										name="background"
										bind:group={background}
										value="transparent"
									/>
									transparent
								</label>
								<label>
									<input type="radio" name="background" bind:group={background} value="#ffffff" />
									white
								</label>
							</td>
						</tr>

						<!-- Size -->
						<tr>
							<th>Size</th>
							<td>
								<div class="size-row">
									<input
										type="number"
										min="16"
										max="4096"
										step="1"
										bind:value={size}
										class="size-input"
									/>
									<span class="size-unit">px</span>
									<div class="preset-buttons">
										{#each PRESET_SIZES as preset (preset)}
											<button
												class="preset-btn"
												class:active={size === preset}
												onclick={() => (size = preset)}
											>
												{preset}
											</button>
										{/each}
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- ── Export Buttons ────────────────────────────────────────── -->
			<div class="export-row">
				<div class="export-group">
					<span class="export-label">Copy:</span>
					<button onclick={copyPng} class:copied={copying === 'png'}>
						{copying === 'png' ? 'Copied!' : 'Copy PNG'}
					</button>
					<button onclick={copySvg} class:copied={copying === 'svg'}>
						{copying === 'svg' ? 'Copied!' : 'Copy SVG'}
					</button>
					<button onclick={copyWebp} class:copied={copying === 'webp'}>
						{copying === 'webp' ? 'Copied!' : 'Copy WebP'}
					</button>
				</div>

				<div class="export-group">
					<span class="export-label">Download:</span>
					<button onclick={downloadPng} disabled={downloading === 'png'}>
						{downloading === 'png' ? '...' : 'Download PNG'}
					</button>
					<button onclick={downloadSvg} disabled={downloading === 'svg'}>
						{downloading === 'svg' ? '...' : 'Download SVG'}
					</button>
					<button onclick={downloadWebp} disabled={downloading === 'webp'}>
						{downloading === 'webp' ? '...' : 'Download WebP'}
					</button>
				</div>
			</div>
		</section>

		<!-- ════════════════════════════════════════════════════════════════════ -->
		<!-- RIGHT COLUMN: Favicon Generator                                    -->
		<!-- ════════════════════════════════════════════════════════════════════ -->
		<section class="column">
			<h2>Favicon</h2>

			<!-- ── Live Preview ──────────────────────────────────────────── -->
			<div class="preview-wrap">
				<div class="preview-outer">
					<div class="preview-inner checkerboard">
						<div class="favicon-preview" style="width: 256px; height: 256px;">
							{@html generateFaviconSvg(faviconConfig)}
						</div>
					</div>
				</div>
			</div>

			<!-- ── Small previews ────────────────────────────────────────── -->
			<div class="favicon-small-previews">
				<div class="favicon-small-preview">
					<div class="favicon-thumb" style="width: 96px; height: 96px;">
						{@html generateFaviconSvg(faviconConfig)}
					</div>
					<span class="favicon-thumb-label">96px</span>
				</div>
				<div class="favicon-small-preview">
					<div class="favicon-thumb" style="width: 32px; height: 32px;">
						{@html generateFaviconSvg(faviconConfig)}
					</div>
					<span class="favicon-thumb-label">32px</span>
				</div>
				<div class="favicon-small-preview">
					<div class="favicon-thumb" style="width: 16px; height: 16px;">
						{@html generateFaviconSvg(faviconConfig)}
					</div>
					<span class="favicon-thumb-label">16px</span>
				</div>
			</div>

			<!-- ── Controls ─────────────────────────────────────────────── -->
			<div class="controls">
				<table class="controls-table">
					<tbody>
						<!-- Shape -->
						<tr>
							<th>Shape</th>
							<td>
								<label>
									<input
										type="radio"
										name="faviconSquircle"
										bind:group={faviconSquircle}
										value={true}
									/>
									squircle
								</label>
								<label>
									<input
										type="radio"
										name="faviconSquircle"
										bind:group={faviconSquircle}
										value={false}
									/>
									square
								</label>
							</td>
						</tr>

						<!-- Scale -->
						<tr>
							<th>Scale</th>
							<td>
								<div class="slider-row">
									<input
										type="range"
										min="0.3"
										max="1.2"
										step="0.01"
										bind:value={faviconScale}
										class="slider"
									/>
									<span class="slider-value">{faviconScale.toFixed(2)}</span>
									<button class="reset-btn" onclick={() => (faviconScale = 0.7)}>×</button>
								</div>
							</td>
						</tr>

						<!-- Offset X -->
						<tr>
							<th>Offset X</th>
							<td>
								<div class="slider-row">
									<input
										type="range"
										min="-0.3"
										max="0.3"
										step="0.01"
										bind:value={faviconOffsetX}
										class="slider"
									/>
									<span class="slider-value">{faviconOffsetX.toFixed(2)}</span>
									<button class="reset-btn" onclick={() => (faviconOffsetX = 0)}>×</button>
								</div>
							</td>
						</tr>

						<!-- Offset Y -->
						<tr>
							<th>Offset Y</th>
							<td>
								<div class="slider-row">
									<input
										type="range"
										min="-0.3"
										max="0.3"
										step="0.01"
										bind:value={faviconOffsetY}
										class="slider"
									/>
									<span class="slider-value">{faviconOffsetY.toFixed(2)}</span>
									<button class="reset-btn" onclick={() => (faviconOffsetY = 0)}>×</button>
								</div>
							</td>
						</tr>

						<!-- Size (export) -->
						<tr>
							<th>Size</th>
							<td>
								<div class="size-row">
									<input
										type="number"
										min="16"
										max="4096"
										step="1"
										bind:value={faviconSize}
										class="size-input"
									/>
									<span class="size-unit">px</span>
									<div class="preset-buttons">
										{#each FAVICON_PRESET_SIZES as preset (preset)}
											<button
												class="preset-btn"
												class:active={faviconSize === preset}
												onclick={() => (faviconSize = preset)}
											>
												{preset}
											</button>
										{/each}
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- ── Export Buttons ────────────────────────────────────────── -->
			<div class="export-row">
				<div class="export-group">
					<span class="export-label">Copy:</span>
					<button onclick={faviconCopyPng} class:copied={faviconCopying === 'png'}>
						{faviconCopying === 'png' ? 'Copied!' : 'Copy PNG'}
					</button>
					<button onclick={faviconCopySvg} class:copied={faviconCopying === 'svg'}>
						{faviconCopying === 'svg' ? 'Copied!' : 'Copy SVG'}
					</button>
				</div>

				<div class="export-group">
					<span class="export-label">Download:</span>
					<button onclick={faviconDownloadPng} disabled={faviconDownloading === 'png'}>
						{faviconDownloading === 'png' ? '...' : 'Download PNG'}
					</button>
					<button onclick={faviconDownloadSvg} disabled={faviconDownloading === 'svg'}>
						{faviconDownloading === 'svg' ? '...' : 'Download SVG'}
					</button>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.4rem;
		color: #333;
	}

	/* ── Two-column layout ───────────────────────────────────────────── */

	.two-column {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.column {
		min-width: 0;
	}

	/* Vertical divider between columns */
	.column + .column {
		border-left: 1px solid #ddd;
		padding-left: 2rem;
	}

	@media (max-width: 768px) {
		.two-column {
			grid-template-columns: 1fr;
		}

		.column + .column {
			border-left: none;
			padding-left: 0;
			border-top: 1px solid #ddd;
			padding-top: 1.5rem;
		}
	}

	/* ── Preview ──────────────────────────────────────────────────────── */

	.preview-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	.preview-outer {
		display: inline-block;
		padding: 2rem;
	}

	.preview-inner {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 300px;
		height: 300px;
		border: 1px solid #999;
	}

	.checkerboard {
		background: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 16px 16px;
	}

	.white-bg {
		background: #ffffff;
	}

	/* ── Favicon preview ─────────────────────────────────────────────── */

	.favicon-preview {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.favicon-preview :global(svg) {
		width: 100%;
		height: 100%;
	}

	.favicon-small-previews {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.favicon-small-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.favicon-thumb {
		border: 1px solid #ccc;
		background: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 8px 8px;
	}

	.favicon-thumb :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.favicon-thumb-label {
		font-size: 0.75rem;
		color: #888;
	}

	/* ── Controls table ───────────────────────────────────────────────── */

	.controls {
		margin-bottom: 1.5rem;
	}

	.controls-table {
		border-collapse: collapse;
		width: 100%;
	}

	.controls-table th,
	.controls-table td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		vertical-align: middle;
		border-bottom: 1px solid #eee;
	}

	.controls-table th {
		font-size: 0.88rem;
		font-weight: 600;
		color: #555;
		white-space: nowrap;
		width: 100px;
	}

	.controls-table td label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-right: 1rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	/* ── Slider row ──────────────────────────────────────────────────── */

	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.slider {
		flex: 1;
		min-width: 80px;
	}

	.slider-value {
		font-size: 0.85rem;
		font-family: monospace;
		color: #333;
		min-width: 3.5em;
		text-align: right;
	}

	.reset-btn {
		padding: 0.1rem 0.45rem;
		font-size: 0.85rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #f5f5f5;
		color: #888;
		cursor: pointer;
		line-height: 1;
	}

	.reset-btn:hover {
		background: #e0e0e0;
		color: #333;
		border-color: #999;
	}

	/* ── Size row ─────────────────────────────────────────────────────── */

	.size-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.size-input {
		width: 80px;
		padding: 0.25rem 0.4rem;
		font-size: 0.9rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.size-unit {
		font-size: 0.85rem;
		color: #666;
	}

	.preset-buttons {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.preset-btn {
		padding: 0.25rem 0.6rem;
		font-size: 0.82rem;
		border: 1px solid #aaa;
		border-radius: 4px;
		background: #f5f5f5;
		color: #333;
		cursor: pointer;
		transition:
			background 0.12s,
			border-color 0.12s;
	}

	.preset-btn:hover {
		background: #e0e0e0;
		border-color: #888;
	}

	.preset-btn.active {
		font-weight: 700;
		background: #dce8ff;
		border-color: #0029c1;
		color: #0029c1;
	}

	/* ── Export buttons ───────────────────────────────────────────────── */

	.export-row {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.export-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.export-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #555;
	}

	.export-group button {
		padding: 0.4rem 0.9rem;
		font-size: 0.88rem;
		border: 1px solid #0029c1;
		border-radius: 5px;
		background: #0029c1;
		color: #fff;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.export-group button:hover:not(:disabled) {
		background: #3973ff;
		border-color: #3973ff;
	}

	.export-group button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.export-group button.copied {
		background: #16a34a;
		border-color: #16a34a;
	}
</style>
