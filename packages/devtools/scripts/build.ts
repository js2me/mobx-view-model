import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { camelCase, upperFirst } from 'lodash-es';
import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';
import { ConfigsManager, prepareDistDir } from 'sborshik/utils';
import { minify } from 'terser';
import { build, defineConfig, type LibraryFormats } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const createBundle = async ({
  configs,
  buildEnvs,
}: {
  configs: ConfigsManager;
  buildEnvs: BuildEnvVariables;
}) => {
  let fileName: string;
  let libraryFormats: LibraryFormats[];
  let emptyOutDir: boolean;
  let sourceEntryFilePath: string;

  if (buildEnvs.version === 'default') {
    fileName = 'index';
    emptyOutDir = true;
    libraryFormats = ['cjs', 'es'];
    sourceEntryFilePath = resolve(configs.rootPath, 'src/index.ts');
  } else {
    fileName = 'auto.global';
    emptyOutDir = false;
    libraryFormats = ['umd'];
    sourceEntryFilePath = resolve(configs.rootPath, 'src/auto.global.ts');
  }

  const outputFileNames: string[] = [];

  const mode =
    process.env.NODE_ENV === 'development' ? 'development' : 'production';

  const viteConfig = defineConfig({
    appType: 'spa',
    mode: mode,
    define: {
      'process.env.NODE_ENV': `"${mode}"`,
      buildEnvs: JSON.stringify(buildEnvs),
    },
    build: {
      cssMinify:mode === 'development' ? false : true,
      cssCodeSplit: false,
      minify: mode === 'development' ? false : 'terser',
      emptyOutDir,
      lib: {
        entry: {
          [fileName]: sourceEntryFilePath,
        },
        formats: libraryFormats,
        name:
          libraryFormats.includes('iife') || libraryFormats.includes('umd')
            ? upperFirst(camelCase(configs.package.name))
            : undefined,
        fileName: (format, entryName) => {
          const outputFileName =
            format === 'cjs' ? `${entryName}.cjs` : `${entryName}.js`;
          outputFileNames.push(outputFileName);
          return outputFileName;
        },
      },
      rollupOptions: {
        external: [],
      },
      terserOptions: {
        format: {
          comments: false,
        },
      } as any,
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: '[local]_[hash:base64:5]', // Опционально
      },
      postcss: './postcss.config.js',
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: '/src',
        },
      ],
    },
    plugins: [
      cssInjectedByJsPlugin(),
      {
        name: 'dts-bundle',
        apply: 'build',
        async closeBundle() {
          if (buildEnvs.version === 'global') {
            console.log('⚠️ Generating bundled .d.ts files SKIPPED...\n');
            return;
          }

          console.log('\n📦 Generating bundled .d.ts files...\n');

          try {
            const bundle = await rollup({
              input: resolve(configs.rootPath, './src/index.ts'),
              external: (id) => {
                return id.includes('node_modules');
              },
              plugins: [
                dts({
                  respectExternal: false,
                  compilerOptions: {
                    baseUrl: '.',
                    paths: {
                      '@/*': ['./src/*'],
                    },
                  },
                }),
              ],
            });

            await bundle.write({
              file: `dist/${fileName}.d.ts`,
              format: 'es',
            });

            await bundle.close();
            console.log(`✅ ${fileName}.d.ts`);
          } catch (error) {
            console.error(`❌ Failed to generate ${fileName}.d.ts:`, error);
          }
        },
      },
    ],
  });

  await build(viteConfig);

  if (mode === 'production') {
    for await (const outputFileName of outputFileNames) {
      const outputFilePath = resolve(
        configs.rootPath,
        `dist/${outputFileName}`,
      );
      const outputFileContent = readFileSync(outputFilePath).toString();

      writeFileSync(
        outputFilePath,
        (
          await minify(outputFileContent, {
            mangle: true,
            compress: true,
            format: {
              comments: false,
            },
          })
        ).code,
      );
    }
  }
};

const main = async () => {
  const configs = ConfigsManager.create();

  if (!process.env.GLOBAL_ONLY) {
    await createBundle({
      configs,
      buildEnvs: {
        version: 'default',
        isDev: process.env.NODE_ENV === 'development',
      },
    });
  }
  await createBundle({
    configs,
    buildEnvs: {
      version: 'global',
      isDev: process.env.NODE_ENV === 'development',
    },
  });

  await prepareDistDir({
    configs,
    ignoredModuleNamesForExport: ['auto.global'],
  });
};

// biome-ignore lint/nursery/noFloatingPromises: <explanation>
main();
