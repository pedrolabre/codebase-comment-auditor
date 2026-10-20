import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vue from 'vue';
import FilterToolbar from '../../src/components/FilterToolbar.vue';
import { useCommentFilter } from '../../src/composables/useCommentFilter.js';
import { useAuditState } from '../../src/composables/useAuditState.js';

describe('FilterToolbar Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      FilterToolbar.setup(
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
      text: '// Copyright (c) 2026 Acme Corp. All rights reserved.',
      content: 'Copyright (c) 2026 Acme Corp. All rights reserved.',
      tags: [],
      hasUrl: false,
      urls: []
    },
    {
      id: 'src/utils/math.js:10:3',
      file: 'src/utils/math.js',
      language: 'javascript',
      type: 'line',
      category: 'development',
      startLine: 10,
      text: '// TODO: optimize calculation algorithm https://example.com/algo',
      content: 'TODO: optimize calculation algorithm https://example.com/algo',
      tags: ['TODO'],
      hasUrl: true,
      urls: ['https://example.com/algo']
    },
    {
      id: 'app/parser.py:20:1',
      file: 'app/parser.py',
      language: 'python',
      type: 'line',
      category: 'development',
      startLine: 20,
      text: '# FIXME: handle edge case when array is empty',
      content: 'FIXME: handle edge case when array is empty',
      tags: ['FIXME'],
      hasUrl: false,
      urls: []
    }
  ];

  beforeEach(() => {
    useAuditState().resetAudit();
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(FilterToolbar).toBeDefined();
    expect(typeof FilterToolbar.setup).toBe('function');
  });

  it('inicializa com o estado padrao com base no composable useCommentFilter', () => {
    const { exposed } = mountComponent();

    expect(exposed.searchQuery.value).toBe('');
    expect(exposed.selectedLanguages.value).toEqual([]);
    expect(exposed.selectedTags.value).toEqual([]);
    expect(exposed.hideCopyright.value).toBe(false);
    expect(exposed.hideLinters.value).toBe(false);
    expect(exposed.hideDocstrings.value).toBe(false);
    expect(exposed.hideToolGenerated.value).toBe(false);
    expect(exposed.hasActiveFilters.value).toBe(false);
  });

  it('aceita uma instancia customizada de useCommentFilter via prop filter', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    expect(exposed.totalCount.value).toBe(3);
    expect(exposed.filteredCount.value).toBe(3);
    expect(exposed.availableLanguages.value).toEqual(['javascript', 'python']);
    expect(exposed.availableTags.value).toContain('TODO');
    expect(exposed.availableTags.value).toContain('FIXME');
    expect(exposed.availableTags.value).toContain('URL');
  });

  it('permite buscar por texto e limpar via handleSearchClear', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    exposed.searchQuery.value = 'optimize';
    expect(exposed.filteredCount.value).toBe(1);
    expect(exposed.hasActiveFilters.value).toBe(true);

    exposed.handleSearchClear();
    expect(exposed.searchQuery.value).toBe('');
    expect(exposed.filteredCount.value).toBe(3);
    expect(exposed.hasActiveFilters.value).toBe(false);
  });

  it('permite alternar linguagens e reporta isLanguageActive corretamente', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    expect(exposed.isLanguageActive('javascript')).toBe(false);

    customFilter.toggleLanguage('javascript');
    expect(exposed.isLanguageActive('javascript')).toBe(true);
    expect(exposed.isLanguageActive('python')).toBe(false);
    expect(exposed.filteredCount.value).toBe(2);

    customFilter.toggleLanguage('javascript');
    expect(exposed.isLanguageActive('javascript')).toBe(false);
    expect(exposed.filteredCount.value).toBe(3);
  });

  it('permite alternar tags e reporta isTagActive corretamente', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    expect(exposed.isTagActive('TODO')).toBe(false);

    customFilter.toggleTag('TODO');
    expect(exposed.isTagActive('TODO')).toBe(true);
    expect(exposed.isTagActive('FIXME')).toBe(false);
    expect(exposed.filteredCount.value).toBe(1);

    customFilter.toggleTag('TODO');
    expect(exposed.isTagActive('TODO')).toBe(false);
    expect(exposed.filteredCount.value).toBe(3);
  });

  it('permite alternar regras de Allowlist atraves de toggleAllowlistRule', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    expect(exposed.hideCopyright.value).toBe(false);
    customFilter.toggleAllowlistRule('hideCopyright');
    expect(exposed.hideCopyright.value).toBe(true);
    expect(exposed.filteredCount.value).toBe(2);

    customFilter.toggleAllowlistRule('hideLinters');
    expect(exposed.hideLinters.value).toBe(true);

    customFilter.toggleAllowlistRule('hideDocstrings');
    expect(exposed.hideDocstrings.value).toBe(true);

    customFilter.toggleAllowlistRule('hideToolGenerated');
    expect(exposed.hideToolGenerated.value).toBe(true);
  });

  it('restaura todos os filtros ativos atraves de handleResetAll', () => {
    const customFilter = useCommentFilter(sampleComments);
    const { exposed } = mountComponent({ filter: customFilter });

    exposed.searchQuery.value = 'Acme';
    customFilter.toggleLanguage('javascript');
    customFilter.toggleTag('TODO');
    customFilter.toggleAllowlistRule('hideCopyright');

    expect(exposed.hasActiveFilters.value).toBe(true);

    exposed.handleResetAll();

    expect(exposed.searchQuery.value).toBe('');
    expect(exposed.selectedLanguages.value).toEqual([]);
    expect(exposed.selectedTags.value).toEqual([]);
    expect(exposed.hideCopyright.value).toBe(false);
    expect(exposed.hideLinters.value).toBe(false);
    expect(exposed.hideDocstrings.value).toBe(false);
    expect(exposed.hideToolGenerated.value).toBe(false);
    expect(exposed.hasActiveFilters.value).toBe(false);
    expect(exposed.filteredCount.value).toBe(3);
  });
});
