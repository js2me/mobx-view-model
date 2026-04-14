import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const dtsFiles = readdirSync(distDir).filter((name) => name.endsWith('.d.ts'));
const absoluteYummiesTypesPattern =
  /(['"])(?:\/|[A-Za-z]:\\)[^'"]*[/\\]yummies[/\\]types\.d\.ts\1/g;

for (const fileName of dtsFiles) {
  const filePath = resolve(distDir, fileName);
  const source = readFileSync(filePath, 'utf8');
  const normalized = source
    .replace(absoluteYummiesTypesPattern, "'yummies/types'")
    .replace(
      /React\.Context<ViewModelStore>/g,
      'React.Context<ViewModelStore$1>',
    );

  if (normalized !== source) {
    writeFileSync(filePath, normalized);
  }
}
