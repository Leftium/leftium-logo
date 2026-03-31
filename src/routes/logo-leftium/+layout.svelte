<script lang="ts">
	let { children } = $props();
</script>

{@render children?.()}

<style>
	:global(:root) {
		--nc-content-width: 1400px;
	}
</style>
