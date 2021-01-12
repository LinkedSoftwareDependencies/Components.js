module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname, // this is the reason this is a .js file
        project: ['./tsconfig.eslint.json'],
    },
    extends: [
        '@rubensworks'
    ],
    rules: {
        'no-implicit-coercion': 'off',
        'no-sync': 'off',
    },
    overrides: [
        {
            // Specific rules for test files
            files: ['**/test/**/*.ts'],
            rules: {
                '@typescript-eslint/require-array-sort-compare': 'off',
            },
        },
    ]
};
