import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vue from 'vue';
import ExportModal from '../../src/components/ExportModal.vue';

describe('ExportModal Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      ExportModal.setup(
        props,
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit };
  }

  const sampleComments = [
    {
      id: 'src/main.js:1:1',
      file: 'src/main.js',
      language: 'javascript',
      type: 'line',
      category: 'development',
      startLine: 1,
      endLine: 1,
      startColumn: 1,
      endColumn: 25,
      text: '// TODO: setup global config',
      content: 'TODO: setup global config',
      tags: ['TODO'],
      hasUrl: false,
      urls: [],
      isAdded: false,
      context: {
        before: [],
        target: ['// TODO: setup global config'],
        after: ['import { createApp } from "vue";']
      }
    },
    {
      id: 'src/app.py:10:0',
      file: 'src/app.py',
      language: 'python',
      type: 'line',
      category: 'development',
      startLine: 10,
      endLine: 10,
      startColumn: 0,
      endColumn: 30,
      text: '# FIXME: handle timeout error',
      content: 'FIXME: handle timeout error',
      tags: ['FIXME'],
      hasUrl: true,
      urls: ['https://bugs.python.org'],
      isAdded: true,
      context: {
        before: ['def run():'],
        target: ['    # FIXME: handle timeout error'],
        after: ['    pass']
      }
    }
  ];

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

    if (typeof global.URL === 'undefined') {
      global.URL = {};
    }
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    if (typeof document === 'undefined') {
      global.document = {
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        },
        createElement: vi.fn(() => ({
          click: vi.fn(),
          href: '',
          download: ''
        }))
      };
    } else {
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(ExportModal).toBeDefined();
    expect(typeof ExportModal.setup).toBe('function');
  });

  it('inicializa com aba markdown ativa e flags padrao', () => {
    const { exposed } = mountComponent({
      isOpen: true,
      comments: sampleComments
    });

    expect(exposed.activeTab.value).toBe('markdown');
    expect(exposed.isCopied.value).toBe(false);
  });

  it('calcula estatisticas agregadas de tags, linguagens e arquivos unicos', () => {
    const { exposed } = mountComponent({
      comments: sampleComments
    });

    const stats = exposed.summaryStats.value;
    expect(stats.totalComments).toBe(2);
    expect(stats.affectedFilesCount).toBe(2);
    expect(stats.tagsCount.TODO).toBe(1);
    expect(stats.tagsCount.FIXME).toBe(1);
    expect(stats.languageCount.javascript).toBe(1);
    expect(stats.languageCount.python).toBe(1);
  });

  it('emite eventos de fechamento ao acionar closeModal', () => {
    const { exposed, emit } = mountComponent({ modelValue: true });

    exposed.closeModal();

    expect(emit).toHaveBeenCalledWith('update:modelValue', false);
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('fecha o modal ao acionar handleKeydown com Escape quando aberto', () => {
    const { exposed, emit } = mountComponent({
      isOpen: true,
      comments: sampleComments
    });

    exposed.handleKeydown({ key: 'Escape' });

    expect(emit).toHaveBeenCalledWith('update:modelValue', false);
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('ignora tecla Escape quando o modal estiver fechado', () => {
    const { exposed, emit } = mountComponent({
      isOpen: false,
      modelValue: false
    });

    exposed.handleKeydown({ key: 'Escape' });

    expect(emit).not.toHaveBeenCalled();
  });

  it('alterna abas entre markdown e json e atualiza activeContent', () => {
    const { exposed } = mountComponent({
      comments: sampleComments
    });

    expect(exposed.activeTab.value).toBe('markdown');
    expect(exposed.activeContent.value).toContain('# 📋 Relatório de Auditoria de Comentários');

    exposed.activeTab.value = 'json';
    expect(exposed.activeTab.value).toBe('json');
    expect(exposed.activeContent.value).toContain('"generator": "codebase-comment-auditor"');
  });

  it('gera relatorio deterministico em Markdown com metricas e blocos de codigo', () => {
    const { exposed } = mountComponent({
      comments: sampleComments,
      activeMode: 'diff'
    });

    const md = exposed.markdownReport.value;
    expect(md).toContain('# 📋 Relatório de Auditoria de Comentários');
    expect(md).toContain('Modo Operacional:** Diff Scan (Pré-Commit)');
    expect(md).toContain('Total de Comentários Auditados:** 2');
    expect(md).toContain('Arquivos Afetados:** 2');
    expect(md).toContain('**TODO:** 1');
    expect(md).toContain('**FIXME:** 1');
    expect(md).toContain('`src/main.js` (L1)');
    expect(md).toContain('`src/app.py` (L10) *(Novo no Diff)*');
    expect(md).toContain('```javascript');
    expect(md).toContain('```python');
  });

  it('gera mensagem quando nenhum comentario estiver disponivel para exportacao no markdown', () => {
    const { exposed } = mountComponent({
      comments: []
    });

    expect(exposed.markdownReport.value).toContain('Nenhum comentário detectado ou selecionado para exportação');
  });

  it('gera relatorio canonico em JSON com schema estruturado e parseavel', () => {
    const { exposed } = mountComponent({
      comments: sampleComments,
      activeMode: 'repo'
    });

    const jsonString = exposed.jsonReport.value;
    const parsed = JSON.parse(jsonString);

    expect(parsed.generator).toBe('codebase-comment-auditor');
    expect(parsed.mode).toBe('repo');
    expect(parsed.summary.totalComments).toBe(2);
    expect(parsed.summary.tagsCount.TODO).toBe(1);
    expect(parsed.summary.tagsCount.FIXME).toBe(1);
    expect(parsed.comments).toHaveLength(2);
    expect(parsed.comments[0].file).toBe('src/main.js');
    expect(parsed.comments[1].urls).toContain('https://bugs.python.org');
  });

  it('copia o relatorio ativo para a area de transferencia com feedback', async () => {
    const { exposed } = mountComponent({
      comments: sampleComments
    });

    await exposed.copyReport();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(exposed.activeContent.value);
    expect(exposed.isCopied.value).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(exposed.isCopied.value).toBe(false);
  });

  it('executa o download do arquivo de relatorio acionando criacao de blob e link', () => {
    const { exposed } = mountComponent({
      comments: sampleComments
    });

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn()
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    exposed.downloadReport();

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('comment-audit-report.md');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
