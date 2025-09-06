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
	main {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		color: #333;
		text-align: center;
		margin-bottom: 1rem;
	}

	p {
		text-align: center;
		color: #666;
		margin-bottom: 2rem;
	}

	.test-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.test-card {
		display: block;
		padding: 1.5rem;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
		background: #fafafa;
	}

	.test-card:hover {
		border-color: #007acc;
		background: #f0f8ff;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.test-card h2 {
		margin: 0 0 0.5rem 0;
		color: #333;
		font-size: 1.2rem;
	}

	.test-card p {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
		line-height: 1.4;
		text-align: left;
	}

	a[href='/'] {
		color: #007acc;
		text-decoration: none;
		font-weight: 500;
	}

	a[href='/']:hover {
		text-decoration: underline;
	}
</style>
