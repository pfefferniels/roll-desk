export type Point = { x: number; y: number };

export interface KMeansResult {
  centroids: Point[];
  assignments: number[]; // assignments[i] = index of centroid for points[i]
  iterations: number;
}

function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/**
 * Simple k-means clustering for 2D points.
 *
 * @param points      Array of 2D points
 * @param k           Number of clusters
 * @param maxIters    Max iterations before stopping
 * @param tol         Convergence tolerance (on centroid movement)
 */
export function kMeans2D(
  points: Point[],
  k: number,
  maxIters: number = 100,
  tol: number = 1e-4
): KMeansResult {
  if (points.length === 0) {
    throw new Error("kMeans2D: no points given.");
  }
  if (k <= 0) {
    throw new Error("kMeans2D: k must be positive.");
  }
  if (k > points.length) {
    throw new Error("kMeans2D: k cannot be larger than number of points.");
  }

  // --- 1. initialize centroids by sampling k distinct points ---
  const chosenIndices = new Set<number>();
  while (chosenIndices.size < k) {
    chosenIndices.add(randomInt(points.length));
  }
  let centroids: Point[] = Array.from(chosenIndices).map(i => ({
    x: points[i].x,
    y: points[i].y,
  }));

  let assignments: number[] = new Array(points.length).fill(0);

  // --- 2. main loop ---
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;

    // --- assignment step: assign each point to closest centroid ---
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let bestIdx = 0;
      let bestDist = distanceSq(p, centroids[0]);

      for (let c = 1; c < k; c++) {
        const d = distanceSq(p, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = c;
        }
      }

      if (assignments[i] !== bestIdx) {
        assignments[i] = bestIdx;
        changed = true;
      }
    }

    // optional early exit: if no assignment changed, we might be done
    // (we still check centroid movement below to be safe)
    // if (!changed) break;

    // --- update step: recompute centroids as mean of cluster points ---
    const sums: Point[] = Array.from({ length: k }, () => ({ x: 0, y: 0 }));
    const counts: number[] = new Array(k).fill(0);

    for (let i = 0; i < points.length; i++) {
      const cluster = assignments[i];
      sums[cluster].x += points[i].x;
      sums[cluster].y += points[i].y;
      counts[cluster]++;
    }

    const newCentroids: Point[] = centroids.map((old, idx) => {
      if (counts[idx] === 0) {
        // empty cluster: reinitialize to a random point to avoid NaN
        const randomPoint = points[randomInt(points.length)];
        return { x: randomPoint.x, y: randomPoint.y };
      }
      return {
        x: sums[idx].x / counts[idx],
        y: sums[idx].y / counts[idx],
      };
    });

    // --- check convergence (centroids moved < tol) ---
    let maxMoveSq = 0;
    for (let c = 0; c < k; c++) {
      const moveSq = distanceSq(centroids[c], newCentroids[c]);
      if (moveSq > maxMoveSq) {
        maxMoveSq = moveSq;
      }
    }

    centroids = newCentroids;

    if (maxMoveSq < tol * tol) {
      return { centroids, assignments, iterations: iter + 1 };
    }
  }

  return { centroids, assignments, iterations: maxIters };
}
