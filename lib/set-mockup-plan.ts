// Which mockups a set of artworks is worth showing.
//
// A set sells as a group, so most of the photos are the whole group on a wall.
// But a buyer also wants to see the pieces: what each one looks like on its
// own, and how they read in twos and threes. The rule the shop asked for:
//
//   - at least three mockups of the complete set, and
//   - every artwork in the set appears somewhere among the rest.
//
// The second half is the one worth writing down. A set of five whose fifth
// image never appears in any photo is a listing that sells something the buyer
// has not been shown.

export interface MockupPlanItem {
  /** Indices into the artwork list, in the order they fill the frames. */
  artworks: number[];
  /** True when this is the complete set. */
  full: boolean;
}

export interface MockupPlanOptions {
  /** How many photos to plan for in total. */
  total?: number;
  /** How many of them must show the complete set. */
  minimumFull?: number;
  /** Largest group a template is expected to hold. */
  maxGroup?: number;
}

/**
 * The photo plan for one set.
 *
 * Full-set shots first, because they are the ones that sell it. Then groups
 * that get smaller as they go -- pairs and triples before singles -- and the
 * order within them is chosen so the artworks that have been seen least come
 * first. That is what guarantees the coverage rather than hoping for it.
 */
export function planSetMockups(imageCount: number, options: MockupPlanOptions = {}): MockupPlanItem[] {
  const total = Math.max(1, options.total ?? 7);
  const minimumFull = Math.max(0, options.minimumFull ?? 3);
  const maxGroup = Math.max(1, options.maxGroup ?? 12);

  if (imageCount <= 1) {
    return Array.from({ length: total }, () => ({ artworks: [0], full: true }));
  }

  const everything = Array.from({ length: imageCount }, (_, index) => index);
  const plan: MockupPlanItem[] = [];

  const fullShots = Math.min(total, Math.max(1, minimumFull));
  for (let index = 0; index < fullShots; index += 1) {
    plan.push({ artworks: everything.slice(0, maxGroup), full: true });
  }

  // How often each artwork has been shown outside the full-set shots. The
  // least-seen go first, which is what makes "every artwork appears" true
  // rather than likely.
  const seen = new Array(imageCount).fill(0);
  const leastSeen = () => everything.slice().sort((a, b) => seen[a] - seen[b] || a - b);

  // Group sizes step down from just-under-the-set to one, then repeat. A set
  // of two has only singles to offer; a set of five has fours, threes, twos.
  const sizes: number[] = [];
  for (let size = Math.min(imageCount - 1, maxGroup); size >= 1; size -= 1) sizes.push(size);

  let step = 0;
  while (plan.length < total) {
    const size = sizes[step % sizes.length];
    step += 1;
    const chosen = leastSeen().slice(0, size).sort((a, b) => a - b);
    for (const index of chosen) seen[index] += 1;
    plan.push({ artworks: chosen, full: false });
  }

  return plan;
}

/** Whether a plan shows every artwork outside the full-set shots. */
export function coversEveryArtwork(plan: MockupPlanItem[], imageCount: number): boolean {
  const shown = new Set<number>();
  for (const item of plan) {
    if (item.full) continue;
    for (const index of item.artworks) shown.add(index);
  }
  return shown.size >= imageCount;
}
