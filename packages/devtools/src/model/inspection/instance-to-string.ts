const defaultInstanceToStringPattern = /^\[object [^\]]+\]$/;

export function getInstanceToStringValue(instance: object): string {
  try {
    return instance.toString();
  } catch {
    return '[object Object]';
  }
}

export function isDefaultInstanceToString(value: string): boolean {
  return defaultInstanceToStringPattern.test(value);
}

export function shouldShowInstanceCollapsedValue(
  data: unknown,
  isExpanded: boolean,
  isInaccessibleDisplay: boolean,
  valueType: string,
): data is object {
  if (isExpanded || isInaccessibleDisplay || valueType !== 'instance') {
    return false;
  }

  if (!data || typeof data !== 'object') {
    return false;
  }

  const toStringValue = getInstanceToStringValue(data);

  return !isDefaultInstanceToString(toStringValue);
}
