import type { ObserverCallInfo } from './types.js';

const DEFAULT_OBSERVER_SOURCES = ['mobx-react-lite', 'mobx-react'];

/**
 * Detects observer() calls that assign to a named variable.
 * Returns info needed to inject displayName assignments.
 */
export function detectObserverCalls(
  code: string,
  observerSources: string[] = DEFAULT_OBSERVER_SOURCES,
): ObserverCallInfo[] {
  const results: ObserverCallInfo[] = [];

  // Only process files that import observer from one of the configured sources
  const hasObserverImport = observerSources.some((source) => {
    const re = new RegExp(`from\\s+['"]${escapeRegExp(source)}['"]`);
    return re.test(code);
  });
  if (!hasObserverImport) {
    return results;
  }

  // Match: [export] (const|let|var) Name = observer(
  const pattern = /(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*observer\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    const isExported = !!match[1];
    const varName = match[2];
    const matchStart = match.index;
    const observerCallStart = match.index + match[0].length - 1; // position of '('

    // Find the matching closing ')'
    const statementEnd = findMatchingParenAndSemicolon(code, observerCallStart);
    if (statementEnd === -1) continue;

    results.push({
      start: matchStart,
      statementEnd,
      varName,
      isExported,
    });
  }

  return results;
}

/**
 * Given the position of an opening '(' in code, find the matching ')' and
 * any trailing semicolon. Returns the index after the full statement.
 */
function findMatchingParenAndSemicolon(
  code: string,
  openParenIndex: number,
): number {
  let depth = 0;
  let i = openParenIndex;
  let inString: string | null = null;
  let inTemplate = 0;
  let escaped = false;

  while (i < code.length) {
    const ch = code[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      i++;
      continue;
    }

    // Track string literals
    if (inString) {
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }

    // Track template literals
    if (ch === '`') {
      inTemplate++;
      i++;
      continue;
    }
    if (inTemplate > 0 && ch === '`') {
      inTemplate--;
      i++;
      continue;
    }
    if (inTemplate > 0) {
      i++;
      continue;
    }

    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        // Found matching ')', skip trailing whitespace and optional ';'
        i++;
        while (i < code.length && (code[i] === ' ' || code[i] === '\t')) i++;
        if (i < code.length && code[i] === ';') i++;
        return i;
      }
    }

    i++;
  }

  return -1;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
