import JSZip from 'jszip';
import type { LeftiumLogoConfig } from './generate-svg.js';
import { generateLeftiumLogoSvg, generateLeftiumLogoPng } from './generate-svg.js';
import type { FaviconConfig } from './generate-favicon-svg.js';
import { generateFaviconSvg, generateFaviconPng } from './generate-favicon-svg.js';
import { pngToIco } from '$lib/app-logo/generate-ico.js';
import {
	generateManifest,
	generateFaviconHtml,
	type AppInfo
} from '$lib/app-logo/generate-favicon-set.js';

export type { AppInfo };

/**
 * Build the full Leftium logo kit as a zip Blob.
 *
 * Zip structure mirrors a SvelteKit project root:
 *   static/favicon.ico              (32×32 favicon PNG wrapped in ICO container)
 *   static/icon.svg                 (favicon SVG)
 *   static/apple-touch-icon.png     (180×180 favicon PNG)
 *   static/icon-192.png             (192×192 favicon PNG)
 *   static/icon-512.png             (512×512 favicon PNG)
 *   static/logo.png                 (512px logo PNG)
 *   static/logo.webp                (512px logo WebP)
 *   static/logo.svg                 (logo SVG)
 *   static/manifest.webmanifest     (PWA web app manifest)
 *   .logo/config.json               (logo + favicon config for regeneration)
 *   .logo/favicon.htm               (HTML <head> snippet, paste-ready)
 */
export async function generateLeftiumZipKit(
	logoConfig: LeftiumLogoConfig,
	faviconConfig: FaviconConfig,
	appInfo: AppInfo = { name: 'Leftium', shortName: 'Leftium' }
): Promise<Blob> {
	// Generate favicon PNGs at all required sizes in parallel with logo assets
	const [logoPng, logoWebp, logoSvg, faviconPng32, faviconAppleTouch, favicon192, favicon512] =
		await Promise.all([
			generateLeftiumLogoPng({ ...logoConfig, size: 512 }, 'png'),
			generateLeftiumLogoPng({ ...logoConfig, size: 512 }, 'webp'),
			generateLeftiumLogoSvg(logoConfig),
			generateFaviconPng({ ...faviconConfig, size: 32 }, 'png'),
			generateFaviconPng({ ...faviconConfig, size: 180 }, 'png'),
			generateFaviconPng({ ...faviconConfig, size: 192 }, 'png'),
			generateFaviconPng({ ...faviconConfig, size: 512 }, 'png')
		]);

	const faviconIco = await pngToIco(faviconPng32);
	const faviconSvg = generateFaviconSvg(faviconConfig);

	const zip = new JSZip();
	const staticDir = zip.folder('static')!;
	const logoDir = zip.folder('.logo')!;

	// Favicon files
	staticDir.file('favicon.ico', faviconIco);
	staticDir.file('icon.svg', faviconSvg);
	staticDir.file('apple-touch-icon.png', faviconAppleTouch);
	staticDir.file('icon-192.png', favicon192);
	staticDir.file('icon-512.png', favicon512);

	// Logo files
	staticDir.file('logo.png', logoPng);
	staticDir.file('logo.webp', logoWebp);
	staticDir.file('logo.svg', logoSvg);

	// Manifest
	staticDir.file('manifest.webmanifest', generateManifest(appInfo));

	// Config for regeneration
	logoDir.file(
		'config.json',
		JSON.stringify({ logo: logoConfig, favicon: faviconConfig }, null, '\t')
	);

	// HTML snippet
	logoDir.file('favicon.htm', generateFaviconHtml(appInfo));

	return zip.generateAsync({ type: 'blob' });
}
