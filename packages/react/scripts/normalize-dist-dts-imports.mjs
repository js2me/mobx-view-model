import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const dtsFiles = readdirSync(distDir).filter((name) => name.endsWith('.d.ts'));
const absoluteYummiesTypesPattern =
  /(['"])(?:\/|[A-Za-z]:\\)[^'"]*[/\\]yummies[/\\]types\.d\.ts\1/g;
const syntheticAliasPattern = /\b([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*\$\d+)\b/g;

for (const fileName of dtsFiles) {
  const filePath = resolve(distDir, fileName);
  const source = readFileSync(filePath, 'utf8');
  let normalized = source.replace(absoluteYummiesTypesPattern, "'yummies/types'");
  const aliases = [...normalized.matchAll(syntheticAliasPattern)];

  if (aliases.length > 0) {
    normalized = normalized.replace(syntheticAliasPattern, '$1');

    for (const [, canonical, synthetic] of aliases) {
      // rollup-plugin-dts can generate synthetic aliases like `Type$1`.
      // Normalize them back to canonical import names in emitted declarations.
      normalized = normalized.replace(
        new RegExp(`\\b${synthetic.replace(/\$/g, '\\$')}\\b`, 'g'),
        canonical,
      );
    }
  }

  if (normalized !== source) {
    writeFileSync(filePath, normalized);
  }
}
