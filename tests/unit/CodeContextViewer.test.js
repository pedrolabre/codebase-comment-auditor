import { describe, it, expect, vi } from 'vitest';
import * as vue from 'vue';
import CodeContextViewer from '../../src/components/CodeContextViewer.vue';

describe('CodeContextViewer Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      CodeContextViewer.setup(
        props,
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit };
  }

  it('exporta a definicao valida do componente Vue', () => {
    expect(CodeContextViewer).toBeDefined();
    expect(typeof CodeContextViewer.setup).toBe('function');
  });

  it('renderiza contexto vazio quando nenhuma linha for fornecida', () => {
    const { exposed } = mountComponent({
      context: { before: [], target: [], after: [] },
      startLine: 1,
      language: 'javascript'
    });

    expect(exposed.computedLines.value).toEqual([]);
  });

  it('calcula e numera corretamente as linhas de before, target e after', () => {
    const { exposed } = mountComponent({
      context: {
        before: ['const a = 1;', 'const b = 2;'],
        target: ['// TODO: calcular soma'],
        after: ['const c = a + b;', 'return c;']
      },
      startLine: 10,
      language: 'javascript'
    });

    const lines = exposed.computedLines.value;
    expect(lines).toHaveLength(5);

    // Linhas before: 8, 9
    expect(lines[0].lineNumber).toBe(8);
    expect(lines[0].isTarget).toBe(false);
    expect(lines[0].text).toBe('const a = 1;');

    expect(lines[1].lineNumber).toBe(9);
    expect(lines[1].isTarget).toBe(false);

    // Linha target: 10
    expect(lines[2].lineNumber).toBe(10);
    expect(lines[2].isTarget).toBe(true);
    expect(lines[2].text).toBe('// TODO: calcular soma');

    // Linhas after: 11, 12
    expect(lines[3].lineNumber).toBe(11);
    expect(lines[3].isTarget).toBe(false);
    expect(lines[4].lineNumber).toBe(12);
    expect(lines[4].isTarget).toBe(false);
  });

  it('aplica syntax highlighting com highlight.js gerando spans semanticos em JavaScript', () => {
    const { exposed } = mountComponent({
      context: {
        before: [],
        target: ['function sum(x, y) { return x + y; }'],
        after: []
      },
      startLine: 1,
      language: 'javascript'
    });

    const targetHtml = exposed.computedLines.value[0].html;
    expect(targetHtml).toContain('hljs-keyword');
    expect(targetHtml).toContain('function');
  });

  it('suporta linguagens com aliases e fallback gracioso para plaintext', () => {
    const { exposed } = mountComponent({
      context: {
        before: [],
        target: ['# Python comment'],
        after: []
      },
      startLine: 1,
      language: 'py'
    });

    expect(exposed.resolveLanguage('py')).toBe('python');
    expect(exposed.resolveLanguage('ts')).toBe('typescript');
    expect(exposed.resolveLanguage('unknown-lang-xyz')).toBe('plaintext');

    const htmlFallback = exposed.highlightText('<div>Hello & World</div>', 'unknown-lang-xyz');
    expect(htmlFallback).toContain('&lt;div&gt;Hello &amp; World&lt;/div&gt;');
  });

  it('trata linhas vazias gerando espacamento seguro sem quebrar o layout', () => {
    const { exposed } = mountComponent({
      context: {
        before: [''],
        target: ['// comment'],
        after: ['']
      },
      startLine: 20,
      language: 'javascript'
    });

    expect(exposed.computedLines.value[0].html).toBe('&nbsp;');
    expect(exposed.computedLines.value[2].html).toBe('&nbsp;');
  });

  it('garante que startLine seja normalizado quando valores invalidos forem passados', () => {
    const { exposed } = mountComponent({
      context: {
        before: [],
        target: ['// comment'],
        after: []
      },
      startLine: 0,
      language: 'javascript'
    });

    expect(exposed.computedLines.value[0].lineNumber).toBe(1);
  });
});
