import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Detect if running in Tauri
    const isTauri = process.env.TAURI_PLATFORM !== undefined;
    
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: true,
      },
      // Tauri expects a relative base path
      base: isTauri ? './' : '/',
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Tauri uses Chromium-based webview which supports all modern features
        target: isTauri ? 'esnext' : 'modules',
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_DEBUG,
        // Optimize chunk size for faster loading
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'icons': ['lucide-react'],
              'charts': ['recharts'],
            }
          }
        }
      },
    };
});
