import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

function serviceWorkerManifest() {
  return {
    name: 'growth-radar-service-worker-manifest',
    generateBundle(_options, bundle) {
      const iconDirectory = new URL('./assets/icons/', import.meta.url);
      const runtimeIcons = readdirSync(iconDirectory).map((name) => {
        const fileName = `assets/icons/${name}`;
        this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(name, iconDirectory)) });
        return `./${fileName}`;
      });
      const files = [
        './',
        './index.html',
        './manifest.webmanifest',
        './icons/icon-192.png',
        './icons/icon-512.png',
        './icons/apple-touch-icon.png',
        ...runtimeIcons,
        ...Object.keys(bundle).filter((file) => file !== 'service-worker.js').map((file) => `./${file}`)
      ];
      const assets = [...new Set(files)];
      const template = readFileSync(new URL('./src/service-worker.template.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(template).update(JSON.stringify(assets));
      for (const entry of Object.values(bundle)) hash.update(entry.type === 'chunk' ? entry.code : entry.source);
      for (const name of readdirSync(iconDirectory)) hash.update(readFileSync(new URL(name, iconDirectory)));
      for (const name of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) hash.update(readFileSync(new URL(`./public/${name}`, import.meta.url)));
      const version = hash.digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: template
          .replace('__CACHE_VERSION__', `growth-radar-shell-${version}`)
          .replace('__PRECACHE_ASSETS__', JSON.stringify(assets))
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorkerManifest()],
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1']
  },
  preview: {
    host: '127.0.0.1'
  }
});
