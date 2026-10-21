<script setup>
import { ref, computed } from 'vue';
import { CheckCircle2, FileCode, Search, RotateCcw, Download } from 'lucide-vue-next';
import Navbar from './components/Navbar.vue';
import ModeSelector from './components/ModeSelector.vue';
import DiffInput from './components/DiffInput.vue';
import RepositoryInput from './components/RepositoryInput.vue';
import AuditProgressBar from './components/AuditProgressBar.vue';
import MetricsSummary from './components/MetricsSummary.vue';
import FilterToolbar from './components/FilterToolbar.vue';
import SkippedFilesModal from './components/SkippedFilesModal.vue';
import CommentCard from './components/CommentCard.vue';
import ExportModal from './components/ExportModal.vue';
import { useAuditState } from './composables/useAuditState.js';
import { useGitHubLoader } from './composables/useGitHubLoader.js';
import { useCommentFilter } from './composables/useCommentFilter.js';

const {
  activeMode,
  comments,
  affectedFiles,
  repoMetrics,
  hasAudited,
  totalCommentsCount
} = useAuditState();

const loader = useGitHubLoader();
const commentFilter = useCommentFilter(comments);
const { filteredComments, hasActiveFilters, resetFilters } = commentFilter;

const isSkippedModalOpen = ref(false);
const isExportModalOpen = ref(false);

const isRepoAudited = computed(() => {
  return hasAudited.value && (loader.status.value === 'done' || repoMetrics.value.totalFiles > 0);
});

const isDiffAudited = computed(() => {
  return activeMode.value === 'diff' && hasAudited.value;
});

const showProgressBar = computed(() => {
  return activeMode.value === 'repo' && (loader.isLoading.value || (isRepoAudited.value && loader.status.value === 'done'));
});

const filteredAffectedFilesCount = computed(() => {
  const set = new Set(filteredComments.value.map((c) => c.file));
  return set.size;
});

const exportMetrics = computed(() => {
  if (activeMode.value === 'repo') {
    return {
      totalFiles: repoMetrics.value.totalFiles,
      supportedFiles: repoMetrics.value.supportedFiles,
      skippedFilesCount: repoMetrics.value.skippedFiles?.length || 0
    };
  }
  return {
    affectedFilesCount: affectedFiles.value?.length || 0
  };
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
    <Navbar />

    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-3 sm:py-4 flex flex-col gap-3">
      <h1 class="sr-only">codebase-comment-auditor - Auditoria de Comentários</h1>

      <div class="flex justify-center">
        <ModeSelector v-model="activeMode" />
      </div>

      <section class="w-full">
        <transition
          mode="out-in"
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="activeMode === 'repo'"
            key="repo"
            class="w-full space-y-3.5"
          >
            <RepositoryInput :loader="loader" />

            <div v-if="showProgressBar" class="w-full">
              <AuditProgressBar
                :percent="loader.progress.value.percent"
                :current="loader.progress.value.current"
                :total="loader.progress.value.total"
                :current-file="loader.progress.value.currentFile"
                :phase="loader.progress.value.phase"
              />
            </div>

            <div v-if="isRepoAudited && !loader.isLoading.value" class="space-y-3.5">
              <MetricsSummary @open-skipped="isSkippedModalOpen = true" />

              <div
                v-if="totalCommentsCount === 0"
                class="bg-slate-900 border border-slate-800 rounded-none p-4 text-center space-y-1.5"
              >
                <div class="w-7 h-7 mx-auto rounded-none bg-slate-800 text-slate-300 flex items-center justify-center">
                  <CheckCircle2 class="w-4 h-4" />
                </div>
                <h3 class="text-xs sm:text-sm font-semibold text-white font-mono">Nenhum comentário detectado</h3>
                <p class="text-xs text-slate-400 max-w-md mx-auto font-mono">
                  A base de código analisada não possui comentários ou anotações nas linguagens suportadas.
                </p>
              </div>

              <div v-else class="space-y-3">
                <FilterToolbar :filter="commentFilter" />

                <div
                  v-if="filteredComments.length === 0"
                  class="bg-slate-900 border border-slate-800 rounded-none p-4 text-center space-y-2"
                >
                  <div class="w-7 h-7 mx-auto rounded-none bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Search class="w-4 h-4" />
                  </div>
                  <h3 class="text-xs sm:text-sm font-semibold text-white font-mono">Nenhum comentário corresponde aos filtros</h3>
                  <p class="text-xs text-slate-400 max-w-md mx-auto font-mono">
                    Ajuste a busca, tags, linguagens ou toggles da Allowlist.
                  </p>
                  <div>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-mono font-medium text-slate-900 bg-slate-100 hover:bg-white transition"
                      @click="resetFilters"
                    >
                      <RotateCcw class="w-3 h-3" />
                      Restaurar Filtros
                    </button>
                  </div>
                </div>

                <div v-else class="bg-slate-900 border border-slate-800 rounded-none p-3 space-y-2.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                      <h3 class="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                        <FileCode class="w-3.5 h-3.5 text-slate-400" />
                        Comentários Detectados ({{ filteredComments.length }})
                      </h3>
                      <span class="text-[11px] font-mono text-slate-400">
                        • {{ filteredAffectedFilesCount }} {{ filteredAffectedFilesCount === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
                      </span>
                    </div>

                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-mono font-semibold bg-slate-100 hover:bg-white text-slate-950 transition border border-slate-200"
                      @click="isExportModalOpen = true"
                    >
                      <Download class="w-3 h-3" />
                      Exportar Relatório
                    </button>
                  </div>

                  <div class="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                    <CommentCard
                      v-for="comment in filteredComments"
                      :key="comment.id"
                      :comment="comment"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            key="diff"
            class="w-full space-y-3.5"
          >
            <DiffInput :show-preview="false" />

            <div v-if="isDiffAudited" class="space-y-3.5">
              <MetricsSummary @open-skipped="isSkippedModalOpen = true" />

              <div
                v-if="totalCommentsCount === 0"
                class="bg-slate-900 border border-slate-800 rounded-none p-4 text-center space-y-1.5"
              >
                <div class="w-7 h-7 mx-auto rounded-none bg-slate-800 text-slate-300 flex items-center justify-center">
                  <CheckCircle2 class="w-4 h-4" />
                </div>
                <h3 class="text-xs sm:text-sm font-semibold text-white font-mono">
                  Nenhum comentário adicionado detectado
                </h3>
                <p class="text-xs text-slate-400 max-w-md mx-auto font-mono">
                  As alterações introduzidas no diff estão limpas de novos comentários de desenvolvimento.
                </p>
              </div>

              <div v-else class="space-y-3">
                <FilterToolbar :filter="commentFilter" />

                <div
                  v-if="filteredComments.length === 0"
                  class="bg-slate-900 border border-slate-800 rounded-none p-4 text-center space-y-2"
                >
                  <div class="w-7 h-7 mx-auto rounded-none bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Search class="w-4 h-4" />
                  </div>
                  <h3 class="text-xs sm:text-sm font-semibold text-white font-mono">Nenhum comentário corresponde aos filtros</h3>
                  <p class="text-xs text-slate-400 max-w-md mx-auto font-mono">
                    Ajuste a busca, tags, linguagens ou toggles da Allowlist.
                  </p>
                  <div>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-mono font-medium text-slate-900 bg-slate-100 hover:bg-white transition"
                      @click="resetFilters"
                    >
                      <RotateCcw class="w-3 h-3" />
                      Restaurar Filtros
                    </button>
                  </div>
                </div>

                <div v-else class="bg-slate-900 border border-slate-800 rounded-none p-3 space-y-2.5">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                      <h3 class="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                        <FileCode class="w-3.5 h-3.5 text-slate-400" />
                        Comentários Adicionados ({{ filteredComments.length }})
                      </h3>
                      <span class="text-[11px] font-mono text-slate-400">
                        • {{ filteredAffectedFilesCount }} {{ filteredAffectedFilesCount === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
                      </span>
                    </div>

                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-mono font-semibold bg-slate-100 hover:bg-white text-slate-950 transition border border-slate-200"
                      @click="isExportModalOpen = true"
                    >
                      <Download class="w-3 h-3" />
                      Exportar Relatório
                    </button>
                  </div>

                  <div class="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                    <CommentCard
                      v-for="comment in filteredComments"
                      :key="comment.id"
                      :comment="comment"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </section>

      <SkippedFilesModal v-model="isSkippedModalOpen" />
      <ExportModal
        v-model="isExportModalOpen"
        :comments="filteredComments"
        :metrics="exportMetrics"
        :active-mode="activeMode"
      />
    </main>

    <footer class="border-t border-slate-800 py-2.5 text-center text-[11px] text-slate-500 font-mono">
      <p>codebase-comment-auditor</p>
    </footer>
  </div>
</template>
