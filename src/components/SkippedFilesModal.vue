<script setup>
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import {
  X,
  Search,
  FileX2,
  Filter,
  FolderX
} from 'lucide-vue-next';
import { useAuditState } from '../composables/useAuditState.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  skippedFiles: {
    type: Array,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const auditState = useAuditState();
const searchQuery = ref('');
const activeCategory = ref('all');

const allFiles = computed(() => {
  if (Array.isArray(props.skippedFiles)) {
    return props.skippedFiles;
  }
  return auditState.repoMetrics.value.skippedFiles || [];
});

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'ignored-directory', label: 'Diretórios Ignorados' },
  { id: 'unsupported-language', label: 'Linguagens Não Suportadas' },
  { id: 'binary-file', label: 'Binários & Mídia' },
  { id: 'minified-file', label: 'Minificados & Bundles' },
  { id: 'file-size-exceeded', label: 'Tamanho Excedido' }
];

const categoryCounts = computed(() => {
  const counts = { all: allFiles.value.length };
  for (const file of allFiles.value) {
    const reason = file?.reason || 'other';
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return counts;
});

const availableCategories = computed(() => {
  return CATEGORIES.filter(
    (cat) => cat.id === 'all' || (categoryCounts.value[cat.id] || 0) > 0
  );
});

const filteredFiles = computed(() => {
  let list = allFiles.value;

  if (activeCategory.value !== 'all') {
    list = list.filter((f) => f?.reason === activeCategory.value);
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (query) {
    list = list.filter((f) => {
      const path = (f?.path || '').toLowerCase();
      const reason = (f?.reason || '').toLowerCase();
      return path.includes(query) || reason.includes(query);
    });
  }

  return list;
});

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReasonBadge(reason) {
  switch (reason) {
    case 'ignored-directory':
      return {
        label: 'Diretório Ignorado',
        class: 'bg-slate-800 text-slate-300 border-slate-700'
      };
    case 'unsupported-language':
      return {
        label: 'Linguagem Não Suportada',
        class: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      };
    case 'binary-file':
      return {
        label: 'Binário / Lockfile',
        class: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
      };
    case 'minified-file':
      return {
        label: 'Minificado / Bundle',
        class: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
      };
    case 'file-size-exceeded':
      return {
        label: 'Tamanho > 1MB',
        class: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
      };
    case 'parse-error':
      return {
        label: 'Erro de Parsing',
        class: 'bg-orange-500/10 text-orange-300 border-orange-500/30'
      };
    default:
      return {
        label: reason || 'Descartado',
        class: 'bg-slate-800 text-slate-400 border-slate-700'
      };
  }
}

function closeModal() {
  emit('update:modelValue', false);
  emit('close');
}

function handleKeydown(e) {
  if (e.key === 'Escape' && props.modelValue) {
    closeModal();
  }
}

if (getCurrentInstance()) {
  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
}

defineExpose({
  searchQuery,
  activeCategory,
  allFiles,
  categoryCounts,
  availableCategories,
  filteredFiles,
  formatFileSize,
  getReasonBadge,
  closeModal,
  handleKeydown
});
</script>

<template>
  <div
    v-if="modelValue"
    data-testid="skipped-files-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skipped-modal-title"
      class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center">
            <FileX2 class="w-5 h-5" />
          </span>
          <div>
            <h2 id="skipped-modal-title" class="text-base sm:text-lg font-semibold text-white tracking-tight">
              Arquivos Pulados na Auditoria
            </h2>
            <p class="text-xs text-slate-400">
              Transparência técnica sobre arquivos descartados deterministicamente antes da análise sintática.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-modal-btn"
          aria-label="Fechar modal"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          @click="closeModal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
        <div class="relative">
          <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            data-testid="skipped-search-input"
            placeholder="Filtrar por caminho ou motivo de descarte..."
            class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 font-mono"
          />
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            v-for="cat in availableCategories"
            :key="cat.id"
            type="button"
            data-testid="category-filter-btn"
            class="px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5"
            :class="[
              activeCategory === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 hover:bg-slate-800'
            ]"
            @click="activeCategory = cat.id"
          >
            <span>{{ cat.label }}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-300">
              {{ categoryCounts[cat.id] || 0 }}
            </span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 max-h-[50vh]">
        <div
          v-if="allFiles.length === 0"
          class="py-12 text-center text-slate-500 space-y-2"
        >
          <FolderX class="w-8 h-8 mx-auto text-slate-600" />
          <p class="text-sm">Nenhum arquivo pulado na auditoria.</p>
        </div>

        <div
          v-else-if="filteredFiles.length === 0"
          class="py-12 text-center text-slate-500 space-y-2"
        >
          <Filter class="w-8 h-8 mx-auto text-slate-600" />
          <p class="text-sm">Nenhum arquivo corresponde aos critérios de busca informados.</p>
        </div>

        <div
          v-for="file in filteredFiles"
          :key="file.path"
          data-testid="skipped-file-item"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
        >
          <div class="min-w-0 flex-1">
            <span class="font-mono text-xs text-slate-300 break-all">
              {{ file.path }}
            </span>
          </div>

          <div class="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <span
              class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
              :class="getReasonBadge(file.reason).class"
            >
              {{ getReasonBadge(file.reason).label }}
            </span>

            <span class="text-[11px] font-mono text-slate-500 min-w-14 text-right">
              {{ formatFileSize(file.size) }}
            </span>
          </div>
        </div>
      </div>

      <div class="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
        <span class="text-xs font-mono text-slate-400">
          Exibindo {{ filteredFiles.length }} de {{ allFiles.length }} descartes
        </span>

        <button
          type="button"
          data-testid="footer-close-btn"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
          @click="closeModal"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
