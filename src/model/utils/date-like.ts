export function isDateLike(value: unknown): value is Date {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Object.prototype.toString.call(value) !== '[object Date]') {
    return false;
  }

  return (
    typeof (value as Date).getTime === 'function' &&
    typeof (value as Date).toISOString === 'function'
  );
}

export function getDateToStringValue(date: Date): string {
  try {
    return date.toString();
  } catch {
    return 'Invalid Date';
  }
}

function getDatePreviewValue(
  date: Date,
  getter: (value: Date) => unknown,
): unknown {
  try {
    return getter(date);
  } catch {
    return 'Invalid Date';
  }
}

export const DATE_PREVIEW_FIELDS: ReadonlyArray<{
  property: string;
  getPreview: (date: Date) => unknown;
}> = [
  {
    property: 'toISOString()',
    getPreview: (date) =>
      getDatePreviewValue(date, (value) => value.toISOString()),
  },
  {
    property: 'getTime()',
    getPreview: (date) => getDatePreviewValue(date, (value) => value.getTime()),
  },
  {
    property: 'toString()',
    getPreview: (date) =>
      getDatePreviewValue(date, (value) => value.toString()),
  },
];
