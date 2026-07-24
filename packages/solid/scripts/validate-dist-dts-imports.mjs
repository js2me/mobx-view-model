import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const dtsFiles = readdirSync(distDir).filter((name) => name.endsWith('.d.ts'));
const absoluteImportPattern =
  /(from\s+['"](?:\/|[A-Za-z]:\\)|import\(\s*['"](?:\/|[A-Za-z]:\\)|export\s+\*\s+from\s+['"](?:\/|[A-Za-z]:\\))/;

const violations = [];

for (const fileName of dtsFiles) {
  const filePath = resolve(distDir, fileName);
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (absoluteImportPattern.test(line)) {
      violations.push(`${fileName}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length > 0) {
  console.error('Absolute filesystem imports are forbidden in dist .d.ts files:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('dist .d.ts import validation passed');
