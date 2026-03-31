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

| Mode                   | Effect                                                                | `iconColor` used?    |
| ---------------------- | --------------------------------------------------------------------- | -------------------- |
| `"auto"` (default)     | Monochrome → apply `iconColor`; multicolor → keep original            | Only for monochrome  |
| `"original"`           | All colors kept exactly as-is                                         | No                   |
| `"monochrome"`         | All fills/strokes → `iconColor` (flat silhouette)                     | Yes                  |
| `"grayscale"`          | Each color → luminance-equivalent gray; `grayscaleLightness` adjusts  | No                   |
| `"grayscale-tint"`     | Grayscale, then tint toward `iconColor`; `grayscaleLightness` adjusts | Yes (tint)           |
| `{ hue, saturation? }` | Remap all colors to shades of target hue                              | No (hue is explicit) |

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
	grayscaleLightness?: number; // lightness multiplier for grayscale modes, default: 100
	//   0-200 (%). 100 = no change, <100 = darker, >100 = lighter.
	//   Only affects 'grayscale' and 'grayscale-tint' color modes.

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

## Export Formats

| Format | Method                                   | Use case                                         | Phase |
| ------ | ---------------------------------------- | ------------------------------------------------ | ----- |
| SVG    | Programmatic string                      | Favicon `<link>`, inline, resolution-independent | 1     |
| PNG    | Canvas `toBlob('image/png')`             | General logo image, apple-touch-icon             | 1     |
| WebP   | Canvas `toBlob('image/webp')`            | Smaller file size for web use                    | 3     |
| ICO    | 32px PNG wrapped in ICO binary container | Favicon fallback for older browsers              | 3     |

### WebP support notes

- **As an image format**: 97% global browser support. Fine for logo downloads.
- **As a favicon**: Not standardized for `<link rel="icon">`. Do not use for favicons.

---

## Phases

### Phase 1: Core ✅

Minimum viable component and export. Get logos generating immediately.

**Status: Complete** (commit `35cd9c5`)

**Scope:**

- `AppLogoProps` and `AppLogoConfig` types with defaults
- `AppLogo.svelte` component (live preview)
- Iconify API fetch + cache (`iconify.ts`)
- Icon source auto-detection (Iconify ID / emoji / SVG string / data URL)
- `iconColor` + `iconColorMode: "auto" | "original" | "monochrome"` only
- `cornerRadius` (standard CSS `border-radius` only, no squircle yet)
- `background`: solid color + gradient with `angle` + `colors` + `stops`
- `iconSize`, `iconOffsetX`, `iconOffsetY`
- `generateAppLogoSvg()` — programmatic SVG string builder
- `generateAppLogoPng()` — canvas-based rasterization (PNG only)
- Test page at `/test/app-logo` for interactive preview + manual download
- Package exports for `AppLogo` component + generation functions
- Link/card added to test route index (`/test`)

**Test page (`/test/app-logo/+page.svelte`):**

- Interactive controls: icon ID, color pickers, sliders for size/offset/radius, gradient toggle
- Live 256px preview on checkerboard transparency background
- "Download SVG" / "Download PNG" buttons
- 5-item preset gallery (default, monochrome on red, rounded corners, large icon, small offset)
- Serves as development sandbox until the full generator UI in Phase 3

**Implementation notes:**

- Monochrome detection heuristic: checks for `currentColor` in SVG; if absent, checks
  for hardcoded `fill`/`stroke` values. If neither found, assumes monochrome.
- CSS gradient angle to SVG `linearGradient` conversion uses `sin(angle)` / `-cos(angle)`
  for direction vector (CSS 0deg = up, clockwise; SVG Y-axis is inverted).
- `AppLogo.svelte` uses `$effect` + stale-request guard for async icon resolution
  (can't use `$derived` with `async`). Resolved icon stored in `$state.raw`.
- PNG export: SVG string → `Blob` URL → `Image` → `Canvas` → `toBlob('image/png')`.

**Files:**

```
src/lib/
  AppLogo.svelte
  app-logo/
    types.ts
    defaults.ts
    generate-svg.ts
    generate-png.ts
    iconify.ts

src/routes/
  test/app-logo/
    +page.svelte              # test/preview page

src/lib/index.ts              # add exports
src/routes/test/+page.svelte  # add link to test index
```

### Phase 2: Advanced Styling ✅

Full visual flexibility for corner shapes and icon color transforms.

**Status: Complete**

**Scope:**

- `cornerShape` — squircle + all `<corner-shape-value>` keywords + `superellipse(n)`
- Superellipse path generation (`squircle.ts`) per CSS Borders Level 4 spec
- Gradient `position` and `scale` props
- `iconRotation` (around icon center)
- Full `iconColorMode`: `"grayscale"`, `"grayscale-tint"`, `{ hue, saturation? }`
- OKLCH color transforms via `culori` library (not HSL)

**Implementation notes:**

- **Superellipse parametric curve**: Follows CSS Borders L4 spec exactly —
  `K = 2^abs(curvature)`, sampling `(T^K, (1-T)^K)` at 64 segments per corner.
  `round` (K=1) uses SVG arc commands for exact rendering.
- **Clip-out vs outline inversion**: The CSS spec generates a "clip-out" path (what
  to remove). Our outline path inverts the reference point: convex shapes use the
  outer corner, concave shapes use the inner center.
- **Notch (K=-∞)**: Inward right-angle cuts — path goes from tangent point inward
  to the corner-region center, then back out to the other tangent point.
- **OKLCH color space**: `culori` library used for perceptually uniform color
  transforms (grayscale via C=0, tint via hue/chroma at 70%, hue remap preserving L).
- **Test page UI**: Corner shape exposed as a continuous K slider (-10 to 10) with
  preset buttons (square, squircle, round, bevel, scoop, notch) rather than a
  dropdown, enabling smooth interpolation between shapes.

**Files (new):**

```
src/lib/
  app-logo/
    squircle.ts               # superellipse path generation (CSS Borders L4)
    color-transform.ts        # OKLCH color transforms via culori
```

**Dependencies added:**

| Package         | Purpose                      |
| --------------- | ---------------------------- |
| `culori`        | OKLCH color space transforms |
| `@types/culori` | TypeScript definitions       |

### Phase 3: Generator UI + Favicon Set ✅

Complete self-service tool with full asset export.

**Status: Complete** (commit TBD)

**Scope:**

- `/logo` page with full config UI (960px wide, overrides nimble.css default)
  - Unified 8-column controls grid (logo label | num | slider | reset | lock | fav-slider | fav-num | fav label)
    - Each `.ctrl-row` is an independent 8-col grid (`90px 54px 1fr 28px 36px 1fr 54px 90px`)
    - No CSS subgrid — subgrid caused all rows to inherit the icon textarea's height
    - Alternating row background tint for readability
  - Per-row lock button (🔒/🔓) between logo and favicon columns
    - Locked: favicon mirrors logo value in real time (dimmed, disabled)
    - Unlocked: favicon has independent value; unlocking snaps favicon to current logo value
    - All rows locked by default
  - All props per column: icon (textarea + Browse icons link), iconColor (swatch + hex),
    iconColorMode (dropdown), iconSize, iconOffsetX/Y, iconRotation, cornerRadius,
    cornerShape (K slider + preset buttons: square/squircle/round/bevel/scoop/notch),
    background (gradient toggle + solid color swatch + grad angle/position/scale)
  - All background rows always rendered (solid color + gradient angle/position/scale);
    inactive rows are dimmed with `opacity: 0.42` instead of removed — prevents layout shift
    when toggling gradient on/off
  - Each numeric control: slider + number input + ↺ reset (resets logo to default; no fav reset)
  - Corner K row: num+slider span merged into cols 2-3 (and 6-7 for favicon) so preset
    buttons have full width and don't wrap; favicon presets right-aligned to mirror logo side
  - Favicon preview: 96px (3×), 32px, 16px sizes side by side, ordered largest → smallest
  - Per-preview download buttons (SVG, PNG/WebP/ICO) and clipboard copy (PNG)
  - **"Download All"** zip button; app name/short name in collapsible `<details>`
- Full favicon set generation (`generateZipKit()`)
  - `icon.svg` (favicon variant)
  - `favicon.ico` (32×32 PNG wrapped in ICO container, written by hand — no library)
  - `apple-touch-icon.png` (180×180)
  - `icon-192.png`, `icon-512.png` (PWA manifest)
- Zip kit mirrors SvelteKit project root structure:
  ```
  static/
    favicon.ico
    icon.svg
    apple-touch-icon.png
    icon-192.png
    icon-512.png
    logo.png
    logo.webp
    logo.svg
    manifest.webmanifest
    _app-logo/
      config.json             # generator config for re-import
  _snippets/
    favicon-html.html         # <link> tags for app.html
  ```
- `manifest.webmanifest` generation (name, short_name, icons array)
- `_snippets/favicon-html.html` snippet generation
- WebP export (`canvas.toBlob('image/webp')`)
- Test page kept at `/test/app-logo` as development sandbox

**Files (new/modified):**

```
src/lib/
  app-logo/
    generate-favicon-set.ts   # generateZipKit, generateFaviconHtml, generateManifest
    generate-ico.ts           # ICO binary container (manual, no library)
    generate-png.ts           # added format: 'png' | 'webp' option

src/routes/
  logo/
    +layout.svelte            # --nc-content-width: 960px override
    +page.svelte              # full generator UI (~2600 lines)
```

**Dependencies (Phase 3):**

| Package | Purpose                                | Required? |
| ------- | -------------------------------------- | --------- |
| `jszip` | Zip file generation for "Download All" | Yes       |

**Implementation notes:**

- ICO format: 6-byte ICONDIR header + 16-byte ICONDIRENTRY + raw PNG bytes.
  Width/height read from PNG IHDR chunk at bytes 16-23 (big-endian uint32).
- WebP: same canvas pipeline as PNG, just `canvas.toBlob('image/webp')`.
- Clipboard copy: `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`.
- Zip kit: uses `jszip` with folder structure; `generateZipKit()` runs all exports
  in parallel via `Promise.all`.
- `modern-screenshot` not needed — programmatic SVG path proved sufficient.
- Lock/unlock icons: icomoon-free padlock SVGs inlined as constants (no async fetch).
  Unlock icon uses `viewBox="0 0 16 16"` with `overflow="visible"` so the open
  shackle extends past the viewBox without distorting the padlock body proportions.
- `effectiveFavicon`: derived object that merges locked fields from `logo` and
  unlocked fields from `favicon`; used for all favicon rendering and export.

---

## Generation Approach

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
- Both use the same foreignObject SVG → canvas technique.

### Programmatic API

Exported functions for use in scripts, server routes, or other components:

```typescript
// Returns an SVG string (Phase 1)
function generateAppLogoSvg(config: AppLogoConfig, variant?: 'logo' | 'favicon'): Promise<string>;

// Returns a PNG/WebP Blob — browser only, needs canvas (Phase 1: PNG only; Phase 3: +WebP)
function generateAppLogoPng(
	config: AppLogoConfig,
	options?: {
		variant?: 'logo' | 'favicon';
		size?: number; // px, default: 512
		format?: 'png' | 'webp';
	}
): Promise<Blob>;

// Returns the full favicon file set (Phase 3)
function generateFaviconSet(config: AppLogoConfig): Promise<{
	svg: string; // icon.svg content
	ico: Blob; // favicon.ico (32x32)
	appleTouchIcon: Blob; // 180x180 PNG
	icon192: Blob; // 192x192 PNG
	icon512: Blob; // 512x512 PNG
}>;
```

---

## Favicon Strategy

Following the [Evil Martians 2026 guide](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs),
the recommended minimal favicon set is:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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

**SVG favicon dark mode**: The generated SVG can include a `<style>` block with
`@media (prefers-color-scheme: dark)` to swap icon/background colors.

**SVG favicon support**: 90% global (Safari 26+, Chrome 80+, Firefox 41+).
The `.ico` fallback covers the remaining 10%.

---

## Package Exports

Added to `src/lib/index.ts`:

```typescript
// Phase 1
export { default as AppLogo } from './AppLogo.svelte';
export type { AppLogoProps, AppLogoConfig } from './app-logo/types.ts';
export { generateAppLogoSvg } from './app-logo/generate-svg.ts';
export { generateAppLogoPng } from './app-logo/generate-png.ts';
export { LEFTIUM_GRADIENT } from './app-logo/defaults.ts';

// Phase 3
export { generateFaviconSet } from './app-logo/generate-favicon-set.ts';
```

---

## Dependencies

Phase 2 added `culori` (OKLCH color transforms) + `@types/culori`. Iconify icons
are fetched via HTTP API at generation time (dev/build, not shipped to end users).

Phase 3 adds:

| Package             | Purpose                                       | Required?                                               |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `jszip`             | Zip file generation for "Download All"        | Yes (devDependency, ~45KB gzipped)                      |
| `modern-screenshot` | DOM-to-image fallback for emoji/complex cases | Optional, only if programmatic SVG path is insufficient |

---

## Leftium Brand Logo: Squircle Variant

The `LeftiumLogo.svelte` component (the animated brand mark on the homepage) was
updated to support a squircle rendering mode in addition to the original sharp square.

### `squircle` prop

A new boolean prop `squircle` (default `false`) on `LeftiumLogo` switches all three
visual layers simultaneously:

| Layer                | Square mode                                            | Squircle mode                                         |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Blue gradient square | Sharp rect (original)                                  | CSS `clip-path: polygon(...)` superellipse            |
| White glow           | `glow.svg` — blurred white rect                        | `glow-squircle.svg` — blurred white superellipse path |
| White ligature       | Original positioning (440×666, left=133.5, top=−65.75) | Squircle-adjusted positioning (see below)             |

A **Squircle** checkbox on the homepage (`/`) toggles the prop live.

### Squircle clip-path

The blue square and WebGL ripple canvas are clipped using a pre-computed CSS
`clip-path: polygon(...)` with percentage coordinates (50% radius, K=2 superellipse,
64 segments per corner). Using percentages means the clip scales automatically with
the element size — no JavaScript needed at render time.

This approach clips both the `background-image` (the SVG gradient) and the WebGL
ripple canvas in one step, preventing ripples from "escaping" the squircle corners.

**Algorithm**: Same superellipse formula as `squircle.ts` (CSS Borders Level 4):
`K = 2^abs(curvature)`, sampling `(T^K, (1-T)^K)` at 64 points per corner.
At `curvature=2`, `K=4`.

### Squircle glow

`glow-squircle.svg` replaces the white `<rect>` in `glow.svg` with the same
superellipse `<path>` (offset to match the rect's position). The Gaussian blur
(`stdDeviation=50.9`) then follows the squircle contour, reducing glow at the
corners and hugging the curved edges.

### Ligature repositioning

The ligature is a stroked path (200px stroke-width) whose inner V-corners
originally touched the top-right and bottom-right corners of the sharp square.
When the square becomes a squircle, those corners move inward, so the ligature
needs to be repositioned to keep the inner corners touching the new boundary.

**Geometry**: At 50% radius K=2, the squircle boundary at the 45° diagonal from
each corner is approximately 50px inward (35.36px on each axis). The inner stroke
corners are at ~45° from the square center, so a uniform scale is applied.

**Computed scale**: `749.99 / 794.00 ≈ 0.9446` (distance from center to squircle
corner vs. distance to original inner corner). The ligature is then fine-tuned
to `scale=1.023, offsetX=−6.5, offsetY=7` to align the "e" arc bottom with the
squircle boundary.

**Final squircle ligature constants** (in the 532-unit CSS coordinate space):

|                 | Square (original) | Squircle (adjusted) |
| --------------- | ----------------- | ------------------- |
| Width           | 440               | 425.2               |
| Height          | 666               | 643.6               |
| Left            | 133.5             | 129.5               |
| Top             | −65.75            | −47.6               |
| Shadow blur pad | 50                | 48.3                |

The shadow SVG (`shadow.svg`) is a blurred copy of the ligature path and tracks
the ligature position automatically (shadow = ligature bounds + blur pad on each side).

### Files

```
src/lib/
  LeftiumLogo.svelte            # squircle prop, dual ligature positioning
  assets/logo-parts/
    glow-squircle.svg           # new: squircle-shaped glow source
```

---

### Phase 4: Config Persistence, Sharing & Emoji Mapping

Shareable URLs, JSON import/export, copy-ready code/HTML snippets, and
cross-platform emoji rendering via Iconify auto-mapping.

**Status: Complete**

**Scope:**

- Homepage link to `/logo` ✅ (already added)
- Sticky preview row (previews stay visible while scrolling controls)
- Config JSON import/export UI
- Shareable URLs (hash-based config encoding)
- Copy HTML snippet button
- Copy Svelte component code snippet
- Emoji → Iconify auto-mapping (configurable, with visual comparison grid)

---

#### 4a. Sticky Preview Row

On shorter screens the preview row scrolls out of view while the user adjusts
lower controls (corner shape, gradient, etc.), making it impossible to see the
effect of changes in real time.

**Fix**: Make the preview row sticky so it remains visible at the top of the
viewport while the controls scroll beneath it.

**What sticks**: Only the `AppLogo` previews (the `.checkerboard` containers
with logo at 256px and favicon at 96/32/16px) and the column headings
("Logo" / "Favicon"). The download/copy action buttons (`.preview-actions`)
are **not** included in the sticky area — they're useful but not essential
during editing, and they add visual weight that would compete with the
previews.

**Implementation**:

- Wrap the sticky portion in a new `<div class="preview-sticky">` inside
  `.preview-row`. The `.preview-actions` and `<h2>` headings move below it.
- CSS:
  ```css
  .preview-sticky {
  	position: sticky;
  	top: 0;
  	z-index: 10;
  	background: var(--nc-bg-primary, #fff);
  	/* subtle bottom shadow to indicate floating */
  	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  	padding-bottom: 0.5rem;
  }
  ```
- The sticky container uses a solid background (matching the page) to prevent
  controls from bleeding through behind the previews.
- On tall screens where everything fits, the sticky behavior has no visual
  effect — it only activates when the user scrolls.

**Layout restructure**:

```
Before:                          After:
┌─ .preview-row ───────────┐    ┌─ .preview-sticky ────────────┐  ← sticky
│  checkerboard (logo 256) │    │  checkerboard (logo 256)     │
│  actions [Copy][SVG]...  │    │  checkerboard (fav 96/32/16) │
│  <h2>Logo</h2>           │    │  <h2>Logo</h2>  <h2>Fav</h2>│
│  ── gap ──               │    └──────────────────────────────┘
│  checkerboard (fav 96…)  │    ┌─ .preview-actions ───────────┐  ← scrolls
│  actions [Copy][ICO]...  │    │  [Copy][SVG][PNG]  [Copy]... │
│  <h2>Favicon</h2>        │    └──────────────────────────────┘
└──────────────────────────┘    ┌─ controls ───────────────────┐
                                │  ...                         │
```

---

#### 4b. Config Persistence & Sharing

##### JSON Import/Export

A collapsible "Config" `<details>` section (between the App info section and
Download All button) containing:

- **"Copy Config JSON"** button — serializes `fullConfig` (`AppLogoConfig`) to
  pretty-printed JSON and copies to clipboard
- **Textarea** — for pasting a previously exported `config.json`
- **"Import"** button — deserializes pasted JSON and applies it to the UI state

**Deserialization mapping** (`AppLogoConfig` → `ColumnState`):

The `AppLogoConfig` uses a structured format (`background` as `GradientConfig |
string`, `cornerShape` as keyword) while the UI uses flat `ColumnState` fields
(`solidColor`, `useGradient`, `gradientAngle`, `cornerK`, etc.). The import
function must:

1. Parse `background`: if string → `solidColor` + `useGradient: false`; if
   `GradientConfig` → extract `angle`, `position`, `scale`, first color as
   `solidColor`, `useGradient: true`
2. Parse `cornerShape`: extract K value from `"superellipse(N)"` or map keyword
   to K (`round`→1, `squircle`→2, `square`→10, `bevel`→0, `scoop`→-1,
   `notch`→-10)
3. Parse `iconColorMode`: if object (`{ hue, saturation }`) → set
   `iconColorModeKey: 'hue'`, `hueValue`, `saturationValue`; if string → set
   `iconColorModeKey` directly
4. Apply shared fields to `logo` state
5. Apply `config.favicon` overrides (if present) to `favicon` state and unlock
   the corresponding lock for any field that differs from the logo value

**Validation**: Wrap import in try/catch. On invalid JSON or missing required
fields (`icon`), show an inline error message below the textarea. Silently
ignore unknown fields for forward compatibility.

##### Shareable URLs

Encode the full config into the URL hash fragment so logos can be shared via
link.

**Format**: `#config=<base64url-encoded JSON>`

```
https://logo.leftium.com/logo#config=eyJpY29uIjoibWRpOnJvY2tldC1sYXVuY2giLC...
```

- **Encoding**: `JSON.stringify(fullConfig)` → `btoa()` (with Unicode-safe
  encoding via `TextEncoder` + manual base64) → URL-safe base64 (replace `+`
  with `-`, `/` with `_`, strip trailing `=`)
- **Decoding**: On page load, check `window.location.hash` for `#config=...`.
  If present, decode base64 → JSON.parse → apply via the same import logic as
  JSON paste
- **Live URL updates**: Debounced (500ms) `$effect` that updates
  `window.location.hash` via `history.replaceState()` (no navigation, no
  history spam) whenever `fullConfig` changes
- **URL priority**: Hash config takes precedence over defaults on initial load.
  After load, the hash tracks the UI state bidirectionally
- **"Copy Link"** button next to "Copy Config JSON" — copies the full URL
  (with hash) to clipboard

**Size considerations**: A typical config JSON is 300–600 bytes; base64
inflates ~33%, so URLs will be 400–800 characters — well within browser limits
(2048+ chars supported everywhere). Configs with unlocked favicon overrides
will be on the longer end.

**Empty/default state**: When the config matches `DEFAULT_STATE` exactly, the
hash should be empty (clean URL). Only non-default values need encoding — but
for simplicity, Phase 4 encodes the full config. Diff-based encoding can be a
future optimization.

---

#### 4c. Copy Buttons

##### Copy HTML Snippet

A **"Copy HTML"** button in the Download All area (next to the zip button, not
next to the per-image copy buttons). Copies the same `<link>` tag snippet that
goes into `_snippets/favicon-html.html` in the zip:

```html
<title>My App</title>
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

Uses `navigator.clipboard.writeText()`. Shows "Copied!" feedback for 1.5s
(same pattern as existing Copy PNG buttons).

##### Copy Svelte Component Code

A **"Copy Svelte"** button next to "Copy HTML". Generates a minimal
`<AppLogo>` snippet using only non-default props:

```svelte
<script>
	import { AppLogo } from '@leftium/logo';
</script>

<AppLogo
	icon="mdi:rocket-launch"
	iconColor="#ffffff"
	cornerRadius={20}
	cornerShape="squircle"
	background={{ colors: ['#0029c1', '#3973ff', '#0029c1'], stops: [0, 0.29, 1], angle: 45 }}
/>
```

**Implementation**: Compare each field in `fullConfig` against `DEFAULTS`. Only
include props that differ from defaults. String values use `prop="value"`,
numbers/booleans/objects use `prop={value}`. The `background` prop uses the
`AppLogoProps` format (not `ColumnState` — i.e., `GradientConfig` object or
solid color string).

If the favicon config differs from the logo config, generate a comment noting
the favicon overrides:

```svelte
<!-- Favicon variant uses different settings:
     iconSize={70}, cornerRadius={25} -->
```

---

#### 4d. Emoji → Iconify Auto-Mapping

##### Problem

Emoji icons are currently rendered as SVG `<text>` elements using system fonts.
This produces platform-dependent rendering — the same emoji looks different on
macOS, Windows, Android, and Linux.

##### Solution

When the icon input is detected as emoji (by `detectIconSource()`), auto-map it
to an equivalent Iconify SVG icon from a configurable emoji icon set. This
produces consistent vector rendering across all platforms.

##### Available emoji icon sets

| Prefix                       | Name                 | Icons | Style                     | Auto-map | Notes                           |
| ---------------------------- | -------------------- | ----: | ------------------------- | -------- | ------------------------------- |
| `twemoji`                    | Twitter Emoji        | 3,988 | Flat, bold, colorful      | Yes      | **Default.** Widest recognition |
| `noto`                       | Noto Emoji           | 3,710 | Google, detailed          | Yes      |                                 |
| `openmoji`                   | OpenMoji             | 4,470 | Outline/flat, open-source | Yes      | Largest set                     |
| `fluent-emoji`               | Fluent Emoji         | 3,126 | Microsoft 3D-style        | Yes      |                                 |
| `fluent-emoji-flat`          | Fluent Emoji Flat    | 3,145 | Microsoft flat            | Yes      | Good for logos                  |
| `emojione`                   | Emoji One (Colored)  | 1,834 | Classic color             | Yes      |                                 |
| `noto-v1`                    | Noto Emoji v1        | 2,162 | Older Google style        | Yes      | Legacy                          |
| `emojione-v1`                | Emoji One v1         | 1,262 | Legacy color              | Yes      | Legacy                          |
| `emojione-monotone`          | Emoji One (Monotone) | 1,403 | **Monochrome**            | Yes      | Useful with `iconColor`         |
| `fluent-emoji-high-contrast` | Fluent Emoji HC      | 1,595 | **Monochrome**            | Yes      |                                 |
| `fxemoji`                    | Firefox OS Emoji     | 1,034 | Playful                   | **No**   | Non-standard naming             |
| `streamline-emojis`          | Streamline Emojis    |   787 | Illustrative              | **No**   | Non-standard naming             |

Sets marked "No" for auto-map use non-standard icon names (e.g., `fxemoji`
uses `hampster` instead of `hamster`, `catside` instead of `cat`). These sets
are still available when the user types a full Iconify ID like
`fxemoji:rocket`, but the automatic emoji-to-Iconify mapping won't work.

##### Emoji-to-Iconify name resolution

1. **Extract codepoints**: Convert the emoji string to its Unicode codepoint
   sequence. Handle multi-codepoint emoji (flags, skin tones, ZWJ sequences).
   Strip variation selectors (`U+FE0E`, `U+FE0F`).

   Examples:
   - `🚀` → `1f680`
   - `👨‍💻` → `1f468-200d-1f4bb` (ZWJ sequence)
   - `🇺🇸` → `1f1fa-1f1f8` (flag)

2. **Build Iconify slug**: Iconify emoji sets use human-readable slugs (e.g.,
   `rocket`, `man-technologist`, `flag-united-states`), not codepoint-based
   names. Two resolution strategies:

   **Strategy A — Iconify search API**: Query
   `https://api.iconify.design/search?query=<emoji>&prefix=<set>&limit=1`.
   The API accepts emoji characters directly and returns matching icon names.

   **Strategy B — Unicode CLDR name mapping**: Use the Unicode CLDR short name
   for the codepoint (e.g., `U+1F680` → `"rocket"`) and convert to slug
   format (`kebab-case`). Most Iconify emoji sets use CLDR-derived names.
   A lightweight CLDR-to-slug table (~15KB for common emoji) can be embedded
   or lazy-loaded.

   **Recommended**: Try Strategy A first (most accurate); fall back to
   Strategy B if offline or API unavailable. Cache results in the same
   in-memory icon cache used by `resolveIcon()`.

3. **Fetch SVG**: Once the Iconify slug is resolved (e.g., `twemoji:rocket`),
   fetch via the standard Iconify pipeline in `iconify.ts`.

4. **Fallback**: If no matching icon is found in the selected set, fall back to
   the current `<text>` rendering with a visual warning indicator in the UI
   (e.g., an orange border around the preview with a tooltip:
   "Emoji not found in twemoji set — rendering with system font").

##### UI: Emoji style picker with visual comparison

When the current icon is detected as emoji, an **emoji style picker** appears
below the icon input. Instead of a dropdown (which hides the options), all
available emoji sets are shown simultaneously as a visual comparison grid so
the user can see and compare renderings at a glance.

**Layout** — horizontal grid of small icon previews, one per set:

```
 Emoji style:
 ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 │ 🚀   │ │ 🚀   │ │ 🚀   │ │ 🚀   │ │ 🚀   │ │ 🚀   │  ...
 │twemoj│ │ noto │ │openmo│ │fluent│ │fl-flt│ │emoji1│
 └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
  ▲ selected
```

Each cell shows:

- The emoji rendered via that set's Iconify SVG (fetched on demand), at ~40px
- The set name below (abbreviated if needed)
- A **selected** indicator (highlight border / check mark) on the active set
- Clicking a cell selects that set as the `emojiStyle`

**Grouping**: Color sets first, then monochrome sets (separated by a subtle
divider or label). The "Platform native" option is shown as the last cell,
rendering the emoji as a `<text>` element (i.e., the system font).

**Loading**: Previews are fetched lazily. While loading, each cell shows a
small spinner or the emoji character as placeholder text. Failed lookups
(emoji not in that set) show the cell dimmed with a "not found" indicator.

**Placement**: The picker spans the full width of the controls area (below
the icon `<textarea>` row, above the icon color row). It's conditionally
rendered — hidden when the icon is not emoji.

**Responsive**: On narrow screens, the grid wraps to multiple rows. Each
cell is a fixed ~64px wide (icon + label).

**"Platform native" option**: The last cell in the grid. Shows the emoji
via system font rendering. When selected, a subtle note appears:
"Emoji appearance will vary by platform."

##### Config serialization

The selected emoji style is stored in `AppLogoConfig` as a new optional field:

```typescript
interface AppLogoConfig {
	// ... existing fields ...
	emojiStyle?: string; // Iconify prefix, e.g. "twemoji", "noto"
	// Default: "twemoji"
	// Set to "native" to disable auto-mapping
}
```

This field is included in `config.json` (zip export), JSON copy, and URL hash
so shared logos preserve the emoji rendering choice.

##### Changes to `iconify.ts`

The `resolveIcon()` function's `'emoji'` case changes from:

```typescript
case 'emoji':
    return { svgContent: `<text ...>`, viewBox, isMonochrome: false, sourceType };
```

To:

```typescript
case 'emoji': {
    if (emojiStyle !== 'native') {
        const slug = await resolveEmojiSlug(icon, emojiStyle);
        if (slug) {
            // Delegate to the 'iconify' pipeline
            return resolveIcon(`${emojiStyle}:${slug}`, emojiStyle);
        }
    }
    // Fallback: platform-native <text> rendering
    return { svgContent: `<text ...>`, viewBox, isMonochrome: false, sourceType };
}
```

`resolveEmojiSlug(emoji: string, prefix: string)` is a new function that
implements the codepoint → Iconify slug mapping (Strategy A/B above).

**Files (new/modified):**

```
src/lib/
  app-logo/
    config-serialization.ts     # NEW: ColumnState, defaults, build/parse, URL hash, snippets
    iconify.ts                  # emoji case rewrite, resolveEmojiSlug()
    types.ts                    # emojiStyle + grayscaleLightness on AppLogoConfig/AppLogoProps
    defaults.ts                 # DEFAULT_EMOJI_STYLE, EMOJI_SETS array
    color-transform.ts          # grayscaleLightness multiplier in grayscale/grayscale-tint
    generate-svg.ts             # grayscaleLightness passthrough to applyColorMode
  AppLogo.svelte                # emojiStyle + grayscaleLightness props
  tooltip.ts                    # NEW: Svelte action wrapping tippy.js

src/routes/
  logo/
    +page.svelte                # sticky preview, JSON import/export UI, URL hash
                                # sync, Copy HTML/Svelte buttons, emoji style
                                # picker grid, grouped controls (<article> cards),
                                # grayscale lightness slider, tippy tooltips,
                                # disabled reset buttons at default values
```

**Dependencies (Phase 4):**

| Package          | Purpose                                      | Required? |
| ---------------- | -------------------------------------------- | --------- |
| `tippy.js`       | Instant tooltips on Copy HTML/Svelte buttons | Yes       |
| `@popperjs/core` | Positioning engine for tippy.js (types)      | Yes       |

The Iconify search API and existing fetch pipeline handle emoji resolution.
If a CLDR name table is embedded for offline fallback, it adds ~15KB to the
bundle.

**Implementation notes:**

- URL hash encoding uses `TextEncoder` → `Uint8Array` → base64 to handle
  Unicode correctly (emoji in icon names, non-ASCII app names).
- `history.replaceState()` avoids polluting browser history with every slider
  drag. The 500ms debounce prevents excessive calls.
- The JSON import must handle both the full `AppLogoConfig` format (from
  `config.json` in the zip) and potentially a raw `ColumnState` dump (for
  internal copy/paste between sessions). Detect by checking for
  `background` (AppLogoConfig) vs `useGradient` (ColumnState).
- Emoji style picker renders all sets as a CSS grid of preview cells; each
  cell lazy-fetches its icon SVG on mount via `resolveIcon()`.
- The `resolveEmojiSlug()` cache key includes the prefix so switching styles
  doesn't cause redundant lookups for already-resolved slugs.

##### UI enhancements (added alongside Phase 4)

**Grouped controls**: The flat controls grid is reorganized into three visual
groups using nimble.css `<article>` card wrappers with `<header>` elements:

| Group        | Fields                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Icon / Emoji | Icon, Emoji Style, Icon Color, Color Mode, Hue, Saturation, Lightness, Icon Size, Offset X/Y, Rotation |
| Corners      | Corner Radius, Corner K                                                                                |
| Background   | Background toggle, Solid Color, Gradient Angle/Position/Scale                                          |

Each group header uses the same 8-column grid as the control rows, with the
group title spanning columns 1-3, a reset button in column 4, and a lock/unlock
button in column 5 -- visually aligned with the per-row reset/lock buttons.

- **Group reset**: Resets all fields in the group to `DEFAULT_STATE`. Disabled
  (opacity 0.3) when all fields are already at defaults.
- **Group lock**: Toggles all locks in the group. Shows locked icon when all
  fields are locked; unlocked when any field is unlocked.
- **Per-row reset buttons**: Now disabled (opacity 0.3, `pointer-events: none`)
  when the individual field matches its default value.

**Grayscale lightness**: A new `grayscaleLightness` prop (0-200%, default 100%)
controls the OKLCH lightness multiplier for `'grayscale'` and `'grayscale-tint'`
color modes. The slider row appears conditionally (same pattern as Hue/Saturation
rows). This allows making grayscale icons lighter or darker without switching
modes.

**Tippy.js tooltips**: The Copy HTML and Copy Svelte buttons use tippy.js
(`use:tooltip` Svelte action) instead of native `title` attributes. Tooltips
show a monospace preview of the clipboard content with 80ms show delay (vs the
browser's ~500-1000ms default for `title`). Tooltip content updates reactively
as the config changes.

---

## Open Questions / Future

- [ ] Dark mode variant: auto-generate a dark-mode favicon with inverted colors?
- [ ] CLI tool: `npx @leftium/logo generate --icon mdi:rocket --out ./static/`?
- [ ] Batch generation: config file with multiple projects?
- [ ] Should the component be SSR-compatible (no canvas dependency)?
- [ ] Diff-based URL encoding: only encode non-default values to shorten URLs?
- [ ] CLDR name table: embed for offline emoji resolution, or always require API?
- [ ] Emoji skin tone support: should skin-tone modifiers be preserved in the
      Iconify mapping, or stripped to use the default yellow?
