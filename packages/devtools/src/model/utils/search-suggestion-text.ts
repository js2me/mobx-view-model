import { getSearchPathParts } from './parse-search-path';

/**
 * Начало последнего сегмента пути в сыром тексте (для замены при apply).
 */
export function findCompletingSegmentStart(
  text: string,
  completingSegment: string,
): number {
  if (!completingSegment) return -1;

  const textLower = text.toLowerCase();
  const segLower = completingSegment.toLowerCase();
  const idx = textLower.lastIndexOf(segLower);

  if (idx < 0) return -1;

  const afterSegment = textLower.slice(idx + segLower.length);
  if (afterSegment && !/^[\]'"]*$/.test(afterSegment)) {
    return -1;
  }

  if (idx === 0) return 0;

  const before = text.slice(0, idx);
  const lastDot = before.lastIndexOf('.');
  const lastBracket = before.lastIndexOf('[');

  if (lastDot > lastBracket) {
    return lastDot + 1;
  }

  if (lastBracket >= 0) {
    const afterBracket = before.slice(lastBracket + 1);
    const quoteMatch = afterBracket.match(/^(\s*)(['"])?/);
    return lastBracket + 1 + (quoteMatch?.[0].length ?? 0);
  }

  return idx;
}

/** Ghost-суффикс: только при prefix-match (`serv` → `service`). */
export function getSuggestionSuffix(
  suggestionValue: string,
  completingSegment: string,
): string {
  if (!completingSegment) return '';

  if (
    suggestionValue.toLowerCase().startsWith(completingSegment.toLowerCase())
  ) {
    return suggestionValue.slice(completingSegment.length);
  }

  return '';
}

/** Текст инпута после Tab/Enter/клика по подсказке. */
export function applySuggestionToSearchText(
  currentText: string,
  suggestionValue: string,
): string {
  const trailingWhitespace = currentText.match(/\s+$/)?.[0] ?? '';
  const trimmedEnd = currentText.slice(
    0,
    currentText.length - trailingWhitespace.length,
  );

  const { completingSegment, endsWithDot } = getSearchPathParts(trimmedEnd);

  if (endsWithDot) {
    return trimmedEnd + suggestionValue + trailingWhitespace;
  }

  if (!completingSegment) {
    return suggestionValue + trailingWhitespace;
  }

  const segmentStart = findCompletingSegmentStart(
    trimmedEnd,
    completingSegment,
  );

  if (segmentStart < 0) {
    return suggestionValue + trailingWhitespace;
  }

  return (
    trimmedEnd.slice(0, segmentStart) + suggestionValue + trailingWhitespace
  );
}
