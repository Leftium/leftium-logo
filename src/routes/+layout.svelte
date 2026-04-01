<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

{@render children?.()}

<style>
	:global(body) {
		overflow: hidden;
		--nc-content-width: 100vw;
	}
</style>
