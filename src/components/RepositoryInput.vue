<script setup>
import { ref, computed } from 'vue';
import {
  FolderGit2, Upload, FileArchive, X, Clipboard, Key, Eye, EyeOff,
  ChevronDown, ChevronUp, Play, Loader2, AlertCircle, ShieldCheck, Trash2, Check
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
  <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FolderGit2 class="w-4 h-4" />
          </span>
          <h2 class="text-lg font-semibold text-white tracking-tight">Varredura de Repositório (Repository Scan)</h2>
        </div>
        <p class="text-xs sm:text-sm text-slate-400">
          Audite uma base inteira a partir de repositório do GitHub ou arquivo <code class="text-emerald-400 font-mono">.zip</code> diretamente no navegador.
        </p>
      </div>

      <button
        v-if="hasValidInput || displayedError"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 transition self-start sm:self-auto"
        :disabled="isLoading"
        @click="handleClear"
      >
        <Trash2 class="w-3.5 h-3.5" />
        Limpar
      </button>
    </div>

    <div class="space-y-2">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Repositório do GitHub</label>
      <div class="relative flex items-center">
        <input
          v-model="repoUrlInput"
          type="text"
          placeholder="Ex: owner/repo ou https://github.com/owner/repo"
          class="w-full bg-slate-950/70 border rounded-xl py-2.5 pl-3.5 pr-24 text-xs sm:text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none transition selection:bg-emerald-500/30"
          :class="[
            isInvalidUrl ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40' :
            parsedRepo ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40' :
            'border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40'
          ]"
          :disabled="isLoading"
          @keydown.enter.prevent="handleAudit"
        />
        <div class="absolute right-2 flex items-center gap-1">
          <span v-if="parsedRepo" class="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
            <Check class="w-3 h-3" />
            {{ parsedRepo.owner }}/{{ parsedRepo.repo }}
          </span>
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Colar da área de transferência"
            :disabled="isLoading"
            @click="handlePaste"
          >
            <Clipboard class="w-4 h-4" />
          </button>
        </div>
      </div>
      <p v-if="isInvalidUrl" class="text-xs text-rose-400 font-mono">Formato inválido. Utilize 'owner/repo' ou URL completa do GitHub.</p>
    </div>

    <div class="relative flex items-center justify-center"><div class="border-t border-slate-800 w-full"></div><span class="bg-slate-900 px-3 text-xs text-slate-500 uppercase font-mono tracking-wider">ou</span><div class="border-t border-slate-800 w-full"></div></div>

    <div class="space-y-2">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Arquivo compactado (.zip)</label>
      <input ref="fileInputRef" type="file" accept=".zip,application/zip,application/x-zip-compressed" class="hidden" @change="handleFileChange" />

      <div
        v-if="!selectedFile"
        class="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
        :class="[isDragging ? 'border-emerald-400 bg-emerald-950/20 ring-2 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60']"
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-slate-700/80 text-emerald-400 flex items-center justify-center transition">
          <Upload class="w-5 h-5" />
        </div>
        <div class="space-y-0.5">
          <p class="text-xs sm:text-sm font-medium text-slate-300">
            Arraste e solte um arquivo <code class="text-emerald-400 font-mono">.zip</code> aqui ou clique para selecionar
          </p>
          <p class="text-[11px] text-slate-500">Descompactação e análise 100% no navegador via JSZip</p>
        </div>
      </div>

      <div v-else class="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-xs font-mono">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <FileArchive class="w-4 h-4 text-emerald-400 shrink-0" />
          <span class="text-slate-200 truncate font-semibold">{{ selectedFile.name }}</span>
          <span class="text-slate-500 shrink-0">({{ formatFileSize(selectedFile.size) }})</span>
        </div>
        <button
          type="button"
          class="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          title="Remover arquivo"
          :disabled="isLoading"
          @click="selectedFile = null; localError = ''"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="border border-slate-800/80 rounded-xl bg-slate-950/40 overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
        @click="showPatField = !showPatField"
      >
        <div class="flex items-center gap-2">
          <Key class="w-3.5 h-3.5 text-emerald-400" />
          <span>GitHub Personal Access Token (PAT opcional para rate-limit)</span>
        </div>
        <component :is="showPatField ? ChevronUp : ChevronDown" class="w-4 h-4" />
      </button>

      <div v-if="showPatField" class="px-4 pb-4 pt-1 space-y-2.5 border-t border-slate-800/60">
        <div class="relative flex items-center">
          <input
            v-model="patToken"
            :type="showPatValue ? 'text' : 'password'"
            placeholder="ghp_... ou github_pat_..."
            class="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60"
            :disabled="isLoading"
          />
          <button
            type="button"
            class="absolute right-2.5 text-slate-500 hover:text-slate-300 transition"
            :title="showPatValue ? 'Ocultar token' : 'Exibir token'"
            @click="showPatValue = !showPatValue"
          >
            <component :is="showPatValue ? EyeOff : Eye" class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <p>O token é mantido estritamente na memória da sessão para contornar o rate-limit da API (5.000 reqs/h). Nunca é persistido.</p>
        </div>
      </div>
    </div>

    <div v-if="displayedError" class="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
      <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <span>{{ displayedError }}</span>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:ring-2 focus:ring-emerald-400/50 transition shadow-lg shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-400"
        :disabled="!canAudit"
        @click="handleAudit"
      >
        <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin text-slate-950" />
        <Play v-else class="w-4 h-4 fill-slate-950" />
        <span>{{ isLoading ? 'Processando Repositório...' : 'Auditar Repositório' }}</span>
      </button>
    </div>
  </div>
</template>