# AppLogo Generator Spec

Quick logo/favicon generator for Leftium projects. Composites the Leftium gradient
square with an icon overlay to produce ready-to-use assets.

## Overview

A Svelte component (`AppLogo`) and companion generation utilities that render a
gradient (or solid-color) square with any Iconify icon, Unicode character, or emoji
on top. No shadows, no glow, no animation, no WebGL ripples -- just a clean static
logo mark.

---

## Icon Sources

| Source        | Input example                | Resolution                                               |
| ------------- | ---------------------------- | -------------------------------------------------------- |
| Iconify ID    | `"mdi:rocket-launch"`        | Fetched from Iconify API as SVG at generation time       |
| Unicode/Emoji | `"U+1F680"` or `"\u{1F680}"` | Rendered as text in SVG `<text>` element                 |
| SVG string    | `"<svg>...</svg>"`           | Used directly (inline SVG markup)                        |
| Data URL      | `"data:image/svg+xml;..."`   | Decoded and used as SVG (supports Iconify "Copy as URL") |

Iconify icons are loaded on demand via the HTTP API
(`https://api.iconify.design/{prefix}/{name}.svg`). No icon bundles are shipped.

The `icon` prop auto-detects the source type:

- Starts with `<svg` or `<SVG` → inline SVG
- Starts with `data:` → data URL (decoded to SVG)
- Contains `:` (but not `data:`) → Iconify ID (`prefix:name`)
- Otherwise → Unicode/emoji text

### Icon color behavior

Iconify icons come in three flavors:

| Type           | Example sets                                  | `fill` values in SVG       |
| -------------- | --------------------------------------------- | -------------------------- |
| **Monochrome** | `mdi:*`, `lucide:*`, `tabler:*`               | `currentColor`             |
| **Multicolor** | `noto:*`, `twemoji:*`, `fxemoji:*`, `logos:*` | Hardcoded hex per `<path>` |
| **Mixed**      | Some icon sets                                | Mix of both                |

The `iconColorMode` prop controls how colors are transformed:

| Mode                   | Effect                                                     | `iconColor` used?    |
| ---------------------- | ---------------------------------------------------------- | -------------------- |
| `"auto"` (default)     | Monochrome → apply `iconColor`; multicolor → keep original | Only for monochrome  |
| `"original"`           | All colors kept exactly as-is                              | No                   |
| `"monochrome"`         | All fills/strokes → `iconColor` (flat silhouette)          | Yes                  |
| `"grayscale"`          | Each color → luminance-equivalent gray                     | No                   |
| `"grayscale-tint"`     | Grayscale, then tint toward `iconColor`                    | Yes (as tint hue)    |
| `{ hue, saturation? }` | Remap all colors to shades of target hue                   | No (hue is explicit) |

**Implementation**: Color transforms operate on the parsed SVG before rendering.
Each `fill` and `stroke` attribute (except `"none"`) is converted to HSL, transformed
according to the mode, and written back. This works for both the live component
(via DOM manipulation) and SVG/PNG export (via string manipulation).

**`"grayscale-tint"` example**: Given `fxemoji:rocket` with orange (#ffb636),
red (#ff473e), and gray (#adbbbc) parts, `iconColorMode: "grayscale-tint"` with
`iconColor: "#3973ff"` would produce light blue, medium blue, and pale blue --
preserving the relative contrast while unifying the palette.

**`{ hue }` example**: `iconColorMode: { hue: 210, saturation: 80 }` would remap
all colors to shades of blue, each retaining its original lightness value.

---

## Component: `AppLogo.svelte`

### Props

```typescript
// Icon color transformation modes
type IconColorMode =
	| 'auto' // Monochrome icons → use iconColor; multicolor → keep original
	| 'original' // Keep all colors exactly as-is (even currentColor)
	| 'monochrome' // Replace all fills/strokes with iconColor (flat silhouette)
	| 'grayscale' // Convert each color to its luminance-equivalent gray
	//   Preserves relative contrast between icon parts.
	//   iconColor is ignored; output is neutral grays.
	| 'grayscale-tint' // Grayscale first, then tint toward iconColor
	//   Maps grays to shades of the target hue.
	//   Light parts → light tint, dark parts → dark tint.
	| { hue: number; saturation?: number }; // Remap all colors to a target hue (0-360)
//   Preserves each color's original lightness.
//   saturation (0-100, default: 70) controls intensity.
//   Example: { hue: 210 } → all blues, { hue: 0 } → all reds

// Follows CSS <corner-shape-value> from CSS Borders Level 4
// https://drafts.csswg.org/css-borders-4/#corner-shape
type CornerShape =
	| 'round' // superellipse(1)  — standard circular arc (CSS border-radius)
	| 'squircle' // superellipse(2)  — smooth iOS-style continuous curvature
	| 'square' // superellipse(∞)  — sharp corners (ignores border-radius)
	| 'bevel' // superellipse(0)  — straight diagonal cut
	| 'scoop' // superellipse(-1) — inward concave curve
	| 'notch' // superellipse(-∞) — inward right-angle cut
	| `superellipse(${number})`; // arbitrary curvature value

interface GradientConfig {
	colors: string[]; // stop colors, e.g. ["#0029c1", "#3973ff", "#0029c1"]
	stops?: number[]; // stop positions 0-1, e.g. [0, 0.29, 1]
	angle?: number; // CSS gradient angle in degrees (clockwise from top)
	//   default: 45 (bottom-left to top-right, matching Leftium logo)
	//   Common values: 0=bottom-to-top, 90=left-to-right,
	//     135=top-left-to-bottom-right, 180=top-to-bottom
	position?: number; // shift gradient along its axis, as % (-100 to 100)
	//   default: 0 (centered on square). Positive = shift toward end.
	//   Moves the bright spot / color peak without changing the angle.
	scale?: number; // scale gradient length relative to square diagonal
	//   default: 1 (gradient spans full square diagonal)
	//   >1 = more zoomed in (tighter color transition)
	//   <1 = more spread out (gentler transition)
}

interface AppLogoProps {
	// --- Icon ---
	icon?: string; // Iconify ID, emoji, SVG string, or data URL
	//   default: "fxemoji:rocket"
	iconColor?: string; // CSS color, default: "#ffffff"
	//   Monochrome icons & "monochrome" mode: replaces currentColor / all fills
	//   Multicolor icons in "original" mode: ignored
	//   Emoji: sets the text color (usually ignored by emoji renderers)
	iconColorMode?: IconColorMode; // how to treat icon colors, default: "auto"
	iconSize?: number; // % of square side, default: 60
	iconOffsetX?: number; // % horizontal offset from center, default: 0
	iconOffsetY?: number; // % vertical offset from center, default: 0
	iconRotation?: number; // degrees clockwise, default: 0

	// --- Square ---
	cornerRadius?: number; // CSS border-radius as %, default: 0. Range: 0-50
	cornerShape?: CornerShape; // CSS <corner-shape-value>, default: "round"
	background?: // default: Leftium blue gradient
		| string // solid CSS color ("#ff0000")
		| GradientConfig;

	// --- Layout ---
	size?: number; // rendered CSS size in px, default: 512
}
```

### Defaults (Leftium blue)

```typescript
const LEFTIUM_GRADIENT: GradientConfig = {
	colors: ['#0029c1', '#3973ff', '#0029c1'],
	stops: [0, 0.29, 1],
	angle: 45 // bottom-left → top-right
	// position: 0 (default, centered)
	// scale: 1 (default, spans full diagonal)
};
```

The Leftium logo's original SVG gradient runs from (14%, 85%) to (85%, 15%) of
the square -- a 45-degree diagonal spanning the full square. The bright blue peak
(`#3973ff`) at stop offset 0.29 lands at approximately (34%, 65%) of the square,
in the lower-left quadrant.

**`position`** shifts the entire gradient along its axis without changing the angle.
For example, `position: -20` would shift the bright spot further toward the
bottom-left corner.

**`scale`** controls how "zoomed in" the gradient is. `scale: 0.5` would compress
the full color sweep into half the diagonal, creating a tighter, more vivid
transition.

### Rendering

The component renders a simple DOM structure:

```
<app-logo>          <!-- custom element, sized to `size` px -->
  <square>          <!-- gradient/solid background, corner radius applied -->
    <icon-layer>    <!-- centered icon: SVG <img> or <text> for emoji -->
  </square>
</app-logo>
```

No shadow, no glow, no ligature, no animation, no ripples.

---

## Dual Config: Logo vs Favicon

Logo and favicon often need different tuning (favicon icons are typically larger
relative to the square, and may have different padding).

```typescript
interface AppLogoConfig {
	// Shared defaults
	icon: string;
	iconColor?: string;
	background?: AppLogoProps['background'];
	cornerRadius?: number;
	cornerShape?: CornerShape;

	// Per-output overrides
	logo?: Partial<AppLogoProps>;
	favicon?: Partial<AppLogoProps>;
}
```

Example:

```typescript
const config: AppLogoConfig = {
	icon: 'mdi:rocket-launch',
	background: '#e63946', // solid red
	cornerRadius: 20,
	cornerShape: 'squircle', // smooth iOS-style corners

	logo: { iconSize: 55 }, // more breathing room
	favicon: {
		iconSize: 70, // bigger at small sizes
		cornerRadius: 25 // more rounding for app icon feel
	}
};
```

---

## Corner Shape

Two independent properties control the corner treatment, mirroring the CSS Borders
Level 4 model (`border-radius` + `corner-shape`):

- **`cornerRadius`** (number, 0-50): _How much_ rounding is applied (same as
  CSS `border-radius` as a percentage). 0 = sharp square, 50 = maximum.
- **`cornerShape`** (`CornerShape`): _What curve_ the rounding follows.

### `<corner-shape-value>` reference

| Keyword           | `superellipse()`          | Visual                      | Notes                                           |
| ----------------- | ------------------------- | --------------------------- | ----------------------------------------------- |
| `round`           | `superellipse(1)`         | Standard circular arc       | Same as CSS `border-radius` today. **Default.** |
| `squircle`        | `superellipse(2)`         | Smooth continuous curvature | iOS app icon shape. Most useful for logos.      |
| `square`          | `superellipse(infinity)`  | Sharp right angle           | Ignores `cornerRadius` entirely.                |
| `bevel`           | `superellipse(0)`         | Straight diagonal cut       | Chamfered corner.                               |
| `scoop`           | `superellipse(-1)`        | Inward concave curve        | Decorative / notch-like.                        |
| `notch`           | `superellipse(-infinity)` | Inward right-angle cut      | Hard rectangular notch.                         |
| `superellipse(n)` | --                        | Arbitrary curvature         | Any number; higher = sharper, lower = rounder.  |

The difference between `round` and `squircle` is most visible at moderate radii
(~10-30%). A squircle has continuous curvature -- the flat sides blend smoothly into
the corners without the abrupt tangent change of a circular arc.

### Rendering strategy

**Component (live preview)**: Uses CSS `corner-shape` property where browser
supports it, with `clip-path: path(...)` fallback for unsupported browsers.

**SVG/PNG export**: All corner shapes are rendered as cubic Bezier `<path>` elements
computed from the superellipse formula. This ensures identical output regardless
of browser support. `round` uses `<rect rx="...">` as a fast path.

---

## Output Formats & Delivery

### Programmatic SVG generation (primary path)

Since the logo is simple geometry (rect + gradient + icon path), the SVG string
can be built programmatically without any DOM-to-image library:

1. Build an SVG string: `<svg>` with `<defs>` for gradient, `<rect>` or `<path>`
   for the square, inline icon `<path>` data from Iconify API.
2. For PNG/WebP: draw the SVG onto a `<canvas>` via `new Image()` + `canvas.toBlob()`.

This avoids external dependencies and works in any environment (browser, Node with
a canvas polyfill, or server-side).

### DOM screenshot fallback

If programmatic SVG proves insufficient (e.g., emoji rendering, complex CSS),
fall back to `modern-screenshot` (`domToPng` / `domToWebp`):

- **Why modern-screenshot over html-to-image**: Actively maintained fork, built-in
  WebP support, progress callbacks, smaller bundle, nearly identical API as fallback.
- Both use the same foreignObject SVG -> canvas technique.

### Export formats

| Format | Method                                          | Use case                                         |
| ------ | ----------------------------------------------- | ------------------------------------------------ |
| SVG    | Programmatic string                             | Favicon `<link>`, inline, resolution-independent |
| PNG    | Canvas `toBlob('image/png')`                    | General logo image, apple-touch-icon             |
| WebP   | Canvas `toBlob('image/webp')`                   | Smaller file size for web use                    |
| ICO    | Not generated (use SVG + PNG fallback strategy) | See favicon strategy below                       |

### WebP support notes

- **As an image format**: 97% global browser support. Fine for logo downloads.
- **As a favicon**: Not standardized for `<link rel="icon">`. Do not use for favicons.

---

## Favicon Strategy

Following the [Evil Martians 2026 guide](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs),
the recommended minimal favicon set is:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<!-- 180x180 -->
```

Plus for PWAs:

```json
// manifest.webmanifest
{
	"icons": [
		{ "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
		{ "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" }
	]
}
```

**What we generate:**

| File                   | Size    | Notes                                                         |
| ---------------------- | ------- | ------------------------------------------------------------- |
| `icon.svg`             | vector  | Primary favicon; supports dark mode via `<style>` media query |
| `favicon.ico`          | 32x32   | ICO fallback (single 32px PNG wrapped in ICO container)       |
| `apple-touch-icon.png` | 180x180 | For iOS home screen; 20px padding recommended                 |
| `icon-192.png`         | 192x192 | PWA manifest                                                  |
| `icon-512.png`         | 512x512 | PWA manifest / splash                                         |

**SVG favicon dark mode**: The generated SVG can include a `<style>` block with
`@media (prefers-color-scheme: dark)` to swap icon/background colors.

**SVG favicon support**: 90% global (Safari 26+, Chrome 80+, Firefox 41+).
The `.ico` fallback covers the remaining 10%.

---

## Generation Approach

### In-browser UI (primary)

A page in the dev app at `/generate` where you:

1. Enter an Iconify icon ID (with search/preview) or paste an emoji
2. Tweak background, corner radius, squircle, icon size/position/color
3. See live preview of both logo and favicon variants side by side
4. Download individual files or **"Download All"** as a zip

#### Zip download contents

The "Download All" button produces a zip file (via `JSZip` or manual zip
construction) containing everything needed to drop into a project's `static/`
folder:

```
app-logo/
  icon.svg                  # SVG favicon (with dark mode media query)
  favicon.ico               # 32x32 ICO fallback
  apple-touch-icon.png      # 180x180
  icon-192.png              # PWA manifest
  icon-512.png              # PWA manifest / splash
  logo.png                  # Full-size logo (512 or 1024, configurable)
  logo.webp                 # WebP variant of the logo
  logo.svg                  # Vector logo (may differ from favicon SVG in icon size/position)
  manifest.webmanifest      # Ready-to-use web app manifest snippet
  _favicon-html.html        # Copy-pasteable <link> tags for <head>
```

The `manifest.webmanifest` contains just the `icons` array:

```json
{
	"icons": [
		{ "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
		{ "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" }
	]
}
```

The `_favicon-html.html` contains the recommended `<link>` tags:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

### Programmatic API

Exported functions for use in scripts, server routes, or other components:

```typescript
// Returns an SVG string
function generateAppLogoSvg(config: AppLogoConfig, variant?: 'logo' | 'favicon'): Promise<string>;

// Returns a PNG/WebP Blob (browser only, needs canvas)
function generateAppLogoPng(
	config: AppLogoConfig,
	options?: {
		variant?: 'logo' | 'favicon';
		size?: number; // px, default: 512
		format?: 'png' | 'webp';
	}
): Promise<Blob>;

// Returns the full favicon file set
function generateFaviconSet(config: AppLogoConfig): Promise<{
	svg: string; // icon.svg content
	ico: Blob; // favicon.ico (32x32)
	appleTouchIcon: Blob; // 180x180 PNG
	icon192: Blob; // 192x192 PNG
	icon512: Blob; // 512x512 PNG
}>;
```

---

## File Structure

```
src/lib/
  AppLogo.svelte                # the component
  app-logo/
    types.ts                    # AppLogoProps, AppLogoConfig
    defaults.ts                 # LEFTIUM_GRADIENT, default sizes
    generate-svg.ts             # programmatic SVG string builder
    generate-png.ts             # canvas-based rasterization
    generate-favicon-set.ts     # full favicon set generator
    squircle.ts                 # superellipse path generation
    iconify.ts                  # Iconify API fetch + cache

src/routes/
  generate/
    +page.svelte                # generator UI

src/lib/index.ts                # add: export AppLogo + generation functions
```

---

## Package Exports

Added to `src/lib/index.ts`:

```typescript
export { default as AppLogo } from './AppLogo.svelte';
export type { AppLogoProps, AppLogoConfig } from './app-logo/types.ts';
export { generateAppLogoSvg } from './app-logo/generate-svg.ts';
export { generateAppLogoPng } from './app-logo/generate-png.ts';
export { generateFaviconSet } from './app-logo/generate-favicon-set.ts';
export { LEFTIUM_GRADIENT } from './app-logo/defaults.ts';
```

---

## Dependencies

| Package             | Purpose                                       | Required?                                               |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `jszip`             | Zip file generation for "Download All"        | Yes (devDependency, ~45KB gzipped)                      |
| `modern-screenshot` | DOM-to-image fallback for emoji/complex cases | Optional, only if programmatic SVG path is insufficient |

No other new runtime dependencies. Iconify icons are fetched via HTTP API at
generation time (dev/build, not shipped to end users).

---

## Open Questions / Future

- [ ] Dark mode variant: auto-generate a dark-mode favicon with inverted colors?
- [ ] CLI tool: `npx @leftium/logo generate --icon mdi:rocket --out ./static/`?
- [ ] Batch generation: config file with multiple projects?
- [ ] ICO generation: wrap 32px PNG in ICO container in-browser, or recommend
      external tool? (ICO is just a container format; a single 32px PNG inside
      works for all browsers.)
- [ ] Should the component be SSR-compatible (no canvas dependency)?
