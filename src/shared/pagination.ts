export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function parseOffsetCursor(value: string | undefined): number | null {
  if (value === undefined || value === "") return 0;
  if (!/^\d+$/u.test(value)) return null;
  const offset = Number(value);
  return Number.isSafeInteger(offset) ? offset : null;
}

export function mergePageById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  })];
}
