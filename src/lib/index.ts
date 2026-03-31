// Reexport your entry components here

import LeftiumLogo, { toggleAnimation, setAnimated } from './LeftiumLogo.svelte';
import favicon from './assets/favicon.svg';

export { LeftiumLogo, toggleAnimation, setAnimated, favicon };

// Phase 1: AppLogo component and generation utilities
export { default as AppLogo } from './AppLogo.svelte';
export type {
	AppLogoProps,
	AppLogoConfig,
	GradientConfig,
	IconColorMode,
	CornerShape
} from './app-logo/types.js';
export { generateAppLogoSvg } from './app-logo/generate-svg.js';
export { generateAppLogoPng } from './app-logo/generate-png.js';
export { LEFTIUM_GRADIENT } from './app-logo/defaults.js';
