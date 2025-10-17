module.exports = {
  root: true,
  extends: [
    '@metamask/eslint-config',
    '@metamask/eslint-config-nodejs',
    '@metamask/eslint-config-typescript',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.js'],
      extends: ['@metamask/eslint-config-jest'],
      rules: {
        // Allow shadowing of test globals from vitest
        '@typescript-eslint/no-shadow': [
          'error',
          {
            builtinGlobals: false,
            allow: ['describe', 'expect', 'it', 'beforeEach', 'afterEach'],
          },
        ],
      },
    },
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.ts',
    '.eslintrc.js',
  ],
  rules: {
    // Disable prettier/prettier rule to avoid conflicts with standalone Prettier
    'prettier/prettier': 'off',
    // Allow hex identifier for crypto operations
    'id-denylist': ['error', 'err', 'e', 'cb', 'callback'],
    // Allow unary ++ operator in loops
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    // Allow BigInt - it's widely supported and needed for Bitcoin operations
    'n/no-unsupported-features/es-builtins': [
      'error',
      { ignores: ['BigInt'] },
    ],
  },
};
