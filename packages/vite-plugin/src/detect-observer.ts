import ts from 'typescript';
import { createBindingChecker, hasModifier, parseSource } from './ast.js';
import type { ObserverCallInfo } from './types.js';

const DEFAULT_OBSERVER_SOURCES = ['mobx-react-lite', 'mobx-react'];

/** Use syntax node boundaries, so comments, regexes and templates cannot move the insertion. */
export function detectObserverCalls(
  code: string,
  observerSources: string[] = DEFAULT_OBSERVER_SOURCES,
  fileName?: string,
): ObserverCallInfo[] {
  const source = parseSource(code, fileName);
  const observerBindings: ts.Identifier[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !observerSources.includes(statement.moduleSpecifier.text) ||
      statement.importClause?.isTypeOnly
    )
      continue;
    if (statement.importClause?.name) {
      observerBindings.push(statement.importClause.name);
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if (
          !binding.isTypeOnly &&
          (binding.propertyName ?? binding.name).text === 'observer'
        ) {
          observerBindings.push(binding.name);
        }
      }
    }
  }

  if (!observerBindings.length) return [];
  const checker = createBindingChecker(source);
  const observerSymbols = new Set(
    observerBindings
      .map((binding) => checker.getSymbolAtLocation(binding))
      .filter(Boolean),
  );

  const results: ObserverCallInfo[] = [];
  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const call = declaration.initializer;
        if (
          !ts.isIdentifier(declaration.name) ||
          !call ||
          !ts.isCallExpression(call) ||
          !ts.isIdentifier(call.expression) ||
          !observerSymbols.has(checker.getSymbolAtLocation(call.expression))
        )
          continue;
        results.push({
          start: node.getStart(source),
          statementEnd: node.end,
          varName: declaration.name.text,
          isExported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return results;
}
