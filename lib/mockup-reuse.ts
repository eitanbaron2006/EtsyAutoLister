// Whether a run can use the mockups a listing already has.
//
// Rendering is by far the slowest step in the pipeline. A re-run after an
// interruption, a copy retry, or a tweak to the description used to pay for
// images that were already sitting there unchanged.
//
// Pure on purpose, and here rather than inline in the page, because the rule
// is the sort of thing that is easy to get subtly wrong: reuse too eagerly and
// a newly picked template silently never renders.

export interface RenderedMockup {
  templateId: string;
}

/**
 * True when the existing mockups already cover what this run asked for.
 *
 * With no templates named, any existing mockups will do -- the run did not ask
 * for anything in particular. With templates named, every one of them has to
 * be present already; a template that has never been rendered is exactly the
 * case that must not be skipped.
 */
export function mockupsAlreadyCover(
  existing: RenderedMockup[],
  requestedTemplateIds?: string[] | null,
): boolean {
  if (existing.length === 0) return false;
  if (!requestedTemplateIds || requestedTemplateIds.length === 0) return true;
  const rendered = new Set(existing.map(mockup => mockup.templateId));
  return requestedTemplateIds.every(id => rendered.has(id));
}
