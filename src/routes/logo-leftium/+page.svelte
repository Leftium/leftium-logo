<script lang="ts">
	import {
		generateLeftiumLogoSvg,
		generateLeftiumLogoPng
	} from '$lib/leftium-logo/generate-svg.js';
	import type { BoundingBox, LeftiumLogoConfig } from '$lib/leftium-logo/generate-svg.js';
	import LeftiumLogo, { setAnimated } from '$lib/LeftiumLogo.svelte';

	// Disable animation for this page immediately
	setAnimated(false);

	// ─── State ─────────────────────────────────────────────────────────────────

	let squircle = $state(true);
	let boundingBox = $state<BoundingBox>('default');
	let background = $state('transparent');
	let size = $state(800);
	let copying = $state<string | null>(null);
	let downloading = $state<string | null>(null);

	// ─── Derived ───────────────────────────────────────────────────────────────

	let config: LeftiumLogoConfig = $derived({ size, squircle, boundingBox, background });

	// ─── Helpers ──────────────────────────────────────────────────────────────

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

	// ─── Copy functions ────────────────────────────────────────────────────────

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
		// Clipboard API doesn't support webp; copy as PNG instead
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

	// ─── Download functions ────────────────────────────────────────────────────

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

	const PRESET_SIZES = [256, 512, 800, 1024, 2048];
	const BOUNDING_BOXES: BoundingBox[] = ['encircled', 'cropped', 'default', 'square'];
</script>

<svelte:head>
	<title>Leftium Logo Generator</title>
</svelte:head>

<main>
	<h1>Leftium Logo Generator</h1>

	<!-- ── Live Preview ────────────────────────────────────────────────── -->
	<div class="preview-wrap">
		<!-- outer: provides padding/border, overflow visible so glow bleeds freely -->
		<div class="preview-outer">
			<!-- inner: exactly 300×300, carries the checkerboard/white bg -->
			<div
				class="preview-inner"
				class:white-bg={background === '#ffffff'}
				class:checkerboard={background === 'transparent'}
			>
				<LeftiumLogo size="300px" {squircle} {boundingBox} />
			</div>
		</div>
	</div>

	<!-- ── Controls ────────────────────────────────────────────────────── -->
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
							<input type="radio" name="background" bind:group={background} value="transparent" />
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

	<!-- ── Export Buttons ──────────────────────────────────────────────── -->
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
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	/* ── Preview ──────────────────────────────────────────────────────── */

	.preview-wrap {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
	}

	/* Outer wrapper: centers the preview, no background so glow can bleed freely */
	.preview-outer {
		display: inline-block;
		padding: 2rem;
	}

	/* Inner box: fixed 300×300 square regardless of bounding box mode,
	   so switching to/from cropped (non-square) causes no layout shift.
	   overflow: visible so LeftiumLogo's glow/shadow can bleed past the border
	   without triggering broken-image artifacts from clipped <img> elements. */
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
		width: 130px;
	}

	.controls-table td label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		margin-right: 1rem;
		font-size: 0.9rem;
		cursor: pointer;
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
