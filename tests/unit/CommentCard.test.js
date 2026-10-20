import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vue from 'vue';
import CommentCard from '../../src/components/CommentCard.vue';

describe('CommentCard Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      CommentCard.setup(
        props,
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit };
  }

  const sampleComment = {
    id: 'src/utils/calc.js:15:2',
    file: 'src/utils/calc.js',
    language: 'javascript',
    type: 'line',
    category: 'development',
    startLine: 15,
    endLine: 15,
    startColumn: 2,
    endColumn: 35,
    text: '// TODO: refatorar algoritmo de soma',
    content: 'TODO: refatorar algoritmo de soma',
    tags: ['TODO'],
    hasUrl: false,
    urls: [],
    isAdded: false,
    context: {
      before: ['function calculate(a, b) {'],
      target: ['  // TODO: refatorar algoritmo de soma'],
      after: ['  return a + b;', '}']
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof navigator === 'undefined') {
      global.navigator = {};
    }
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(CommentCard).toBeDefined();
    expect(typeof CommentCard.setup).toBe('function');
  });

  it('inicializa com os estados padrao de contexto aberto e flags de copia zeradas', () => {
    const { exposed } = mountComponent({ comment: sampleComment });

    expect(exposed.isContextOpen.value).toBe(true);
    expect(exposed.isCopied.value).toBe(false);
    expect(exposed.isPathCopied.value).toBe(false);
  });

  it('respeita a prop initialOpen quando fornecida como falsa', () => {
    const { exposed } = mountComponent({
      comment: sampleComment,
      initialOpen: false
    });

    expect(exposed.isContextOpen.value).toBe(false);
  });

  it('alterna a exibicao do contexto de codigo ao acionar toggleContext', () => {
    const { exposed } = mountComponent({ comment: sampleComment });

    expect(exposed.isContextOpen.value).toBe(true);
    exposed.toggleContext();
    expect(exposed.isContextOpen.value).toBe(false);
    exposed.toggleContext();
    expect(exposed.isContextOpen.value).toBe(true);
  });

  it('copia o conteudo do comentario para a area de transferencia com feedback temporario', async () => {
    const { exposed } = mountComponent({ comment: sampleComment });

    await exposed.copyContent();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TODO: refatorar algoritmo de soma');
    expect(exposed.isCopied.value).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(exposed.isCopied.value).toBe(false);
  });

  it('copia o caminho do arquivo e linha com feedback temporario', async () => {
    const { exposed } = mountComponent({ comment: sampleComment });

    await exposed.copyPath();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('src/utils/calc.js:15');
    expect(exposed.isPathCopied.value).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(exposed.isPathCopied.value).toBe(false);
  });

  it('retorna classes semanticas apropriadas para cada tipo de tag', () => {
    const { exposed } = mountComponent({ comment: sampleComment });

    expect(exposed.getTagBadgeClass('TODO')).toContain('bg-amber-500/15');
    expect(exposed.getTagBadgeClass('FIXME')).toContain('bg-rose-500/15');
    expect(exposed.getTagBadgeClass('BUG')).toContain('bg-rose-500/15');
    expect(exposed.getTagBadgeClass('HACK')).toContain('bg-purple-500/15');
    expect(exposed.getTagBadgeClass('XXX')).toContain('bg-purple-500/15');
    expect(exposed.getTagBadgeClass('NOTE')).toContain('bg-cyan-500/15');
    expect(exposed.getTagBadgeClass('CUSTOM')).toContain('bg-slate-800');
  });
});
