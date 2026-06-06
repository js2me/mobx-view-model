export function formatSearchSegmentKey(key: unknown): string {
  if (typeof key === 'string') {
    return key;
  }

  if (typeof key === 'symbol') {
    return String(key);
  }

  if (
    typeof key === 'number' ||
    typeof key === 'boolean' ||
    typeof key === 'bigint'
  ) {
    return String(key);
  }

  if (key === null) {
    return 'null';
  }

  if (key === undefined) {
    return 'undefined';
  }

  return '{...}';
}
