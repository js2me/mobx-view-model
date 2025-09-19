import { publishScript, getInfoFromChangelog, publishGhRelease } from 'js2me-exports-post-build-script';
import { $ } from 'js2me-exports-post-build-script/utils';
import { PackageJsonManager } from 'js2me-exports-post-build-script/utils/package-json-manager';
import path from 'path';

if (!process.env.CI) {
  // $(`pnpm test`);
  $('pnpm changeset version');
}

const pckgJson = new PackageJsonManager('package.json');

const publishOutput = publishScript({
  gitTagFormat: '<tag>',
  nextVersion: pckgJson.data.version,
  packageManager: 'pnpm',
  commitAllCurrentChanges: true,
  createTag: true,
  safe: true,
  onAlreadyPublishedThisVersion: () => {
    console.warn(`${pckgJson.data.version} already published`);
  },
  cleanupCommand: 'pnpm clean',
  targetPackageJson: pckgJson,
  mainBranch: 'master',
  stayInCurrentDir: true,
});

if (process.env.CI) {
  if (publishOutput?.publishedGitTag) {
    const { whatChangesText } = getInfoFromChangelog(
      pckgJson.data.version,
      path.resolve(pckgJson.locationDir, './CHANGELOG.md'),
      pckgJson.repositoryUrl
    );

    publishGhRelease({
      authToken: process.env.GITHUB_TOKEN,
      body: whatChangesText,
      owner: pckgJson.ghRepoData.user,
      repo: pckgJson.ghRepoData.packageName,
      version: pckgJson.data.version,
    })
      .then((r) =>{
        console.info('published new gh release',r)
      })
      .catch((err) =>{
        console.error('failed to publish new gh release', err);
        process.exit(1);
      })
  }
}