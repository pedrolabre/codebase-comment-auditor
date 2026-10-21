<script setup>
import { computed } from 'vue';
import {
  MessageSquareCode,
  FileCheck2,
  FileX2,
  AlertTriangle,
  ExternalLink
} from 'lucide-vue-next';
import { useAuditState } from '../composables/useAuditState.js';

const props = defineProps({
  mode: {
    type: String,
    default: null
  },
  comments: {
    type: Array,
    default: null
  },
  repoMetrics: {
    type: Object,
    default: null
  },
  diffStats: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['open-skipped']);

const auditState = useAuditState();

const currentMode = computed(() => props.mode || auditState.activeMode.value);
const activeComments = computed(() => props.comments || auditState.comments.value || []);
const activeRepoMetrics = computed(
  () =>
    props.repoMetrics ||
    auditState.repoMetrics.value || { totalFiles: 0, supportedFiles: 0, skippedFiles: [] }
);
const activeDiffStats = computed(
  () =>
    props.diffStats ||
    auditState.diffStats.value || { filesChanged: 0, additions: 0, deletions: 0 }
);

const totalComments = computed(() => activeComments.value.length);

const auditedFiles = computed(() => {
  if (currentMode.value === 'repo') {
    return activeRepoMetrics.value.supportedFiles || 0;
  }
  return (
    activeDiffStats.value.filesChanged ||
    (activeComments.value.length > 0
      ? new Set(activeComments.value.map((c) => c.file)).size
      : 0)
  );
});

const auditedFilesSubtitle = computed(() => {
  if (currentMode.value === 'repo') {
    return `de ${activeRepoMetrics.value.totalFiles || 0} arquivos totais`;
  }
  return `+${activeDiffStats.value.additions || 0} / -${activeDiffStats.value.deletions || 0} linhas`;
});

const skippedFilesCount = computed(
  () => activeRepoMetrics.value.skippedFiles?.length || 0
);
const isSkippedClickable = computed(() => skippedFilesCount.value > 0);

const todoCount = computed(
  () =>
    activeComments.value.filter(
      (c) => Array.isArray(c.tags) && c.tags.includes('TODO')
    ).length
);

const fixmeCount = computed(
  () =>
    activeComments.value.filter(
      (c) =>
        Array.isArray(c.tags) &&
        (c.tags.includes('FIXME') || c.tags.includes('BUG'))
    ).length
);

const criticalTagsCount = computed(() => {
  const critical = ['TODO', 'FIXME', 'BUG', 'HACK', 'XXX'];
  return activeComments.value.filter(
    (c) => Array.isArray(c.tags) && c.tags.some((t) => critical.includes(t))
  ).length;
});

const criticalSubtitle = computed(() => {
  if (criticalTagsCount.value === 0) {
    return 'Nenhum alerta crítico';
  }
  return `${todoCount.value} TODOs • ${fixmeCount.value} FIXMEs`;
});

function handleSkippedClick() {
  if (isSkippedClickable.value) {
    emit('open-skipped');
  }
}

defineExpose({
  currentMode,
  activeComments,
  activeRepoMetrics,
  activeDiffStats,
  totalComments,
  auditedFiles,
  auditedFilesSubtitle,
  skippedFilesCount,
  isSkippedClickable,
  todoCount,
  fixmeCount,
  criticalTagsCount,
  criticalSubtitle,
  handleSkippedClick
});
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
    <div
      data-testid="metric-comments"
      class="bg-slate-900 border border-slate-800 rounded-none p-3 flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Comentários
        </span>
        <span class="w-6 h-6 rounded-none bg-slate-800 text-slate-400 flex items-center justify-center">
          <MessageSquareCode class="w-3.5 h-3.5" />
        </span>
      </div>

      <div class="my-1.5">
        <span
          class="text-xl sm:text-2xl font-bold font-mono"
          :class="totalComments > 0 ? 'text-amber-400' : 'text-slate-300'"
        >
          {{ totalComments }}
        </span>
      </div>

      <div class="text-[10px] text-slate-500 font-mono">
        {{ currentMode === 'repo' ? 'detectados na árvore CST' : 'adicionados no diff' }}
      </div>
    </div>

    <div
      data-testid="metric-audited"
      class="bg-slate-900 border border-slate-800 rounded-none p-3 flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Arquivos Auditados
        </span>
        <span class="w-6 h-6 rounded-none bg-slate-800 text-slate-400 flex items-center justify-center">
          <FileCheck2 class="w-3.5 h-3.5" />
        </span>
      </div>

      <div class="my-1.5">
        <span class="text-xl sm:text-2xl font-bold font-mono text-slate-200">
          {{ auditedFiles }}
        </span>
      </div>

      <div class="text-[10px] text-slate-500 font-mono truncate">
        {{ auditedFilesSubtitle }}
      </div>
    </div>

    <div
      data-testid="metric-skipped"
      class="bg-slate-900 border border-slate-800 rounded-none p-3 flex flex-col justify-between transition-colors"
      :class="[
        isSkippedClickable
          ? 'group cursor-pointer hover:border-slate-700 hover:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-slate-700'
          : 'opacity-90'
      ]"
      :role="isSkippedClickable ? 'button' : undefined"
      :tabindex="isSkippedClickable ? 0 : undefined"
      :aria-label="isSkippedClickable ? 'Inspecionar arquivos pulados' : undefined"
      @click="handleSkippedClick"
      @keydown.enter.prevent="handleSkippedClick"
      @keydown.space.prevent="handleSkippedClick"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Arquivos Pulados
        </span>
        <span class="w-6 h-6 rounded-none bg-slate-800 text-slate-400 flex items-center justify-center group-hover:text-slate-200 transition-colors">
          <FileX2 class="w-3.5 h-3.5" />
        </span>
      </div>

      <div class="my-1.5 flex items-baseline justify-between">
        <span
          class="text-xl sm:text-2xl font-bold font-mono"
          :class="skippedFilesCount > 0 ? 'text-slate-200' : 'text-slate-500'"
        >
          {{ skippedFilesCount }}
        </span>
        <span
          v-if="isSkippedClickable"
          class="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 group-hover:text-slate-200 transition"
        >
          Ver lista
          <ExternalLink class="w-2.5 h-2.5" />
        </span>
      </div>

      <div class="text-[10px] text-slate-500 font-mono">
        {{ skippedFilesCount > 0 ? 'descartados por regras' : 'nenhum descartado' }}
      </div>
    </div>

    <div
      data-testid="metric-critical"
      class="bg-slate-900 border border-slate-800 rounded-none p-3 flex flex-col justify-between"
    >
      <div class="flex items-center justify-between gap-1.5">
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Tags Críticas
        </span>
        <span
          class="w-6 h-6 rounded-none flex items-center justify-center"
          :class="criticalTagsCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-500'"
        >
          <AlertTriangle class="w-3.5 h-3.5" />
        </span>
      </div>

      <div class="my-1.5">
        <span
          class="text-xl sm:text-2xl font-bold font-mono"
          :class="criticalTagsCount > 0 ? 'text-rose-400' : 'text-slate-500'"
        >
          {{ criticalTagsCount }}
        </span>
      </div>

      <div class="text-[10px] text-slate-500 font-mono truncate">
        {{ criticalSubtitle }}
      </div>
    </div>
  </div>
</template>
