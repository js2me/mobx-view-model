export interface ParsedSearchPath {
  segments: string[];
  endsWithDot: boolean;
}

/** Есть path-синтаксис: точка или bracket-доступ `obj['key']`. */
export function hasSearchPathSyntax(text: string): boolean {
  if (text.includes('.')) return true;

  return /\[(?:'|")/.test(text);
}

function readBracketKeySegment(
  text: string,
  bracketStart: number,
): { key: string; nextIndex: number } {
  let i = bracketStart + 1;

  while (i < text.length && /\s/.test(text[i] ?? '')) {
    i++;
  }

  const quote = text[i];
  if (quote !== "'" && quote !== '"') {
    const closeIdx = text.indexOf(']', i);
    const inner = closeIdx === -1 ? text.slice(i) : text.slice(i, closeIdx);
    return {
      key: inner,
      nextIndex: closeIdx === -1 ? text.length : closeIdx + 1,
    };
  }

  i++;
  const contentStart = i;
  const bracketClose = text.indexOf(']', bracketStart);
  const searchEnd = bracketClose === -1 ? text.length : bracketClose;
  const bracketContent = text.slice(contentStart, searchEnd);
  const lastQuote = bracketContent.lastIndexOf(quote);

  if (lastQuote !== -1) {
    return {
      key: bracketContent.slice(0, lastQuote),
      nextIndex: contentStart + lastQuote + 1,
    };
  }

  return {
    key: bracketContent,
    nextIndex: searchEnd,
  };
}

/**
 * Парсит путь поиска. Bracket-нотация эквивалентна точке:
 * `obj['key']` ≈ `obj.key`, `obj['ke` ≈ `obj.ke`.
 */
export function parseSearchPath(raw: string): ParsedSearchPath {
  const text = raw.trim().toLowerCase();
  if (!text) {
    return { segments: [], endsWithDot: false };
  }

  const endsWithDot = text.endsWith('.');
  const segments: string[] = [];
  let buffer = '';
  let i = 0;

  const pushBuffer = () => {
    if (buffer) {
      segments.push(buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    const char = text[i];

    if (char === '.') {
      pushBuffer();
      i++;
      continue;
    }

    if (char === '[') {
      pushBuffer();
      const { key, nextIndex } = readBracketKeySegment(text, i);
      segments.push(key);
      i = nextIndex;

      while (i < text.length && text[i] === ']') {
        i++;
      }

      while (i < text.length && /\s/.test(text[i] ?? '')) {
        i++;
      }

      continue;
    }

    buffer += char;
    i++;
  }

  pushBuffer();

  return { segments, endsWithDot };
}

export function getSearchPathParts(raw: string): {
  pathSegments: string[];
  completingSegment: string;
  endsWithDot: boolean;
  hasBracketKeySyntax: boolean;
} {
  const text = raw.trim().toLowerCase();
  const { segments, endsWithDot } = parseSearchPath(text);
  const completingSegment = endsWithDot
    ? ''
    : (segments[segments.length - 1] ?? '');
  const pathSegments = endsWithDot ? segments : segments.slice(0, -1);
  const hasBracketKeySyntax = /\[(?:'|")/.test(text);

  return {
    pathSegments,
    completingSegment,
    endsWithDot,
    hasBracketKeySyntax,
  };
}
