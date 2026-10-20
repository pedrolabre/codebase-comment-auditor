import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vue from 'vue';
import MetricsSummary from '../../src/components/MetricsSummary.vue';
import { useAuditState } from '../../src/composables/useAuditState.js';

describe('MetricsSummary Component', () => {
  let exposed;
  let emit;

  function mountComponent(props = {}) {
    exposed = {};
    emit = vi.fn();
    const app = vue.createApp({});
    app.provide(vue.ssrContextKey, { modules: new Set() });

    app.runWithContext(() => {
      MetricsSummary.setup(
        props,
        { emit, expose: (vals) => Object.assign(exposed, vals) }
      );
    });

    return { exposed, emit };
  }

  beforeEach(() => {
    const auditState = useAuditState();
    auditState.resetAudit();
    auditState.setMode('repo');
    vi.restoreAllMocks();
  });

  it('exporta a definicao valida do componente Vue', () => {
    expect(MetricsSummary).toBeDefined();
    expect(typeof MetricsSummary.setup).toBe('function');
  });

  it('inicializa com contadores zerados no estado padrao', () => {
    const { exposed } = mountComponent();

    expect(exposed.totalComments.value).toBe(0);
    expect(exposed.auditedFiles.value).toBe(0);
    expect(exposed.skippedFilesCount.value).toBe(0);
    expect(exposed.isSkippedClickable.value).toBe(false);
    expect(exposed.criticalTagsCount.value).toBe(0);
    expect(exposed.criticalSubtitle.value).toBe('Nenhum alerta crítico');
  });

  it('calcula corretamente as metricas analiticas no modo repository scan', () => {
    const auditState = useAuditState();
    auditState.setMode('repo');
    auditState.setRepoAuditResults({
      comments: [
        { id: '1', file: 'app.js', text: '// TODO: refatorar', tags: ['TODO'] },
        { id: '2', file: 'app.js', text: '// normal comment', tags: [] },
        { id: '3', file: 'utils.js', text: '// FIXME: bugfix', tags: ['FIXME'] }
      ],
      metrics: {
        totalFiles: 25,
        supportedFiles: 20,
        skippedFiles: [
          { path: 'package-lock.json', reason: 'binary-file', size: 1024 },
          { path: 'dist/app.min.js', reason: 'minified-file', size: 4096 }
        ]
      },
      affectedFiles: [{ path: 'app.js' }, { path: 'utils.js' }]
    });

    const { exposed } = mountComponent();

    expect(exposed.currentMode.value).toBe('repo');
    expect(exposed.totalComments.value).toBe(3);
    expect(exposed.auditedFiles.value).toBe(20);
    expect(exposed.auditedFilesSubtitle.value).toBe('de 25 arquivos totais');
    expect(exposed.skippedFilesCount.value).toBe(2);
    expect(exposed.isSkippedClickable.value).toBe(true);
    expect(exposed.todoCount.value).toBe(1);
    expect(exposed.fixmeCount.value).toBe(1);
    expect(exposed.criticalTagsCount.value).toBe(2);
    expect(exposed.criticalSubtitle.value).toBe('1 TODOs • 1 FIXMEs');
  });

  it('calcula metricas de arquivos e linhas no modo diff scan', () => {
    const auditState = useAuditState();
    auditState.setMode('diff');
    auditState.diffStats.value = {
      filesChanged: 4,
      additions: 120,
      deletions: 45
    };
    auditState.comments.value = [
      { id: '1', file: 'src/main.js', text: '// TODO: test', tags: ['TODO'] }
    ];

    const { exposed } = mountComponent();

    expect(exposed.currentMode.value).toBe('diff');
    expect(exposed.totalComments.value).toBe(1);
    expect(exposed.auditedFiles.value).toBe(4);
    expect(exposed.auditedFilesSubtitle.value).toBe('+120 / -45 linhas');
    expect(exposed.skippedFilesCount.value).toBe(0);
    expect(exposed.isSkippedClickable.value).toBe(false);
  });

  it('identifica e contabiliza tags criticas (TODO, FIXME, BUG, HACK, XXX)', () => {
    const fakeComments = [
      { id: '1', tags: ['TODO'] },
      { id: '2', tags: ['FIXME'] },
      { id: '3', tags: ['BUG'] },
      { id: '4', tags: ['HACK'] },
      { id: '5', tags: ['XXX'] },
      { id: '6', tags: ['NOTE', 'TEMP'] },
      { id: '7', tags: [] }
    ];

    const { exposed } = mountComponent({ comments: fakeComments });

    expect(exposed.todoCount.value).toBe(1);
    expect(exposed.fixmeCount.value).toBe(2);
    expect(exposed.criticalTagsCount.value).toBe(5);
    expect(exposed.criticalSubtitle.value).toBe('1 TODOs • 2 FIXMEs');
  });

  it('formata o subtitulo de tags criticas adequadamente para zero vs multiplas ocorrencias', () => {
    const { exposed: exposedEmpty } = mountComponent({ comments: [] });
    expect(exposedEmpty.criticalSubtitle.value).toBe('Nenhum alerta crítico');

    const { exposed: exposedNonCritical } = mountComponent({
      comments: [{ id: '1', tags: ['NOTE'] }]
    });
    expect(exposedNonCritical.criticalSubtitle.value).toBe('Nenhum alerta crítico');

    const { exposed: exposedMultiple } = mountComponent({
      comments: [
        { id: '1', tags: ['TODO'] },
        { id: '2', tags: ['TODO'] },
        { id: '3', tags: ['FIXME'] }
      ]
    });
    expect(exposedMultiple.criticalSubtitle.value).toBe('2 TODOs • 1 FIXMEs');
  });

  it('prioriza valores fornecidos via props sobre useAuditState global', () => {
    const auditState = useAuditState();
    auditState.comments.value = [{ id: '1', tags: [] }];
    auditState.repoMetrics.value = { totalFiles: 10, supportedFiles: 8, skippedFiles: [] };

    const customComments = [
      { id: 'custom-1', tags: ['TODO'] },
      { id: 'custom-2', tags: ['FIXME'] }
    ];
    const customRepoMetrics = {
      totalFiles: 50,
      supportedFiles: 45,
      skippedFiles: [{ path: 'test.bin', reason: 'binary-file' }]
    };

    const { exposed } = mountComponent({
      comments: customComments,
      repoMetrics: customRepoMetrics,
      mode: 'repo'
    });

    expect(exposed.totalComments.value).toBe(2);
    expect(exposed.auditedFiles.value).toBe(45);
    expect(exposed.auditedFilesSubtitle.value).toBe('de 50 arquivos totais');
    expect(exposed.skippedFilesCount.value).toBe(1);
    expect(exposed.criticalTagsCount.value).toBe(2);
  });

  it('marca card de arquivos pulados como interativo apenas quando ha arquivos descartados', () => {
    const { exposed: exposedZero } = mountComponent({
      repoMetrics: { totalFiles: 5, supportedFiles: 5, skippedFiles: [] }
    });
    expect(exposedZero.isSkippedClickable.value).toBe(false);

    const { exposed: exposedWithSkipped } = mountComponent({
      repoMetrics: {
        totalFiles: 5,
        supportedFiles: 4,
        skippedFiles: [{ path: 'a.png', reason: 'binary-file' }]
      }
    });
    expect(exposedWithSkipped.isSkippedClickable.value).toBe(true);
  });

  it('emite evento open-skipped ao acionar handleSkippedClick com arquivos pulados existentes', () => {
    const { exposed, emit } = mountComponent({
      repoMetrics: {
        totalFiles: 2,
        supportedFiles: 1,
        skippedFiles: [{ path: 'dist/app.js', reason: 'ignored-directory' }]
      }
    });

    exposed.handleSkippedClick();
    expect(emit).toHaveBeenCalledWith('open-skipped');
  });

  it('ignora handleSkippedClick quando nao ha arquivos pulados', () => {
    const { exposed, emit } = mountComponent({
      repoMetrics: { totalFiles: 2, supportedFiles: 2, skippedFiles: [] }
    });

    exposed.handleSkippedClick();
    expect(emit).not.toHaveBeenCalled();
  });

  it('reage as mudancas no estado reativo global de useAuditState', () => {
    const auditState = useAuditState();
    const { exposed } = mountComponent();

    expect(exposed.totalComments.value).toBe(0);

    auditState.setRepoAuditResults({
      comments: [{ id: 'live-1', tags: ['TODO'] }],
      metrics: {
        totalFiles: 12,
        supportedFiles: 10,
        skippedFiles: [{ path: 'bundle.js', reason: 'minified-file' }]
      }
    });

    expect(exposed.totalComments.value).toBe(1);
    expect(exposed.auditedFiles.value).toBe(10);
    expect(exposed.skippedFilesCount.value).toBe(1);
    expect(exposed.isSkippedClickable.value).toBe(true);
    expect(exposed.todoCount.value).toBe(1);
  });
});
