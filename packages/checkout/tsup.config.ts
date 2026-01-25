import { defineConfig } from 'tsup';

const shared = {
  format: ['esm', 'cjs'],
  sourcemap: true,
  splitting: false,
  treeshake: true,
} as const;

export default [
  defineConfig({
    entry: {
      index: 'src/index.ts',
      'server/route': 'src/server/route.ts',
      'next-plugin': 'src/next-plugin.ts',
    },
    dts: true,
    clean: true,
    ...shared,
    external: [
      'next',
      'react',
      '@arkade-os/sdk',
      '@arkade-os/boltz-swap',
      'qrcode',
      '@vercel/kv',
    ],
  }),
  defineConfig({
    entry: {
      'cli/create': 'cli/create.ts',
    },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['@arkade-os/sdk'],
  }),
];
