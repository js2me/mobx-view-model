import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreVersion = JSON.parse(
  readFileSync(join(pkgRoot, '../core/package.json'), 'utf8'),
).version;
const distPath = join(pkgRoot, 'dist/package.json');
const distPkg = JSON.parse(readFileSync(distPath, 'utf8'));

// The library builder may name the declaration entry after the tsconfig path
// alias (`mobx-view-model-react.d.ts`) while the runtime entry is `index.js`.
// The package root must expose a declaration at the same basename as runtime.
const generatedRootTypes = join(pkgRoot, 'dist/mobx-view-model-react.d.ts');
const rootTypes = join(pkgRoot, 'dist/index.d.ts');
if (!existsSync(rootTypes) && existsSync(generatedRootTypes)) {
  copyFileSync(generatedRootTypes, rootTypes);
}

// Rewrite workspace: protocol to actual version
const dep = distPkg.dependencies?.['mobx-view-model'];
if (typeof dep === 'string' && dep.startsWith('workspace:')) {
  distPkg.dependencies['mobx-view-model'] = `^${coreVersion}`;
}

// Rewrite exports.types from ./src/index.ts to ./index.d.ts
// (src/ is not included in the published package)
if (distPkg.exports?.['.']?.types) {
  distPkg.exports['.'].types = distPkg.exports['.'].types
    .replace('./src/index.ts', './index.d.ts')
    .replace('./dist/index.d.ts', './index.d.ts');
}

if (distPkg.exports?.['.'] && !distPkg.exports['.'].types) {
  distPkg.exports['.'].types = './index.d.ts';
}

writeFileSync(distPath, `${JSON.stringify(distPkg, null, 2)}\n`);
