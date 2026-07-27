const localTimeFormat = new Intl.DateTimeFormat('he-IL', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const hourFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('he-IL', { month: 'long' });
const monthYearFormat = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
const yearFormat = new Intl.DateTimeFormat('he-IL', { year: 'numeric' });
const WEEKDAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

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

// TODO: UNVERIFIED CODE BELOW
export interface TimelineTick {
  time: number;
  label: string;
  major: boolean;
}

type TimeUnit = 'hour' | 'day' | 'month' | 'year';

const TICK_LEVELS: { maxSpanDays: number; minorUnit: TimeUnit; minorStep: number; majorUnit: TimeUnit }[] = [
  { maxSpanDays: 0.5, minorUnit: 'hour', minorStep: 1, majorUnit: 'day' },
  { maxSpanDays: 1.5, minorUnit: 'hour', minorStep: 3, majorUnit: 'day' },
  { maxSpanDays: 3, minorUnit: 'hour', minorStep: 6, majorUnit: 'day' },
  { maxSpanDays: 6, minorUnit: 'hour', minorStep: 12, majorUnit: 'day' },
  { maxSpanDays: 12, minorUnit: 'day', minorStep: 1, majorUnit: 'month' },
  { maxSpanDays: 36, minorUnit: 'day', minorStep: 3, majorUnit: 'month' },
  { maxSpanDays: 84, minorUnit: 'day', minorStep: 7, majorUnit: 'month' },
  { maxSpanDays: 365, minorUnit: 'month', minorStep: 1, majorUnit: 'year' },
  { maxSpanDays: 1100, minorUnit: 'month', minorStep: 3, majorUnit: 'year' },
  { maxSpanDays: 2200, minorUnit: 'month', minorStep: 6, majorUnit: 'year' },
  { maxSpanDays: Infinity, minorUnit: 'year', minorStep: 1, majorUnit: 'year' },
];

export function timelineTicks(startSeconds: number, endSeconds: number): TimelineTick[] {
  const level = TICK_LEVELS.find(
    (candidate) => (endSeconds - startSeconds) / 86400 <= candidate.maxSpanDays,
  )!;
  const majors = tickSequence(startSeconds, endSeconds, level.majorUnit, 1, level.majorUnit);
  const majorTimes = new Set(majors.map((date) => date.getTime()));
  const crowdingSeconds = (endSeconds - startSeconds) * 0.05;
  const minors = tickSequence(
    startSeconds,
    endSeconds,
    level.minorUnit,
    level.minorStep,
    level.majorUnit,
  ).filter(
    (date) =>
      !majorTimes.has(date.getTime()) &&
      !majors.some((major) => Math.abs(major.getTime() - date.getTime()) / 1000 < crowdingSeconds),
  );
  const promoted = majors.length === 0 && level.minorUnit === 'month' ? minors.shift() : undefined;
  return [
    ...minors.map((date) => ({
      time: date.getTime() / 1000,
      label: formatUnit(date, level.minorUnit, false),
      major: false,
    })),
    ...(promoted
      ? [{ time: promoted.getTime() / 1000, label: formatUnit(promoted, 'month', true), major: true }]
      : []),
    ...majors.map((date) => ({
      time: date.getTime() / 1000,
      label: formatUnit(date, level.majorUnit, true),
      major: true,
    })),
  ];
}

function tickSequence(
  startSeconds: number,
  endSeconds: number,
  unit: TimeUnit,
  step: number,
  alignUnit: TimeUnit,
): Date[] {
  const cursor = startOfUnit(new Date(startSeconds * 1000), alignUnit);
  const dates: Date[] = [];
  while (cursor.getTime() / 1000 <= endSeconds) {
    if (cursor.getTime() / 1000 >= startSeconds) dates.push(new Date(cursor));
    if (unit === 'hour') cursor.setHours(cursor.getHours() + step);
    else if (unit === 'day') cursor.setDate(cursor.getDate() + step);
    else if (unit === 'month') cursor.setMonth(cursor.getMonth() + step);
    else cursor.setFullYear(cursor.getFullYear() + step);
  }
  return dates;
}

function startOfUnit(date: Date, unit: TimeUnit): Date {
  if (unit === 'hour') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
  }
  if (unit === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (unit === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), 0, 1);
}

function formatUnit(date: Date, unit: TimeUnit, major: boolean): string {
  if (unit === 'hour') return hourFormat.format(date);
  if (unit === 'day') {
    return `${WEEKDAY_LETTERS[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}`;
  }
  if (unit === 'month') return major ? monthYearFormat.format(date) : monthFormat.format(date);
  return yearFormat.format(date);
}
