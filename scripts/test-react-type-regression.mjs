import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const consumerFixtures = [
  {
    dir: resolve(rootDir, 'tests/react-regressions/react19'),
    label: 'React 19',
  },
  {
    dir: resolve(rootDir, 'tests/react-regressions/react18'),
    label: 'React 18',
  },
];
const reactDistDir = resolve(rootDir, 'packages/react/dist');
const coreDistDir = resolve(rootDir, 'packages/core/dist');
const mode = process.env.TYPE_REGRESSION_MODE === 'regression'
  ? 'regression'
  : 'fixed';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    shell: false,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}\n${output}`.trim(),
    );
  }

  return { ...result, output };
}

function isPackTarballFileName(line) {
  const trimmed = line.trim();
  if (!trimmed.endsWith('.tgz')) {
    return false;
  }
  // `pnpm pack` prints a bare tarball name. Corepack may print a line that also
  // ends with ".tgz" (e.g. a download URL) — reject URLs, banners, and paths.
  if (/\s/.test(trimmed) || /:\/\//.test(trimmed) || /^[!?]/.test(trimmed)) {
    return false;
  }
  const base = trimmed.split(/[/\\]/).pop() ?? trimmed;
  return base === trimmed || trimmed.endsWith(`/${base}`);
}

function parsePackedFileName(packOutput) {
  const lines = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (isPackTarballFileName(lines[i])) {
      return lines[i].split(/[/\\]/).pop();
    }
  }

  throw new Error(`Unable to resolve packed file name:\n${packOutput}`);
}

const expectedErrorCodes = ['TS2312', 'TS2339', 'TS2322'];

console.log('1/4 Build workspace packages');
run('pnpm', ['build'], { cwd: rootDir });

console.log('2/4 Prepare temporary packed artifacts from dist');
const tempRoot = mkdtempSync(join(tmpdir(), 'mobx-vm-regression-'));
const tempReactDir = join(tempRoot, 'react-dist');
const tempCoreDir = join(tempRoot, 'core-dist');
cpSync(reactDistDir, tempReactDir, { recursive: true });
cpSync(coreDistDir, tempCoreDir, { recursive: true });

const reactPackageJsonPath = join(tempReactDir, 'package.json');
const corePackageJsonPath = join(tempCoreDir, 'package.json');
const reactPackageJson = JSON.parse(readFileSync(reactPackageJsonPath, 'utf8'));
const corePackageJson = JSON.parse(readFileSync(corePackageJsonPath, 'utf8'));

if (
  reactPackageJson.publishConfig?.directory &&
  reactPackageJson.publishConfig.directory === 'dist'
) {
  delete reactPackageJson.publishConfig.directory;
  writeFileSync(
    reactPackageJsonPath,
    `${JSON.stringify(reactPackageJson, null, 2)}\n`,
  );
}

if (
  corePackageJson.publishConfig?.directory &&
  corePackageJson.publishConfig.directory === 'dist'
) {
  delete corePackageJson.publishConfig.directory;
}

writeFileSync(corePackageJsonPath, `${JSON.stringify(corePackageJson, null, 2)}\n`);

const reactPack = run(
  'pnpm',
  ['pack', '--pack-destination', tempRoot],
  { cwd: tempReactDir },
);
const corePack = run(
  'pnpm',
  ['pack', '--pack-destination', tempRoot],
  { cwd: tempCoreDir },
);
const packedReactFile = parsePackedFileName(reactPack.stdout ?? '');
const packedCoreFile = parsePackedFileName(corePack.stdout ?? '');
const reactTarball = isAbsolute(packedReactFile)
  ? packedReactFile
  : join(tempRoot, packedReactFile);
const coreTarball = isAbsolute(packedCoreFile)
  ? packedCoreFile
  : join(tempRoot, packedCoreFile);

console.log('3/4 Run consumer fixtures (install, tsc, assert)');
for (const { dir: fixtureDir, label } of consumerFixtures) {
  console.log(`— ${label}: ${fixtureDir}`);
  rmSync(join(fixtureDir, 'node_modules'), { recursive: true, force: true });
  rmSync(join(fixtureDir, 'pnpm-lock.yaml'), { force: true });

  const fixturePackageJsonPath = join(fixtureDir, 'package.json');
  const fixturePackageJsonSource = readFileSync(fixturePackageJsonPath, 'utf8');
  const fixturePackageJson = JSON.parse(fixturePackageJsonSource);
  fixturePackageJson.dependencies = {
    ...(fixturePackageJson.dependencies ?? {}),
    'mobx-view-model': coreTarball,
    'mobx-view-model-react': reactTarball,
  };
  writeFileSync(
    fixturePackageJsonPath,
    `${JSON.stringify(fixturePackageJson, null, 2)}\n`,
  );

  const fixtureWorkspaceYamlPath = join(fixtureDir, 'pnpm-workspace.yaml');
  const fixtureWorkspaceYamlExisted = existsSync(fixtureWorkspaceYamlPath);
  const fixtureWorkspaceYamlSource = fixtureWorkspaceYamlExisted
    ? readFileSync(fixtureWorkspaceYamlPath, 'utf8')
    : null;
  writeFileSync(
    fixtureWorkspaceYamlPath,
    `packages:
  - .
minimumReleaseAgeExclude:
  - mobx-view-model-react@${reactPackageJson.version}
  - mobx-view-model@${corePackageJson.version}
overrides:
  mobx-view-model: ${JSON.stringify(coreTarball)}
  mobx-view-model-react: ${JSON.stringify(reactTarball)}
allowBuilds:
  '@swc/core': true
`,
  );

  try {
    run('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd: fixtureDir,
    });

    const tscResult = run(
      'pnpm',
      [
        'exec',
        'tsc',
        '--noEmit',
        '--pretty',
        'false',
        '--project',
        'tsconfig.json',
      ],
      { cwd: fixtureDir, allowFailure: true },
    );
    const diagnostics = tscResult.output;
    const missingCodes = expectedErrorCodes.filter(
      (code) => !new RegExp(`\\b${code}\\b`).test(diagnostics),
    );

    if (mode === 'regression') {
      if (missingCodes.length > 0) {
        throw new Error(
          [
            `[${label}] Type regression was not reproduced as expected.`,
            `Missing error codes: ${missingCodes.join(', ')}`,
            '',
            diagnostics,
          ].join('\n'),
        );
      }

      console.error(diagnostics.trim());
      throw new Error(
        [
          `[${label}] Regression reproduced (expected red-state): ${expectedErrorCodes.join(', ')}`,
          '',
          diagnostics,
        ].join('\n'),
      );
    }

    if (tscResult.status !== 0) {
      throw new Error(
        [
          `[${label}] Consumer typecheck failed (expected green-state):`,
          '',
          diagnostics,
        ].join('\n'),
      );
    }

    if (missingCodes.length !== expectedErrorCodes.length) {
      throw new Error(
        [
          `[${label}] Found historical regression diagnostics in fixed mode: ${expectedErrorCodes
            .filter((code) => !missingCodes.includes(code))
            .join(', ')}`,
          '',
          diagnostics,
        ].join('\n'),
      );
    }

    console.log(`[${label}] Consumer type regression check passed (green-state)`);
  } finally {
    writeFileSync(fixturePackageJsonPath, fixturePackageJsonSource);
    if (fixtureWorkspaceYamlExisted) {
      writeFileSync(fixtureWorkspaceYamlPath, fixtureWorkspaceYamlSource);
    } else {
      rmSync(fixtureWorkspaceYamlPath, { force: true });
    }
  }
}

console.log('4/4 All consumer type regression checks passed');
