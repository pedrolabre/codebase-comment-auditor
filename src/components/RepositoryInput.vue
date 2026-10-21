<script setup>
import { ref, computed } from 'vue';
import {
  FolderGit2, Upload, FileArchive, X, Clipboard, Key, Eye, EyeOff,
  ChevronDown, ChevronUp, Play, Loader2, AlertCircle, Shield, Trash2, Check
} from 'lucide-vue-next';
import { parseGitHubUrl } from '../services/githubService.js';
import { isZipFile } from '../services/zipService.js';
import { useGitHubLoader } from '../composables/useGitHubLoader.js';

const props = defineProps({ loader: { type: Object, default: null } });
const emit = defineEmits(['audit-start', 'audit-complete', 'audit-error', 'reset']);

const defaultLoader = useGitHubLoader();
const activeLoader = computed(() => props.loader || defaultLoader);
const repoUrlInput = ref('');
const selectedFile = ref(null);
const patToken = ref('');
const showPatField = ref(false);
const showPatValue = ref(false);
const isDragging = ref(false);
const fileInputRef = ref(null);
const localError = ref('');

const isLoading = computed(() => Boolean(activeLoader.value.isLoading?.value));
const parsedRepo = computed(() => {
  const raw = repoUrlInput.value.trim();
  if (!raw) return null;
  try { return parseGitHubUrl(raw); } catch { return null; }
});
const isInvalidUrl = computed(() => Boolean(repoUrlInput.value.trim() && !parsedRepo.value));
const hasValidInput = computed(() => Boolean(parsedRepo.value || selectedFile.value));
const canAudit = computed(() => hasValidInput.value && !isLoading.value);
const displayedError = computed(() => localError.value || activeLoader.value.error?.value || '');

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handlePaste() {
  try {
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text && typeof text === 'string') {
        repoUrlInput.value = text.trim();
        selectedFile.value = null;
        localError.value = '';
      }
    }
  } catch {
    localError.value = 'Permissão para leitura da área de transferência negada.';
  }
}

function triggerFileInput() { if (fileInputRef.value) fileInputRef.value.click(); }
function handleFileChange(event) {
  const file = event.target?.files?.[0];
  if (file) {
    if (isZipFile(file)) {
      selectedFile.value = file;
      repoUrlInput.value = '';
      localError.value = '';
    } else {
      localError.value = 'Por favor, selecione um arquivo no formato .zip válido.';
    }
    event.target.value = '';
  }
}

function handleDrop(event) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    if (isZipFile(file)) {
      selectedFile.value = file;
      repoUrlInput.value = '';
      localError.value = '';
    } else {
      localError.value = 'O arquivo solto não possui formato .zip válido.';
    }
    return;
  }
  const text = event.dataTransfer?.getData('text');
  if (text) {
    repoUrlInput.value = text.trim();
    selectedFile.value = null;
    localError.value = '';
  }
}

function handleClear() {
  repoUrlInput.value = '';
  selectedFile.value = null;
  patToken.value = '';
  localError.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
  activeLoader.value.resetLoader();
  emit('reset');
}

async function handleAudit() {
  if (!canAudit.value) return;
  localError.value = '';
  const target = selectedFile.value || repoUrlInput.value.trim();
  const type = selectedFile.value ? 'zip' : 'github';
  emit('audit-start', { type, target });

  try {
    let result;
    if (selectedFile.value) {
      result = await activeLoader.value.loadFromZip(selectedFile.value);
    } else {
      result = await activeLoader.value.loadFromGitHub(repoUrlInput.value.trim(), {
        token: patToken.value.trim() || undefined
      });
    }
    emit('audit-complete', result);
  } catch (err) {
    const msg = err?.message || 'Falha ao auditar repositório.';
    localError.value = msg;
    emit('audit-error', err);
  }
}

defineExpose({ repoUrlInput, selectedFile, patToken, canAudit, handleAudit, handleClear, loader: activeLoader });
</script>

<template>
  <div class="w-full bg-slate-900 border border-slate-800 rounded-none p-3.5 sm:p-4 space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-none bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
          <FolderGit2 class="w-3.5 h-3.5" />
        </span>
        <h2 class="text-xs sm:text-sm font-semibold text-white tracking-tight font-mono">
          Varredura de Repositório
        </h2>
      </div>

      <button
        v-if="hasValidInput || displayedError"
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition self-start sm:self-auto"
        :disabled="isLoading"
        @click="handleClear"
      >
        <Trash2 class="w-3 h-3" />
        Limpar
      </button>
    </div>

    <div class="space-y-1.5">
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
        Repositório do GitHub
      </label>
      <div class="relative flex items-center">
        <input
          v-model="repoUrlInput"
          type="text"
          placeholder="Ex: owner/repo ou https://github.com/owner/repo"
          class="w-full bg-slate-950 border border-slate-800 rounded-none py-1.5 pl-3 pr-24 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition"
          :class="[
            isInvalidUrl ? 'border-rose-500/60 focus:border-rose-500' :
            parsedRepo ? 'border-slate-700 focus:border-slate-500' :
            'border-slate-800 focus:border-slate-600'
          ]"
          :disabled="isLoading"
          @keydown.enter.prevent="handleAudit"
        />
        <div class="absolute right-1.5 flex items-center gap-1">
          <span v-if="parsedRepo" class="text-[10px] font-mono px-1.5 py-0.5 rounded-none bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
            <Check class="w-2.5 h-2.5" />
            {{ parsedRepo.owner }}/{{ parsedRepo.repo }}
          </span>
          <button
            type="button"
            class="p-1 rounded-none text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Colar da área de transferência"
            :disabled="isLoading"
            @click="handlePaste"
          >
            <Clipboard class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p v-if="isInvalidUrl" class="text-xs text-rose-400 font-mono">Formato inválido. Utilize 'owner/repo' ou URL completa do GitHub.</p>
    </div>

    <div class="relative flex items-center justify-center py-0.5">
      <div class="border-t border-slate-800 w-full"></div>
      <span class="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase font-mono tracking-wider">ou</span>
      <div class="border-t border-slate-800 w-full"></div>
    </div>

    <div class="space-y-1.5">
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
        Arquivo compactado (.zip)
      </label>
      <input ref="fileInputRef" type="file" accept=".zip,application/zip,application/x-zip-compressed" class="hidden" @change="handleFileChange" />

      <div
        v-if="!selectedFile"
        class="border border-dashed border-slate-800 rounded-none p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 bg-slate-950/40 hover:bg-slate-950/70 hover:border-slate-700"
        :class="[isDragging ? 'border-slate-500 bg-slate-900' : '']"
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="w-7 h-7 rounded-none bg-slate-800 text-slate-300 flex items-center justify-center">
          <Upload class="w-4 h-4" />
        </div>
        <p class="text-xs font-mono text-slate-300">
          Arraste e solte um arquivo <code class="text-slate-200">.zip</code> ou clique para selecionar
        </p>
      </div>

      <div v-else class="flex items-center justify-between p-2.5 rounded-none bg-slate-950 border border-slate-800 text-xs font-mono">
        <div class="flex items-center gap-2 overflow-hidden">
          <FileArchive class="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span class="text-slate-200 truncate font-semibold">{{ selectedFile.name }}</span>
          <span class="text-slate-500 shrink-0">({{ formatFileSize(selectedFile.size) }})</span>
        </div>
        <button
          type="button"
          class="p-1 rounded-none text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          title="Remover arquivo"
          :disabled="isLoading"
          @click="selectedFile = null; localError = ''"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div class="border border-slate-800 rounded-none bg-slate-950/40 overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 text-xs font-mono font-medium text-slate-400 hover:text-slate-200 transition"
        @click="showPatField = !showPatField"
      >
        <div class="flex items-center gap-2">
          <Key class="w-3.5 h-3.5 text-slate-400" />
          <span>GitHub Personal Access Token (PAT opcional)</span>
        </div>
        <component :is="showPatField ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
      </button>

      <div v-if="showPatField" class="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800">
        <div class="relative flex items-center">
          <input
            v-model="patToken"
            :type="showPatValue ? 'text' : 'password'"
            placeholder="ghp_... ou github_pat_..."
            class="w-full bg-slate-900 border border-slate-800 rounded-none py-1.5 pl-2.5 pr-8 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
            :disabled="isLoading"
          />
          <button
            type="button"
            class="absolute right-2 text-slate-500 hover:text-slate-300 transition"
            :title="showPatValue ? 'Ocultar token' : 'Exibir token'"
            @click="showPatValue = !showPatValue"
          >
            <component :is="showPatValue ? EyeOff : Eye" class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex items-start gap-1.5 text-[11px] font-mono text-slate-500">
          <Shield class="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <p>O token é mantido estritamente na memória da sessão para contornar o rate-limit da API (5.000 reqs/h). Nunca é persistido.</p>
        </div>
      </div>
    </div>

    <div v-if="displayedError" class="flex items-start gap-2 p-2.5 rounded-none bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
      <AlertCircle class="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
      <span>{{ displayedError }}</span>
    </div>

    <div class="flex items-center justify-end pt-1">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-none text-xs font-semibold font-mono uppercase tracking-wider text-slate-950 bg-slate-100 hover:bg-white border border-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAudit"
        @click="handleAudit"
      >
        <Loader2 v-if="isLoading" class="w-3.5 h-3.5 animate-spin text-slate-950" />
        <Play v-else class="w-3.5 h-3.5 fill-slate-950" />
        <span>{{ isLoading ? 'Processando Repositório...' : 'Auditar Repositório' }}</span>
      </button>
    </div>
  </div>
</template>
