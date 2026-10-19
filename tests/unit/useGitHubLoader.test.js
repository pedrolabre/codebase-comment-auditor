import { describe, it, expect, beforeEach, vi } from 'vitest';
import JSZip from 'jszip';
import { useGitHubLoader } from '../../src/composables/useGitHubLoader.js';
import { useAuditState } from '../../src/composables/useAuditState.js';
import * as githubService from '../../src/services/githubService.js';

describe('useGitHubLoader Composable', () => {
  beforeEach(() => {
    const auditState = useAuditState();
    auditState.resetAudit();
    vi.restoreAllMocks();
  });

  it('inicializa com o estado padrao esperado', () => {
    const loader = useGitHubLoader();

    expect(loader.status.value).toBe('idle');
    expect(loader.error.value).toBe('');
    expect(loader.isLoading.value).toBe(false);
    expect(loader.progress.value).toEqual({
      phase: 'idle',
      current: 0,
      total: 0,
      percent: 0,
      currentFile: ''
    });
    expect(loader.scanMetrics.value).toEqual({
      totalFiles: 0,
      supportedFiles: 0,
      skippedFiles: []
    });
  });

  it('permite resetar o estado atraves de resetLoader', () => {
    const loader = useGitHubLoader();
    loader.status.value = 'error';
    loader.error.value = 'Erro de teste';
    loader.progress.value.percent = 50;

    loader.resetLoader();

    expect(loader.status.value).toBe('idle');
    expect(loader.error.value).toBe('');
    expect(loader.progress.value.percent).toBe(0);
    expect(loader.isLoading.value).toBe(false);
  });

  it('trata lista vazia de arquivos retornando metricas zeradas e finalizando', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    const result = await loader.processFiles([]);

    expect(result.comments).toEqual([]);
    expect(result.metrics).toEqual({
      totalFiles: 0,
      supportedFiles: 0,
      skippedFiles: []
    });
    expect(loader.status.value).toBe('done');
    expect(loader.progress.value.percent).toBe(100);
    expect(auditState.hasAudited.value).toBe(true);
    expect(auditState.isAuditing.value).toBe(false);
  });

  it('processa arquivos em chunks assincronos, atualiza progresso e separa arquivos suportados vs pulados', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    const syntheticFiles = [
      {
        path: 'src/main.js',
        content: '// TODO: iniciar aplicacao\nconsole.log("running");',
        size: 50
      },
      {
        path: 'src/utils.js',
        content: '/* FIXME: otimizar funcao */\nexport function calc() { return 42; }',
        size: 70
      },
      {
        path: 'node_modules/pkg/index.js',
        content: '// comentario em dependencia',
        size: 30
      },
      {
        path: 'assets/logo.png',
        content: 'binary-png-data',
        size: 1500
      },
      {
        path: 'src/heavy.js',
        content: 'const big = true;',
        size: 2 * 1024 * 1024
      },
      {
        path: 'src/bundle.min.js',
        content: 'var a=1;/* minified */',
        size: 200
      },
      {
        path: 'src/lib.rs',
        content: '// Rust code not supported in MVP',
        size: 40
      },
      {
        path: 'scripts/worker.py',
        content: '# NOTE: worker assincrono em python\nimport time',
        size: 45
      }
    ];

    const progressHistory = [];
    const checkInterval = setInterval(() => {
      progressHistory.push({ ...loader.progress.value });
    }, 1);

    const result = await loader.processFiles(syntheticFiles, {
      chunkSize: 2,
      chunkDelay: 10
    });

    clearInterval(checkInterval);

    expect(result.metrics.totalFiles).toBe(8);
    expect(result.metrics.supportedFiles).toBe(3);
    expect(result.metrics.skippedFiles).toHaveLength(5);

    const skippedReasons = result.metrics.skippedFiles.map((f) => ({
      path: f.path,
      reason: f.reason
    }));

    expect(skippedReasons).toContainEqual({
      path: 'node_modules/pkg/index.js',
      reason: 'ignored-directory'
    });
    expect(skippedReasons).toContainEqual({
      path: 'assets/logo.png',
      reason: 'binary-file'
    });
    expect(skippedReasons).toContainEqual({
      path: 'src/heavy.js',
      reason: 'file-size-exceeded'
    });
    expect(skippedReasons).toContainEqual({
      path: 'src/bundle.min.js',
      reason: 'minified-file'
    });
    expect(skippedReasons).toContainEqual({
      path: 'src/lib.rs',
      reason: 'unsupported-language'
    });

    expect(result.comments.length).toBeGreaterThanOrEqual(3);
    const todoComment = result.comments.find((c) => c.tags.includes('TODO'));
    expect(todoComment).toBeDefined();
    expect(todoComment.file).toBe('src/main.js');
    expect(todoComment.isAdded).toBe(false);

    const fixmeComment = result.comments.find((c) => c.tags.includes('FIXME'));
    expect(fixmeComment).toBeDefined();
    expect(fixmeComment.file).toBe('src/utils.js');

    const noteComment = result.comments.find((c) => c.tags.includes('NOTE'));
    expect(noteComment).toBeDefined();
    expect(noteComment.file).toBe('scripts/worker.py');

    expect(auditState.comments.value).toEqual(result.comments);
    expect(auditState.repoMetrics.value).toEqual(result.metrics);
    expect(auditState.hasAudited.value).toBe(true);
    expect(auditState.isAuditing.value).toBe(false);

    expect(loader.status.value).toBe('done');
    expect(loader.progress.value.percent).toBe(100);
    expect(loader.progress.value.phase).toBe('done');
    expect(progressHistory.length).toBeGreaterThan(0);
  });

  it('descompacta e processa arquivo ZIP via loadFromZip', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    const zip = new JSZip();
    zip.file('repo-main/src/service.js', '// TODO: servico zip\nexport const x = 1;');
    zip.file('repo-main/node_modules/lib.js', '// ignorado');
    zip.file('repo-main/package-lock.json', '{"name": "test"}');

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const result = await loader.loadFromZip(zipBuffer, { chunkSize: 5 });

    expect(result.metrics.totalFiles).toBe(3);
    expect(result.metrics.supportedFiles).toBe(1);
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].file).toBe('src/service.js');
    expect(result.comments[0].tags).toContain('TODO');

    expect(loader.status.value).toBe('done');
    expect(auditState.hasAudited.value).toBe(true);
  });

  it('propaga erro e atualiza estado em caso de ZIP corrompido', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    const corruptedBuffer = new Uint8Array([1, 2, 3, 4, 5]);

    await expect(loader.loadFromZip(corruptedBuffer)).rejects.toThrow();

    expect(loader.status.value).toBe('error');
    expect(loader.error.value).toBeTruthy();
    expect(auditState.errorMessage.value).toBeTruthy();
    expect(auditState.isAuditing.value).toBe(false);
  });

  it('carrega repositorio do GitHub com sucesso via loadFromGitHub', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    const zip = new JSZip();
    zip.file('myorg-myrepo-abc1234/src/app.js', '// HACK: github download mock\nconst ok = true;');
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    vi.spyOn(githubService, 'downloadRepoZip').mockResolvedValue(zipBlob);

    const result = await loader.loadFromGitHub('https://github.com/myorg/myrepo');

    expect(result.metrics.totalFiles).toBe(1);
    expect(result.metrics.supportedFiles).toBe(1);
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].tags).toContain('HACK');

    expect(loader.status.value).toBe('done');
    expect(auditState.hasAudited.value).toBe(true);
  });

  it('trata erro de download ou URL invalida no loadFromGitHub', async () => {
    const loader = useGitHubLoader();
    const auditState = useAuditState();

    await expect(loader.loadFromGitHub('invalid-github-url')).rejects.toThrow();

    expect(loader.status.value).toBe('error');
    expect(loader.error.value).toContain('GitHub inválido');
    expect(auditState.errorMessage.value).toContain('GitHub inválido');
    expect(auditState.isAuditing.value).toBe(false);
  });
});
