import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(packageRoot, 'dist');

// Keep the root entry and the explicit core entry on the same declaration
// symbols. Bundling core into index.d.ts creates duplicate TypeScript types
// when one consumer imports the root and another imports /core.
writeFileSync(
  join(distRoot, 'index.d.ts'),
  [
    "export * from './core.d.ts';",
    "export * from './mobx-view-model-react.d.ts';",
    '',
  ].join('\n'),
);
