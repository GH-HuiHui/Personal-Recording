import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);

describe('PWA 安装与离线边界', () => {
  it('manifest 使用独立显示与相对作用域', async () => {
    const manifest = JSON.parse(await readFile(new URL('public/manifest.webmanifest', root), 'utf8'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
  });

  it('Service Worker 仅缓存同源静态 GET 请求', async () => {
    const worker = await readFile(new URL('public/service-worker.js', root), 'utf8');
    expect(worker).toContain("request.method !== 'GET'");
    expect(worker).toContain('url.origin !== self.location.origin');
    expect(worker).not.toMatch(/indexedDB|growth-radar-backup|records/);
  });

  it('应用源码没有业务网络接口', async () => {
    const main = await readFile(new URL('src/main.js', root), 'utf8');
    const data = await readFile(new URL('src/data/db.js', root), 'utf8');
    expect(`${main}\n${data}`).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
});
