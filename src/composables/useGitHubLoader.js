import { ref, computed } from 'vue';
import { parseGitHubUrl, downloadRepoZip } from '../services/githubService.js';
import { extractZipFiles } from '../services/zipService.js';
import { evaluateFileEligibility } from '../utils/fileIgnoreRules.js';
import { extractRawComments } from '../parsing/commentExtractor.js';
import { normalizeCommentNodes } from '../parsing/commentNormalizer.js';
import { useAuditState } from './useAuditState.js';

export function useGitHubLoader() {
  const status = ref('idle');
  const error = ref('');
  const progress = ref({
    phase: 'idle',
    current: 0,
    total: 0,
    percent: 0,
    currentFile: ''
  });
  const scanMetrics = ref({
    totalFiles: 0,
    supportedFiles: 0,
    skippedFiles: []
  });

  const isLoading = computed(() =>
    ['downloading', 'extracting', 'analyzing'].includes(status.value)
  );

  function resetLoader() {
    status.value = 'idle';
    error.value = '';
    progress.value = {
      phase: 'idle',
      current: 0,
      total: 0,
      percent: 0,
      currentFile: ''
    };
    scanMetrics.value = {
      totalFiles: 0,
      supportedFiles: 0,
      skippedFiles: []
    };
  }

  async function processFiles(fileEntries, options = {}) {
    const auditState = options.auditState || useAuditState();
    const files = Array.isArray(fileEntries) ? fileEntries : [];
    const total = files.length;
    const chunkSize = typeof options.chunkSize === 'number' && options.chunkSize > 0
      ? options.chunkSize
      : 10;
    const chunkDelay = typeof options.chunkDelay === 'number' ? options.chunkDelay : 0;
    const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, chunkDelay));

    if (total === 0) {
      status.value = 'done';
      progress.value = {
        phase: 'done',
        current: 0,
        total: 0,
        percent: 100,
        currentFile: ''
      };
      const emptyMetrics = { totalFiles: 0, supportedFiles: 0, skippedFiles: [] };
      scanMetrics.value = emptyMetrics;
      auditState.setRepoAuditResults({
        comments: [],
        metrics: emptyMetrics,
        affectedFiles: []
      });
      return { comments: [], metrics: emptyMetrics, affectedFiles: [] };
    }

    status.value = 'analyzing';
    error.value = '';
    auditState.isAuditing.value = true;
    auditState.errorMessage.value = '';

    const allComments = [];
    const skippedFiles = [];
    const affectedFilesMap = new Map();
    let supportedCount = 0;

    for (let i = 0; i < total; i++) {
      const entry = files[i];
      const currentPath = entry?.path || '';
      const percent = Math.min(100, Math.round(((i + 1) / total) * 100));

      progress.value = {
        phase: 'analyzing',
        current: i + 1,
        total,
        percent,
        currentFile: currentPath
      };

      const eligibility = evaluateFileEligibility(entry, {
        maxSizeBytes: options.maxSizeBytes
      });

      if (!eligibility.eligible) {
        skippedFiles.push({
          path: currentPath,
          reason: eligibility.reason,
          size: entry?.size ?? 0
        });
      } else {
        supportedCount++;
        try {
          const rawComments = await extractRawComments(
            entry.content || '',
            eligibility.language,
            currentPath
          );

          if (rawComments && rawComments.length > 0) {
            const normalized = normalizeCommentNodes(rawComments, entry.content || '', {
              isAdded: false
            });
            allComments.push(...normalized);
            affectedFilesMap.set(currentPath, {
              path: currentPath,
              language: eligibility.language,
              commentsCount: normalized.length
            });
          }
        } catch {
          skippedFiles.push({
            path: currentPath,
            reason: 'parse-error',
            size: entry?.size ?? 0
          });
        }
      }

      if ((i + 1) % chunkSize === 0 && i + 1 < total) {
        await yieldToMain();
      }
    }

    const metrics = {
      totalFiles: total,
      supportedFiles: supportedCount,
      skippedFiles
    };

    scanMetrics.value = metrics;
    status.value = 'done';
    progress.value = {
      phase: 'done',
      current: total,
      total,
      percent: 100,
      currentFile: 'Auditoria concluída'
    };

    const affectedFiles = Array.from(affectedFilesMap.values());
    auditState.setRepoAuditResults({
      comments: allComments,
      metrics,
      affectedFiles
    });

    return {
      comments: allComments,
      metrics,
      affectedFiles
    };
  }

  async function loadFromZip(zipSource, options = {}) {
    const auditState = options.auditState || useAuditState();
    error.value = '';
    status.value = 'extracting';
    progress.value = {
      phase: 'extracting',
      current: 0,
      total: 0,
      percent: 0,
      currentFile: 'Descompactando arquivos...'
    };
    auditState.isAuditing.value = true;
    auditState.errorMessage.value = '';

    try {
      const fileEntries = await extractZipFiles(zipSource, options);
      return await processFiles(fileEntries, options);
    } catch (err) {
      status.value = 'error';
      error.value = err?.message || 'Falha ao descompactar e analisar arquivo ZIP.';
      progress.value = {
        phase: 'error',
        current: 0,
        total: 0,
        percent: 0,
        currentFile: ''
      };
      auditState.isAuditing.value = false;
      auditState.errorMessage.value = error.value;
      throw err;
    }
  }

  async function loadFromGitHub(repoUrl, options = {}) {
    const auditState = options.auditState || useAuditState();
    error.value = '';
    status.value = 'downloading';
    progress.value = {
      phase: 'downloading',
      current: 0,
      total: 0,
      percent: 0,
      currentFile: 'Baixando repositório do GitHub...'
    };
    auditState.isAuditing.value = true;
    auditState.errorMessage.value = '';

    try {
      const parsed = parseGitHubUrl(repoUrl);
      const targetRef = options.ref || parsed.ref;
      const zipBlob = await downloadRepoZip(parsed.owner, parsed.repo, {
        token: options.token,
        ref: targetRef,
        signal: options.signal
      });

      status.value = 'extracting';
      progress.value = {
        phase: 'extracting',
        current: 0,
        total: 0,
        percent: 0,
        currentFile: 'Descompactando arquivos...'
      };

      const fileEntries = await extractZipFiles(zipBlob, options);
      return await processFiles(fileEntries, options);
    } catch (err) {
      status.value = 'error';
      error.value = err?.message || 'Falha ao baixar e processar repositório do GitHub.';
      progress.value = {
        phase: 'error',
        current: 0,
        total: 0,
        percent: 0,
        currentFile: ''
      };
      auditState.isAuditing.value = false;
      auditState.errorMessage.value = error.value;
      throw err;
    }
  }

  return {
    status,
    error,
    progress,
    scanMetrics,
    isLoading,
    resetLoader,
    processFiles,
    loadFromZip,
    loadFromGitHub
  };
}

export default useGitHubLoader;
