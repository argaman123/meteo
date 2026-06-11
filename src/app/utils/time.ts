const localTimeFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function snapToStep(unixSeconds: number, stepHours: number): number {
  const stepSeconds = stepHours * 3600;
  return Math.round(unixSeconds / stepSeconds) * stepSeconds;
}

export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatLocalTime(unixSeconds: number): string {
  return localTimeFormat.format(new Date(unixSeconds * 1000));
}
