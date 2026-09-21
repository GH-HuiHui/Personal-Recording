import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1']
  },
  preview: {
    host: '0.0.0.0'
  }
});
