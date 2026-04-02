<script lang="ts">
	import { onMount } from 'svelte';
	import AppLogo from '$lib/AppLogo.svelte';
	import { tooltip } from '$lib/tooltip.js';
	import { generateAppLogoSvg } from '$lib/app-logo/generate-svg.js';
	import { generateAppLogoPng } from '$lib/app-logo/generate-png.js';
	import { generateZipKit } from '$lib/app-logo/generate-favicon-set.js';
	import { generateCornerPath } from '$lib/app-logo/squircle.js';
	import { pngToIco } from '$lib/app-logo/generate-ico.js';
	import {
		type ColumnState,
		DEFAULT_STATE,
		DEFAULT_LOCKS,
		cornerKToShape,
		cornerKLabel,
		iconColorModeFromFlat,
		backgroundFromFlat,
		buildVariantConfig,
		buildFullConfig,
		generateSvelteSnippet,
		generateHtmlSnippet,
		encodeConfigToHash,
		decodeConfigFromHash,
		configToUIState
	} from '$lib/app-logo/config-serialization.js';
	import { DEFAULT_EMOJI_STYLE, EMOJI_SETS, detectIconSource } from '$lib/app-logo/defaults.js';
	import { resolveEmojiName } from '$lib/app-logo/iconify.js';

	// ─── Name derivation from icon ──────────────────────────────────────────

	/** Title-case a slug: replace hyphens/underscores with spaces, capitalize words */
	function titleCase(slug: string): string {
		return slug
			.replace(/[-_]/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase())
			.trim();
	}

	/**
	 * Derive a human-readable app name from the icon string (synchronous).
	 * - Iconify ID (e.g. "fxemoji:rocket") → "Rocket"
	 * - Emoji character → "My App" (placeholder; async resolution upgrades this)
	 * - Inline SVG → "My App" (generic)
	 * - Plain text → the text itself
	 */
	function deriveNameFromIcon(icon: string): { name: string; shortName: string } {
		const source = detectIconSource(icon);
		switch (source) {
			case 'iconify': {
				// Extract part after the last colon, e.g. "fxemoji:rocket" → "rocket"
				const parts = icon.split(':');
				const raw = parts[parts.length - 1] || 'App';
				const name = titleCase(raw);
				return { name, shortName: name };
			}
			case 'emoji':
				// Placeholder — async resolveEmojiName() will upgrade this
				return { name: 'My App', shortName: 'App' };
			case 'svg':
			case 'data-url':
				return { name: 'My App', shortName: 'App' };
			default:
				return { name: icon.trim() || 'My App', shortName: icon.trim() || 'App' };
		}
	}

	// ─── Lock icons (icomoon-free, inlined to avoid async fetch) ─────────────

	// Lock icons from icomoon-free, adjusted so the padlock body occupies the
	// same visual position in both states. Both use translate(3,0) on the path
	// to center the body in the 16×16 frame. The unlocked icon uses
	// overflow="visible" so the open shackle extends past the viewBox.
	const ICON_LOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" transform="translate(3,0)" d="M9.25 7H9V4c0-1.654-1.346-3-3-3H4C2.346 1 1 2.346 1 4v3H.75a.753.753 0 0 0-.75.75v7.5c0 .412.338.75.75.75h8.5c.412 0 .75-.338.75-.75v-7.5A.753.753 0 0 0 9.25 7M3 4c0-.551.449-1 1-1h2c.551 0 1 .449 1 1v3H3z"/></svg>`;
	const ICON_UNLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16" overflow="visible"><path fill="currentColor" transform="translate(3,0)" d="M12 1c1.654 0 3 1.346 3 3v3h-2V4c0-.551-.449-1-1-1h-2c-.551 0-1 .449-1 1v3h.25c.412 0 .75.338.75.75v7.5c0 .412-.338.75-.75.75H.75a.753.753 0 0 1-.75-.75v-7.5C0 7.338.338 7 .75 7H7V4c0-1.654 1.346-3 3-3z"/></svg>`;

	// ─── Column State ──────────────────────────────────────────────────────────

	let logo = $state<ColumnState>({ ...DEFAULT_STATE });
	// favicon holds the user's own values (used when unlocked)
	let favicon = $state<ColumnState>({ ...DEFAULT_STATE });

	// ─── Additional State ─────────────────────────────────────────────────────

	// Auto-derive initial names from the default icon
	const initialNames = deriveNameFromIcon(DEFAULT_STATE.icon);
	let appName = $state(initialNames.name);
	let appShortName = $state(initialNames.shortName);
	// Track whether the user has manually edited the name fields.
	// Once manually edited, we stop auto-syncing from the icon.
	let nameManuallyEdited = $state(false);
	let shortNameManuallyEdited = $state(false);

	let emojiStyle = $state(DEFAULT_EMOJI_STYLE);

	// Auto-sync names from logo icon when not manually edited.
	// First applies the synchronous derivation (instant), then for emoji icons
	// fires an async lookup to resolve the human-readable emoji name.
	$effect(() => {
		const icon = logo.icon;
		const style = emojiStyle;
		const derived = deriveNameFromIcon(icon);

		if (!nameManuallyEdited) appName = derived.name;
		if (!shortNameManuallyEdited) appShortName = derived.shortName;

		// For emoji icons, asynchronously resolve the human-readable name
		if (detectIconSource(icon) === 'emoji' && style !== 'native') {
			resolveEmojiName(icon, style).then((slug) => {
				if (slug && logo.icon === icon) {
					const name = titleCase(slug);
					if (!nameManuallyEdited) appName = name;
					if (!shortNameManuallyEdited) appShortName = name;
				}
			});
		}
	});
	// ─── Manifest color derivation from background ────────────────────────────

	// Manifest colors default to the logo's primary background color.
	// Once manually edited, auto-sync stops (same pattern as app name).
	let themeColor = $state(logo.solidColor);
	let backgroundColor = $state(logo.solidColor);
	let themeColorManuallyEdited = $state(false);
	let bgColorManuallyEdited = $state(false);

	// Auto-sync manifest colors from background settings.
	// Uses solidColor as the representative color — it's the solid background
	// color when gradients are off, or the primary gradient stop color.
	$effect(() => {
		const color = logo.solidColor;
		if (!themeColorManuallyEdited) themeColor = color;
		if (!bgColorManuallyEdited) backgroundColor = color;
	});

	let copying = $state<'logo' | 'favicon' | null>(null);
	let downloading = $state(false);
	let showGuidelines = $state(true);
	let guidelineInsetPct = $state(7.5); // % of 256px — default matches Apple icon grid

	// Is the current logo icon an emoji?
	let isEmojiIcon = $derived(detectIconSource(logo.icon) === 'emoji');

	// ─── Lock State ───────────────────────────────────────────────────────────

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
		iconMirrorH: locks.iconMirrorH ? logo.iconMirrorH : favicon.iconMirrorH,
		iconMirrorV: locks.iconMirrorV ? logo.iconMirrorV : favicon.iconMirrorV,
		grayscaleLightness: locks.grayscaleLightness
			? logo.grayscaleLightness
			: favicon.grayscaleLightness,
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

	// ─── Derived: Logo props ─────────────────────────────────────────────────

	let logoCornerShape = $derived(cornerKToShape(logo.cornerK));
	let logoIconColorMode = $derived(
		iconColorModeFromFlat(logo.iconColorModeKey, logo.hueValue, logo.saturationValue)
	);
	let logoBackground = $derived(backgroundFromFlat(logo));

	// Guidelines: outer shape path at 256px, matching current corner settings
	let guidelineShapePath = $derived(generateCornerPath(256, logo.cornerRadius, logoCornerShape));
	// Guideline inset in px at 256px preview size
	let guidelineInset = $derived((guidelineInsetPct / 100) * 256);

	// ─── Derived: Favicon props ──────────────────────────────────────────────

	let faviconCornerShape = $derived(cornerKToShape(effectiveFavicon.cornerK));
	let faviconIconColorMode = $derived(
		iconColorModeFromFlat(
			effectiveFavicon.iconColorModeKey,
			effectiveFavicon.hueValue,
			effectiveFavicon.saturationValue
		)
	);
	let faviconBackground = $derived(backgroundFromFlat(effectiveFavicon));

	// ─── Derived: Export Configs ──────────────────────────────────────────────

	let logoExportConfig = $derived(buildVariantConfig(logo, 'logo', emojiStyle));
	let faviconExportConfig = $derived(buildVariantConfig(effectiveFavicon, 'favicon', emojiStyle));
	let fullConfig = $derived(buildFullConfig(logo, effectiveFavicon, locks, emojiStyle));

	// ─── Helpers ──────────────────────────────────────────────────────────────

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

	// ─── Copy Snippets ───────────────────────────────────────────────────────

	let snippetCopied = $state<'html' | 'svelte' | null>(null);

	async function copyHtmlSnippet() {
		snippetCopied = 'html';
		try {
			const html = generateHtmlSnippet(appInfo);
			await navigator.clipboard.writeText(html);
		} finally {
			setTimeout(() => {
				snippetCopied = null;
			}, 1500);
		}
	}

	async function copySvelteSnippet() {
		snippetCopied = 'svelte';
		try {
			const svelte = generateSvelteSnippet(fullConfig);
			await navigator.clipboard.writeText(svelte);
		} finally {
			setTimeout(() => {
				snippetCopied = null;
			}, 1500);
		}
	}

	// ─── Download All ─────────────────────────────────────────────────────────

	async function downloadAll() {
		downloading = true;
		try {
			const zip = await generateZipKit(fullConfig, appInfo);
			downloadBlob(zip, zipFilename);
		} finally {
			downloading = false;
		}
	}

	// ─── Reset helpers ────────────────────────────────────────────────────────

	function resetLogoField<K extends keyof ColumnState>(field: K) {
		logo[field] = DEFAULT_STATE[field] as ColumnState[K];
	}

	function isAtDefault<K extends keyof ColumnState>(field: K): boolean {
		return logo[field] === DEFAULT_STATE[field];
	}

	// ─── Control Groups ──────────────────────────────────────────────────────

	const ICON_GROUP_FIELDS: (keyof ColumnState)[] = [
		'icon',
		'iconColor',
		'iconColorModeKey',
		'hueValue',
		'saturationValue',
		'grayscaleLightness',
		'iconSize',
		'iconOffsetX',
		'iconOffsetY',
		'iconRotation',
		'iconMirrorH',
		'iconMirrorV'
	];

	const CORNER_GROUP_FIELDS: (keyof ColumnState)[] = ['cornerRadius', 'cornerK'];

	const BG_GROUP_FIELDS: (keyof ColumnState)[] = [
		'solidColor',
		'useGradient',
		'gradientAngle',
		'gradientPosition',
		'gradientScale'
	];

	function isGroupAtDefaults(fields: (keyof ColumnState)[]): boolean {
		return fields.every((f) => logo[f] === DEFAULT_STATE[f]);
	}

	function areAllGroupFieldsLocked(fields: (keyof ColumnState)[]): boolean {
		return fields.every((f) => locks[f]);
	}

	function resetGroup(fields: (keyof ColumnState)[]) {
		for (const f of fields) {
			(logo as Record<keyof ColumnState, unknown>)[f] = DEFAULT_STATE[f];
		}
	}

	function toggleGroupLocks(fields: (keyof ColumnState)[]) {
		const allLocked = areAllGroupFieldsLocked(fields);
		for (const f of fields) {
			const wasLocked = locks[f];
			locks[f] = !allLocked;
			// When locking, snap favicon value to logo
			if (!wasLocked && locks[f]) {
				(favicon as Record<keyof ColumnState, unknown>)[f] = logo[f];
			}
		}
	}

	let iconGroupAtDefaults = $derived(isGroupAtDefaults(ICON_GROUP_FIELDS));
	let cornerGroupAtDefaults = $derived(isGroupAtDefaults(CORNER_GROUP_FIELDS));
	let bgGroupAtDefaults = $derived(isGroupAtDefaults(BG_GROUP_FIELDS));

	let iconGroupAllLocked = $derived(areAllGroupFieldsLocked(ICON_GROUP_FIELDS));
	let cornerGroupAllLocked = $derived(areAllGroupFieldsLocked(CORNER_GROUP_FIELDS));
	let bgGroupAllLocked = $derived(areAllGroupFieldsLocked(BG_GROUP_FIELDS));

	// Is grayscale mode active? (show lightness slider)
	let logoIsGrayscaleMode = $derived(
		logo.iconColorModeKey === 'grayscale' || logo.iconColorModeKey === 'grayscale-tint'
	);
	let favIsGrayscaleMode = $derived(
		favicon.iconColorModeKey === 'grayscale' || favicon.iconColorModeKey === 'grayscale-tint'
	);

	// ─── Derived: AppInfo (shared by manifest, snippets, zip) ──────────────

	let appInfo = $derived({
		name: appName,
		shortName: appShortName,
		themeColor,
		backgroundColor
	});

	// ─── Derived: Zip filename slug ─────────────────────────────────────────

	let zipSlug = $derived(
		(appShortName || appName || 'app')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'app'
	);
	let zipFilename = $derived(`${zipSlug}-logo-kit.zip`);

	// ─── Snippet preview for tooltips ────────────────────────────────────────

	let htmlSnippetPreview = $derived(generateHtmlSnippet(appInfo));
	let svelteSnippetPreview = $derived(generateSvelteSnippet(fullConfig));

	// ─── Config import/export ─────────────────────────────────────────────────

	let configJsonText = $state('');
	let configImportError = $state('');
	let configCopied = $state<'json' | 'link' | null>(null);

	function applyConfig(config: ReturnType<typeof configToUIState>) {
		// Apply to state — assign each field individually for reactivity
		const keys = Object.keys(DEFAULT_STATE) as (keyof ColumnState)[];
		for (const key of keys) {
			(logo as Record<keyof ColumnState, unknown>)[key] = config.logo[key];
			(favicon as Record<keyof ColumnState, unknown>)[key] = config.favicon[key];
			locks[key] = config.locks[key];
		}
		emojiStyle = config.emojiStyle;
	}

	function copyConfigJson() {
		configCopied = 'json';
		const json = JSON.stringify(fullConfig, null, '\t');
		navigator.clipboard.writeText(json);
		setTimeout(() => {
			configCopied = null;
		}, 1500);
	}

	function copyLink() {
		configCopied = 'link';
		const hash = encodeConfigToHash(fullConfig);
		const url = `${window.location.origin}${window.location.pathname}#config=${hash}`;
		navigator.clipboard.writeText(url);
		setTimeout(() => {
			configCopied = null;
		}, 1500);
	}

	function importConfig() {
		configImportError = '';
		try {
			const parsed = JSON.parse(configJsonText);
			if (!parsed || typeof parsed.icon !== 'string') {
				configImportError = 'Invalid config: missing "icon" field.';
				return;
			}
			const uiState = configToUIState(parsed);
			applyConfig(uiState);
			configJsonText = '';
		} catch {
			configImportError = 'Invalid JSON. Please paste a valid config.';
		}
	}

	// ─── URL hash sync ───────────────────────────────────────────────────────

	let hashSyncReady = false;

	// Load config from URL hash on mount
	onMount(() => {
		const hash = window.location.hash;
		if (hash.startsWith('#config=')) {
			const encoded = hash.slice('#config='.length);
			const config = decodeConfigFromHash(encoded);
			if (config) {
				const uiState = configToUIState(config);
				applyConfig(uiState);
			}
		}
		// Enable hash writing after initial load is applied
		// Use a microtask so the effect setup sees hashSyncReady = true
		// only after the imported state has settled
		queueMicrotask(() => {
			hashSyncReady = true;
		});
	});

	// Debounced hash update when config changes
	let hashUpdateTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		// Read fullConfig to create a dependency
		const config = fullConfig;
		if (!hashSyncReady) return;
		// Debounce at 500ms
		clearTimeout(hashUpdateTimer);
		hashUpdateTimer = setTimeout(() => {
			const hash = encodeConfigToHash(config);
			history.replaceState(null, '', `#config=${hash}`);
		}, 500);
	});
</script>

<main>
	<!-- ── Sticky preview ──────────────────────────────────────────────── -->
	<div class="preview-sticky">
		<div class="preview-row">
			<div class="preview-panel">
				<div class="checkerboard">
					<div class="logo-preview-container">
						<AppLogo
							icon={logo.icon}
							iconColor={logo.iconColor}
							iconColorMode={logoIconColorMode}
							iconSize={logo.iconSize}
							iconOffsetX={logo.iconOffsetX}
							iconOffsetY={logo.iconOffsetY}
							iconRotation={logo.iconRotation}
							iconMirrorH={logo.iconMirrorH}
							iconMirrorV={logo.iconMirrorV}
							grayscaleLightness={logo.grayscaleLightness}
							cornerRadius={logo.cornerRadius}
							cornerShape={logoCornerShape}
							background={logoBackground}
							size={256}
							{emojiStyle}
						/>
						{#if showGuidelines}
							<!-- Guidelines overlay: dual-stroke for contrast, geometry follows corner shape -->
							{@const g = guidelineInset}
							{@const s = 256}
							{@const outerR = s / 2 - g}
							{@const innerR = (s / 2 - g) * 0.56}
							<svg class="guidelines-overlay" viewBox="0 0 {s} {s}" width={s} height={s}>
								<!-- Light dashes (fills gaps of dark layer) -->
								<g class="guide-light">
									<path d={guidelineShapePath} fill="none" />
									<line x1={g} y1="0" x2={g} y2={s} />
									<line x1={s - g} y1="0" x2={s - g} y2={s} />
									<line x1="0" y1={g} x2={s} y2={g} />
									<line x1="0" y1={s - g} x2={s} y2={s - g} />
									<line x1={s / 2} y1="0" x2={s / 2} y2={s} />
									<line x1="0" y1={s / 2} x2={s} y2={s / 2} />
									<line x1="0" y1="0" x2={s} y2={s} />
									<line x1={s} y1="0" x2="0" y2={s} />
									<circle cx={s / 2} cy={s / 2} r={outerR} fill="none" />
									<circle cx={s / 2} cy={s / 2} r={innerR} fill="none" />
								</g>
								<!-- Dark dashes -->
								<g class="guide-dark">
									<path d={guidelineShapePath} fill="none" />
									<line x1={g} y1="0" x2={g} y2={s} />
									<line x1={s - g} y1="0" x2={s - g} y2={s} />
									<line x1="0" y1={g} x2={s} y2={g} />
									<line x1="0" y1={s - g} x2={s} y2={s - g} />
									<line x1={s / 2} y1="0" x2={s / 2} y2={s} />
									<line x1="0" y1={s / 2} x2={s} y2={s / 2} />
									<line x1="0" y1="0" x2={s} y2={s} />
									<line x1={s} y1="0" x2="0" y2={s} />
									<circle cx={s / 2} cy={s / 2} r={outerR} fill="none" />
									<circle cx={s / 2} cy={s / 2} r={innerR} fill="none" />
								</g>
								<!-- Intersection dots -->
								<g class="guide-dots">
									<!-- 4 corner intersections -->
									<circle cx={g} cy={g} r="2.5" />
									<circle cx={s - g} cy={g} r="2.5" />
									<circle cx={g} cy={s - g} r="2.5" />
									<circle cx={s - g} cy={s - g} r="2.5" />
									<!-- Midpoints on inner grid lines -->
									<circle cx={s / 2} cy={g} r="2" />
									<circle cx={s / 2} cy={s - g} r="2" />
									<circle cx={g} cy={s / 2} r="2" />
									<circle cx={s - g} cy={s / 2} r="2" />
								</g>
							</svg>
						{/if}
					</div>
				</div>
				<div class="guidelines-control guidelines-control-logo">
					<label class="guidelines-toggle" title="Show design guidelines overlay">
						<input type="checkbox" bind:checked={showGuidelines} />
						<span class="guidelines-label">Guidelines</span>
					</label>
					<input
						type="range"
						min="0"
						max="25"
						step="0.5"
						bind:value={guidelineInsetPct}
						class="guidelines-slider"
						disabled={!showGuidelines}
						title="Guide inset: {guidelineInsetPct.toFixed(1)}%"
					/>
				</div>
				<h2>Logo</h2>
			</div>

			<div class="preview-gap"></div>

			<div class="preview-panel favicon-panel">
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
							iconMirrorH={effectiveFavicon.iconMirrorH}
							iconMirrorV={effectiveFavicon.iconMirrorV}
							grayscaleLightness={effectiveFavicon.grayscaleLightness}
							cornerRadius={effectiveFavicon.cornerRadius}
							cornerShape={faviconCornerShape}
							background={faviconBackground}
							size={96}
							{emojiStyle}
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
							iconMirrorH={effectiveFavicon.iconMirrorH}
							iconMirrorV={effectiveFavicon.iconMirrorV}
							grayscaleLightness={effectiveFavicon.grayscaleLightness}
							cornerRadius={effectiveFavicon.cornerRadius}
							cornerShape={faviconCornerShape}
							background={faviconBackground}
							size={32}
							{emojiStyle}
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
							iconMirrorH={effectiveFavicon.iconMirrorH}
							iconMirrorV={effectiveFavicon.iconMirrorV}
							grayscaleLightness={effectiveFavicon.grayscaleLightness}
							cornerRadius={effectiveFavicon.cornerRadius}
							cornerShape={faviconCornerShape}
							background={faviconBackground}
							size={16}
							{emojiStyle}
						/>
						<span class="size-label">16px</span>
					</div>
				</div>
				<div class="preview-spacer"></div>
				<div class="guidelines-control guidelines-control-favicon">
					<label class="guidelines-toggle" title="Show design guidelines overlay">
						<input type="checkbox" bind:checked={showGuidelines} />
						<span class="guidelines-label">Guidelines</span>
					</label>
					<input
						type="range"
						min="0"
						max="25"
						step="0.5"
						bind:value={guidelineInsetPct}
						class="guidelines-slider"
						disabled={!showGuidelines}
						title="Guide inset: {guidelineInsetPct.toFixed(1)}%"
					/>
				</div>
				<h2>Favicon</h2>
			</div>
		</div>
	</div>

	<!-- ── Preview action buttons (scroll normally) ───────────────────── -->
	<div class="preview-actions-row">
		<div class="preview-actions">
			<button onclick={copyLogoPng} class:active={copying === 'logo'}>
				{copying === 'logo' ? 'Copied!' : 'Copy PNG'}
			</button>
			<button onclick={downloadLogoSvg}>SVG</button>
			<button onclick={downloadLogoPng}>PNG</button>
			<button onclick={downloadLogoWebp}>WebP</button>
		</div>
		<div class="preview-actions-gap"></div>
		<div class="preview-actions favicon-actions">
			<button onclick={copyFaviconPng} class:active={copying === 'favicon'}>
				{copying === 'favicon' ? 'Copied!' : 'Copy PNG'}
			</button>
			<button onclick={downloadFaviconIco}>ICO</button>
			<button onclick={downloadFaviconSvg}>SVG</button>
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
		<!-- ══ GROUP: ICON / EMOJI ═══════════════════════════════════════ -->
		<article class="control-group">
			<header>
				<span class="group-title">Icon / Emoji</span>
				<button
					class="group-btn reset-btn"
					onclick={() => resetGroup(ICON_GROUP_FIELDS)}
					disabled={iconGroupAtDefaults}
					title="Reset all icon fields to defaults">↺</button
				>
				<button
					class="group-btn lock-btn"
					class:locked={iconGroupAllLocked}
					onclick={() => toggleGroupLocks(ICON_GROUP_FIELDS)}
					title={iconGroupAllLocked ? 'Unlock all icon fields' : 'Lock all icon fields'}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html iconGroupAllLocked ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</header>

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
						<div class="browse-links">
							<a
								href="https://icon-sets.iconify.design"
								target="_blank"
								rel="noopener"
								class="browse-link">Browse icons →</a
							>
							<a href="https://emojiterra.com/" target="_blank" rel="noopener" class="browse-link"
								>Browse emoji →</a
							>
						</div>
					</div>
				</div>
				<button
					class="reset-btn col-reset"
					onclick={() => resetLogoField('icon')}
					disabled={isAtDefault('icon')}
					title="Reset to default">↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.icon}
						onclick={() => toggleLock('icon')}
						title={locks.icon ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html locks.icon ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				<div class="fav-icon-wrap" class:fav-dimmed={locks.icon}>
					<div class="icon-input-group">
						{#if locks.icon}
							<textarea
								class="icon-input"
								value={effectiveFavicon.icon}
								rows={3}
								placeholder="Iconify ID or paste SVG..."
								disabled
							></textarea>
						{:else}
							<textarea
								class="icon-input"
								bind:value={favicon.icon}
								rows={3}
								placeholder="Iconify ID or paste SVG..."
							></textarea>
						{/if}
						{#if !locks.icon}
							<div class="browse-links">
								<a
									href="https://icon-sets.iconify.design"
									target="_blank"
									rel="noopener"
									class="browse-link">Browse icons →</a
								>
								<a href="https://emojiterra.com/" target="_blank" rel="noopener" class="browse-link"
									>Browse emoji →</a
								>
							</div>
						{/if}
					</div>
					<span class="fav-icon-label">Icon</span>
				</div>
			</div>

			<!-- ════════════════ EMOJI STYLE PICKER ════════════════ -->
			{#if isEmojiIcon}
				<div class="ctrl-row emoji-style-row">
					<span class="col-logo-label row-label">Emoji style</span>
					<div class="emoji-picker-area">
						{#each EMOJI_SETS as set}
							<button
								class="emoji-cell"
								class:selected={emojiStyle === set.prefix}
								class:mono={set.monochrome}
								onclick={() => (emojiStyle = set.prefix)}
								title={set.name}
							>
								<span class="emoji-cell-icon">
									<AppLogo
										icon={logo.icon}
										emojiStyle={set.prefix}
										background="transparent"
										size={40}
									/>
								</span>
								<span class="emoji-cell-label">{set.name}</span>
							</button>
						{/each}
						<button
							class="emoji-cell"
							class:selected={emojiStyle === 'native'}
							onclick={() => (emojiStyle = 'native')}
							title="Platform native"
						>
							<span
								class="emoji-cell-icon native-emoji"
								style="font-size: 28px; line-height: 40px;"
							>
								{logo.icon}
							</span>
							<span class="emoji-cell-label">Native</span>
						</button>
					</div>
				</div>
			{/if}

			<!-- ════════════════ ICON COLOR ════════════════ -->
			<div class="ctrl-row">
				<span class="col-logo-label row-label">Icon Color</span>
				<span class="col-logo-num"></span>
				<div class="col-logo-slider color-area">
					<input type="color" bind:value={logo.iconColor} class="color-swatch" />
					<span class="color-hex">{logo.iconColor}</span>
				</div>
				<button
					class="reset-btn col-reset"
					onclick={() => resetLogoField('iconColor')}
					title="Reset"
					disabled={isAtDefault('iconColor')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconColor}
						onclick={() => toggleLock('iconColor')}
						title={locks.iconColor ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
					<button
						class="reset-btn col-reset"
						onclick={() => resetLogoField('hueValue')}
						title="Reset"
						disabled={isAtDefault('hueValue')}>↺</button
					>
					<div class="lock-col col-lock">
						<button
							class="lock-btn"
							class:locked={locks.hueValue}
							onclick={() => toggleLock('hueValue')}
							title={locks.hueValue ? 'Locked to logo' : 'Unlock favicon'}
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
						title="Reset"
						disabled={isAtDefault('saturationValue')}>↺</button
					>
					<div class="lock-col col-lock">
						<button
							class="lock-btn"
							class:locked={locks.saturationValue}
							onclick={() => toggleLock('saturationValue')}
							title={locks.saturationValue ? 'Locked to logo' : 'Unlock favicon'}
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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

			<!-- ════════════════ GRAYSCALE LIGHTNESS (conditional) ════════════════ -->
			{#if logoIsGrayscaleMode || (!locks.iconColorModeKey && favIsGrayscaleMode)}
				<div class="ctrl-row">
					<span class="col-logo-label row-label">Lightness</span>
					{#if logoIsGrayscaleMode}
						<input
							type="number"
							min="0"
							max="200"
							bind:value={logo.grayscaleLightness}
							class="ctrl-number col-logo-num"
						/>
						<input
							type="range"
							min="0"
							max="200"
							bind:value={logo.grayscaleLightness}
							class="ctrl-slider col-logo-slider"
						/>
					{:else}
						<span class="col-logo-num"></span>
						<span class="col-logo-slider"></span>
					{/if}
					<button
						class="reset-btn col-reset"
						onclick={() => resetLogoField('grayscaleLightness')}
						title="Reset"
						disabled={isAtDefault('grayscaleLightness')}>↺</button
					>
					<div class="lock-col col-lock">
						<button
							class="lock-btn"
							class:locked={locks.grayscaleLightness}
							onclick={() => toggleLock('grayscaleLightness')}
							title={locks.grayscaleLightness ? 'Locked to logo' : 'Unlock favicon'}
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html locks.grayscaleLightness ? ICON_LOCK : ICON_UNLOCK}
						</button>
					</div>
					{#if !locks.grayscaleLightness && favIsGrayscaleMode}
						<input
							type="range"
							min="0"
							max="200"
							bind:value={favicon.grayscaleLightness}
							class="ctrl-slider col-fav-slider"
						/>
						<input
							type="number"
							min="0"
							max="200"
							bind:value={favicon.grayscaleLightness}
							class="ctrl-number col-fav-num"
						/>
						<span class="col-fav-label row-label fav-side-label">Lightness</span>
					{:else if locks.grayscaleLightness}
						<input
							type="range"
							min="0"
							max="200"
							value={effectiveFavicon.grayscaleLightness}
							class="ctrl-slider col-fav-slider fav-dimmed"
							disabled
						/>
						<input
							type="number"
							min="0"
							max="200"
							value={effectiveFavicon.grayscaleLightness}
							class="ctrl-number col-fav-num fav-dimmed"
							disabled
						/>
						<span class="col-fav-label row-label fav-side-label fav-dimmed">Lightness</span>
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
					max="120"
					bind:value={logo.iconSize}
					class="ctrl-number col-logo-num"
				/>
				<input
					type="range"
					min="10"
					max="120"
					bind:value={logo.iconSize}
					class="ctrl-slider col-logo-slider"
				/>
				<button
					class="reset-btn col-reset"
					onclick={() => resetLogoField('iconSize')}
					title="Reset"
					disabled={isAtDefault('iconSize')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconSize}
						onclick={() => toggleLock('iconSize')}
						title={locks.iconSize ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html locks.iconSize ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				<input
					type="range"
					min="10"
					max="120"
					bind:value={favicon.iconSize}
					class="ctrl-slider col-fav-slider"
					class:fav-dimmed={locks.iconSize}
					disabled={locks.iconSize}
				/>
				<input
					type="number"
					min="10"
					max="120"
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
					title="Reset"
					disabled={isAtDefault('iconOffsetX')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconOffsetX}
						onclick={() => toggleLock('iconOffsetX')}
						title={locks.iconOffsetX ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
					title="Reset"
					disabled={isAtDefault('iconOffsetY')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconOffsetY}
						onclick={() => toggleLock('iconOffsetY')}
						title={locks.iconOffsetY ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
					title="Reset"
					disabled={isAtDefault('iconRotation')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconRotation}
						onclick={() => toggleLock('iconRotation')}
						title={locks.iconRotation ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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

			<!-- ════════════════ MIRROR ════════════════ -->
			<div class="ctrl-row">
				<span class="col-logo-label row-label">Mirror</span>
				<span class="col-logo-num"></span>
				<div class="col-logo-slider mirror-checks">
					<label class="mirror-label" title="Flip horizontally">
						<input type="checkbox" bind:checked={logo.iconMirrorH} />
						<span class="mirror-icon">↔</span><span>H</span>
					</label>
					<label class="mirror-label" title="Flip vertically">
						<input type="checkbox" bind:checked={logo.iconMirrorV} />
						<span class="mirror-icon">↕</span><span>V</span>
					</label>
				</div>
				<button
					class="reset-btn col-reset"
					onclick={() => {
						resetLogoField('iconMirrorH');
						resetLogoField('iconMirrorV');
					}}
					title="Reset"
					disabled={isAtDefault('iconMirrorH') && isAtDefault('iconMirrorV')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.iconMirrorH && locks.iconMirrorV}
						onclick={() => {
							toggleLock('iconMirrorH');
							toggleLock('iconMirrorV');
						}}
						title={locks.iconMirrorH ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html locks.iconMirrorH && locks.iconMirrorV ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				<div
					class="col-fav-slider mirror-checks"
					class:fav-dimmed={locks.iconMirrorH && locks.iconMirrorV}
				>
					<label class="mirror-label" title="Flip horizontally">
						<input
							type="checkbox"
							bind:checked={favicon.iconMirrorH}
							disabled={locks.iconMirrorH}
						/>
						<span class="mirror-icon">↔</span><span>H</span>
					</label>
					<label class="mirror-label" title="Flip vertically">
						<input
							type="checkbox"
							bind:checked={favicon.iconMirrorV}
							disabled={locks.iconMirrorV}
						/>
						<span class="mirror-icon">↕</span><span>V</span>
					</label>
				</div>
				<span class="col-fav-num"></span>
				<span
					class="col-fav-label row-label fav-side-label"
					class:fav-dimmed={locks.iconMirrorH && locks.iconMirrorV}
				>
					Mirror
				</span>
			</div>
		</article>

		<!-- ══ GROUP: CORNERS ═════════════════════════════════════════════ -->
		<article class="control-group">
			<header>
				<span class="group-title">Corners</span>
				<button
					class="group-btn reset-btn"
					onclick={() => resetGroup(CORNER_GROUP_FIELDS)}
					disabled={cornerGroupAtDefaults}
					title="Reset all corner fields to defaults">↺</button
				>
				<button
					class="group-btn lock-btn"
					class:locked={cornerGroupAllLocked}
					onclick={() => toggleGroupLocks(CORNER_GROUP_FIELDS)}
					title={cornerGroupAllLocked ? 'Unlock all corner fields' : 'Lock all corner fields'}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html cornerGroupAllLocked ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</header>

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
					title="Reset"
					disabled={isAtDefault('cornerRadius')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.cornerRadius}
						onclick={() => toggleLock('cornerRadius')}
						title={locks.cornerRadius ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
				<button
					class="reset-btn col-reset"
					onclick={() => resetLogoField('cornerK')}
					title="Reset"
					disabled={isAtDefault('cornerK')}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.cornerK}
						onclick={() => toggleLock('cornerK')}
						title={locks.cornerK ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
		</article>

		<!-- ══ GROUP: BACKGROUND ══════════════════════════════════════════ -->
		<article class="control-group">
			<header>
				<span class="group-title">Background</span>
				<button
					class="group-btn reset-btn"
					onclick={() => resetGroup(BG_GROUP_FIELDS)}
					disabled={bgGroupAtDefaults}
					title="Reset all background fields to defaults">↺</button
				>
				<button
					class="group-btn lock-btn"
					class:locked={bgGroupAllLocked}
					onclick={() => toggleGroupLocks(BG_GROUP_FIELDS)}
					title={bgGroupAllLocked ? 'Unlock all background fields' : 'Lock all background fields'}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html bgGroupAllLocked ? ICON_LOCK : ICON_UNLOCK}
				</button>
			</header>

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
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html locks.useGradient ? ICON_LOCK : ICON_UNLOCK}
					</button>
				</div>
				<div class="col-fav-slider" class:fav-dimmed={locks.useGradient}>
					<label class="toggle-label">
						<input
							type="checkbox"
							bind:checked={favicon.useGradient}
							disabled={locks.useGradient}
						/>
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
				<span class="col-logo-label row-label" class:fav-dimmed={logo.useGradient}>Solid Color</span
				>
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
					disabled={isAtDefault('solidColor')}
					class:fav-dimmed={logo.useGradient}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.solidColor}
						onclick={() => toggleLock('solidColor')}
						title={locks.solidColor ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
				<span class="col-logo-label row-label" class:fav-dimmed={!logo.useGradient}>Grad Angle</span
				>
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
					disabled={isAtDefault('gradientAngle')}
					class:fav-dimmed={!logo.useGradient}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.gradientAngle}
						onclick={() => toggleLock('gradientAngle')}
						title={locks.gradientAngle ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
					disabled={isAtDefault('gradientPosition')}
					class:fav-dimmed={!logo.useGradient}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.gradientPosition}
						onclick={() => toggleLock('gradientPosition')}
						title={locks.gradientPosition ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
				<span class="col-logo-label row-label" class:fav-dimmed={!logo.useGradient}>Grad Scale</span
				>
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
					disabled={isAtDefault('gradientScale')}
					class:fav-dimmed={!logo.useGradient}>↺</button
				>
				<div class="lock-col col-lock">
					<button
						class="lock-btn"
						class:locked={locks.gradientScale}
						onclick={() => toggleLock('gradientScale')}
						title={locks.gradientScale ? 'Locked to logo' : 'Unlock favicon'}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
		</article>
	</div>

	<!-- ── Config ───────────────────────────────────────────────────────── -->
	<details class="config-section">
		<summary>Config (import/export &amp; shareable link)</summary>
		<div class="config-actions">
			<button onclick={copyConfigJson} class="snippet-btn" class:active={configCopied === 'json'}>
				{configCopied === 'json' ? 'Copied!' : 'Copy Config JSON'}
			</button>
			<button onclick={copyLink} class="snippet-btn" class:active={configCopied === 'link'}>
				{configCopied === 'link' ? 'Copied!' : 'Copy Link'}
			</button>
		</div>
		<div class="config-import">
			<textarea
				class="config-textarea"
				bind:value={configJsonText}
				rows={4}
				placeholder="Paste config JSON here..."
			></textarea>
			<button onclick={importConfig} class="snippet-btn" disabled={!configJsonText.trim()}>
				Import
			</button>
			{#if configImportError}
				<p class="config-error">{configImportError}</p>
			{/if}
		</div>
	</details>

	<!-- ── App Info + Download ────────────────────────────────────────── -->
	<fieldset class="app-info-group">
		<legend>Logo Kit</legend>

		<div class="app-info-body">
			<div class="app-name-row">
				<label class="app-name-field">
					<span>App name</span>
					<input type="text" bind:value={appName} oninput={() => (nameManuallyEdited = true)} />
				</label>
				<label class="app-name-field">
					<span>Short name</span>
					<input
						type="text"
						bind:value={appShortName}
						oninput={() => (shortNameManuallyEdited = true)}
					/>
				</label>
			</div>
			<div class="manifest-color-row">
				<label class="manifest-color-field">
					<span>Theme color</span>
					<span class="color-input-pair">
						<input
							type="color"
							bind:value={themeColor}
							oninput={() => (themeColorManuallyEdited = true)}
						/>
						<input
							type="text"
							bind:value={themeColor}
							oninput={() => (themeColorManuallyEdited = true)}
							class="color-hex"
						/>
					</span>
				</label>
				<label class="manifest-color-field">
					<span>Background color</span>
					<span class="color-input-pair">
						<input
							type="color"
							bind:value={backgroundColor}
							oninput={() => (bgColorManuallyEdited = true)}
						/>
						<input
							type="text"
							bind:value={backgroundColor}
							oninput={() => (bgColorManuallyEdited = true)}
							class="color-hex"
						/>
					</span>
				</label>
			</div>
		</div>

		<footer class="app-info-footer">
			<button onclick={downloadAll} disabled={downloading} class="download-all-btn">
				{downloading ? 'Generating…' : `Download All (${zipFilename})`}
			</button>
			<div class="snippet-buttons">
				<button
					onclick={copyHtmlSnippet}
					class="snippet-btn"
					class:active={snippetCopied === 'html'}
					use:tooltip={{
						content: htmlSnippetPreview,
						placement: 'top',
						maxWidth: 480,
						allowHTML: false
					}}
				>
					{snippetCopied === 'html' ? 'Copied!' : 'Copy HTML'}
				</button>
				<button
					onclick={copySvelteSnippet}
					class="snippet-btn"
					class:active={snippetCopied === 'svelte'}
					use:tooltip={{
						content: svelteSnippetPreview,
						placement: 'top',
						maxWidth: 480,
						allowHTML: false
					}}
				>
					{snippetCopied === 'svelte' ? 'Copied!' : 'Copy Svelte'}
				</button>
			</div>
		</footer>
	</fieldset>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
		padding-top: 0 !important;
	}

	/* Tippy tooltip content: monospace for code snippets */
	:global(.tippy-content) {
		font-family: monospace;
		font-size: 0.72rem;
		white-space: pre;
		line-height: 1.4;
		text-align: left;
	}

	main {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 1rem 3rem;
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

	/* ── Sticky preview ────────────────────────────────────────────────── */

	.preview-sticky {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--nc-bg-primary, #fff);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		padding: 0.5rem 1rem;
		margin: 0 -1rem;
	}

	.preview-row {
		display: flex;
		gap: 1rem;
		align-items: stretch;
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

	/* ── Preview actions (non-sticky) ─────────────────────────────────── */

	.preview-actions-row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		justify-content: center;
		padding: 0.75rem 0;
		margin-bottom: 1rem;
	}

	.preview-actions-row > .preview-actions {
		flex: 1;
	}

	.preview-actions-gap {
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

	/* ── Logo preview with guidelines ──────────────────────────────────── */

	.logo-preview-container {
		position: relative;
		width: 256px;
		height: 256px;
		flex-shrink: 0;
	}

	.guidelines-overlay {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	/* Dashed guidelines: light layer */
	.guidelines-overlay .guide-light line,
	.guidelines-overlay .guide-light path,
	.guidelines-overlay .guide-light circle {
		stroke: rgba(255, 255, 255, 0.45);
		stroke-width: 0.5;
		stroke-dasharray: 4 4;
		stroke-dashoffset: 4;
	}

	/* Dashed guidelines: dark layer (offset to fill gaps) */
	.guidelines-overlay .guide-dark line,
	.guidelines-overlay .guide-dark path,
	.guidelines-overlay .guide-dark circle {
		stroke: rgba(0, 0, 0, 0.3);
		stroke-width: 0.5;
		stroke-dasharray: 4 4;
		stroke-dashoffset: 0;
	}

	/* Control-point dots */
	.guidelines-overlay .guide-dots circle {
		fill: rgba(0, 0, 0, 0.3);
		stroke: rgba(255, 255, 255, 0.45);
		stroke-width: 0.75;
	}

	.preview-spacer {
		flex: 1;
	}

	.guidelines-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		align-self: flex-start;
	}

	/* On desktop: show only the favicon-panel copy of guidelines */
	.guidelines-control-logo {
		display: none;
	}

	.guidelines-toggle {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: #666;
		cursor: pointer;
		user-select: none;
	}

	.guidelines-toggle input[type='checkbox'] {
		margin: 0;
	}

	.guidelines-label {
		font-size: 0.78rem;
	}

	.guidelines-slider {
		width: 80px;
		margin: 0;
	}

	.guidelines-slider:disabled {
		opacity: 0.35;
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
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	/* ── Control groups (nimble.css <article> card pattern) ───────────── */

	.control-group {
		/* Strip nimble.css article chrome: no border/padding, just a container */
		padding: 0;
		border: none;
		background: none;
		margin-bottom: 0;
	}

	.control-group > header {
		/* Use the same 8-col grid as ctrl-rows so buttons align */
		display: grid;
		grid-template-columns: 90px 54px 1fr 28px 36px 1fr 54px 90px;
		align-items: center;
		gap: 0 0.4rem;
		/* Strip nimble.css header bleed chrome */
		margin: 0;
		padding: 0.35rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 2px solid #ddd;
		border-radius: 0;
	}

	.group-title {
		/* Span columns 1-3 (label + num + slider) */
		grid-column: 1 / 4;
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #333;
	}

	.control-group > header .group-btn {
		margin: 0; /* Strip nimble.css button bottom-margin */
	}

	.group-btn.reset-btn {
		grid-column: 4; /* Align with per-row reset buttons */
	}

	.group-btn.lock-btn {
		grid-column: 5; /* Align with per-row lock buttons */
		justify-self: center;
	}

	.group-btn.reset-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.ctrl-row {
		display: grid;
		grid-template-columns: 90px 54px 1fr 28px 36px 1fr 54px 90px;
		align-items: center;
		gap: 0 0.4rem;
		min-height: 36px;
		padding: 4px 0.75rem;
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

	/* ── Emoji style picker ────────────────────────────────────────────── */

	.emoji-style-row {
		/* Override the 8-col grid: label in col 1, picker spans the rest */
		align-items: start;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.emoji-style-row > .row-label {
		padding-top: 0.25rem;
	}

	.emoji-picker-area {
		grid-column: 2 / -1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.emoji-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.3rem;
		border: 2px solid transparent;
		border-radius: 6px;
		background: #f8f8f8;
		cursor: pointer;
		width: 64px;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.emoji-cell:hover {
		background: #eef;
		border-color: #ccc;
	}

	.emoji-cell.selected {
		border-color: #0029c1;
		background: #eef4ff;
	}

	.emoji-cell.mono {
		/* Subtle visual separator from color sets */
		background: #f0f0f0;
	}

	.emoji-cell.mono.selected {
		background: #e8ecff;
	}

	.emoji-cell-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.native-emoji {
		text-align: center;
	}

	.emoji-cell-label {
		font-size: 0.62rem;
		color: #666;
		text-align: center;
		line-height: 1.1;
		max-width: 58px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	/* ── Mirror checkboxes ─────────────────────────────────────────────── */

	.mirror-checks {
		display: flex;
		gap: 1rem;
		align-items: center;
		height: 28px;
	}

	.mirror-label {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.85rem;
		cursor: pointer;
		margin: 0;
	}

	.mirror-label input[type='checkbox'] {
		margin: 0;
	}

	.mirror-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.browse-links {
		display: flex;
		gap: 1rem;
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

	.reset-btn:disabled {
		opacity: 0.3;
		cursor: default;
		pointer-events: none;
	}

	.reset-btn:hover:not(:disabled) {
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

	/* ── Config section ───────────────────────────────────────────────── */

	.config-section {
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
	}

	.config-section summary {
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		color: #444;
		user-select: none;
	}

	.config-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.config-import {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.config-import > button {
		align-self: flex-start;
	}

	.config-textarea {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-family: monospace;
		font-size: 0.8rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		resize: vertical;
		box-sizing: border-box;
	}

	.config-error {
		color: #dc2626;
		font-size: 0.82rem;
		margin: 0;
	}

	/* ── Download All + Snippet Buttons ───────────────────────────────── */

	.app-name-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.app-name-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: #555;
	}

	.app-name-field input {
		padding: 0.3rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.85rem;
		min-width: 150px;
		text-align: center;
	}

	.app-info-group {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 0.75rem 1rem 1rem;
		margin: 0.5rem 0 1rem;
	}

	.app-info-group legend {
		font-size: 0.9rem;
		font-weight: 600;
		color: #333;
		padding: 0 0.4rem;
	}

	.app-info-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.manifest-color-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.manifest-color-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: #555;
	}

	.color-input-pair {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.color-input-pair input[type='color'] {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		background: none;
	}

	.color-hex {
		padding: 0.3rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.85rem;
		font-family: monospace;
		width: 7em;
	}

	.app-info-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding-top: 0.75rem;
		margin-top: 0.75rem;
		border-top: 1px solid #eee;
	}

	.snippet-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.snippet-btn {
		padding: 0.4rem 1rem;
		font-size: 0.85rem;
		border-radius: 5px;
		cursor: pointer;
		border: 1px solid #0029c1;
		background: transparent;
		color: #0029c1;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.snippet-btn:hover {
		background: #0029c1;
		color: #fff;
	}

	.snippet-btn.active {
		background: #16a34a;
		border-color: #16a34a;
		color: #fff;
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

	/* ── Responsive: tablet-ish (narrow but not phone) ────────────────── */

	@media (max-width: 700px) {
		.ctrl-row {
			grid-template-columns: 70px 46px 1fr 24px 30px 1fr 46px 70px;
			font-size: 0.78rem;
		}

		.control-group > header {
			grid-template-columns: 70px 46px 1fr 24px 30px 1fr 46px 70px;
		}

		.col-logo-label.row-label,
		.fav-side-label {
			font-size: 0.74rem;
		}
	}

	/* ── Responsive: phone — hide favicon side, logo-only layout ──────── */

	@media (max-width: 640px) {
		/*
		 * Do NOT set overflow-x on html/body/main — any overflow value
		 * other than 'visible' on an ancestor breaks position:sticky.
		 * Instead, contain overflow at the source with max-width.
		 */
		main {
			padding: 0 0.5rem 2rem;
			max-width: 100vw;
			box-sizing: border-box;
		}

		/* ── Sticky preview: smaller, logo only ──────────────────────── */

		.preview-sticky {
			padding: 0.35rem 0.5rem;
			margin: 0 -0.5rem;
		}

		.preview-gap,
		.favicon-panel {
			display: none;
		}

		.preview-row {
			justify-content: center;
		}

		.preview-panel {
			flex: none;
		}

		/* Show guidelines control in the logo panel on mobile */
		.guidelines-control-logo {
			display: flex;
		}

		/*
		 * Shrink the logo preview uniformly using CSS zoom.
		 * Unlike transform:scale(), zoom changes the actual layout size
		 * (256 * 0.625 = 160px) AND scales all children — including the
		 * AppLogo's inline size, clip-path coordinates, and the
		 * absolutely-positioned guidelines overlay — without needing
		 * transform-origin hacks.
		 */
		.logo-preview-container {
			zoom: 0.625;
		}

		.checkerboard {
			padding: 0.5rem;
		}

		/* ── Preview actions: hide favicon buttons ───────────────────── */

		.preview-actions-gap,
		.favicon-actions {
			display: none;
		}

		.preview-actions-row {
			justify-content: center;
			padding: 0.4rem 0;
			margin-bottom: 0.5rem;
		}

		/* ── Controls grid: hide favicon side (cols 5-8), keep logo ─── */

		.ctrl-row {
			grid-template-columns: 64px 42px 1fr 24px;
			font-size: 0.78rem;
		}

		.control-group > header {
			grid-template-columns: 64px 42px 1fr 24px;
			padding: 0.3rem 0.4rem;
		}

		.group-title {
			grid-column: 1 / 4;
		}

		/* Align group reset with per-row reset buttons in col 4 */
		.group-btn.reset-btn {
			grid-column: 4;
		}

		.group-btn.lock-btn {
			display: none;
		}

		/* Hide all favicon-side columns */
		.col-lock,
		.col-fav-slider,
		.col-fav-num,
		.col-fav-label,
		.fav-icon-wrap {
			display: none;
		}

		/* Reset button stays in col 4 */
		.col-reset {
			grid-column: 4;
		}

		.col-logo-label {
			grid-column: 1;
		}

		.col-logo-num {
			grid-column: 2;
		}

		.col-logo-slider {
			grid-column: 3;
		}

		.col-logo-label.row-label,
		.row-label {
			font-size: 0.72rem;
		}

		/* ── Icon row: logo side spans cols 1-3 ──────────────────────── */

		.logo-icon-wrap {
			grid-column: 1 / 4;
			grid-template-columns: 64px 1fr;
		}

		/* ── Emoji picker: full width ────────────────────────────────── */

		.emoji-picker-area {
			grid-column: 2 / -1;
		}

		.emoji-cell {
			width: 52px;
		}

		/* ── Corner K: spans cols 2-3 ────────────────────────────────── */

		.k-num-slider-logo {
			grid-column: 2 / 4;
		}

		.k-num-slider-fav {
			display: none;
		}

		.corner-k-row > .col-fav-label {
			display: none;
		}

		/* ── General cleanup for narrow screens ──────────────────────── */

		h2 {
			font-size: 0.8rem;
		}

		.ctrl-row {
			padding: 3px 0.4rem;
		}

		.preview-actions button {
			padding: 0.3rem 0.65rem;
			font-size: 0.8rem;
		}
	}
</style>
