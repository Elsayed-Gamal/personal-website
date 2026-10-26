export function publicAnalyticsPath(value: string): string | null {
  try {
    const path = decodeURIComponent(value.split(/[?#]/)[0]).replace(/\/$/, "");
    if (path.length > 250) return null;
    return /^\/(ar|en)(\/(about|contact|blog|work))?$/.test(path) ||
      /^\/(ar|en)\/(blog|work)\/[\p{L}\p{M}\p{N}_-]+$/u.test(path)
      ? path
      : null;
  } catch {
    return null;
  }
}
