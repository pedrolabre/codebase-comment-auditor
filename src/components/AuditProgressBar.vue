<script setup>
import { computed } from 'vue';

const props = defineProps({
  percent: {
    type: Number,
    default: 0
  },
  current: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  currentFile: {
    type: String,
    default: ''
  },
  phase: {
    type: String,
    default: 'analyzing'
  }
});

const clampedPercent = computed(() => {
  const value = Number(props.percent);
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return Math.round(value);
});

const phaseLabel = computed(() => {
  switch (props.phase) {
    case 'downloading':
      return 'Baixando repositório';
    case 'extracting':
      return 'Descompactando arquivos';
    case 'analyzing':
      return 'Analisando comentários';
    case 'done':
      return 'Auditoria concluída';
    case 'error':
      return 'Falha no processamento';
    default:
      return 'Processando...';
  }
});

const isComplete = computed(() => props.phase === 'done' || clampedPercent.value === 100);
</script>

<template>
  <div class="w-full bg-slate-900 border border-slate-800 rounded-none p-2.5 space-y-2">
    <div class="flex items-center justify-between text-xs font-mono">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-mono border"
          :class="[
            isComplete
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : phase === 'error'
              ? 'bg-rose-950 text-rose-300 border-rose-800'
              : 'bg-slate-800 text-sky-300 border-slate-700'
          ]"
        >
          <span
            class="w-1.5 h-1.5 mr-1"
            :class="[
              isComplete
                ? 'bg-slate-300'
                : phase === 'error'
                ? 'bg-rose-400'
                : 'bg-sky-400 animate-pulse'
            ]"
          ></span>
          {{ phaseLabel }}
        </span>

        <span v-if="total > 0" class="text-[11px] text-slate-400 font-mono">
          <span class="text-slate-200 font-semibold">{{ current }}</span> / {{ total }} arquivos
        </span>
      </div>

      <div
        class="font-mono text-xs font-bold"
        :class="isComplete ? 'text-slate-200' : 'text-sky-400'"
      >
        {{ clampedPercent }}%
      </div>
    </div>

    <div
      class="w-full h-1.5 bg-slate-950 rounded-none overflow-hidden border border-slate-800 relative"
      role="progressbar"
      :aria-valuenow="clampedPercent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="phaseLabel"
    >
      <div
        class="h-full rounded-none transition-all duration-150 ease-out"
        :class="[
          isComplete
            ? 'bg-slate-300'
            : phase === 'error'
            ? 'bg-rose-500'
            : 'bg-sky-500'
        ]"
        :style="{ width: `${clampedPercent}%` }"
      ></div>
    </div>

    <div class="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded-none border border-slate-800 overflow-hidden">
      <span class="text-slate-500 select-none flex-shrink-0">▶</span>
      <span
        class="truncate font-mono"
        :class="currentFile ? 'text-slate-300' : 'text-slate-500 italic'"
        :title="currentFile || 'Aguardando processamento...'"
      >
        {{ currentFile || 'Aguardando processamento...' }}
      </span>
    </div>
  </div>
</template>
