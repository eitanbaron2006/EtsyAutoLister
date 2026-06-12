
// Pick a column count whose cells stay close to square inside a wide dialog
// (4 → 2+2, 6 → 3+3, 7 → 4+3, 8 → 4+4). Tall narrow cells are penalized
// harder than wide flat ones — square-ish photos waste far more space in
// them — and incomplete last rows cost a little extra.
export function balancedGridColumns(count: number): number {
  const CONTAINER_ASPECT = 2.2; // typical width/height of the dialog grid area
  let best = 1;
  let bestScore = Infinity;
  for (let cols = 1; cols <= Math.min(count, 8); cols++) {
    const rows = Math.ceil(count / cols);
    const cellAspect = (CONTAINER_ASPECT * rows) / cols;
    const aspectScore = cellAspect >= 1
      ? Math.log(cellAspect) * 0.6 // wide cell — mild penalty
      : -Math.log(cellAspect) * 1.5; // tall cell — heavy penalty
    const score = aspectScore + (cols * rows - count) * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = cols;
    }
  }
  return best;
}

