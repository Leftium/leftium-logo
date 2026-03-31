<script lang="ts">
	// L polygon vertices in grid units (each square = 1×1)
	const vertices = [
		[0, 0],
		[1, 0],
		[1, 4],
		[3, 4],
		[3, 5],
		[0, 5]
	];

	const cols = 3;
	const rows = 5;
	const pad = 0.3;

	// Unrotated points string (grid units)
	const unrotatedPoints = vertices.map(([x, y]) => `${x},${y}`).join(' ');

	// 45° CW rotation: x' = x*cos(45) + y*sin(45), y' = -x*sin(45) + y*cos(45)
	// cos(45) = sin(45) = √2/2
	const R = Math.SQRT2 / 2;
	const rotatedVertices = vertices.map(([x, y]) => [x * R - y * R, x * R + y * R]);

	// Find bounding box of rotated shape
	const rxs = rotatedVertices.map(([x]) => x);
	const rys = rotatedVertices.map(([, y]) => y);
	const rMinX = Math.min(...rxs);
	const rMaxX = Math.max(...rxs);
	const rMinY = Math.min(...rys);
	const rMaxY = Math.max(...rys);
	const rW = rMaxX - rMinX;
	const rH = rMaxY - rMinY;

	const rotatedPoints = rotatedVertices.map(([x, y]) => `${x},${y}`).join(' ');

	// ViewBox dimensions
	const uVbX = -pad;
	const uVbY = -pad;
	const uVbW = cols + 2 * pad;
	const uVbH = rows + 2 * pad;

	const rVbX = rMinX - pad * rW * 0.15;
	const rVbY = rMinY - pad * rH * 0.15;
	const rVbW = rW + 2 * pad * rW * 0.15;
	const rVbH = rH + 2 * pad * rH * 0.15;

	// Rotated background: square that encloses the rotated shape
	const bgSize = Math.max(rW, rH);
	const bgCx = (rMinX + rMaxX) / 2;
	const bgCy = (rMinY + rMaxY) / 2;

	// Grid line stroke width (relative to viewBox)
	const gridStroke = 0.02;
</script>

<main>
	<h1>Favicon L Ligature</h1>

	<div class="compare">
		<div>
			<h2>Unrotated</h2>
			<p>{cols}&times;{rows} grid</p>
			<div class="svg-wrap">
				<svg
					width="250"
					height={250 * (uVbH / uVbW)}
					viewBox="{uVbX} {uVbY} {uVbW} {uVbH}"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<linearGradient id="leftium-grad-u" x1="0%" y1="100%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#0029c1" />
							<stop offset="29%" stop-color="#3973ff" />
							<stop offset="100%" stop-color="#0029c1" />
						</linearGradient>
					</defs>

					<rect x="0" y="0" width={cols} height={rows} fill="url(#leftium-grad-u)" />

					<polygon points={unrotatedPoints} fill="white" />

					<g
						stroke="rgba(255,255,255,0.35)"
						stroke-width={gridStroke}
						stroke-dasharray="{gridStroke * 3} {gridStroke * 3}"
						fill="none"
					>
						{#each Array(cols + 1) as _, i (i)}
							<line x1={i} y1={0} x2={i} y2={rows} />
						{/each}
						{#each Array(rows + 1) as _, j (j)}
							<line x1={0} y1={j} x2={cols} y2={j} />
						{/each}
					</g>
				</svg>
			</div>
		</div>

		<div>
			<h2>Rotated 45° CW</h2>
			<p>{rW.toFixed(2)} &times; {rH.toFixed(2)}</p>
			<div class="svg-wrap">
				<svg
					width="250"
					height={250 * (rVbH / rVbW)}
					viewBox="{rVbX} {rVbY} {rVbW} {rVbH}"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<linearGradient id="leftium-grad-r" x1="0%" y1="100%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#0029c1" />
							<stop offset="29%" stop-color="#3973ff" />
							<stop offset="100%" stop-color="#0029c1" />
						</linearGradient>
					</defs>

					<!-- Gradient background: square that encloses the rotated shape -->
					<rect
						x={bgCx - bgSize / 2}
						y={bgCy - bgSize / 2}
						width={bgSize}
						height={bgSize}
						fill="url(#leftium-grad-r)"
					/>

					<polygon points={rotatedPoints} fill="white" />
				</svg>
			</div>
		</div>
	</div>

	<details>
		<summary>Geometry details</summary>
		<h3>Unrotated vertices</h3>
		<pre>{JSON.stringify(vertices, null, 2)}</pre>
		<h3>Rotated vertices</h3>
		<pre>{JSON.stringify(
				rotatedVertices.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]),
				null,
				2
			)}</pre>
		<h3>Rotated bounding box</h3>
		<pre>min: ({rMinX.toFixed(4)}, {rMinY.toFixed(4)})
max: ({rMaxX.toFixed(4)}, {rMaxY.toFixed(4)})
size: {rW.toFixed(4)} × {rH.toFixed(4)}</pre>
	</details>

	<p><a href="/test">&larr; Back to test pages</a></p>
</main>

<style>
	:global(body) {
		overflow-y: auto !important;
	}

	main {
		max-width: 800px;
		margin-inline: auto;
		padding: 1rem;
		text-align: center;
	}

	.compare {
		display: flex;
		gap: 2rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	.compare > div {
		flex: 0 1 auto;
	}

	h2 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem;
	}

	.compare p {
		font-size: 0.85rem;
		margin: 0 0 0.5rem;
		color: #888;
	}

	.svg-wrap {
		display: flex;
		justify-content: center;
	}

	svg {
		border: 1px solid rgba(128, 128, 128, 0.3);
		border-radius: 8px;
	}

	details {
		text-align: left;
		margin-bottom: 1rem;
	}

	pre {
		background: rgba(0, 0, 0, 0.05);
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 0.85rem;
		overflow-x: auto;
	}
</style>
