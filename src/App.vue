<script setup>
import { ref, computed } from 'vue';
import { CheckCircle2, FileCode, Tag } from 'lucide-vue-next';
import Navbar from './components/Navbar.vue';
import ModeSelector from './components/ModeSelector.vue';
import DiffInput from './components/DiffInput.vue';
import RepositoryInput from './components/RepositoryInput.vue';
import AuditProgressBar from './components/AuditProgressBar.vue';
import MetricsSummary from './components/MetricsSummary.vue';
import SkippedFilesModal from './components/SkippedFilesModal.vue';
import { useAuditState } from './composables/useAuditState.js';
import { useGitHubLoader } from './composables/useGitHubLoader.js';

const {
  activeMode,
  comments,
  affectedFiles,
  repoMetrics,
  hasAudited,
  totalCommentsCount
} = useAuditState();

const loader = useGitHubLoader();
const isSkippedModalOpen = ref(false);

const isRepoAudited = computed(() => {
  return hasAudited.value && (loader.status.value === 'done' || repoMetrics.value.totalFiles > 0);
});

const showProgressBar = computed(() => {
  return activeMode.value === 'repo' && (loader.isLoading.value || (isRepoAudited.value && loader.status.value === 'done'));
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

                <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                      <FileCode class="w-4 h-4 text-emerald-400" />
                      Preview dos Comentários Detectados ({{ totalCommentsCount }})
                    </h3>
                    <span class="text-xs font-mono text-slate-400">
                      {{ affectedFiles.length }} {{ affectedFiles.length === 1 ? 'arquivo com comentários' : 'arquivos com comentários' }}
                    </span>
                  </div>

                  <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
                    <div
                      v-for="comment in comments"
                      :key="comment.id"
                      class="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono space-y-2 hover:border-slate-700 transition"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                        <span class="text-emerald-400 font-semibold">{{ comment.file }}:{{ comment.startLine }}</span>
                        <div class="flex items-center gap-1.5">
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300">
                            {{ comment.language }}
                          </span>
                          <span
                            v-for="tag in comment.tags"
                            :key="tag"
                            class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                          >
                            <Tag class="w-2.5 h-2.5" />
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                      <p class="text-slate-200 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 whitespace-pre-wrap break-words">
                        {{ comment.text }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <div
            v-else
            key="diff"
            class="w-full"
          >
            <DiffInput />
          </div>
        </transition>
      </section>

      <SkippedFilesModal v-model="isSkippedModalOpen" />
    </main>

    <footer class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
      <p>codebase-comment-auditor • Análise sintática 100% determinística via Concrete Syntax Tree WebAssembly no navegador</p>
    </footer>
  </div>
</template>
