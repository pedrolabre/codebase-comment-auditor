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

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Auditoria Sintática de Comentários
        </h1>
        <p class="text-slate-400 text-sm sm:text-base leading-relaxed">
          Identifique anotações esquecidas, desabafos, TODOs e resquícios de IA diretamente na Concrete Syntax Tree (Tree-sitter WASM), sem enviar nenhum byte para a nuvem.
        </p>
      </div>

      <div class="flex justify-center">
        <ModeSelector v-model="activeMode" />
      </div>

      <section class="w-full">
        <transition
          mode="out-in"
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="activeMode === 'repo'"
            key="repo"
            class="w-full space-y-6"
          >
            <RepositoryInput :loader="loader" />

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-2"
            >
              <div v-if="showProgressBar" class="w-full">
                <AuditProgressBar
                  :percent="loader.progress.value.percent"
                  :current="loader.progress.value.current"
                  :total="loader.progress.value.total"
                  :current-file="loader.progress.value.currentFile"
                  :phase="loader.progress.value.phase"
                />
              </div>
            </transition>

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-2"
            >
              <div v-if="isRepoAudited && !loader.isLoading.value" class="space-y-6">
                <MetricsSummary @open-skipped="isSkippedModalOpen = true" />

                <div
                  v-if="totalCommentsCount === 0"
                  class="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-center space-y-3"
                >
                  <div class="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 class="w-6 h-6" />
                  </div>
                  <h3 class="text-base sm:text-lg font-semibold text-white">Nenhum comentário detectado</h3>
                  <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    A base de código analisada não possui comentários ou anotações nas linguagens suportadas.
                  </p>
                </div>

                <div v-else class="space-y-6">
                  <FilterToolbar :filter="commentFilter" />

                  <div
                    v-if="filteredComments.length === 0"
                    class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-3"
                  >
                    <div class="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Search class="w-6 h-6" />
                    </div>
                    <h3 class="text-base sm:text-lg font-semibold text-white">Nenhum comentário corresponde aos filtros</h3>
                    <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                      Tente ajustar o termo de busca, remover filtros de tag/linguagem ou desativar regras da Allowlist.
                    </p>
                    <div class="pt-2">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                        @click="resetFilters"
                      >
                        <RotateCcw class="w-3.5 h-3.5" />
                        Restaurar Filtros
                      </button>
                    </div>
                  </div>

                  <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                      <div class="flex items-center gap-3">
                        <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                          <FileCode class="w-4 h-4 text-emerald-400" />
                          Comentários Detectados ({{ filteredComments.length }})
                        </h3>
                        <span class="text-xs font-mono text-slate-400">
                          {{ filteredAffectedFilesCount }} {{ filteredAffectedFilesCount === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
                        </span>
                      </div>

                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow"
                        @click="isExportModalOpen = true"
                      >
                        <Download class="w-3.5 h-3.5" />
                        Exportar Relatório
                      </button>
                    </div>

                    <div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      <CommentCard
                        v-for="comment in filteredComments"
                        :key="comment.id"
                        :comment="comment"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <div
            v-else
            key="diff"
            class="w-full space-y-6"
          >
            <DiffInput :show-preview="false" />

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-2"
            >
              <div v-if="isDiffAudited" class="space-y-6">
                <MetricsSummary @open-skipped="isSkippedModalOpen = true" />

                <div
                  v-if="totalCommentsCount === 0"
                  class="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-center space-y-3"
                >
                  <div class="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 class="w-6 h-6" />
                  </div>
                  <h3 class="text-base sm:text-lg font-semibold text-white">
                    Nenhum comentário adicionado detectado
                  </h3>
                  <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    As alterações introduzidas no diff estão limpas de novos comentários de desenvolvimento ou anotações nas linguagens suportadas.
                  </p>
                </div>

                <div v-else class="space-y-6">
                  <FilterToolbar :filter="commentFilter" />

                  <div
                    v-if="filteredComments.length === 0"
                    class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-3"
                  >
                    <div class="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Search class="w-6 h-6" />
                    </div>
                    <h3 class="text-base sm:text-lg font-semibold text-white">Nenhum comentário corresponde aos filtros</h3>
                    <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                      Tente ajustar o termo de busca, remover filtros de tag/linguagem ou desativar regras da Allowlist.
                    </p>
                    <div class="pt-2">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                        @click="resetFilters"
                      >
                        <RotateCcw class="w-3.5 h-3.5" />
                        Restaurar Filtros
                      </button>
                    </div>
                  </div>

                  <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                      <div class="flex items-center gap-3">
                        <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                          <FileCode class="w-4 h-4 text-cyan-400" />
                          Comentários Adicionados ({{ filteredComments.length }})
                        </h3>
                        <span class="text-xs font-mono text-slate-400">
                          {{ filteredAffectedFilesCount }} {{ filteredAffectedFilesCount === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
                        </span>
                      </div>

                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow"
                        @click="isExportModalOpen = true"
                      >
                        <Download class="w-3.5 h-3.5" />
                        Exportar Relatório
                      </button>
                    </div>

                    <div class="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      <CommentCard
                        v-for="comment in filteredComments"
                        :key="comment.id"
                        :comment="comment"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </transition>
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

    <footer class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
      <p>codebase-comment-auditor • Análise sintática 100% determinística via Concrete Syntax Tree WebAssembly no navegador</p>
    </footer>
  </div>
</template>
