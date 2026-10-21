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

function handleClear() {
  diffText.value = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  resetAudit();
}

async function handleAudit() {
  if (!canAudit.value) return;
  await auditDiff(diffText.value);
}

defineExpose({
  diffText,
  lineCount,
  charCount,
  canAudit,
  isDragging,
  handleClear,
  handleAudit,
  handleDrop,
  readFileContent
});
</script>

<template>
  <div class="w-full space-y-4">
    <div class="bg-slate-900 border border-slate-800 rounded-none p-3.5 sm:p-4 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-none bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
            <GitCompare class="w-3.5 h-3.5" />
          </span>
          <h2 class="text-xs sm:text-sm font-semibold text-white tracking-tight font-mono">
            Inspeção de Diff
          </h2>
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
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            @click="triggerFileInput"
          >
            <Upload class="w-3 h-3 text-slate-400" />
            Upload patch
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-medium text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!diffText && !hasAudited"
            @click="handleClear"
          >
            <Trash2 class="w-3 h-3" />
            Limpar
          </button>
        </div>
      </div>

      <div
        class="relative rounded-none border border-slate-800 bg-slate-950/70 transition-colors"
        :class="[
          isDragging
            ? 'border-slate-500 bg-slate-900'
            : 'focus-within:border-slate-600'
        ]"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <textarea
          v-model="diffText"
          rows="8"
          class="w-full bg-transparent p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none resize-y leading-relaxed"
          :placeholder="placeholderText"
          spellcheck="false"
        ></textarea>

        <div class="flex items-center justify-between px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/60 text-[11px] font-mono text-slate-500">
          <div class="flex items-center gap-2.5">
            <span>{{ lineCount }} {{ lineCount === 1 ? 'linha' : 'linhas' }}</span>
            <span>•</span>
            <span>{{ charCount }} {{ charCount === 1 ? 'caractere' : 'caracteres' }}</span>
          </div>
          <span v-if="isDragging" class="text-slate-200 font-mono flex items-center gap-1">
            <FileText class="w-3 h-3" /> Solte o arquivo aqui
          </span>
          <span v-else class="hidden sm:inline text-slate-600 font-mono">
            Cole com Ctrl+V ou arraste arquivo .diff/.patch
          </span>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="flex items-start gap-2 p-2.5 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono"
      >
        <AlertCircle class="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <div class="flex items-center justify-end pt-1">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-none text-xs font-semibold font-mono uppercase tracking-wider text-slate-950 bg-slate-100 hover:bg-white border border-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!canAudit"
          @click="handleAudit"
        >
          <Loader2 v-if="isAuditing" class="w-3.5 h-3.5 animate-spin text-slate-950" />
          <Play v-else class="w-3.5 h-3.5 fill-slate-950" />
          <span>{{ isAuditing ? 'Auditando Diff...' : 'Auditar Diff' }}</span>
        </button>
      </div>
    </div>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="hasAudited && showPreview" class="space-y-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="bg-slate-900 border border-slate-800 rounded-none p-2.5 flex flex-col gap-0.5 font-mono">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Arquivos</span>
            <span class="text-xl font-bold text-white">{{ diffStats.filesChanged }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-none p-2.5 flex flex-col gap-0.5 font-mono">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Linhas (+)</span>
            <span class="text-xl font-bold text-slate-200">+{{ diffStats.additions }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-none p-2.5 flex flex-col gap-0.5 font-mono">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Linhas (-)</span>
            <span class="text-xl font-bold text-rose-400">-{{ diffStats.deletions }}</span>
          </div>
          <div class="bg-slate-900 border border-slate-800 rounded-none p-2.5 flex flex-col gap-0.5 font-mono">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Comentários</span>
            <span
              class="text-xl font-bold"
              :class="totalCommentsCount > 0 ? 'text-amber-400' : 'text-slate-300'"
            >
              {{ totalCommentsCount }}
            </span>
          </div>
        </div>

        <div
          v-if="totalCommentsCount === 0"
          class="bg-slate-900 border border-slate-800 rounded-none p-4 text-center space-y-2"
        >
          <div class="w-8 h-8 mx-auto rounded-none bg-slate-800 text-slate-300 flex items-center justify-center">
            <CheckCircle2 class="w-4 h-4" />
          </div>
          <h3 class="text-xs sm:text-sm font-semibold text-white font-mono">
            Nenhum comentário adicionado detectado
          </h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto font-mono">
            As alterações introduzidas no diff estão limpas de novos comentários nas linguagens suportadas.
          </p>
        </div>

        <div v-else class="bg-slate-900 border border-slate-800 rounded-none p-3.5 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
              <FileCode class="w-3.5 h-3.5 text-slate-400" />
              Preview dos Comentários Adicionados ({{ totalCommentsCount }})
            </h3>
            <span class="text-xs font-mono text-slate-400">
              {{ affectedFiles.length }} {{ affectedFiles.length === 1 ? 'arquivo afetado' : 'arquivos afetados' }}
            </span>
          </div>

          <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="bg-slate-950 border border-slate-800 rounded-none p-2.5 text-xs font-mono space-y-1.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-1 text-slate-400">
                <span class="text-slate-200 font-semibold">{{ comment.file }}:{{ comment.startLine }}</span>
                <div class="flex items-center gap-1">
                  <span class="px-1.5 py-0.2 rounded-none text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {{ comment.language }}
                  </span>
                  <span
                    v-for="tag in comment.tags"
                    :key="tag"
                    class="px-1.5 py-0.2 rounded-none text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                  >
                    <Tag class="w-2.5 h-2.5" />
                    {{ tag }}
                  </span>
                </div>
              </div>
              <p class="text-slate-200 bg-slate-900 p-2 rounded-none border border-slate-800 whitespace-pre-wrap break-words">
                {{ comment.text }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
