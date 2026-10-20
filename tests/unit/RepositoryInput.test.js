import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vue from 'vue';
import RepositoryInput from '../../src/components/RepositoryInput.vue';
import { useGitHubLoader } from '../../src/composables/useGitHubLoader.js';
import { useAuditState } from '../../src/composables/useAuditState.js';

describe('RepositoryInput Component', () => {
  let exposed;
  let emit;
  let loader;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    loader = props.loader || useGitHubLoader();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      RepositoryInput.setup(
        { loader, ...props },
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit, loader };
  }

  beforeEach(() => {
    useAuditState().resetAudit();
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(RepositoryInput).toBeDefined();
    expect(typeof RepositoryInput.setup).toBe('function');
  });

  it('inicializa com os estados padrao esperados', () => {
    const { exposed } = mountComponent();

    expect(exposed.repoUrlInput.value).toBe('');
    expect(exposed.selectedFile.value).toBeNull();
    expect(exposed.patToken.value).toBe('');
    expect(exposed.canAudit.value).toBe(false);
  });

  it('habilita auditoria ao inserir uma URL valida do GitHub', () => {
    const { exposed } = mountComponent();

    exposed.repoUrlInput.value = 'facebook/react';
    expect(exposed.canAudit.value).toBe(true);

    exposed.repoUrlInput.value = 'https://github.com/vuejs/core';
    expect(exposed.canAudit.value).toBe(true);

    exposed.repoUrlInput.value = 'invalid-format-without-slash';
    expect(exposed.canAudit.value).toBe(false);
  });

  it('habilita auditoria ao selecionar um arquivo zip valido', () => {
    const { exposed } = mountComponent();

    const fakeZip = { name: 'repo-archive.zip', size: 1024, type: 'application/zip' };
    exposed.selectedFile.value = fakeZip;

    expect(exposed.canAudit.value).toBe(true);
  });

  it('limpa todas as entradas e estado do loader ao chamar handleClear', () => {
    const { exposed, emit } = mountComponent();

    exposed.repoUrlInput.value = 'owner/repo';
    exposed.selectedFile.value = { name: 'archive.zip' };
    exposed.patToken.value = 'ghp_secret';

    exposed.handleClear();

    expect(exposed.repoUrlInput.value).toBe('');
    expect(exposed.selectedFile.value).toBeNull();
    expect(exposed.patToken.value).toBe('');
    expect(exposed.canAudit.value).toBe(false);
    expect(emit).toHaveBeenCalledWith('reset');
  });

  it('dispara loadFromGitHub quando ha URL valida e emite eventos de ciclo de vida', async () => {
    const fakeLoader = useGitHubLoader();
    const loadFromGitHubSpy = vi.spyOn(fakeLoader, 'loadFromGitHub').mockResolvedValue({
      comments: [{ id: '1', text: '// comment' }],
      metrics: { totalFiles: 1, supportedFiles: 1, skippedFiles: [] },
      affectedFiles: []
    });

    const { exposed, emit } = mountComponent({ loader: fakeLoader });
    exposed.repoUrlInput.value = 'facebook/react';
    exposed.patToken.value = 'ghp_test_token';

    await exposed.handleAudit();

    expect(loadFromGitHubSpy).toHaveBeenCalledWith('facebook/react', {
      token: 'ghp_test_token'
    });
    expect(emit).toHaveBeenCalledWith('audit-start', {
      type: 'github',
      target: 'facebook/react'
    });
    expect(emit).toHaveBeenCalledWith('audit-complete', expect.objectContaining({
      comments: expect.any(Array)
    }));
  });

  it('dispara loadFromZip quando ha arquivo zip selecionado e emite eventos correspondentes', async () => {
    const fakeLoader = useGitHubLoader();
    const fakeZipFile = { name: 'source.zip', size: 5000, type: 'application/zip' };
    const loadFromZipSpy = vi.spyOn(fakeLoader, 'loadFromZip').mockResolvedValue({
      comments: [],
      metrics: { totalFiles: 2, supportedFiles: 2, skippedFiles: [] },
      affectedFiles: []
    });

    const { exposed, emit } = mountComponent({ loader: fakeLoader });
    exposed.selectedFile.value = fakeZipFile;

    await exposed.handleAudit();

    expect(loadFromZipSpy).toHaveBeenCalledWith(fakeZipFile);
    expect(emit).toHaveBeenCalledWith('audit-start', {
      type: 'zip',
      target: fakeZipFile
    });
    expect(emit).toHaveBeenCalledWith('audit-complete', expect.objectContaining({
      comments: []
    }));
  });

  it('captura erros e emite audit-error quando o loader falha', async () => {
    const fakeLoader = useGitHubLoader();
    vi.spyOn(fakeLoader, 'loadFromGitHub').mockRejectedValue(new Error('Repositório não encontrado (HTTP 404)'));

    const { exposed, emit } = mountComponent({ loader: fakeLoader });
    exposed.repoUrlInput.value = 'owner/not-found';

    await exposed.handleAudit();

    expect(emit).toHaveBeenCalledWith('audit-error', expect.any(Error));
  });

  it('ignora chamada handleAudit quando canAudit for false', async () => {
    const fakeLoader = useGitHubLoader();
    const loadFromGitHubSpy = vi.spyOn(fakeLoader, 'loadFromGitHub');

    const { exposed, emit } = mountComponent({ loader: fakeLoader });
    exposed.repoUrlInput.value = '';

    await exposed.handleAudit();

    expect(loadFromGitHubSpy).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('atualiza o estado reativo global de useAuditState ao concluir com sucesso', async () => {
    const auditState = useAuditState();
    const fakeLoader = useGitHubLoader();
    vi.spyOn(fakeLoader, 'loadFromGitHub').mockImplementation(async () => {
      auditState.setRepoAuditResults({
        comments: [{ id: 'file:1:1', text: '// TODO: test' }],
        metrics: { totalFiles: 1, supportedFiles: 1, skippedFiles: [] },
        affectedFiles: [{ path: 'test.js', language: 'javascript', commentsCount: 1 }]
      });
      return { comments: auditState.comments.value };
    });

    const { exposed } = mountComponent({ loader: fakeLoader });
    exposed.repoUrlInput.value = 'owner/repo';

    await exposed.handleAudit();

    expect(auditState.hasAudited.value).toBe(true);
    expect(auditState.totalCommentsCount.value).toBe(1);
    expect(auditState.repoMetrics.value.totalFiles).toBe(1);
  });
});
