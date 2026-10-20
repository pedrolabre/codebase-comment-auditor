<script setup>
import { ref, computed } from 'vue';
import {
  Upload,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitCompare,
  FileText,
  FileCode,
  Tag
} from 'lucide-vue-next';
import { useAuditState } from '../composables/useAuditState.js';

const props = defineProps({
  showPreview: {
    type: Boolean,
    default: true
  }
});

const {
  diffText,
  comments,
  affectedFiles,
  diffStats,
  isAuditing,
  errorMessage,
  hasAudited,
  totalCommentsCount,
  auditDiff,
  resetAudit
} = useAuditState();

const fileInputRef = ref(null);
const isDragging = ref(false);

const placeholderText = `Cole aqui a saída de um comando git diff, por exemplo:
  git diff
  git diff --staged
  git diff HEAD~1
  git show <commit_hash>

Ou arraste e solte um arquivo .diff ou .patch nesta área.`;

const lineCount = computed(() => {
  if (!diffText.value) return 0;
  return diffText.value.split('\n').length;
});

const charCount = computed(() => {
  return diffText.value ? diffText.value.length : 0;
});

const canAudit = computed(() => {
  return Boolean(diffText.value && diffText.value.trim() && !isAuditing.value);
});

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function readFileContent(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      diffText.value = content;
    }
  };
  reader.readAsText(file);
}

function handleFileChange(event) {
  const target = event.target;
  const file = target?.files?.[0];
  if (file) {
    readFileContent(file);
    target.value = '';
  }
}

function handleDragOver() {
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    readFileContent(file);
    return;
  }
  const text = event.dataTransfer?.getData('text');
  if (text) {
    diffText.value = text;
  }
}

async function handleAudit() {
  if (!canAudit.value) return;
  await auditDiff();
}

function handleClear() {
  resetAudit();
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}
</script>

<template>
  <div class="w-full space-y-6">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <GitCompare class="w-4 h-4" />
            </span>
            <h2 class="text-lg font-semibold text-white tracking-tight">
              Inspeção Pré-Commit (Diff Scan)
            </h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-400">
            Cole a saída unificada do seu terminal ou carregue um arquivo <code class="text-cyan-400 font-mono">.diff</code> / <code class="text-cyan-400 font-mono">.patch</code> para filtrar apenas comentários novos.
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <input
            ref="fileInputRef"
            type="file"
            accept=".diff,.patch,.txt"
            class="hidden"
            @change="handleFileChange"
          />
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            @click="triggerFileInput"
          >
            <Upload class="w-3.5 h-3.5 text-cyan-400" />
            Upload .diff/.patch
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!diffText && !hasAudited"
            @click="handleClear"
          >
            <Trash2 class="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>

      <div
        class="relative rounded-xl border transition-all duration-150"
        :class="[
          isDragging
            ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-cyan-950/20'
            : 'border-slate-800 bg-slate-950/60 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/50'
        ]"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <textarea
          v-model="diffText"
          rows="12"
          class="w-full bg-transparent p-4 text-xs sm:text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none resize-y selection:bg-cyan-500/30 leading-relaxed"
          :placeholder="placeholderText"
          spellcheck="false"
        ></textarea>

        <div class="flex items-center justify-between px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 text-[11px] font-mono text-slate-500">
          <div class="flex items-center gap-3">
            <span>{{ lineCount }} {{ lineCount === 1 ? 'linha' : 'linhas' }}</span>
            <span>•</span>
            <span>{{ charCount }} {{ charCount === 1 ? 'caractere' : 'caracteres' }}</span>
          </div>
          <span v-if="isDragging" class="text-cyan-400 font-sans font-medium flex items-center gap-1">
            <FileText class="w-3 h-3" /> Solte o arquivo aqui
          </span>
          <span v-else class="hidden sm:inline text-slate-600">
            Arraste um patch ou cole com Ctrl+V
          </span>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm"
      >
        <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-400/50 transition shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-400"
          :disabled="!canAudit"
          @click="handleAudit"
        >
          <Loader2 v-if="isAuditing" class="w-4 h-4 animate-spin text-slate-950" />
          <Play v-else class="w-4 h-4 fill-slate-950" />
          <span>{{ isAuditing ? 'Auditando Diff...' : 'Auditar Diff' }}</span>
        </button>
      </div>
    </div>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="hasAudited && showPreview" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Arquivos</span>
            <span class="text-2xl font-bold font-mono text-white">{{ diffStats.filesChanged }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Linhas (+)</span>
            <span class="text-2xl font-bold font-mono text-emerald-400">+{{ diffStats.additions }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Linhas (-)</span>
            <span class="text-2xl font-bold font-mono text-rose-400">-{{ diffStats.deletions }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Comentários</span>
            <span
              class="text-2xl font-bold font-mono"
              :class="totalCommentsCount > 0 ? 'text-amber-400' : 'text-emerald-400'"
            >
              {{ totalCommentsCount }}
            </span>
          </div>
        </div>

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

        <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-sm font-semibold text-white flex items-center gap-2">
              <FileCode class="w-4 h-4 text-cyan-400" />
              Preview dos Comentários Adicionados ({{ totalCommentsCount }})
            </h3>
            <span class="text-xs font-mono text-slate-400">
              {{ affectedFiles.length }} {{ affectedFiles.length === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
            </span>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono space-y-2 hover:border-slate-700 transition"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                <span class="text-cyan-400 font-semibold">{{ comment.file }}:{{ comment.startLine }}</span>
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
</template>
