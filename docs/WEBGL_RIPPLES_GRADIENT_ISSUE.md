# WebGL Ripples Gradient Rendering Issue

## Problem

The original `webgl-ripples` library cannot properly render gradients on the "original" side of the comparison page. The gradient appears as a solid color instead.

## Root Cause Analysis

### How the Original Library Works

1. Reads the background image from CSS or `imageUrl` option
2. Loads the image into a WebGL texture using `gl.texImage2D()`
3. **Hides the CSS background** with `element.style.backgroundImage = 'none'`
4. Renders the texture through WebGL with ripple distortion effects

### Why Gradients Fail

When a canvas-generated gradient (via `createLinearGradient`) is passed as a data URL:

1. The gradient loads successfully as an Image
2. WebGL loads it as a texture
3. However, during WebGL rendering, the gradient appears as a solid color
4. This is likely due to:
   - Texture sampling issues in the fragment shader
   - The ripple distortion algorithm collapsing the gradient
   - Possible precision loss during texture coordinate calculations

### Why the Modified Version Works

The modified version (`webgl-ripples.js`) was changed to:

- **NOT hide the CSS background** after loading the texture
- Effectively overlay the ripple effects on top of the visible CSS gradient
- This allows the gradient to show through properly

## Solutions Attempted

### Option 1: CSS Background (Partial Success)

- Set gradient as `background-image` CSS property
- ✅ Works for modified version (CSS remains visible)
- ❌ Fails for original (CSS gets hidden, WebGL renders solid color)

### Option 2: Direct imageUrl (Failed)

- Pass gradient data URL via `imageUrl` option
- ❌ Same issue - WebGL renders solid color

### Option 3: Prevent CSS Hiding (Not Viable)

- Override `hideCssBackground()` method
- ❌ Doesn't help because WebGL canvas covers the background

### Option 4: IMG Element Behind Canvas (Failed)

- Create IMG element with gradient at `z-index: -2`
- WebGL canvas at `z-index: -1`
- ❌ WebGL canvas is opaque, blocks the IMG

### Option 5: File-based Gradients (Failed)

- SVG with gradient
- PNG with gradient
- ❌ Same WebGL rendering issue

## Technical Details

### Fragment Shader Code (Line 847)

```glsl
gl_FragColor = texture2D(samplerBackground, backgroundCoord + offset * perturbance) + specular;
```

The shader samples the background texture at distorted coordinates. This distortion may cause gradients to collapse into their dominant color.

### Texture Setup (Lines 866-867)

```javascript
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
```

Linear filtering is used, which should be appropriate for gradients, but the issue persists.

## Conclusion

The original `webgl-ripples` library has a fundamental limitation with gradient rendering through WebGL. The modified version works around this by keeping the CSS background visible and overlaying the ripple effects, rather than replacing the background entirely.

## Recommendation

For the test page comparison:

1. **Modified side**: Continue using CSS background (working)
2. **Original side**: Accept the solid color limitation as a known issue with the unmodified library
3. Document this as an improvement made in the modified version

This demonstrates one of the key enhancements in the modified version - better handling of gradient backgrounds.
