/**
 * Picks the avatar color for a member joining a family: the first palette color
 * nobody in the family uses. Once the palette runs out, the least-used color is
 * repeated, so the repetition is spread evenly instead of piling on one color.
 * Pure on purpose, so the rule is testable without a database.
 */
export function pickMemberColor(taken: readonly string[], palette: readonly string[]): string {
  const uses = new Map<string, number>(palette.map((c) => [c, 0]));
  for (const color of taken) {
    const key = color.toUpperCase();
    for (const c of palette) {
      if (c.toUpperCase() === key) uses.set(c, (uses.get(c) ?? 0) + 1);
    }
  }
  let best = palette[0];
  for (const c of palette) {
    if ((uses.get(c) ?? 0) < (uses.get(best) ?? 0)) best = c;
  }
  return best;
}
