declare interface BuildEnvVariables {
  version: 'global' | 'default';
  isDev: boolean
}

declare const buildEnvs: BuildEnvVariables;
