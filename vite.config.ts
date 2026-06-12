import { defineConfig } from 'vite';

export default defineConfig({
  base: '/world-cup-betting-scoreboard/',
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          chart: ['chart.js'],
        },
      },
    },
  },
});
