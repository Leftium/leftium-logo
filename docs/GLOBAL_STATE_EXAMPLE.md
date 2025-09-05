# Global State Synchronization - Usage Examples

## Before (Previous External Usage)

```javascript
<script lang="ts">
    import 'open-props/style'
    import { favicon, LeftiumLogo } from '@leftium/leftium-logo'
    import { dev } from '$app/environment'
    import { page } from '$app/stores'

    let { children } = $props()
    let animated = $state(!dev)  // Local state management needed

    function handleLogoClick(event: MouseEvent) {
        event.preventDefault()
        event.stopPropagation()
        animated = !animated  // Manual state toggle
    }
</script>

<header class="screen-only">
    <nav class="container">
        <ul>
            <li>
                <div class="brand">
                    <div class="logo-wrapper">
                        <LeftiumLogo
                            {animated}                    // Pass state down
                            boundingBox="square"
                            size="3.75rem"
                            on:click={handleLogoClick}    // External handler needed
                        />
                    </div>
                </div>
            </li>
        </ul>
    </nav>
</header>
```

## After (New Global State - Simplified!)

```javascript
<script lang="ts">
    import 'open-props/style'
    import { favicon, LeftiumLogo, globalAnimated } from '@leftium/leftium-logo'
    import { dev } from '$app/environment'
    import { page } from '$app/stores'

    let { children } = $props()

    // Set initial global state (affects ALL LeftiumLogo instances)
    globalAnimated.set(!dev)
</script>

<header class="screen-only">
    <nav class="container">
        <ul>
            <li>
                <div class="brand">
                    <div class="logo-wrapper">
                        <LeftiumLogo
                            boundingBox="square"
                            size="3.75rem"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                            }}
                        />
                    </div>
                </div>
            </li>
        </ul>
    </nav>
</header>
```

## Key Improvements

1. **No Local State**: Remove `let animated = $state(!dev)`
2. **No Manual Toggle**: Remove `animated = !animated` logic
3. **Cleaner Props**: No need to pass `{animated}` prop
4. **Global Control**: `globalAnimated.set(!dev)` affects all instances
5. **Simplified Events**: `onClick` callback handles preventDefault/stopPropagation only

## Multiple Synchronized Instances

```javascript
<script>
    import { LeftiumLogo, globalAnimated } from '@leftium/leftium-logo'

    // Set initial state for ALL logos
    globalAnimated.set(true)

    function toggleAllLogos() {
        globalAnimated.update(val => !val)  // Affects all instances instantly!
    }
</script>

<!-- All these logos are automatically synchronized -->
<LeftiumLogo size="100px" />
<LeftiumLogo size="200px" />
<LeftiumLogo size="300px" />

<!-- Click any logo or this button - all logos respond together -->
<button onclick={toggleAllLogos}>Toggle All Animations</button>
```

## Perfect Synchronization

- **Click any logo** → All logos toggle together
- **Global state changes** → All instances update instantly
- **No coordination needed** → Svelte's reactivity handles everything
- **Clean API** → No flags, no configuration, just works
