import { postBuildScript } from 'js2me-exports-post-build-script';
 
postBuildScript({
  buildDir: 'dist',
  rootDir: '.',
  srcDirName: 'src',
  filesToCopy: ['LICENSE', 'README.md', 'assets'],
  updateVersion: process.env.PUBLISH_VERSION! as 'patch' | 'minor' | 'major',
});

