export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/["'`׳״‘’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
