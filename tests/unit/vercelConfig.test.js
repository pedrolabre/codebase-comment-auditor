import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('vercel.json & WebAssembly static deployment configuration', () => {
  const rootDir = process.cwd();
  const vercelConfigPath = path.resolve(rootDir, 'vercel.json');
  const publicDir = path.resolve(rootDir, 'public');
  const grammarsDir = path.resolve(publicDir, 'grammars');

  it('verifica que vercel.json existe e possui estrutura json valida', () => {
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const rawContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(rawContent);

    expect(config).toBeDefined();
    expect(Array.isArray(config.headers)).toBe(true);
    expect(Array.isArray(config.rewrites)).toBe(true);
  });

  it('configura cabecalho Content-Type application/wasm para arquivos WebAssembly', () => {
    const rawContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(rawContent);

    const wasmRules = config.headers.filter((rule) =>
      rule.source && rule.source.includes('.wasm')
    );
    expect(wasmRules.length).toBeGreaterThan(0);

    const hasAppWasmHeader = wasmRules.some((rule) =>
      rule.headers.some(
        (h) =>
          h.key.toLowerCase() === 'content-type' &&
          h.value === 'application/wasm'
      )
    );
    expect(hasAppWasmHeader).toBe(true);
  });

  it('configura politicas de cache imutavel para binarios WebAssembly e assets estaticos', () => {
    const rawContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(rawContent);

    const wasmRules = config.headers.filter((rule) =>
      rule.source && rule.source.includes('.wasm')
    );
    const hasWasmImmutableCache = wasmRules.some((rule) =>
      rule.headers.some(
        (h) =>
          h.key.toLowerCase() === 'cache-control' &&
          h.value.includes('immutable')
      )
    );
    expect(hasWasmImmutableCache).toBe(true);

    const assetsRule = config.headers.find((rule) =>
      rule.source && rule.source.includes('/assets/')
    );
    expect(assetsRule).toBeDefined();
    const hasAssetsImmutableCache = assetsRule.headers.some(
      (h) =>
        h.key.toLowerCase() === 'cache-control' &&
        h.value.includes('immutable')
    );
    expect(hasAssetsImmutableCache).toBe(true);
  });

  it('configura cabecalhos basicos de seguranca HTTP', () => {
    const rawContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(rawContent);

    const globalHeadersRule = config.headers.find((rule) => rule.source === '/(.*)');
    expect(globalHeadersRule).toBeDefined();

    const headerKeys = globalHeadersRule.headers.map((h) => h.key.toLowerCase());
    expect(headerKeys).toContain('x-content-type-options');
    expect(headerKeys).toContain('x-frame-options');
    expect(headerKeys).toContain('x-xss-protection');
    expect(headerKeys).toContain('referrer-policy');
  });

  it('configura reescrita SPA direcionando para index.html', () => {
    const rawContent = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(rawContent);

    const spaRewrite = config.rewrites.find(
      (rw) => rw.source === '/(.*)' && rw.destination === '/index.html'
    );
    expect(spaRewrite).toBeDefined();
  });

  it('valida integridade fisica de public/tree-sitter.wasm e gramaticas do MVP', () => {
    const mainWasm = path.resolve(publicDir, 'tree-sitter.wasm');
    expect(fs.existsSync(mainWasm)).toBe(true);
    const mainStat = fs.statSync(mainWasm);
    expect(mainStat.size).toBeGreaterThan(1000);

    expect(fs.existsSync(grammarsDir)).toBe(true);

    const expectedGrammars = [
      'tree-sitter-bash.wasm',
      'tree-sitter-css.wasm',
      'tree-sitter-html.wasm',
      'tree-sitter-javascript.wasm',
      'tree-sitter-python.wasm',
      'tree-sitter-typescript.wasm'
    ];

    for (const grammarFile of expectedGrammars) {
      const grammarPath = path.resolve(grammarsDir, grammarFile);
      expect(fs.existsSync(grammarPath)).toBe(true);
      const stat = fs.statSync(grammarPath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });
});
