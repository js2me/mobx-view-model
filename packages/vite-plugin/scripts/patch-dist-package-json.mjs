import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const devtoolsVersion = JSON.parse(
  readFileSync(join(pkgRoot, '../devtools/package.json'), 'utf8'),
).version;
const distPath = join(pkgRoot, 'dist/package.json');
const distPkg = JSON.parse(readFileSync(distPath, 'utf8'));

for (const depType of ['dependencies', 'peerDependencies']) {
  const deps = distPkg[depType];
  if (!deps) continue;
  for (const [name, version] of Object.entries(deps)) {
    if (typeof version === 'string' && version.startsWith('workspace:')) {
      if (name === 'mobx-view-model-devtools') {
        deps[name] = `^${devtoolsVersion}`;
      }
    }
  }
}

writeFileSync(distPath, `${JSON.stringify(distPkg, null, 2)}\n`);
