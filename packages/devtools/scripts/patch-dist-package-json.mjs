import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreVersion = JSON.parse(
  readFileSync(join(pkgRoot, '../core/package.json'), 'utf8'),
).version;
const distPath = join(pkgRoot, 'dist/package.json');
const distPkg = JSON.parse(readFileSync(distPath, 'utf8'));

for (const depType of ['dependencies', 'peerDependencies']) {
  const deps = distPkg[depType];
  if (!deps) continue;
  for (const [name, version] of Object.entries(deps)) {
    if (typeof version === 'string' && version.startsWith('workspace:')) {
      if (name === 'mobx-view-model') {
        deps[name] = `^${coreVersion}`;
      }
    }
  }
}

writeFileSync(distPath, `${JSON.stringify(distPkg, null, 2)}\n`);
