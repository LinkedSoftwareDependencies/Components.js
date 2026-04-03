const config = require('@rubensworks/eslint-config');

module.exports = config([
  {
    ignores: [
      'node_modules',
      'coverage',
      '**/*.js',
      '**/*.d.ts',
      '**/*.js.map',
      '**/*.md',
      '**/*.yml',
      '**/*.yaml',
      '**/*.json',
    ],
  },
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    rules: {
      'no-implicit-coercion': 'off',
      'no-sync': 'off',
    },
  },
  {
    // Specific rules for test files
    files: [ '**/test/**/*.ts' ],
    rules: {
      'ts/require-array-sort-compare': 'off',
    },
  },
]);
