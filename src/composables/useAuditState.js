import { ref, computed } from 'vue';
import { extractDiffComments } from '../parsing/diffCommentExtractor.js';
import { getDiffStats, extractDiffFiles } from '../services/diffParserService.js';

const activeMode = ref('repo');
const diffText = ref('');
const comments = ref([]);
const affectedFiles = ref([]);
const diffStats = ref({
  filesChanged: 0,
  additions: 0,
  deletions: 0
});
const isAuditing = ref(false);
const errorMessage = ref('');
const hasAudited = ref(false);
const repoMetrics = ref({
  totalFiles: 0,
  supportedFiles: 0,
  skippedFiles: []
});

const totalCommentsCount = computed(() => comments.value.length);
const hasComments = computed(() => comments.value.length > 0);
const hasErrors = computed(() => Boolean(errorMessage.value));

async function auditDiff(text) {
  const contentToAudit = typeof text === 'string' ? text : diffText.value;
  if (typeof text === 'string') {
    diffText.value = text;
  }

  if (!contentToAudit || !contentToAudit.trim()) {
    errorMessage.value = 'O diff fornecido está vazio. Cole a saída de um comando git diff ou faça upload de um arquivo .diff/.patch.';
    comments.value = [];
    affectedFiles.value = [];
    diffStats.value = { filesChanged: 0, additions: 0, deletions: 0 };
    hasAudited.value = false;
    return [];
  }

  isAuditing.value = true;
  errorMessage.value = '';

  try {
    diffStats.value = getDiffStats(contentToAudit);
    affectedFiles.value = extractDiffFiles(contentToAudit);
    const extracted = await extractDiffComments(contentToAudit);
    comments.value = extracted;
    hasAudited.value = true;
    return extracted;
  } catch (error) {
    errorMessage.value = error?.message || 'Falha ao auditar o diff fornecido.';
    comments.value = [];
    hasAudited.value = false;
    return [];
  } finally {
    isAuditing.value = false;
  }
}

function resetAudit() {
  diffText.value = '';
  comments.value = [];
  affectedFiles.value = [];
  diffStats.value = {
    filesChanged: 0,
    additions: 0,
    deletions: 0
  };
  repoMetrics.value = {
    totalFiles: 0,
    supportedFiles: 0,
    skippedFiles: []
  };
  isAuditing.value = false;
  errorMessage.value = '';
  hasAudited.value = false;
}

function setRepoAuditResults({ comments: newComments = [], metrics = null, affectedFiles: newAffectedFiles = [] } = {}) {
  comments.value = Array.isArray(newComments) ? newComments : [];
  if (metrics && typeof metrics === 'object') {
    repoMetrics.value = {
      totalFiles: Number.isInteger(metrics.totalFiles) ? metrics.totalFiles : 0,
      supportedFiles: Number.isInteger(metrics.supportedFiles) ? metrics.supportedFiles : 0,
      skippedFiles: Array.isArray(metrics.skippedFiles) ? metrics.skippedFiles : []
    };
  }
  if (Array.isArray(newAffectedFiles)) {
    affectedFiles.value = newAffectedFiles;
  }
  hasAudited.value = true;
  isAuditing.value = false;
  errorMessage.value = '';
}

function setMode(mode) {
  if (mode === 'repo' || mode === 'diff') {
    activeMode.value = mode;
  }
}

function setDiffText(text) {
  diffText.value = typeof text === 'string' ? text : '';
}

export function useAuditState() {
  return {
    activeMode,
    diffText,
    comments,
    affectedFiles,
    diffStats,
    repoMetrics,
    isAuditing,
    errorMessage,
    hasAudited,
    totalCommentsCount,
    hasComments,
    hasErrors,
    auditDiff,
    resetAudit,
    setRepoAuditResults,
    setMode,
    setDiffText
  };
}

export default useAuditState;
