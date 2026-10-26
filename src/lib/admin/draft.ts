// Unchanged branches retain their references; avoid serializing long bodies per keystroke.
export function equalDraft(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && equalDraft(left[key], right[key]),
    )
  );
}
export function replaceAtPath<T>(value: T, path: string[], next: unknown): T {
  if (!path.length) return next as T;
  const [key, ...rest] = path;
  const copy = (Array.isArray(value) ? [...value] : { ...value }) as Record<
    string,
    unknown
  >;
  copy[key] = replaceAtPath(copy[key], rest, next);
  return copy as T;
}
