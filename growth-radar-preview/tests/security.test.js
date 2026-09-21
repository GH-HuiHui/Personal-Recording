import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);

describe('静态应用安全边界', () => {
  it('页面不加载远程脚本、字体或资源', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    expect(html).not.toMatch(/(?:src|href|action)=["']https?:\/\//i);
    expect(html).not.toMatch(/google-analytics|googletagmanager|segment|mixpanel/i);
  });

  it('CSP 禁止远程连接、表单外发与嵌入', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain("form-action 'none'");
    expect(html).toContain("object-src 'none'");
  });
});
