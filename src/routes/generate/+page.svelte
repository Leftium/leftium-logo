<script lang="ts">
	import AppLogo from '$lib/AppLogo.svelte';
	import { LEFTIUM_GRADIENT } from '$lib/app-logo/defaults.js';
	import { generateAppLogoSvg } from '$lib/app-logo/generate-svg.js';
	import { generateAppLogoPng } from '$lib/app-logo/generate-png.js';
	import {
		generateZipKit,
		generateFaviconHtml,
		generateManifest
	} from '$lib/app-logo/generate-favicon-set.js';
	import type {
		AppLogoConfig,
		GradientConfig,
		IconColorMode,
		CornerShape
	} from '$lib/app-logo/types.js';
	import { pngToIco } from '$lib/app-logo/generate-ico.js';

	// ─── Lock icons (icomoon-free, inlined to avoid async fetch) ─────────────

	// Lock icons from icomoon-free, adjusted so the padlock body occupies the
	// same visual position in both states. Both use translate(3,0) on the path
	// to center the body in the 16×16 frame. The unlocked icon uses
	// overflow="visible" so the open shackle extends past the viewBox.
	const ICON_LOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" transform="translate(3,0)" d="M9.25 7H9V4c0-1.654-1.346-3-3-3H4C2.346 1 1 2.346 1 4v3H.75a.753.753 0 0 0-.75.75v7.5c0 .412.338.75.75.75h8.5c.412 0 .75-.338.75-.75v-7.5A.753.753 0 0 0 9.25 7M3 4c0-.551.449-1 1-1h2c.551 0 1 .449 1 1v3H3z"/></svg>`;
	const ICON_UNLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" overflow="visible"><path fill="currentColor" transform="translate(3,0)" d="M12 1c1.654 0 3 1.346 3 3v3h-2V4c0-.551-.449-1-1-1h-2c-.551 0-1 .449-1 1v3h.25c.412 0 .75.338.75.75v7.5c0 .412-.338.75-.75.75H.75a.753.753 0 0 1-.75-.75v-7.5C0 7.338.338 7 .75 7H7V4c0-1.654 1.346-3 3-3z"/></svg>`;

	// ─── Types ────────────────────────────────────────────────────────────────

	interface ColumnState {
		icon: string;
		iconColor: string;
		iconColorModeKey: string;
		hueValue: number;
		saturationValue: number;
		iconSize: number;
		iconOffsetX: number;
		iconOffsetY: number;
		iconRotation: number;
		cornerRadius: number;
		cornerK: number;
		solidColor: string;
		useGradient: boolean;
		gradientAngle: number;
		gradientPosition: number;
		gradientScale: number;
	}

	// ─── Default state ─────────────────────────────────────────────────────────

	const DEFAULT_STATE: ColumnState = {
		icon: 'fxemoji:rocket',
		iconColor: '#ffffff',
		iconColorModeKey: 'auto',
		hueValue: 210,
		saturationValue: 70,
		iconSize: 60,
		iconOffsetX: 0,
		iconOffsetY: 0,
		iconRotation: 0,
		cornerRadius: 50,
		cornerK: 2,
		solidColor: '#0029c1',
		useGradient: true,
		gradientAngle: 45,
		gradientPosition: 0,
		gradientScale: 1
	};

	// ─── Column State ──────────────────────────────────────────────────────────

	let logo = $state<ColumnState>({ ...DEFAULT_STATE });
	// favicon holds the user's own values (used when unlocked)
	let favicon = $state<ColumnState>({ ...DEFAULT_STATE });

	// ─── Additional State ─────────────────────────────────────────────────────

	let appName = $state('My App');
	let appShortName = $state('App');
	let copying = $state<'logo' | 'favicon' | null>(null);
	let downloading = $state(false);

	// ─── Lock State ───────────────────────────────────────────────────────────

	const DEFAULT_LOCKS: Record<keyof ColumnState, boolean> = {
		icon: true,
		iconColor: true,
		iconColorModeKey: true,
		hueValue: true,
		saturationValue: true,
		iconSize: true,
		iconOffsetX: true,
		iconOffsetY: true,
		iconRotation: true,
		cornerRadius: true,
		cornerK: true,
		solidColor: true,
		useGradient: true,
		gradientAngle: true,
		gradientPosition: true,
		gradientScale: true
	};

	let locks = $state<Record<keyof ColumnState, boolean>>({ ...DEFAULT_LOCKS });

	// effectiveFavicon merges: locked fields come from logo, unlocked from favicon
	let effectiveFavicon: ColumnState = $derived({
		icon: locks.icon ? logo.icon : favicon.icon,
		iconColor: locks.iconColor ? logo.iconColor : favicon.iconColor,
		iconColorModeKey: locks.iconColorModeKey ? logo.iconColorModeKey : favicon.iconColorModeKey,
		hueValue: locks.hueValue ? logo.hueValue : favicon.hueValue,
		saturationValue: locks.saturationValue ? logo.saturationValue : favicon.saturationValue,
		iconSize: locks.iconSize ? logo.iconSize : favicon.iconSize,
		iconOffsetX: locks.iconOffsetX ? logo.iconOffsetX : favicon.iconOffsetX,
		iconOffsetY: locks.iconOffsetY ? logo.iconOffsetY : favicon.iconOffsetY,
		iconRotation: locks.iconRotation ? logo.iconRotation : favicon.iconRotation,
		cornerRadius: locks.cornerRadius ? logo.cornerRadius : favicon.cornerRadius,
		cornerK: locks.cornerK ? logo.cornerK : favicon.cornerK,
		solidColor: locks.solidColor ? logo.solidColor : favicon.solidColor,
		useGradient: locks.useGradient ? logo.useGradient : favicon.useGradient,
		gradientAngle: locks.gradientAngle ? logo.gradientAngle : favicon.gradientAngle,
		gradientPosition: locks.gradientPosition ? logo.gradientPosition : favicon.gradientPosition,
		gradientScale: locks.gradientScale ? logo.gradientScale : favicon.gradientScale
	});

	function toggleLock(field: keyof ColumnState) {
		locks[field] = !locks[field];
		if (locks[field]) {
			// When locking, snap favicon's own value to current logo value so
			// unlocking later starts from the same point
			(favicon as Record<keyof ColumnState, unknown>)[field] = logo[field];
		}
	}

	// ─── Derived: Logo ────────────────────────────────────────────────────────

	let logoCornerShape: CornerShape = $derived(
		logo.cornerK === 1
			? 'round'
			: logo.cornerK === 0
				? 'bevel'
				: (`superellipse(${logo.cornerK})` as CornerShape)
	);

	let logoIconColorMode: IconColorMode = $derived(
		logo.iconColorModeKey === 'hue'
			? { hue: logo.hueValue, saturation: logo.saturationValue }
			: (logo.iconColorModeKey as IconColorMode)
	);

	let logoBackground: string | GradientConfig = $derived.by(() => {
		if (!logo.useGradient) return logo.solidColor;
		return {
			...LEFTIUM_GRADIENT,
			angle: logo.gradientAngle,
			position: logo.gradientPosition,
			scale: logo.gradientScale
		} satisfies GradientConfig;
	});

	// ─── Derived: Favicon (using effectiveFavicon) ────────────────────────────

	let faviconCornerShape: CornerShape = $derived(
		effectiveFavicon.cornerK === 1
			? 'round'
			: effectiveFavicon.cornerK === 0
				? 'bevel'
				: (`superellipse(${effectiveFavicon.cornerK})` as CornerShape)
	);

	let faviconIconColorMode: IconColorMode = $derived(
		effectiveFavicon.iconColorModeKey === 'hue'
			? { hue: effectiveFavicon.hueValue, saturation: effectiveFavicon.saturationValue }
			: (effectiveFavicon.iconColorModeKey as IconColorMode)
	);

	let faviconBackground: string | GradientConfig = $derived.by(() => {
		if (!effectiveFavicon.useGradient) return effectiveFavicon.solidColor;
		return {
			...LEFTIUM_GRADIENT,
			angle: effectiveFavicon.gradientAngle,
			position: effectiveFavicon.gradientPosition,
			scale: effectiveFavicon.gradientScale
		} satisfies GradientConfig;
	});

	// ─── Derived: Export Configs ──────────────────────────────────────────────

	let logoExportConfig: AppLogoConfig = $derived({
		icon: logo.icon,
		iconColor: logo.iconColor,
		iconColorMode: logoIconColorMode,
		background: logoBackground,
		cornerRadius: logo.cornerRadius,
		cornerShape: logoCornerShape,
		logo: {
			iconSize: logo.iconSize,
			iconOffsetX: logo.iconOffsetX,
			iconOffsetY: logo.iconOffsetY,
			iconRotation: logo.iconRotation
		}
	});

	let faviconExportConfig: AppLogoConfig = $derived({
		icon: effectiveFavicon.icon,
		iconColor: effectiveFavicon.iconColor,
		iconColorMode: faviconIconColorMode,
		background: faviconBackground,
		cornerRadius: effectiveFavicon.cornerRadius,
		cornerShape: faviconCornerShape,
		favicon: {
			iconSize: effectiveFavicon.iconSize,
			iconOffsetX: effectiveFavicon.iconOffsetX,
			iconOffsetY: effectiveFavicon.iconOffsetY,
			iconRotation: effectiveFavicon.iconRotation
		}
	});

	let fullConfig: AppLogoConfig = $derived({
		icon: logo.icon,
		iconColor: logo.iconColor,
		iconColorMode: logoIconColorMode,
		background: logoBackground,
		cornerRadius: logo.cornerRadius,
		cornerShape: logoCornerShape,
		logo: {
			iconSize: logo.iconSize,
			iconOffsetX: logo.iconOffsetX,
			iconOffsetY: logo.iconOffsetY,
			iconRotation: logo.iconRotation
		},
		favicon: {
			icon: effectiveFavicon.icon,
			iconColor: effectiveFavicon.iconColor,
			iconColorMode: faviconIconColorMode,
			background: faviconBackground,
			cornerRadius: effectiveFavicon.cornerRadius,
			cornerShape: faviconCornerShape,
			iconSize: effectiveFavicon.iconSize,
			iconOffsetX: effectiveFavicon.iconOffsetX,
			iconOffsetY: effectiveFavicon.iconOffsetY,
			iconRotation: effectiveFavicon.iconRotation
		}
	});

	// ─── Helpers ──────────────────────────────────────────────────────────────

	function cornerKLabel(k: number): string {
		if (k === -10) return 'notch';
		if (k === -1) return 'scoop';
		if (k === 0) return 'bevel';
		if (k === 1) return 'round';
		if (k === 2) return 'squircle';
		if (k === 10) return 'square';
		return `K=${k}`;
	}

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

	async function copyImageToClipboard(blob: Blob) {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	}

	// ─── Logo Downloads ───────────────────────────────────────────────────────

	async function downloadLogoSvg() {
		const svg = await generateAppLogoSvg(logoExportConfig, 'logo');
		downloadSvg(svg, 'logo.svg');
	}

	async function downloadLogoPng() {
		const blob = await generateAppLogoPng(logoExportConfig, { variant: 'logo', size: 512 });
		downloadBlob(blob, 'logo.png');
	}

	async function downloadLogoWebp() {
		const blob = await generateAppLogoPng(logoExportConfig, {
			variant: 'logo',
			size: 512,
			format: 'webp'
		});
		downloadBlob(blob, 'logo.webp');
	}

	async function copyLogoPng() {
		copying = 'logo';
		try {
			const blob = await generateAppLogoPng(logoExportConfig, { variant: 'logo', size: 512 });
			await copyImageToClipboard(blob);
		} finally {
			setTimeout(() => {
				copying = null;
			}, 1500);
		}
	}

	// ─── Favicon Downloads ────────────────────────────────────────────────────

	async function downloadFaviconSvg() {
		const svg = await generateAppLogoSvg(faviconExportConfig, 'favicon');
		downloadSvg(svg, 'icon.svg');
	}

	async function downloadFaviconIco() {
		const png32 = await generateAppLogoPng(faviconExportConfig, { variant: 'favicon', size: 32 });
		const ico = await pngToIco(png32);
		downloadBlob(ico, 'favicon.ico');
	}

	async function copyFaviconPng() {
		copying = 'favicon';
		try {
			const png = await generateAppLogoPng(faviconExportConfig, { variant: 'favicon', size: 32 });
			await copyImageToClipboard(png);
		} finally {
			setTimeout(() => {
				copying = null;
			}, 1500);
		}
	}

	// ─── Download All ─────────────────────────────────────────────────────────

	async function downloadAll() {
		downloading = true;
		try {
			const zip = await generateZipKit(fullConfig, { name: appName, shortName: appShortName });
			downloadBlob(zip, 'app-logo-kit.zip');
		} finally {
			downloading = false;
		}
	}

	// ─── Reset helpers ────────────────────────────────────────────────────────

	function resetLogoField<K extends keyof ColumnState>(field: K) {
		logo[field] = DEFAULT_STATE[field] as ColumnState[K];
	}
</script>

<main>
	<!-- ── Preview row ─────────────────────────────────────────────────── -->
	<div class="preview-row">
		<div class="preview-panel">
			<div class="checkerboard">
				<AppLogo
					icon={logo.icon}
					iconColor={logo.iconColor}
					iconColorMode={logoIconColorMode}
					iconSize={logo.iconSize}
					iconOffsetX={logo.iconOffsetX}
					iconOffsetY={logo.iconOffsetY}
					iconRotation={logo.iconRotation}
					cornerRadius={logo.cornerRadius}
					cornerShape={logoCornerShape}
					background={logoBackground}
					size={256}
				/>
			</div>
			<div class="preview-actions">
				<button onclick={copyLogoPng} class:active={copying === 'logo'}>
					{copying === 'logo' ? 'Copied!' : 'Copy PNG'}
				</button>
				<button onclick={downloadLogoSvg}>SVG</button>
				<button onclick={downloadLogoPng}>PNG</button>
				<button onclick={downloadLogoWebp}>WebP</button>
			</div>
			<h2>Logo</h2>
		</div>

		<div class="preview-gap"></div>

		<div class="preview-panel">
			<div class="checkerboard favicon-preview">
				<div class="favicon-size">
					<AppLogo
						icon={effectiveFavicon.icon}
						iconColor={effectiveFavicon.iconColor}
						iconColorMode={faviconIconColorMode}
						iconSize={effectiveFavicon.iconSize}
						iconOffsetX={effectiveFavicon.iconOffsetX}
						iconOffsetY={effectiveFavicon.iconOffsetY}
						iconRotation={effectiveFavicon.iconRotation}
						cornerRadius={effectiveFavicon.cornerRadius}
						cornerShape={faviconCornerShape}
						background={faviconBackground}
						size={96}
					/>
					<span class="size-label">3×</span>
				</div>
				<div class="favicon-size">
					<AppLogo
						icon={effectiveFavicon.icon}
						iconColor={effectiveFavicon.iconColor}
						iconColorMode={faviconIconColorMode}
						iconSize={effectiveFavicon.iconSize}
						iconOffsetX={effectiveFavicon.iconOffsetX}
						iconOffsetY={effectiveFavicon.iconOffsetY}
						iconRotation={effectiveFavicon.iconRotation}
						cornerRadius={effectiveFavicon.cornerRadius}
						cornerShape={faviconCornerShape}
						background={faviconBackground}
						size={32}
					/>
					<span class="size-label">32px</span>
				</div>
				<div class="favicon-size">
					<AppLogo
						icon={effectiveFavicon.icon}
						iconColor={effectiveFavicon.iconColor}
						iconColorMode={faviconIconColorMode}
						iconSize={effectiveFavicon.iconSize}
						iconOffsetX={effectiveFavicon.iconOffsetX}
						iconOffsetY={effectiveFavicon.iconOffsetY}
						iconRotation={effectiveFavicon.iconRotation}
						cornerRadius={effectiveFavicon.cornerRadius}
						cornerShape={faviconCornerShape}
						background={faviconBackground}
						size={16}
					/>
					<span class="size-label">16px</span>
				</div>
			</div>
			<div class="preview-actions">
				<button onclick={copyFaviconPng} class:active={copying === 'favicon'}>
					{copying === 'favicon' ? 'Copied!' : 'Copy PNG'}
				</button>
				<button onclick={downloadFaviconIco}>ICO</button>
				<button onclick={downloadFaviconSvg}>SVG</button>
			</div>
			<h2>Favicon</h2>
		</div>
	</div>

	<!-- ── Unified controls grid ───────────────────────────────────────── -->
	<!--
		8-column layout:
		1: reset btn (24px)
		2: logo number (54px)
		3: logo slider (1fr)
		4: logo label (90px)  ← right-aligned, closest to center
		5: lock btn (36px)    ← center
		6: fav label (90px)   ← left-aligned, closest to center
		7: fav slider (1fr)
		8: fav number (54px)
	-->
	<div class="controls-grid">
		<!-- ════════════════ ICON ════════════════ -->
		<div class="ctrl-row icon-row">
			<div class="logo-icon-wrap">
				<span class="icon-label">Icon</span>
				<div class="icon-input-group">
					<textarea
						class="icon-input"
						bind:value={logo.icon}
						rows={3}
						placeholder="Iconify ID or paste SVG..."
					></textarea>
					<a
						href="https://icon-sets.iconify.design"
						target="_blank"
						rel="noopener"
						class="browse-link">Browse icons →</a
					>
				</div>
			</div>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('icon')}
				title="Reset to default">↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.icon}
					onclick={() => toggleLock('icon')}
					title={locks.icon ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.icon ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div class="fav-icon-wrap" class:fav-dimmed={locks.icon}>
				<div class="icon-input-group">
					<textarea
						class="icon-input"
						bind:value={favicon.icon}
						rows={3}
						placeholder="Iconify ID or paste SVG..."
						disabled={locks.icon}
					></textarea>
					{#if !locks.icon}
						<a
							href="https://icon-sets.iconify.design"
							target="_blank"
							rel="noopener"
							class="browse-link">Browse icons →</a
						>
					{/if}
				</div>
				<span class="fav-icon-label">Icon</span>
			</div>
		</div>

		<!-- ════════════════ ICON COLOR ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Icon Color</span>
			<span class="col-logo-num"></span>
			<div class="col-logo-slider color-area">
				<input type="color" bind:value={logo.iconColor} class="color-swatch" />
				<span class="color-hex">{logo.iconColor}</span>
			</div>
			<button class="reset-btn col-reset" onclick={() => resetLogoField('iconColor')} title="Reset"
				>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconColor}
					onclick={() => toggleLock('iconColor')}
					title={locks.iconColor ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconColor ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div class="col-fav-slider color-area" class:fav-dimmed={locks.iconColor}>
				<input
					type="color"
					bind:value={favicon.iconColor}
					class="color-swatch"
					disabled={locks.iconColor}
				/>
				<span class="color-hex">{favicon.iconColor}</span>
			</div>
			<span class="col-fav-num"></span>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.iconColor}>
				Icon Color
			</span>
		</div>

		<!-- ════════════════ COLOR MODE ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Color Mode</span>
			<span class="col-logo-num"></span>
			<div class="col-logo-slider">
				<select bind:value={logo.iconColorModeKey} class="mode-select">
					<option value="auto">auto</option>
					<option value="original">original</option>
					<option value="monochrome">monochrome</option>
					<option value="grayscale">grayscale</option>
					<option value="grayscale-tint">grayscale-tint</option>
					<option value="hue">hue remap</option>
				</select>
			</div>
			<span class="col-reset"></span>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconColorModeKey}
					onclick={() => toggleLock('iconColorModeKey')}
					title={locks.iconColorModeKey ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconColorModeKey ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div class="col-fav-slider" class:fav-dimmed={locks.iconColorModeKey}>
				<select
					bind:value={favicon.iconColorModeKey}
					class="mode-select"
					disabled={locks.iconColorModeKey}
				>
					<option value="auto">auto</option>
					<option value="original">original</option>
					<option value="monochrome">monochrome</option>
					<option value="grayscale">grayscale</option>
					<option value="grayscale-tint">grayscale-tint</option>
					<option value="hue">hue remap</option>
				</select>
			</div>
			<span class="col-fav-num"></span>
			<span
				class="col-fav-label row-label fav-side-label"
				class:fav-dimmed={locks.iconColorModeKey}
			>
				Color Mode
			</span>
		</div>

		<!-- ════════════════ HUE (conditional) ════════════════ -->
		{#if logo.iconColorModeKey === 'hue' || (!locks.iconColorModeKey && favicon.iconColorModeKey === 'hue')}
			<div class="ctrl-row">
				<span class="col-logo-label row-label">Hue</span>
				{#if logo.iconColorModeKey === 'hue'}
					<input
						type="number"
						min="0"
						max="360"
						bind:value={logo.hueValue}
						class="ctrl-number col-logo-num"
					/>
					<input
						type="range"
						min="0"
						max="360"
						bind:value={logo.hueValue}
						class="ctrl-slider col-logo-slider"
					/>
				{:else}
					<span class="col-logo-num"></span>
					<span class="col-logo-slider"></span>
				{/if}
				<button class="reset-btn col-reset" onclick={() => resetLogoField('hueValue')} title="Reset"
					>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.hueValue}
						onclick={() => toggleLock('hueValue')}
						title={locks.hueValue ? 'Locked to logo' : 'Unlock favicon'}
					>
						{@html locks.hueValue ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				{#if !locks.hueValue && favicon.iconColorModeKey === 'hue'}
					<input
						type="range"
						min="0"
						max="360"
						bind:value={favicon.hueValue}
						class="ctrl-slider col-fav-slider"
					/>
					<input
						type="number"
						min="0"
						max="360"
						bind:value={favicon.hueValue}
						class="ctrl-number col-fav-num"
					/>
					<span class="col-fav-label row-label fav-side-label">Hue</span>
				{:else if locks.hueValue}
					<input
						type="range"
						min="0"
						max="360"
						value={effectiveFavicon.hueValue}
						class="ctrl-slider col-fav-slider fav-dimmed"
						disabled
					/>
					<input
						type="number"
						min="0"
						max="360"
						value={effectiveFavicon.hueValue}
						class="ctrl-number col-fav-num fav-dimmed"
						disabled
					/>
					<span class="col-fav-label row-label fav-side-label fav-dimmed"
						>{effectiveFavicon.hueValue}</span
					>
				{:else}
					<span class="col-fav-slider"></span>
					<span class="col-fav-num"></span>
					<span class="col-fav-label"></span>
				{/if}
			</div>
		{/if}

		<!-- ════════════════ SATURATION (conditional) ════════════════ -->
		{#if logo.iconColorModeKey === 'hue' || (!locks.iconColorModeKey && favicon.iconColorModeKey === 'hue')}
			<div class="ctrl-row">
				<span class="col-logo-label row-label">Saturation</span>
				{#if logo.iconColorModeKey === 'hue'}
					<input
						type="number"
						min="0"
						max="100"
						bind:value={logo.saturationValue}
						class="ctrl-number col-logo-num"
					/>
					<input
						type="range"
						min="0"
						max="100"
						bind:value={logo.saturationValue}
						class="ctrl-slider col-logo-slider"
					/>
				{:else}
					<span class="col-logo-num"></span>
					<span class="col-logo-slider"></span>
				{/if}
				<button
					class="reset-btn col-reset"
					onclick={() => resetLogoField('saturationValue')}
					title="Reset">↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.saturationValue}
						onclick={() => toggleLock('saturationValue')}
						title={locks.saturationValue ? 'Locked to logo' : 'Unlock favicon'}
					>
						{@html locks.saturationValue ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				{#if !locks.saturationValue && favicon.iconColorModeKey === 'hue'}
					<input
						type="range"
						min="0"
						max="100"
						bind:value={favicon.saturationValue}
						class="ctrl-slider col-fav-slider"
					/>
					<input
						type="number"
						min="0"
						max="100"
						bind:value={favicon.saturationValue}
						class="ctrl-number col-fav-num"
					/>
					<span class="col-fav-label row-label fav-side-label">Saturation</span>
				{:else if locks.saturationValue}
					<input
						type="range"
						min="0"
						max="100"
						value={effectiveFavicon.saturationValue}
						class="ctrl-slider col-fav-slider fav-dimmed"
						disabled
					/>
					<input
						type="number"
						min="0"
						max="100"
						value={effectiveFavicon.saturationValue}
						class="ctrl-number col-fav-num fav-dimmed"
						disabled
					/>
					<span class="col-fav-label row-label fav-side-label fav-dimmed"
						>{effectiveFavicon.saturationValue}</span
					>
				{:else}
					<span class="col-fav-slider"></span>
					<span class="col-fav-num"></span>
					<span class="col-fav-label"></span>
				{/if}
			</div>
		{/if}

		<!-- ════════════════ ICON SIZE ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Icon Size</span>
			<input
				type="number"
				min="10"
				max="100"
				bind:value={logo.iconSize}
				class="ctrl-number col-logo-num"
			/>
			<input
				type="range"
				min="10"
				max="100"
				bind:value={logo.iconSize}
				class="ctrl-slider col-logo-slider"
			/>
			<button class="reset-btn col-reset" onclick={() => resetLogoField('iconSize')} title="Reset"
				>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconSize}
					onclick={() => toggleLock('iconSize')}
					title={locks.iconSize ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconSize ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="10"
				max="100"
				bind:value={favicon.iconSize}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.iconSize}
				disabled={locks.iconSize}
			/>
			<input
				type="number"
				min="10"
				max="100"
				bind:value={favicon.iconSize}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.iconSize}
				disabled={locks.iconSize}
			/>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.iconSize}>
				Icon Size
			</span>
		</div>

		<!-- ════════════════ OFFSET X ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Offset X</span>
			<input
				type="number"
				min="-50"
				max="50"
				bind:value={logo.iconOffsetX}
				class="ctrl-number col-logo-num"
			/>
			<input
				type="range"
				min="-50"
				max="50"
				bind:value={logo.iconOffsetX}
				class="ctrl-slider col-logo-slider"
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('iconOffsetX')}
				title="Reset">↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconOffsetX}
					onclick={() => toggleLock('iconOffsetX')}
					title={locks.iconOffsetX ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconOffsetX ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="-50"
				max="50"
				bind:value={favicon.iconOffsetX}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.iconOffsetX}
				disabled={locks.iconOffsetX}
			/>
			<input
				type="number"
				min="-50"
				max="50"
				bind:value={favicon.iconOffsetX}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.iconOffsetX}
				disabled={locks.iconOffsetX}
			/>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.iconOffsetX}>
				Offset X
			</span>
		</div>

		<!-- ════════════════ OFFSET Y ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Offset Y</span>
			<input
				type="number"
				min="-50"
				max="50"
				bind:value={logo.iconOffsetY}
				class="ctrl-number col-logo-num"
			/>
			<input
				type="range"
				min="-50"
				max="50"
				bind:value={logo.iconOffsetY}
				class="ctrl-slider col-logo-slider"
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('iconOffsetY')}
				title="Reset">↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconOffsetY}
					onclick={() => toggleLock('iconOffsetY')}
					title={locks.iconOffsetY ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconOffsetY ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="-50"
				max="50"
				bind:value={favicon.iconOffsetY}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.iconOffsetY}
				disabled={locks.iconOffsetY}
			/>
			<input
				type="number"
				min="-50"
				max="50"
				bind:value={favicon.iconOffsetY}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.iconOffsetY}
				disabled={locks.iconOffsetY}
			/>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.iconOffsetY}>
				Offset Y
			</span>
		</div>

		<!-- ════════════════ ROTATION ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Rotation</span>
			<input
				type="number"
				min="-180"
				max="180"
				bind:value={logo.iconRotation}
				class="ctrl-number col-logo-num"
			/>
			<input
				type="range"
				min="-180"
				max="180"
				bind:value={logo.iconRotation}
				class="ctrl-slider col-logo-slider"
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('iconRotation')}
				title="Reset">↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.iconRotation}
					onclick={() => toggleLock('iconRotation')}
					title={locks.iconRotation ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.iconRotation ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="-180"
				max="180"
				bind:value={favicon.iconRotation}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.iconRotation}
				disabled={locks.iconRotation}
			/>
			<input
				type="number"
				min="-180"
				max="180"
				bind:value={favicon.iconRotation}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.iconRotation}
				disabled={locks.iconRotation}
			/>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.iconRotation}>
				Rotation
			</span>
		</div>

		<!-- ════════════════ CORNER RADIUS ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Corner Radius</span>
			<input
				type="number"
				min="0"
				max="50"
				bind:value={logo.cornerRadius}
				class="ctrl-number col-logo-num"
			/>
			<input
				type="range"
				min="0"
				max="50"
				bind:value={logo.cornerRadius}
				class="ctrl-slider col-logo-slider"
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('cornerRadius')}
				title="Reset">↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.cornerRadius}
					onclick={() => toggleLock('cornerRadius')}
					title={locks.cornerRadius ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.cornerRadius ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="0"
				max="50"
				bind:value={favicon.cornerRadius}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.cornerRadius}
				disabled={locks.cornerRadius}
			/>
			<input
				type="number"
				min="0"
				max="50"
				bind:value={favicon.cornerRadius}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.cornerRadius}
				disabled={locks.cornerRadius}
			/>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.cornerRadius}>
				Corner Radius
			</span>
		</div>

		<!-- ════════════════ CORNER K + PRESETS (combined row) ════════════════ -->
		<div class="ctrl-row corner-k-row">
			<span class="col-logo-label row-label">
				Corner K
				<span class="k-label">{cornerKLabel(logo.cornerK)}</span>
			</span>
			<div class="k-num-slider-logo">
				<div class="k-top-row">
					<input
						type="number"
						min="-10"
						max="10"
						step="0.1"
						bind:value={logo.cornerK}
						class="ctrl-number"
					/>
					<input
						type="range"
						min="-10"
						max="10"
						step="0.1"
						bind:value={logo.cornerK}
						class="ctrl-slider"
					/>
				</div>
				<div class="k-presets">
					<button onclick={() => (logo.cornerK = 10)}>square</button>
					<button onclick={() => (logo.cornerK = 2)}>squircle</button>
					<button onclick={() => (logo.cornerK = 1)}>round</button>
					<button onclick={() => (logo.cornerK = 0)}>bevel</button>
					<button onclick={() => (logo.cornerK = -1)}>scoop</button>
					<button onclick={() => (logo.cornerK = -10)}>notch</button>
				</div>
			</div>
			<button class="reset-btn col-reset" onclick={() => resetLogoField('cornerK')} title="Reset"
				>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.cornerK}
					onclick={() => toggleLock('cornerK')}
					title={locks.cornerK ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.cornerK ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div class="k-num-slider-fav" class:fav-dimmed={locks.cornerK}>
				<div class="k-top-row">
					<input
						type="range"
						min="-10"
						max="10"
						step="0.1"
						bind:value={favicon.cornerK}
						class="ctrl-slider"
						disabled={locks.cornerK}
					/>
					<input
						type="number"
						min="-10"
						max="10"
						step="0.1"
						bind:value={favicon.cornerK}
						class="ctrl-number"
						disabled={locks.cornerK}
					/>
				</div>
				{#if !locks.cornerK}
					<div class="k-presets">
						<button onclick={() => (favicon.cornerK = 10)}>square</button>
						<button onclick={() => (favicon.cornerK = 2)}>squircle</button>
						<button onclick={() => (favicon.cornerK = 1)}>round</button>
						<button onclick={() => (favicon.cornerK = 0)}>bevel</button>
						<button onclick={() => (favicon.cornerK = -1)}>scoop</button>
						<button onclick={() => (favicon.cornerK = -10)}>notch</button>
					</div>
				{/if}
			</div>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.cornerK}>
				Corner K
				<span class="k-label">{cornerKLabel(effectiveFavicon.cornerK)}</span>
			</span>
		</div>

		<!-- ════════════════ BACKGROUND TOGGLE ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label">Background</span>
			<span class="col-logo-num"></span>
			<div class="col-logo-slider">
				<label class="toggle-label">
					<input type="checkbox" bind:checked={logo.useGradient} />
					Gradient
				</label>
			</div>
			<span class="col-reset"></span>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.useGradient}
					onclick={() => toggleLock('useGradient')}
					title={locks.useGradient ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.useGradient ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div class="col-fav-slider" class:fav-dimmed={locks.useGradient}>
				<label class="toggle-label">
					<input type="checkbox" bind:checked={favicon.useGradient} disabled={locks.useGradient} />
					Gradient
				</label>
			</div>
			<span class="col-fav-num"></span>
			<span class="col-fav-label row-label fav-side-label" class:fav-dimmed={locks.useGradient}>
				Background
			</span>
		</div>

		<!-- ════════════════ SOLID COLOR ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label" class:fav-dimmed={logo.useGradient}>Solid Color</span>
			<span class="col-logo-num"></span>
			<div class="col-logo-slider color-area" class:fav-dimmed={logo.useGradient}>
				<input
					type="color"
					bind:value={logo.solidColor}
					class="color-swatch"
					disabled={logo.useGradient}
				/>
				<span class="color-hex">{logo.solidColor}</span>
			</div>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('solidColor')}
				title="Reset"
				class:fav-dimmed={logo.useGradient}>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.solidColor}
					onclick={() => toggleLock('solidColor')}
					title={locks.solidColor ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.solidColor ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<div
				class="col-fav-slider color-area"
				class:fav-dimmed={locks.solidColor || effectiveFavicon.useGradient}
			>
				<input
					type="color"
					bind:value={favicon.solidColor}
					class="color-swatch"
					disabled={locks.solidColor || effectiveFavicon.useGradient}
				/>
				<span class="color-hex">{favicon.solidColor}</span>
			</div>
			<span class="col-fav-num"></span>
			<span
				class="col-fav-label row-label fav-side-label"
				class:fav-dimmed={locks.solidColor || effectiveFavicon.useGradient}
			>
				Solid Color
			</span>
		</div>

		<!-- ════════════════ GRADIENT ANGLE ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label" class:fav-dimmed={!logo.useGradient}>Grad Angle</span>
			<input
				type="number"
				min="0"
				max="360"
				bind:value={logo.gradientAngle}
				class="ctrl-number col-logo-num"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<input
				type="range"
				min="0"
				max="360"
				bind:value={logo.gradientAngle}
				class="ctrl-slider col-logo-slider"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('gradientAngle')}
				title="Reset"
				class:fav-dimmed={!logo.useGradient}>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.gradientAngle}
					onclick={() => toggleLock('gradientAngle')}
					title={locks.gradientAngle ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.gradientAngle ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="0"
				max="360"
				bind:value={favicon.gradientAngle}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.gradientAngle || !effectiveFavicon.useGradient}
				disabled={locks.gradientAngle || !effectiveFavicon.useGradient}
			/>
			<input
				type="number"
				min="0"
				max="360"
				bind:value={favicon.gradientAngle}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.gradientAngle || !effectiveFavicon.useGradient}
				disabled={locks.gradientAngle || !effectiveFavicon.useGradient}
			/>
			<span
				class="col-fav-label row-label fav-side-label"
				class:fav-dimmed={locks.gradientAngle || !effectiveFavicon.useGradient}
			>
				Grad Angle
			</span>
		</div>

		<!-- ════════════════ GRADIENT POSITION ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label" class:fav-dimmed={!logo.useGradient}
				>Grad Position</span
			>
			<input
				type="number"
				min="-100"
				max="100"
				bind:value={logo.gradientPosition}
				class="ctrl-number col-logo-num"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<input
				type="range"
				min="-100"
				max="100"
				bind:value={logo.gradientPosition}
				class="ctrl-slider col-logo-slider"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('gradientPosition')}
				title="Reset"
				class:fav-dimmed={!logo.useGradient}>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.gradientPosition}
					onclick={() => toggleLock('gradientPosition')}
					title={locks.gradientPosition ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.gradientPosition ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="-100"
				max="100"
				bind:value={favicon.gradientPosition}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.gradientPosition || !effectiveFavicon.useGradient}
				disabled={locks.gradientPosition || !effectiveFavicon.useGradient}
			/>
			<input
				type="number"
				min="-100"
				max="100"
				bind:value={favicon.gradientPosition}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.gradientPosition || !effectiveFavicon.useGradient}
				disabled={locks.gradientPosition || !effectiveFavicon.useGradient}
			/>
			<span
				class="col-fav-label row-label fav-side-label"
				class:fav-dimmed={locks.gradientPosition || !effectiveFavicon.useGradient}
			>
				Grad Position
			</span>
		</div>

		<!-- ════════════════ GRADIENT SCALE ════════════════ -->
		<div class="ctrl-row">
			<span class="col-logo-label row-label" class:fav-dimmed={!logo.useGradient}>Grad Scale</span>
			<input
				type="number"
				min="0.1"
				max="3"
				step="0.05"
				bind:value={logo.gradientScale}
				class="ctrl-number col-logo-num"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<input
				type="range"
				min="0.1"
				max="3"
				step="0.05"
				bind:value={logo.gradientScale}
				class="ctrl-slider col-logo-slider"
				class:fav-dimmed={!logo.useGradient}
				disabled={!logo.useGradient}
			/>
			<button
				class="reset-btn col-reset"
				onclick={() => resetLogoField('gradientScale')}
				title="Reset"
				class:fav-dimmed={!logo.useGradient}>↺</button
			>
			<div class="lock-col col-lock">
				<button
					class="lock-btn"
					class:locked={locks.gradientScale}
					onclick={() => toggleLock('gradientScale')}
					title={locks.gradientScale ? 'Locked to logo' : 'Unlock favicon'}
				>
					{@html locks.gradientScale ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</div>
			<input
				type="range"
				min="0.1"
				max="3"
				step="0.05"
				bind:value={favicon.gradientScale}
				class="ctrl-slider col-fav-slider"
				class:fav-dimmed={locks.gradientScale || !effectiveFavicon.useGradient}
				disabled={locks.gradientScale || !effectiveFavicon.useGradient}
			/>
			<input
				type="number"
				min="0.1"
				max="3"
				step="0.05"
				bind:value={favicon.gradientScale}
				class="ctrl-number col-fav-num"
				class:fav-dimmed={locks.gradientScale || !effectiveFavicon.useGradient}
				disabled={locks.gradientScale || !effectiveFavicon.useGradient}
			/>
			<span
				class="col-fav-label row-label fav-side-label"
				class:fav-dimmed={locks.gradientScale || !effectiveFavicon.useGradient}
			>
				Grad Scale
			</span>
		</div>
	</div>

	<!-- ── App info ─────────────────────────────────────────────────────── -->
	<details class="app-info">
		<summary>App info (for manifest &amp; HTML snippet)</summary>
		<div class="app-info-fields">
			<label>
				App name
				<input type="text" bind:value={appName} />
			</label>
			<label>
				Short name
				<input type="text" bind:value={appShortName} />
			</label>
		</div>
	</details>

	<!-- ── Download All ──────────────────────────────────────────────────── -->
	<div class="download-all">
		<button onclick={downloadAll} disabled={downloading} class="download-all-btn">
			{downloading ? 'Generating…' : 'Download All (zip kit)'}
		</button>
	</div>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	main {
		max-width: var(--nc-content-width, 1100px);
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
	}

	/* h2 acts as column label below the preview buttons */
	h2 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: center;
		color: #555;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	/* ── Preview row ───────────────────────────────────────────────────── */

	.preview-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}

	.preview-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.preview-gap {
		width: 36px;
		flex-shrink: 0;
	}

	.checkerboard {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 50% / 20px 20px;
		border-radius: 8px;
		border: 1px solid #ddd;
		width: 100%;
		box-sizing: border-box;
	}

	.favicon-preview {
		flex-direction: row;
		gap: 1.5rem;
		justify-content: center;
		padding: 1rem 2rem;
	}

	.favicon-size {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.size-label {
		font-size: 0.7rem;
		color: #888;
	}

	.preview-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.preview-actions button {
		padding: 0.35rem 0.85rem;
		font-size: 0.85rem;
		border-radius: 5px;
		cursor: pointer;
		border: 1px solid #0029c1;
		background: #0029c1;
		color: #fff;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.preview-actions button:hover {
		background: #3973ff;
		border-color: #3973ff;
	}

	.preview-actions button.active {
		background: #16a34a;
		border-color: #16a34a;
	}

	/* ── Controls grid ─────────────────────────────────────────────────── */
	/*
	  8 columns:
	  1: reset btn  24px
	  2: logo num   54px
	  3: logo slider 1fr
	  4: logo label  90px   (right-aligned, closest to center)
	  5: lock btn    36px   (center gutter)
	  6: fav label   90px   (left-aligned, closest to center)
	  7: fav slider  1fr
	  8: fav num     54px
	*/

	/*
	 * Controls grid: flex column wrapper. Each .ctrl-row is its own 8-col grid
	 * with identical column definitions so columns visually align across rows.
	 * NOT using subgrid — subgrid causes all rows to inherit the icon textarea's
	 * height (141px tall rows).
	 *
	 * Col layout (labels outermost):
	 * 1: logo label  (90px, right-aligned)
	 * 2: logo num    (54px)
	 * 3: logo slider (1fr)
	 * 4: logo reset  (28px, closest to center)
	 * 5: lock btn    (36px, center)
	 * 6: fav slider  (1fr)
	 * 7: fav num     (54px)
	 * 8: fav label   (90px, left-aligned)
	 */
	.controls-grid {
		display: flex;
		flex-direction: column;
		margin-bottom: 1.5rem;
	}

	.ctrl-row {
		display: grid;
		grid-template-columns: 90px 54px 1fr 28px 36px 1fr 54px 90px;
		align-items: center;
		gap: 0 0.4rem;
		min-height: 36px;
		padding: 4px 0.3rem;
		border-radius: 4px;
	}

	.ctrl-row:nth-child(even) {
		background: rgba(0, 0, 0, 0.035);
	}

	/* Column position helpers */
	.col-logo-label {
		grid-column: 1;
	}
	.col-logo-num {
		grid-column: 2;
	}
	.col-logo-slider {
		grid-column: 3;
	}
	.col-reset {
		grid-column: 4;
	}
	.col-lock {
		grid-column: 5;
	}
	.col-fav-slider {
		grid-column: 6;
	}
	.col-fav-num {
		grid-column: 7;
	}
	.col-fav-label {
		grid-column: 8;
	}

	/* Row labels */
	.row-label {
		font-size: 0.82rem;
		font-weight: 500;
		color: #444;
		white-space: nowrap;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.col-logo-label.row-label {
		text-align: right;
		align-items: flex-end;
	}

	.fav-side-label {
		text-align: left;
		align-items: flex-start;
	}

	/* K sub-label */
	.k-label {
		font-weight: 400;
		font-size: 0.72rem;
		color: #888;
	}

	/* ── Icon row (special: spans cols 1-4 for logo, 6-8 for fav) ──────── */

	.icon-row {
		align-items: start;
		padding-top: 0.4rem;
		padding-bottom: 0.4rem;
	}

	.logo-icon-wrap {
		grid-column: 1 / 4;
		display: grid;
		grid-template-columns: 90px 1fr;
		gap: 0 0.4rem;
		align-items: start;
	}

	.logo-icon-wrap .icon-label {
		grid-column: 1;
		align-self: start;
		font-size: 0.82rem;
		font-weight: 500;
		color: #444;
		text-align: right;
		padding-top: 0.25rem;
	}

	.logo-icon-wrap .icon-input-group {
		grid-column: 2;
	}

	.icon-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.fav-icon-wrap {
		grid-column: 6 / -1;
		display: grid;
		grid-template-columns: 1fr 90px;
		gap: 0 0.4rem;
		align-items: start;
	}

	.fav-icon-wrap .icon-input-group {
		grid-column: 1;
	}

	.fav-icon-wrap .fav-icon-label {
		grid-column: 2;
		align-self: start;
		font-size: 0.82rem;
		font-weight: 500;
		color: #444;
		text-align: left;
		padding-top: 0.25rem;
	}

	/* ── Inputs ─────────────────────────────────────────────────────────── */

	.ctrl-slider {
		width: 100%;
		min-width: 0;
		margin: 0;
	}

	.ctrl-number {
		width: 100%;
		padding: 0.2rem 0.3rem;
		font-size: 0.82rem;
		text-align: right;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
		/* Consistent height with reset button */
		height: 28px;
		margin: 0;
	}

	.icon-input {
		width: 100%;
		padding: 0.3rem 0.4rem;
		font-size: 0.8rem;
		font-family: monospace;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
		box-sizing: border-box;
		margin: 0;
	}

	.browse-link {
		font-size: 0.78rem;
		color: #0029c1;
		text-decoration: none;
	}

	.browse-link:hover {
		text-decoration: underline;
	}

	.color-area {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.color-swatch {
		width: 44px;
		height: 28px;
		padding: 2px;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		flex-shrink: 0;
		margin: 0;
	}

	.color-hex {
		font-size: 0.78rem;
		font-family: monospace;
		color: #555;
	}

	.mode-select {
		width: 100%;
		padding: 0.2rem 0.3rem;
		font-size: 0.82rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		margin: 0;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	/* ── Reset button ──────────────────────────────────────────────────── */

	.reset-btn {
		/* Square: same size as the number input height */
		width: 28px;
		height: 28px;
		padding: 0;
		font-size: 0.85rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #f5f5f5;
		color: #555;
		cursor: pointer;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.1s;
		flex-shrink: 0;
	}

	.reset-btn:hover {
		background: #e0e0e0;
	}

	/* ── Lock button ───────────────────────────────────────────────────── */

	.lock-col {
		display: flex;
		justify-content: center;
	}

	.lock-btn {
		background: none;
		border: 1px solid #ddd;
		border-radius: 4px;
		/* Square: same size as reset button */
		width: 28px;
		height: 28px;
		padding: 0;
		cursor: pointer;
		font-size: 0.85rem;
		color: #aaa;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.lock-btn.locked {
		border-color: #bbb;
		color: #666;
	}

	.lock-btn:hover {
		border-color: #999;
		color: #333;
	}

	/* ── Favicon dimmed (locked) state ─────────────────────────────────── */

	.fav-dimmed {
		opacity: 0.42;
		pointer-events: none;
	}

	/* ── Corner K combined row ──────────────────────────────────────────── */

	.corner-k-row {
		align-items: start;
		padding-top: 6px;
		padding-bottom: 6px;
	}

	.corner-k-row > .row-label {
		padding-top: 4px;
	}

	/* Span num + slider columns (logo side: cols 2-3) */
	.k-num-slider-logo {
		grid-column: 2 / 4;
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-self: start;
	}

	/* Span slider + num columns (fav side: cols 6-7) */
	.k-num-slider-fav {
		grid-column: 6 / 8;
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-self: start;
	}

	.k-top-row {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		height: 28px;
	}

	.k-top-row .ctrl-number {
		width: 54px;
		flex-shrink: 0;
	}

	.k-top-row .ctrl-slider {
		flex: 1;
		min-width: 0;
	}

	.k-presets {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.k-num-slider-fav .k-presets {
		justify-content: flex-end;
	}

	.k-presets button {
		font-size: 0.72rem;
		padding: 0.12rem 0.35rem;
		border: 1px solid #bbb;
		border-radius: 3px;
		background: #f5f5f5;
		color: #333;
		cursor: pointer;
		transition: background 0.1s;
	}

	.k-presets button:hover {
		background: #e0e0e0;
	}

	/* ── App info ──────────────────────────────────────────────────────── */

	.app-info {
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
	}

	.app-info summary {
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: #444;
		user-select: none;
	}

	.app-info-fields {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.app-info-fields label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.app-info-fields input {
		padding: 0.3rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9rem;
		min-width: 180px;
	}

	/* ── Download All ──────────────────────────────────────────────────── */

	.download-all {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0 1rem;
	}

	.download-all-btn {
		padding: 0.65rem 2rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 7px;
		background: #0029c1;
		color: #fff;
		cursor: pointer;
		transition: background 0.15s;
	}

	.download-all-btn:hover:not(:disabled) {
		background: #3973ff;
	}

	.download-all-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	/* ── Responsive ────────────────────────────────────────────────────── */

	@media (max-width: 600px) {
		.controls-grid {
			grid-template-columns: 64px 40px 1fr 18px 28px 1fr 40px 64px;
			font-size: 0.78rem;
		}

		.col-logo-label.row-label,
		.fav-side-label {
			font-size: 0.74rem;
		}
	}

	@media (max-width: 480px) {
		.preview-row {
			flex-direction: column;
		}

		.preview-gap {
			display: none;
		}
	}
</style>
