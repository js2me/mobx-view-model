import ts from 'typescript';
import { hasModifier, isVmSource, parseSource } from './ast.js';
import type { VMClassInfo } from './types.js';

export type ImportedVmClass = {
  localName: string;
  type: VMClassInfo['type'];
  hasPrivateFields?: boolean;
};

export function extractImportBindings(
  code: string,
  fileName?: string,
): { localName: string; importedName: string; source: string }[] {
  const bindings: {
    localName: string;
    importedName: string;
    source: string;
  }[] = [];
  for (const node of parseSource(code, fileName).statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier)
    )
      continue;
    const source = node.moduleSpecifier.text;
    const clause = node.importClause;
    if (clause?.name)
      bindings.push({
        localName: clause.name.text,
        importedName: 'default',
        source,
      });
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const spec of clause.namedBindings.elements) {
        bindings.push({
          localName: spec.name.text,
          importedName: (spec.propertyName ?? spec.name).text,
          source,
        });
      }
    }
  }
  return bindings;
}

/** Only module-level declarations can be referenced by the appended HMR block. */
export function detectViewModelClasses(
  code: string,
  importedVmClasses: ImportedVmClass[] = [],
  fileName?: string,
): VMClassInfo[] {
  const source = parseSource(code, fileName);
  const known = new Map<
    string,
    { type: VMClassInfo['type']; hasPrivateFields?: boolean }
  >();
  for (const binding of extractImportBindings(code, fileName)) {
    if (
      isVmSource(binding.source) &&
      ['ViewModelBase', 'ViewModelSimple', 'ViewModel'].includes(
        binding.importedName,
      )
    ) {
      known.set(binding.localName, {
        type: binding.importedName as VMClassInfo['type'],
      });
    }
  }
  for (const binding of importedVmClasses)
    known.set(binding.localName, binding);

  const declarations = source.statements
    .filter(ts.isClassDeclaration)
    .filter((node) => node.name);
  const classes = new Map<string, VMClassInfo>();
  // A fixed point also handles several levels of indirect inheritance.
  for (let pass = 0; pass <= declarations.length; pass++) {
    let changed = false;
    for (const node of declarations) {
      const name = node.name!.text;
      const bases =
        node.heritageClauses?.flatMap((clause) => clause.types) ?? [];
      const parent = bases
        .map((base) =>
          ts.isIdentifier(base.expression)
            ? known.get(base.expression.text)
            : undefined,
        )
        .find(Boolean);
      if (!parent) continue;
      const hasPrivateFields =
        !!parent.hasPrivateFields ||
        node.members.some(
          (member) => !!member.name && ts.isPrivateIdentifier(member.name),
        );
      const info: VMClassInfo = {
        name,
        type: parent.type,
        exportType: hasModifier(node, ts.SyntaxKind.DefaultKeyword)
          ? 'default'
          : 'named',
        ...(hasPrivateFields ? { hasPrivateFields: true } : {}),
      };
      if (
        !classes.has(name) ||
        classes.get(name)?.hasPrivateFields !== info.hasPrivateFields
      ) {
        classes.set(name, info);
        known.set(name, info);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return declarations.flatMap((node) =>
    classes.has(node.name!.text) ? [classes.get(node.name!.text)!] : [],
  );
}
