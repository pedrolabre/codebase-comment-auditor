<script setup>
import { ref, computed, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileJson
} from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  comments: {
    type: Array,
    default: () => []
  },
  metrics: {
    type: Object,
    default: () => ({})
  },
  activeMode: {
    type: String,
    default: 'repo'
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const isVisible = computed(() => props.modelValue || props.isOpen);
const activeTab = ref('markdown');
const isCopied = ref(false);
let copyTimeout = null;

function closeModal() {
  emit('update:modelValue', false);
  emit('close');
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isVisible.value) {
    closeModal();
  }
}

if (getCurrentInstance()) {
  watch(isVisible, (open) => {
    if (typeof window !== 'undefined') {
      if (open) {
        window.addEventListener('keydown', handleKeydown);
      } else {
        window.removeEventListener('keydown', handleKeydown);
      }
    }
  });

  onMounted(() => {
    if (typeof window !== 'undefined' && isVisible.value) {
      window.addEventListener('keydown', handleKeydown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
    if (copyTimeout) clearTimeout(copyTimeout);
  });
}

const summaryStats = computed(() => {
  const commentsList = Array.isArray(props.comments) ? props.comments : [];
  const tagsCount = {};
  const languageCount = {};
  const uniqueFiles = new Set();

  commentsList.forEach((c) => {
    if (c.file) uniqueFiles.add(c.file);
    if (c.language) {
      languageCount[c.language] = (languageCount[c.language] || 0) + 1;
    }
    if (Array.isArray(c.tags)) {
      c.tags.forEach((t) => {
        tagsCount[t] = (tagsCount[t] || 0) + 1;
      });
    }
  });

  return {
    totalComments: commentsList.length,
    affectedFilesCount: uniqueFiles.size,
    tagsCount,
    languageCount
  };
});

const markdownReport = computed(() => {
  const modeLabel = props.activeMode === 'diff' ? 'Diff Scan (Pré-Commit)' : 'Repository Scan';
  const timestamp = new Date().toISOString();
  const commentsList = Array.isArray(props.comments) ? props.comments : [];
  const stats = summaryStats.value;

  const lines = [
    '# 📋 Relatório de Auditoria de Comentários',
    '',
    `> **Gerado por:** codebase-comment-auditor (Local-First & Zero AI)`,
    `> **Data de Geração:** ${timestamp}`,
    `> **Modo Operacional:** ${modeLabel}`,
    '',
    '## 📊 Resumo Executivo',
    '',
    `- **Total de Comentários Auditados:** ${stats.totalComments}`,
    `- **Arquivos Afetados:** ${stats.affectedFilesCount}`,
    ''
  ];

  const tagKeys = Object.keys(stats.tagsCount);
  if (tagKeys.length > 0) {
    lines.push('### Distribuição por Marcadores / Tags:');
    tagKeys.sort().forEach((tag) => {
      lines.push(`- **${tag}:** ${stats.tagsCount[tag]}`);
    });
    lines.push('');
  }

  const langKeys = Object.keys(stats.languageCount);
  if (langKeys.length > 0) {
    lines.push('### Distribuição por Linguagem:');
    langKeys.sort().forEach((lang) => {
      lines.push(`- **${lang}:** ${stats.languageCount[lang]}`);
    });
    lines.push('');
  }

  lines.push('## 📝 Detalhamento dos Comentários');
  lines.push('');

  if (commentsList.length === 0) {
    lines.push('_Nenhum comentário detectado ou selecionado para exportação._');
  } else {
    commentsList.forEach((c, idx) => {
      const lineRange = c.startLine === c.endLine ? `L${c.startLine}` : `L${c.startLine}-L${c.endLine}`;
      const tagsString = Array.isArray(c.tags) && c.tags.length > 0 ? c.tags.join(', ') : 'Nenhuma';
      const addedMarker = c.isAdded ? ' *(Novo no Diff)*' : '';

      lines.push(`### ${idx + 1}. \`${c.file}\` (${lineRange})${addedMarker}`);
      lines.push(`- **Linguagem:** \`${c.language || 'desconhecida'}\``);
      lines.push(`- **Tipo:** \`${c.type || 'line'}\``);
      lines.push(`- **Tags:** ${tagsString}`);
      if (c.hasUrl && Array.isArray(c.urls) && c.urls.length > 0) {
        lines.push(`- **URLs:** ${c.urls.join(', ')}`);
      }
      lines.push('');
      lines.push('```' + (c.language || 'text'));

      const before = Array.isArray(c.context?.before) ? c.context.before : [];
      const target = Array.isArray(c.context?.target) ? c.context.target : [c.text || c.content || ''];
      const after = Array.isArray(c.context?.after) ? c.context.after : [];

      before.forEach((l) => lines.push(l));
      target.forEach((l) => lines.push(l));
      after.forEach((l) => lines.push(l));

      lines.push('```');
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('*Relatório gerado client-side sem envio de código para servidores externos.*');

  return lines.join('\n');
});

const jsonReport = computed(() => {
  const timestamp = new Date().toISOString();
  const commentsList = Array.isArray(props.comments) ? props.comments : [];
  const stats = summaryStats.value;

  const payload = {
    generator: 'codebase-comment-auditor',
    version: '0.1.0',
    generatedAt: timestamp,
    mode: props.activeMode,
    summary: {
      totalComments: stats.totalComments,
      affectedFilesCount: stats.affectedFilesCount,
      tagsCount: stats.tagsCount,
      languageCount: stats.languageCount,
      metrics: props.metrics || {}
    },
    comments: commentsList.map((c) => ({
      id: c.id,
      file: c.file,
      language: c.language,
      type: c.type,
      category: c.category,
      startLine: c.startLine,
      endLine: c.endLine,
      startColumn: c.startColumn,
      endColumn: c.endColumn,
      text: c.text,
      content: c.content,
      tags: c.tags,
      hasUrl: c.hasUrl,
      urls: c.urls,
      isAdded: c.isAdded,
      context: c.context
    }))
  };

  return JSON.stringify(payload, null, 2);
});

const activeContent = computed(() => {
  return activeTab.value === 'markdown' ? markdownReport.value : jsonReport.value;
});

async function copyReport() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(activeContent.value);
    }
    isCopied.value = true;
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch {
    // Fallback silencioso
  }
}

function downloadReport() {
  const content = activeContent.value;
  const isMd = activeTab.value === 'markdown';
  const mimeType = isMd ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';
  const filename = isMd ? 'comment-audit-report.md' : 'comment-audit-report.json';

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

defineExpose({
  activeTab,
  markdownReport,
  jsonReport,
  activeContent,
  summaryStats,
  copyReport,
  downloadReport,
  closeModal,
  handleKeydown,
  isCopied
});
</script>

<template>
  <transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      @click.self="closeModal"
    >
      <div
        class="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <header class="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/90">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Download class="w-4 h-4" />
            </div>
            <div>
              <h2 id="export-modal-title" class="text-base font-semibold text-white">
                Exportar Relatório de Auditoria
              </h2>
              <p class="text-xs text-slate-400">
                Gere arquivos prontos para Pull Requests ou pipelines de dados ({{ summaryStats.totalComments }} comentários)
              </p>
            </div>
          </div>

          <button
            type="button"
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Fechar modal"
            @click="closeModal"
          >
            <X class="w-5 h-5" />
          </button>
        </header>

        <div class="px-6 pt-4 pb-2 border-b border-slate-800/80 flex items-center justify-between gap-4 flex-wrap bg-slate-950/40">
          <div class="inline-flex rounded-lg bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition"
              :class="activeTab === 'markdown' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'"
              @click="activeTab = 'markdown'"
            >
              <FileText class="w-3.5 h-3.5" />
              Markdown (.md)
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition"
              :class="activeTab === 'json' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'"
              @click="activeTab = 'json'"
            >
              <FileJson class="w-3.5 h-3.5" />
              JSON (.json)
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              :class="isCopied ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'"
              @click="copyReport"
            >
              <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>{{ isCopied ? 'Copiado!' : 'Copiar' }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition shadow"
              @click="downloadReport"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Baixar {{ activeTab === 'markdown' ? '.md' : '.json' }}</span>
            </button>
          </div>
        </div>

        <div class="flex-1 p-6 overflow-hidden flex flex-col min-h-0 bg-slate-950/60">
          <div class="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-y-auto p-4 text-xs font-mono text-slate-300 leading-relaxed selection:bg-cyan-900 selection:text-white">
            <pre class="whitespace-pre-wrap font-mono">{{ activeContent }}</pre>
          </div>
        </div>

        <footer class="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400">
          <span>Formato: {{ activeTab === 'markdown' ? 'GitHub Flavored Markdown' : 'JSON Estruturado 2-spaces' }}</span>
          <button
            type="button"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            @click="closeModal"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>
