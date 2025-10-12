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
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '*.config.js'],
};
