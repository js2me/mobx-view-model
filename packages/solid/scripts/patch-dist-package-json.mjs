import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreVersion = JSON.parse(
  readFileSync(join(pkgRoot, '../core/package.json'), 'utf8'),
).version;
const distPath = join(pkgRoot, 'dist/package.json');
const distPkg = JSON.parse(readFileSync(distPath, 'utf8'));
const dep = distPkg.dependencies?.['mobx-view-model'];

if (typeof dep === 'string' && dep.startsWith('workspace:')) {
  distPkg.dependencies['mobx-view-model'] = `^${coreVersion}`;
  writeFileSync(distPath, `${JSON.stringify(distPkg, null, 2)}\n`);
}
