-- How this listing's print files can be handed over, kept with the listing.
--
-- The render server decides at pack time: `files` go up as they are,
-- `archives` are packed within the allowance, and `oversize` is past what the
-- marketplace accepts at all and has to travel as a link instead.
--
-- That answer lived only in React state, so it survived exactly as long as the
-- tab did. After a reload the app could no longer tell an oversize listing
-- from an ordinary one, and the warning that should have stopped a doomed
-- publish never fired -- the shop pressed publish and got a raw refusal from
-- Etsy instead of the dialog offering to set delivery up.
--
-- It cannot be recomputed on load either: the totals are known to the render
-- server at pack time, and the export records it keeps do not say how the
-- files were finally packed.

alter table public.listings
  add column if not exists print_delivery jsonb;

comment on column public.listings.print_delivery is
  'What the render server said about handing these files over: { mode: files|archives|oversize, note, totalBytes, allowanceBytes }. Null until the listing has been compiled.';
