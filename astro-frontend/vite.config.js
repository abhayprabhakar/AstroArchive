import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs/promises';

export default defineConfig(() => ({
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-jsx",
          setup(build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: "jsx",
              contents: await fs.readFile(args.path, "utf8"),
            }));
          },
        },
      ],
    },
  },
  server: {
    proxy: {
      '/login': { // Proxy requests to /login to your backend
        target: 'http://localhost:5000',
        changeOrigin: true, // Required for CORS in some cases
        // rewrite: (path) => path.replace(/^\/api/, ''), // Optional: remove the /api prefix
      },
    },
    host: '0.0.0.0', // 👈 listen on all network interfaces
  },
}));
