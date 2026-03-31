import type { AppLogoConfig } from './types.js';
import { generateAppLogoSvg } from './generate-svg.js';

/**
 * Generate a PNG or WebP Blob from an AppLogo configuration.
 *
 * Renders the SVG onto an offscreen canvas and exports as PNG or WebP.
 * Browser-only (requires canvas and Image).
 *
 * @param config - The AppLogo configuration
 * @param options - Export options
 * @returns PNG or WebP Blob
 */
export async function generateAppLogoPng(
	config: AppLogoConfig,
	options?: {
		variant?: 'logo' | 'favicon';
		size?: number; // px, default: 512
		format?: 'png' | 'webp'; // default: 'png'
	}
): Promise<Blob> {
	const size = options?.size ?? 512;
	const mimeType = options?.format === 'webp' ? 'image/webp' : 'image/png';

	// Override size in config for SVG generation
	const sizedConfig: AppLogoConfig = {
		...config,
		[options?.variant === 'favicon' ? 'favicon' : 'logo']: {
			...(options?.variant === 'favicon' ? config.favicon : config.logo),
			size
		}
	};

	const svg = await generateAppLogoSvg(sizedConfig, options?.variant);

	return new Promise<Blob>((resolve, reject) => {
		const img = new Image();
		const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas 2d context'));
					return;
				}

				ctx.drawImage(img, 0, 0, size, size);

				canvas.toBlob((outBlob) => {
					URL.revokeObjectURL(url);
					if (outBlob) {
						resolve(outBlob);
					} else {
						reject(new Error('Canvas toBlob returned null'));
					}
				}, mimeType);
			} catch (err) {
				URL.revokeObjectURL(url);
				reject(err);
			}
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG into Image element'));
		};

		img.src = url;
	});
}
