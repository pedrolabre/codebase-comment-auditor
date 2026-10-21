<script setup>
import { ref } from 'vue';
import {
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  PlusCircle
} from 'lucide-vue-next';
import CodeContextViewer from './CodeContextViewer.vue';

const props = defineProps({
  comment: {
    type: Object,
    required: true
  },
  initialOpen: {
    type: Boolean,
    default: true
  }
});

const isContextOpen = ref(props.initialOpen ?? true);
const isCopied = ref(false);
const isPathCopied = ref(false);

let copyTimeout = null;
let pathCopyTimeout = null;

async function copyToClipboard(text, isPath = false) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    if (isPath) {
      isPathCopied.value = true;
      if (pathCopyTimeout) clearTimeout(pathCopyTimeout);
      pathCopyTimeout = setTimeout(() => {
        isPathCopied.value = false;
      }, 2000);
    } else {
      isCopied.value = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    }
  } catch {
    // Fallback silencioso sem interromper fluxo
  }
}

function copyContent() {
  const text = props.comment.content || props.comment.text || '';
  return copyToClipboard(text, false);
}

function copyPath() {
  const path = `${props.comment.file}:${props.comment.startLine}`;
  return copyToClipboard(path, true);
}

function toggleContext() {
  isContextOpen.value = !isContextOpen.value;
}

function getTagBadgeClass(tag) {
  const normalized = String(tag || '').toUpperCase();
  switch (normalized) {
    case 'TODO':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'FIXME':
    case 'BUG':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'HACK':
    case 'XXX':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'NOTE':
    case 'TEMP':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

defineExpose({
  isContextOpen,
  isCopied,
  isPathCopied,
  toggleContext,
  copyContent,
  copyPath,
  getTagBadgeClass
});
</script>

<template>
  <article
    class="comment-card bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-none p-3 transition-colors space-y-2"
    :data-comment-id="comment.id"
  >
    <header class="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800 text-xs">
      <div class="flex items-center gap-1.5 flex-wrap min-w-0">
        <button
          type="button"
          class="inline-flex items-center gap-1 font-mono text-slate-300 hover:text-white transition group text-left"
          title="Copiar caminho e linha"
          @click="copyPath"
        >
          <FileCode class="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-slate-200" />
          <span class="font-semibold truncate max-w-xs sm:max-w-md">{{ comment.file }}</span>
          <span class="text-slate-500">:</span>
          <span class="font-bold text-slate-200">
            {{ comment.startLine === comment.endLine ? comment.startLine : `${comment.startLine}-${comment.endLine}` }}
          </span>
          <span
            v-if="isPathCopied"
            class="text-[10px] text-sky-400 font-mono ml-1"
          >
            Copiado!
          </span>
        </button>

        <span
          v-if="comment.isAdded"
          class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30"
          title="Comentário introduzido no diff"
        >
          <PlusCircle class="w-2.5 h-2.5" />
          Novo no Diff
        </span>
      </div>

      <div class="flex items-center gap-1 flex-wrap">
        <span
          v-if="comment.language"
          class="px-1.5 py-0.2 rounded-none text-[10px] font-mono uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700"
        >
          {{ comment.language }}
        </span>

        <span
          v-for="tag in comment.tags"
          :key="tag"
          class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none text-[10px] font-mono font-bold border"
          :class="getTagBadgeClass(tag)"
        >
          <Tag class="w-2.5 h-2.5" />
          {{ tag }}
        </span>

        <span
          v-if="comment.hasUrl"
          class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-none text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30"
          title="Possui link externo"
        >
          <ExternalLink class="w-2.5 h-2.5" />
          URL
        </span>
      </div>
    </header>

    <div class="space-y-1.5">
      <div class="flex items-start justify-between gap-2.5 bg-slate-950 border border-slate-800 p-2 rounded-none">
        <p class="font-mono text-xs text-slate-200 whitespace-pre-wrap break-words flex-1 leading-relaxed">
          {{ comment.content || comment.text }}
        </p>

        <button
          type="button"
          class="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-medium transition"
          :class="isCopied ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'"
          title="Copiar conteúdo do comentário"
          @click="copyContent"
        >
          <Check v-if="isCopied" class="w-2.5 h-2.5 text-sky-400" />
          <Copy v-else class="w-2.5 h-2.5 text-slate-400" />
          <span>{{ isCopied ? 'Copiado!' : 'Copiar' }}</span>
        </button>
      </div>

      <div class="pt-0.5">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition select-none"
          @click="toggleContext"
        >
          <ChevronUp v-if="isContextOpen" class="w-3 h-3 text-slate-400" />
          <ChevronDown v-else class="w-3 h-3 text-slate-500" />
          <span>{{ isContextOpen ? 'Ocultar contexto' : 'Exibir contexto de código' }}</span>
        </button>
      </div>

      <div v-show="isContextOpen" class="pt-0.5">
        <CodeContextViewer
          :context="comment.context"
          :start-line="comment.startLine"
          :language="comment.language"
        />
      </div>
    </div>
  </article>
</template>
