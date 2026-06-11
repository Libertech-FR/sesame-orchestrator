const SECONDS_IN_DAY = 24 * 60 * 60;

export function parseLifecycleTriggerInput(
  input: string | number | null | undefined,
): number | string | null | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (typeof input === 'number') {
    return input;
  }

  const trimmed = `${input}`.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === '-1') {
    return -1;
  }

  if (/^\d+[dms]$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    if (seconds > 0) {
      return seconds;
    }
  }

  return null;
}

export function lifecycleTriggerToSeconds(value: number | string | null | undefined): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === -1) {
    return -1;
  }

  if (typeof value === 'number') {
    if (value >= SECONDS_IN_DAY) {
      return value;
    }
    return value * SECONDS_IN_DAY;
  }

  const match = value.match(/^(\d+)([dms])$/);
  if (!match) {
    return undefined;
  }

  const numValue = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return numValue * SECONDS_IN_DAY;
    case 'm':
      return numValue * 60;
    case 's':
      return numValue;
    default:
      return undefined;
  }
}
