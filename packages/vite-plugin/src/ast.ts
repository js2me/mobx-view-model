import ts from 'typescript';

export function parseSource(code: string, fileName = 'source.tsx') {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind) {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((modifier) => modifier.kind === kind)
  );
}

export function isVmSource(source: string) {
  return [
    'mobx-view-model',
    'mobx-view-model/core',
    'mobx-view-model/react',
  ].includes(source);
}
