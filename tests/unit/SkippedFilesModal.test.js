import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vue from 'vue';
import SkippedFilesModal from '../../src/components/SkippedFilesModal.vue';
import { useAuditState } from '../../src/composables/useAuditState.js';

describe('SkippedFilesModal Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      SkippedFilesModal.setup(
        props,
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit };
  }

  const sampleSkippedFiles = [
    { path: 'node_modules/vue/index.js', reason: 'ignored-directory', size: 1024 },
    { path: 'dist/app.bundle.js', reason: 'minified-file', size: 204800 },
    { path: 'src/assets/logo.png', reason: 'binary-file', size: 51200 },
    { path: 'src/main.rs', reason: 'unsupported-language', size: 4096 },
    { path: 'huge-data.json', reason: 'file-size-exceeded', size: 2097152 },
    { path: 'corrupted.py', reason: 'parse-error', size: 120 }
  ];

  beforeEach(() => {
    useAuditState().resetAudit();
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(SkippedFilesModal).toBeDefined();
    expect(typeof SkippedFilesModal.setup).toBe('function');
  });

  it('inicializa com os estados padrao de busca e categoria', () => {
    const { exposed } = mountComponent();

    expect(exposed.searchQuery.value).toBe('');
    expect(exposed.activeCategory.value).toBe('all');
    expect(exposed.allFiles.value).toEqual([]);
    expect(exposed.filteredFiles.value).toEqual([]);
  });

  it('utiliza arquivos passados por props ou fallback de useAuditState', () => {
    const { exposed: exposedProps } = mountComponent({ skippedFiles: sampleSkippedFiles });
    expect(exposedProps.allFiles.value.length).toBe(6);

    const auditState = useAuditState();
    auditState.repoMetrics.value = {
      totalFiles: 10,
      supportedFiles: 9,
      skippedFiles: [{ path: 'test.bin', reason: 'binary-file', size: 100 }]
    };

    const { exposed: exposedGlobal } = mountComponent();
    expect(exposedGlobal.allFiles.value.length).toBe(1);
    expect(exposedGlobal.allFiles.value[0].path).toBe('test.bin');
  });

  it('emite update:modelValue e close ao acionar closeModal', () => {
    const { exposed, emit } = mountComponent({ modelValue: true });

    exposed.closeModal();

    expect(emit).toHaveBeenCalledWith('update:modelValue', false);
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('fecha o modal ao pressionar a tecla Escape quando aberto', () => {
    const { exposed, emit } = mountComponent({ modelValue: true });

    exposed.handleKeydown({ key: 'Escape' });

    expect(emit).toHaveBeenCalledWith('update:modelValue', false);
    expect(emit).toHaveBeenCalledWith('close');
  });

  it('ignora tecla Escape quando o modal estiver fechado', () => {
    const { exposed, emit } = mountComponent({ modelValue: false });

    exposed.handleKeydown({ key: 'Escape' });

    expect(emit).not.toHaveBeenCalled();
  });

  it('ignora outras teclas diferentes de Escape', () => {
    const { exposed, emit } = mountComponent({ modelValue: true });

    exposed.handleKeydown({ key: 'Enter' });
    exposed.handleKeydown({ key: 'Space' });

    expect(emit).not.toHaveBeenCalled();
  });

  it('formata tamanhos de arquivo em formato legivel', () => {
    const { exposed } = mountComponent();

    expect(exposed.formatFileSize(0)).toBe('0 B');
    expect(exposed.formatFileSize(-10)).toBe('0 B');
    expect(exposed.formatFileSize(null)).toBe('0 B');
    expect(exposed.formatFileSize(512)).toBe('512 B');
    expect(exposed.formatFileSize(1536)).toBe('1.5 KB');
    expect(exposed.formatFileSize(2097152)).toBe('2.0 MB');
  });

  it('mapeia os motivos tecnicos para badges e classes correspondentes', () => {
    const { exposed } = mountComponent();

    const ignored = exposed.getReasonBadge('ignored-directory');
    expect(ignored.label).toBe('Diretório Ignorado');

    const unsupported = exposed.getReasonBadge('unsupported-language');
    expect(unsupported.label).toBe('Linguagem Não Suportada');

    const binary = exposed.getReasonBadge('binary-file');
    expect(binary.label).toBe('Binário / Lockfile');

    const minified = exposed.getReasonBadge('minified-file');
    expect(minified.label).toBe('Minificado / Bundle');

    const exceeded = exposed.getReasonBadge('file-size-exceeded');
    expect(exceeded.label).toBe('Tamanho > 1MB');

    const parseErr = exposed.getReasonBadge('parse-error');
    expect(parseErr.label).toBe('Erro de Parsing');

    const custom = exposed.getReasonBadge('custom-reason');
    expect(custom.label).toBe('custom-reason');
  });

  it('calcula as contagens de categorias dinamicamente', () => {
    const { exposed } = mountComponent({ skippedFiles: sampleSkippedFiles });

    expect(exposed.categoryCounts.value.all).toBe(6);
    expect(exposed.categoryCounts.value['ignored-directory']).toBe(1);
    expect(exposed.categoryCounts.value['minified-file']).toBe(1);
    expect(exposed.categoryCounts.value['binary-file']).toBe(1);
    expect(exposed.categoryCounts.value['unsupported-language']).toBe(1);
    expect(exposed.categoryCounts.value['file-size-exceeded']).toBe(1);
    expect(exposed.categoryCounts.value['parse-error']).toBe(1);
  });

  it('filtra arquivos por categoria tecnica ativa', () => {
    const { exposed } = mountComponent({ skippedFiles: sampleSkippedFiles });

    exposed.activeCategory.value = 'unsupported-language';
    expect(exposed.filteredFiles.value.length).toBe(1);
    expect(exposed.filteredFiles.value[0].path).toBe('src/main.rs');

    exposed.activeCategory.value = 'ignored-directory';
    expect(exposed.filteredFiles.value.length).toBe(1);
    expect(exposed.filteredFiles.value[0].path).toBe('node_modules/vue/index.js');

    exposed.activeCategory.value = 'all';
    expect(exposed.filteredFiles.value.length).toBe(6);
  });

  it('filtra arquivos em tempo real por termo de busca', () => {
    const { exposed } = mountComponent({ skippedFiles: sampleSkippedFiles });

    exposed.searchQuery.value = 'bundle';
    expect(exposed.filteredFiles.value.length).toBe(1);
    expect(exposed.filteredFiles.value[0].path).toBe('dist/app.bundle.js');

    exposed.searchQuery.value = 'SRC';
    expect(exposed.filteredFiles.value.length).toBe(2);

    exposed.searchQuery.value = 'termo-inexistente';
    expect(exposed.filteredFiles.value.length).toBe(0);
  });

  it('combina busca textual e filtro de categoria simultaneamente', () => {
    const { exposed } = mountComponent({ skippedFiles: sampleSkippedFiles });

    exposed.activeCategory.value = 'binary-file';
    exposed.searchQuery.value = 'logo';
    expect(exposed.filteredFiles.value.length).toBe(1);
    expect(exposed.filteredFiles.value[0].path).toBe('src/assets/logo.png');

    exposed.searchQuery.value = 'main';
    expect(exposed.filteredFiles.value.length).toBe(0);
  });
});
