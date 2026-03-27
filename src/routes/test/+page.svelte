<script lang="ts">
	// Test pages listing
	const testPages = [
		{
			name: 'Synchronized Animation',
			path: '/test/synchronized',
			description: 'NEW! Global synchronized animation state across all LeftiumLogo instances'
		},
		{
			name: 'Logo Scaling Test',
			path: '/test/logo-scaling',
			description: 'Compare LeftiumLogo scaling algorithms at different sizes'
		},
		{
			name: 'Ripples Tuning',
			path: '/test/ripples-tuning',
			description: 'Fine-tune ripples parameters'
		},
		{
			name: 'Ripples Original',
			path: '/test/ripples-original',
			description: 'Original ripples implementation'
		},
		{
			name: 'Bounding Box Tests',
			path: '/test/bounding',
			description: 'Test different bounding box modes'
		},
		{
			name: 'Responsive Tests',
			path: '/test/responsive',
			description: 'Test responsiveness across screen sizes'
		}
	];
</script>

<main>
	<h1>Leftium Logo Test Pages</h1>
	<p>Explore different test pages for the Leftium Logo component:</p>

	<div class="test-grid">
		{#each testPages as page (page.path)}
			<a href={page.path} class="test-card">
				<h2>{page.name}</h2>
				<p>{page.description}</p>
			</a>
		{/each}
	</div>

	<p><a href="/">← Back to main page</a></p>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	h1,
	p {
		text-align: center;
	}

	.test-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	main {
		max-width: 800px;
		margin-inline: auto;
	}

	.test-card {
		display: block;
		padding: 1rem;
		border: 1px solid var(--nc-border);
		border-radius: var(--nc-radius);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		background: var(--nc-surface-2);
	}

	.test-card:hover {
		border-color: var(--nc-primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.test-card h2 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem;
	}

	.test-card p {
		text-align: left;
		font-size: 0.9rem;
		margin: 0;
	}
</style>
