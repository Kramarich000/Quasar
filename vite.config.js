import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    sourcemap: mode === 'development' ? 'inline' : false,
    outDir: 'dist',
    minify: 'terser',
    target: 'es2015',
    cssCodeSplit: true,
    emptyOutDir: true,
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  publicDir: 'public',
}));
