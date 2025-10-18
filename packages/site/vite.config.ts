import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
  },
  define: {
    // Make environment variables available at runtime
    'import.meta.env.VITE_SNAP_ID': JSON.stringify(
      process.env.VITE_SNAP_ID || 'npm:@arkade-os/snap'
    ),
    'import.meta.env.VITE_SNAP_VERSION': JSON.stringify(
      process.env.VITE_SNAP_VERSION || '>=0.1.0'
    ),
  },
});
