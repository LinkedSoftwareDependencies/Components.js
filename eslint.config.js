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
      // This is a Node.js library, it must import Node.js builtins
      'import/no-nodejs-modules': 'off',
      // The DI framework necessarily works with unknown types at runtime
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-return': 'off',
      // Don't flag unused function parameters (common in interface implementations)
      'unused-imports/no-unused-vars': [ 'error', { args: 'none' }],
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
