import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(packageRoot, 'dist');

// Keep the root entry and the explicit core entry on the same declaration
// symbols. This prevents duplicate TypeScript type identities when consumers
// resolve both package entrypoints.
writeFileSync(
  join(distRoot, 'index.d.ts'),
  [
    "export * from './core.d.ts';",
    "export * from './react.d.ts';",
    '',
  ].join('\n'),
);
