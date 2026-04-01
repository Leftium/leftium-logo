import JSZip from 'jszip';
import type { AppLogoConfig } from './types.js';
import { generateAppLogoSvg } from './generate-svg.js';
import { generateAppLogoPng } from './generate-png.js';
import { pngToIco } from './generate-ico.js';

export interface FaviconSetResult {
	svg: string; // icon.svg content
	ico: Blob; // favicon.ico (32x32 PNG in ICO container)
	appleTouchIcon: Blob; // apple-touch-icon.png (180x180)
	icon192: Blob; // icon-192.png
	icon512: Blob; // icon-512.png
}

export interface AppInfo {
	name?: string; // full app name, e.g. "My App"
	shortName?: string; // short name for home screen, e.g. "App"
}

/**
 * Generate the full favicon file set from an AppLogo configuration.
 *
 * Returns SVG, ICO, and PNG blobs for all standard favicon sizes.
 * Browser-only (requires canvas).
 */
export async function generateFaviconSet(config: AppLogoConfig): Promise<FaviconSetResult> {
	const [svg, png32, appleTouchIcon, icon192, icon512] = await Promise.all([
		generateAppLogoSvg(config, 'favicon'),
		generateAppLogoPng(config, { variant: 'favicon', size: 32 }),
		generateAppLogoPng(config, { variant: 'favicon', size: 180 }),
		generateAppLogoPng(config, { variant: 'favicon', size: 192 }),
		generateAppLogoPng(config, { variant: 'favicon', size: 512 })
	]);

	const ico = await pngToIco(png32);

	return { svg, ico, appleTouchIcon, icon192, icon512 };
}

/**
 * Generate a manifest.webmanifest JSON string.
 */
export function generateManifest(appInfo: AppInfo): string {
	const manifest = {
		name: appInfo.name || 'My App',
		short_name: appInfo.shortName || appInfo.name || 'App',
		icons: [
			{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
			{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
			{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
		],
		theme_color: '#ffffff',
		background_color: '#ffffff',
		display: 'standalone'
	};
	return JSON.stringify(manifest, null, '\t');
}

/**
 * Generate the HTML snippet for pasting into app.html.
 */
export function generateFaviconHtml(appInfo: AppInfo): string {
	const name = appInfo.name || 'My App';
	return [
		`\t\t<title>${name}</title>`,
		`\t\t<link rel="icon" href="/favicon.ico" sizes="32x32">`,
		`\t\t<link rel="icon" href="/icon.svg" type="image/svg+xml">`,
		`\t\t<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
		`\t\t<link rel="manifest" href="/manifest.webmanifest">`
	].join('\n');
}

/**
 * Build the full zip kit as a Blob.
 *
 * Zip structure mirrors a SvelteKit project root:
 *   static/favicon.ico
 *   static/icon.svg
 *   static/apple-touch-icon.png
 *   static/icon-192.png
 *   static/icon-512.png
 *   static/logo.png
 *   static/logo.webp
 *   static/logo.svg
 *   static/manifest.webmanifest
 *   .logo/config.json
 *   .logo/favicon.htm
 */
export async function generateZipKit(config: AppLogoConfig, appInfo: AppInfo): Promise<Blob> {
	const [faviconSet, logoPng, logoWebp, logoSvg] = await Promise.all([
		generateFaviconSet(config),
		generateAppLogoPng(config, { variant: 'logo', size: 512 }),
		generateAppLogoPng(config, { variant: 'logo', size: 512, format: 'webp' }),
		generateAppLogoSvg(config, 'logo')
	]);

	const zip = new JSZip();
	const staticDir = zip.folder('static')!;
	const logoDir = zip.folder('.logo')!;

	// Favicon files
	staticDir.file('favicon.ico', faviconSet.ico);
	staticDir.file('icon.svg', faviconSet.svg);
	staticDir.file('apple-touch-icon.png', faviconSet.appleTouchIcon);
	staticDir.file('icon-192.png', faviconSet.icon192);
	staticDir.file('icon-512.png', faviconSet.icon512);

	// Logo files
	staticDir.file('logo.png', logoPng);
	staticDir.file('logo.webp', logoWebp);
	staticDir.file('logo.svg', logoSvg);

	// Manifest
	staticDir.file('manifest.webmanifest', generateManifest(appInfo));

	// Config for regeneration
	logoDir.file('config.json', JSON.stringify(config, null, '\t'));

	// HTML snippet
	logoDir.file('favicon.htm', generateFaviconHtml(appInfo));

	return zip.generateAsync({ type: 'blob' });
}
