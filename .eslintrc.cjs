/* eslint-disable @typescript-eslint/no-var-requires */
const packageJson = require('./package.json');

module.exports = {
  extends: [require.resolve('js2me-eslint-config/react')],
  rules: {
    'import/no-unresolved': [
      'error',
      { ignore: Object.keys(packageJson.peerDependencies) },
    ],
    'unicorn/prevent-abbreviations': 'off',
    'sonarjs/deprecation': 'off'
  },
  overrides: [
    {
      files: [
        "*.fixture.ts",
        "*.fixture.tsx"
      ],
      rules: {
        'sonarjs/no-empty-test-file': 'off'
      }
    },
    {
      files: [
        "*.test.ts",
        "*.test.tsx"
      ],
      rules: {
        'sonarjs/no-identical-functions': 'off',
        'sonarjs/no-nested-functions': 'off',
        'unicorn/consistent-function-scoping': 'off',
        'unicorn/no-this-assignment': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
      parserOptions: {
        project: 'tsconfig.test.json',
      },
    },
    {
      files: [
        'website/**/*'
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-unresolved': 'off',
        'unicorn/prefer-module': 'off'
      }
    }
  ]
};
