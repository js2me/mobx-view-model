import { postBuildScript, publishScript } from 'js2me-exports-post-build-script';

postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md', 'assets'],
  updateVersion: process.env.PUBLISH_VERSION,
  onDone: (versionsDiff, { $ }, packageJson, { targetPackageJson}) => {
    if (process.env.PUBLISH) {
      $(`pnpm test`);
      // remove all test compiled files. TODO: find a better to ignore test files
      $('rm dist/**/*.test.*');

      publishScript({
        nextVersion: versionsDiff?.next ?? packageJson.version,
        currVersion: versionsDiff?.current,
        publishCommand: 'pnpm publish',
        commitAllCurrentChanges: true,
        createTag: true,
        githubRepoLink: packageJson.repository.url.replace('git://', 'https://'),
        cleanupCommand: 'pnpm clean', 
        targetPackageJson,
      })
    }
  }
});

