import type { VMClassInfo } from './types.js';

/**
 * Checks if a file imports from mobx-view-model or mobx-view-model-react.
 */
const MOBX_VM_IMPORT_RE = /from\s+['"]mobx-view-model(?:\/react|\/core)?['"]/;

/**
 * Collapses generic type parameters (<...>) into a single line so that
 * class declarations spanning multiple lines can be matched by regex.
 * e.g. "class VM<\n  Payload,\n> extends ViewModelBase" →
 *      "class VM<Payload,> extends ViewModelBase"
 */
function collapseGenerics(code: string): string {
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] !== '<') {
      result += code[i];
      i++;
      continue;
    }

    // Try to find the matching '>' for this '<', handling nested <> and
    // skipping balanced {} / () / [] blocks and string literals inside.
    let depth = 0;
    let j = i;
    let found = false;

    while (j < code.length) {
      const ch = code[j];
      if (ch === '<') {
        depth++;
        j++;
      } else if (ch === '>') {
        depth--;
        if (depth === 0) {
          found = true;
          break;
        }
        j++;
      } else if (ch === '{' || ch === '(' || ch === '[') {
        const close = ch === '{' ? '}' : ch === '(' ? ')' : ']';
        let innerDepth = 1;
        j++;
        while (j < code.length && innerDepth > 0) {
          if (code[j] === ch) innerDepth++;
          else if (code[j] === close) innerDepth--;
          j++;
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        j++;
        while (j < code.length) {
          if (code[j] === '\\') {
            j += 2;
            continue;
          }
          if (code[j] === quote) {
            j++;
            break;
          }
          j++;
        }
      } else {
        j++;
      }
    }

    if (found) {
      const generic = code.slice(i, j + 1);
      result += generic.replace(/\s+/g, ' ');
      i = j + 1;
    } else {
      // No matching '>' — treat '<' as a comparison operator
      result += code[i];
      i++;
    }
  }
  return result;
}

/**
 * Imported VM class from another file — local name and its type.
 */
export type ImportedVmClass = { localName: string; type: VMClassInfo['type'] };

/**
 * Detects ViewModel classes exported from the given source code.
 * Returns an array of VMClassInfo for each detected class.
 *
 * @param code - Source code to analyze
 * @param importedVmClasses - VM classes imported from other files
 *   (local identifier in this file + their VM type), used for cross-file
 *   indirect inheritance detection (e.g. `class X extends ImportedVM`).
 */
export function detectViewModelClasses(
  code: string,
  importedVmClasses: ImportedVmClass[] = [],
): VMClassInfo[] {
  if (!MOBX_VM_IMPORT_RE.test(code) && importedVmClasses.length === 0) {
    return [];
  }

  // Collapse generic type parameters to single lines so that multi-line
  // class declarations like `class VM<\n  Payload,\n> extends ViewModelBase`
  // can be matched by the line-oriented regexes below.
  const flatCode = collapseGenerics(code);

  const classes: VMClassInfo[] = [];

  // class X extends ViewModelBase
  const extendsBaseRe = /class\s+(\w+)(?:\s*<[^>]*?>)?\s+extends\s+\w*ViewModelBase\b/g;
  let match: RegExpExecArray | null;
  while ((match = extendsBaseRe.exec(flatCode)) !== null) {
    classes.push({
      name: match[1],
      type: 'ViewModelBase',
      exportType: getExportType(code, match[1]),
    });
  }

  // class X extends ViewModelSimple
  const extendsSimpleRe = /class\s+(\w+)(?:\s*<[^>]*?>)?\s+extends\s+\w*ViewModelSimple\b/g;
  while ((match = extendsSimpleRe.exec(flatCode)) !== null) {
    if (!classes.some((c) => c.name === match![1])) {
      classes.push({
        name: match[1],
        type: 'ViewModelSimple',
        exportType: getExportType(code, match[1]),
      });
    }
  }

  // class X implements ... ViewModel ...
  const implementsVMRe =
    /class\s+(\w+)(?:\s*<[^>]*?>)?[^;{]*?\bimplements\b[^{]*?\bViewModel\b(?!Simple|Base)/g;
  while ((match = implementsVMRe.exec(flatCode)) !== null) {
    // Avoid duplicating if already found via extends ViewModelBase
    if (!classes.some((c) => c.name === match![1])) {
      classes.push({
        name: match[1],
        type: 'ViewModel',
        exportType: getExportType(code, match[1]),
      });
    }
  }

  // class X implements ... ViewModelSimple ...
  const implementsSimpleRe =
    /class\s+(\w+)(?:\s*<[^>]*?>)?[^;{]*?\bimplements\b[^{]*?\bViewModelSimple\b/g;
  while ((match = implementsSimpleRe.exec(flatCode)) !== null) {
    if (!classes.some((c) => c.name === match![1])) {
      classes.push({
        name: match[1],
        type: 'ViewModelSimple',
        exportType: getExportType(code, match[1]),
      });
    }
  }

  // class X extends SomeBase (where SomeBase was already detected as VM in this file
  // or is an imported VM class from another file)
  const extendsAnyRe = /class\s+(\w+)(?:\s*<[^>]*?>)?\s+extends\s+(\w+)/g;
  const knownNames = new Set(classes.map((c) => c.name));
  const importedByName = new Map(
    importedVmClasses.map((v) => [v.localName, v.type]),
  );
  while ((match = extendsAnyRe.exec(flatCode)) !== null) {
    const [, className, baseName] = match;
    if (knownNames.has(className)) continue;

    // Same-file indirect inheritance
    const localBase = classes.find((c) => c.name === baseName);
    if (localBase) {
      classes.push({
        name: className,
        type: localBase.type,
        exportType: getExportType(code, className),
      });
      knownNames.add(className);
      continue;
    }

    // Cross-file indirect inheritance via import
    const importedType = importedByName.get(baseName);
    if (importedType) {
      classes.push({
        name: className,
        type: importedType,
        exportType: getExportType(code, className),
      });
      knownNames.add(className);
    }
  }

  return classes;
}

/**
 * Extracts import bindings from source code.
 * Returns a list of { localName, importedName, source } for each imported identifier.
 * Handles named imports (including aliases) and default imports.
 */
export function extractImportBindings(
  code: string,
): { localName: string; importedName: string; source: string }[] {
  const bindings: {
    localName: string;
    importedName: string;
    source: string;
  }[] = [];

  // import { X, Y as Z } from 'source'
  const namedImportRe = /import[ \t]*\{([^}]+)\}[ \t]*from[ \t]*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = namedImportRe.exec(code)) !== null) {
    const specifiers = match[1];
    const source = match[2];
    for (const spec of specifiers.split(',')) {
      const trimmed = spec.trim();
      if (!trimmed) continue;
      const asIndex = trimmed.lastIndexOf(' as ');
      const importedName = asIndex === -1 ? trimmed : trimmed.slice(0, asIndex);
      const localName = asIndex === -1 ? trimmed : trimmed.slice(asIndex + 4);
      bindings.push({ localName, importedName, source });
    }
  }

  // import X from 'source'
  const defaultImportRe = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
  while ((match = defaultImportRe.exec(code)) !== null) {
    // Avoid duplicating if this was already captured as a named import
    if (!bindings.some((b) => b.localName === match![1])) {
      bindings.push({
        localName: match[1],
        importedName: 'default',
        source: match[2],
      });
    }
  }

  return bindings;
}

/**
 * Determines how a class is exported from the file.
 */
function getExportType(code: string, className: string): 'named' | 'default' {
  // export default class X
  if (new RegExp(`export\\s+default\\s+class\\s+${className}\\b`).test(code)) {
    return 'default';
  }
  // export class X or export { X }
  if (
    new RegExp(`export\\s+class\\s+${className}\\b`).test(code) ||
    new RegExp(`export\\s+\\{[^}]*\\b${className}\\b[^}]*\\}`).test(code)
  ) {
    return 'named';
  }
  return 'named';
}
