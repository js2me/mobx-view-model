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

/** Bind identifiers in one file without loading libraries or following imports. */
export function createBindingChecker(source: ts.SourceFile) {
  const options: ts.CompilerOptions = {
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (fileName) =>
    fileName === source.fileName ? source : undefined;
  host.fileExists = (fileName) => fileName === source.fileName;
  host.readFile = (fileName) =>
    fileName === source.fileName ? source.text : undefined;
  return ts.createProgram([source.fileName], options, host).getTypeChecker();
}
