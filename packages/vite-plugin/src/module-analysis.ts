import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { hasModifier, isVmSource, parseSource } from './ast.js';
import type { ImportedVmClass } from './detect-vm-classes.js';
import {
  detectViewModelClasses,
  extractImportBindings,
} from './detect-vm-classes.js';
import { normalizeModulePath } from './module-path.js';
import type { VMClassInfo, VMUsageInfo } from './types.js';

type ExportedVM = { filePath: string; info: VMClassInfo };
type Alias = { find: string | RegExp; replacement: string };

/** Resolve the actual source module, rather than inferring identity from a class name. */
export class ModuleAnalysis {
  private sources = new Map<string, string>();
  private compilerOptions: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  private aliases: readonly Alias[] = [];

  configure(root: string, aliases: readonly Alias[]) {
    this.aliases = aliases;
    const configPath = ts.findConfigFile(root, ts.sys.fileExists);
    if (configPath) {
      const config = ts.readConfigFile(configPath, ts.sys.readFile);
      if (!config.error)
        this.compilerOptions = {
          ...ts.parseJsonConfigFileContent(
            config.config,
            ts.sys,
            dirname(configPath),
          ).options,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
        };
    }
  }

  setSource(filePath: string, code: string) {
    this.sources.set(normalizeModulePath(filePath), code);
  }
  removeSource(filePath: string) {
    this.sources.delete(normalizeModulePath(filePath));
  }

  private readSource(filePath: string) {
    filePath = normalizeModulePath(filePath);
    // Dependencies may have changed on disk before Vite transforms them again.
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return this.sources.get(filePath);
    }
  }

  private resolveImport(source: string, importer: string) {
    let specifier = source;
    for (const alias of this.aliases) {
      if (typeof alias.find === 'string') {
        if (source !== alias.find && !source.startsWith(`${alias.find}/`))
          continue;
        specifier = alias.replacement + source.slice(alias.find.length);
      } else {
        if (!alias.find.test(source)) continue;
        specifier = source.replace(alias.find, alias.replacement);
      }
      break;
    }
    const host: ts.ModuleResolutionHost = {
      fileExists: (path) => this.sources.has(path) || ts.sys.fileExists(path),
      readFile: (path) => this.readSource(path),
      directoryExists: (path) =>
        [...this.sources.keys()].some((file) => file.startsWith(`${path}/`)) ||
        ts.sys.directoryExists(path),
    };
    const resolved = ts.resolveModuleName(
      specifier,
      importer,
      this.compilerOptions,
      host,
    ).resolvedModule?.resolvedFileName;
    if (!resolved) return;
    const filePath = normalizeModulePath(resolve(resolved));
    return filePath.includes('/node_modules/') ? undefined : filePath;
  }

  importedClasses(
    code: string,
    filePath: string,
    seen = new Set<string>(),
  ): ImportedVmClass[] {
    const bases = new Set(
      parseSource(code, filePath)
        .statements.filter(ts.isClassDeclaration)
        .flatMap(
          (node) =>
            node.heritageClauses?.flatMap((clause) => clause.types) ?? [],
        )
        .flatMap((base) =>
          ts.isIdentifier(base.expression) ? [base.expression.text] : [],
        ),
    );
    return this.importedVMs(code, filePath, seen, bases).map(
      ({ localName, vm }) => ({
        localName,
        type: vm.info.type,
        ...(vm.info.hasPrivateFields ? { hasPrivateFields: true } : {}),
      }),
    );
  }

  private importedVMs(
    code: string,
    filePath: string,
    seen: Set<string>,
    names: Set<string>,
  ) {
    const result: { localName: string; vm: ExportedVM }[] = [];
    for (const binding of extractImportBindings(code, filePath)) {
      if (!names.has(binding.localName)) continue;
      if (isVmSource(binding.source)) continue;
      const dependency = this.resolveImport(binding.source, filePath);
      const vm =
        dependency && this.findExport(dependency, binding.importedName, seen);
      if (vm) result.push({ localName: binding.localName, vm });
    }
    return result;
  }

  private findExport(
    filePath: string,
    exportName: string,
    seen: Set<string>,
  ): ExportedVM | undefined {
    const key = `${filePath}\0${exportName}`;
    if (seen.has(key)) return;
    const nextSeen = new Set(seen).add(key);
    const code = this.readSource(filePath);
    if (code === undefined) return;
    const ast = parseSource(code, filePath);
    const classes = detectViewModelClasses(
      code,
      this.importedClasses(code, filePath, nextSeen),
      filePath,
    );
    for (const statement of ast.statements) {
      const localName = localExportName(statement, exportName);
      const info = classes.find((cls) => cls.name === localName);
      if (info) return { filePath, info };
      if (localName) {
        const imported = this.importedVMs(
          code,
          filePath,
          nextSeen,
          new Set([localName]),
        ).find((binding) => binding.localName === localName);
        if (imported) return imported.vm;
      }
      if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
      const vm = this.findReExport(statement, exportName, {
        filePath,
        code,
        classes,
        seen: nextSeen,
      });
      if (vm) return vm;
    }
  }

  private findReExport(
    statement: ts.ExportDeclaration,
    exportName: string,
    context: {
      filePath: string;
      code: string;
      classes: VMClassInfo[];
      seen: Set<string>;
    },
  ): ExportedVM | undefined {
    const { filePath, code, classes, seen } = context;
    const dependency =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? this.resolveImport(statement.moduleSpecifier.text, filePath)
        : undefined;
    if (!statement.exportClause) {
      return dependency && exportName !== 'default'
        ? this.findExport(dependency, exportName, seen)
        : undefined;
    }
    if (!ts.isNamedExports(statement.exportClause)) return;
    const spec = statement.exportClause.elements.find(
      (spec) => spec.name.text === exportName && !spec.isTypeOnly,
    );
    if (!spec) return;
    const originalName = (spec.propertyName ?? spec.name).text;
    if (dependency) return this.findExport(dependency, originalName, seen);
    const info = classes.find((cls) => cls.name === originalName);
    if (info) return { filePath, info };
    return this.importedVMs(code, filePath, seen, new Set([originalName])).find(
      (binding) => binding.localName === originalName,
    )?.vm;
  }

  resolveUsages(
    code: string,
    filePath: string,
    usages: VMUsageInfo[],
  ): VMUsageInfo[] {
    filePath = normalizeModulePath(filePath);
    if (!usages.length) return [];
    const imports = this.importedVMs(
      code,
      filePath,
      new Set(),
      new Set(usages.map((usage) => usage.vmClassName)),
    );
    return usages.map((usage) => {
      const binding = imports.find(
        (binding) => binding.localName === usage.vmClassName,
      );
      return binding
        ? {
            ...usage,
            vmClassName: binding.vm.info.name,
            sourceFile: binding.vm.filePath,
          }
        : { ...usage, sourceFile: filePath };
    });
  }
}

function localExportName(statement: ts.Statement, exportName: string) {
  if (
    ts.isClassDeclaration(statement) &&
    statement.name &&
    hasModifier(statement, ts.SyntaxKind.ExportKeyword)
  ) {
    const exportedName = hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
      ? 'default'
      : statement.name.text;
    return exportedName === exportName ? statement.name.text : undefined;
  }
  if (
    ts.isExportAssignment(statement) &&
    !statement.isExportEquals &&
    exportName === 'default' &&
    ts.isIdentifier(statement.expression)
  ) {
    return statement.expression.text;
  }
}
