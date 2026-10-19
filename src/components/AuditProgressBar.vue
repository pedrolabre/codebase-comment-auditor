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
  <div class="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border"
          :class="[
            isComplete
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
              : phase === 'error'
              ? 'bg-red-950 text-red-400 border-red-800/50'
              : 'bg-cyan-950 text-cyan-400 border-cyan-800/50'
          ]"
        >
          <span
            class="w-1.5 h-1.5 rounded-full mr-1.5"
            :class="[
              isComplete
                ? 'bg-emerald-400'
                : phase === 'error'
                ? 'bg-red-400'
                : 'bg-cyan-400 animate-pulse'
            ]"
          ></span>
          {{ phaseLabel }}
        </span>

        <span v-if="total > 0" class="text-xs text-slate-400 font-mono">
          <span class="text-slate-200 font-semibold">{{ current }}</span> / {{ total }} arquivos
        </span>
      </div>

      <div
        class="font-mono text-sm font-bold"
        :class="isComplete ? 'text-emerald-400' : 'text-cyan-400'"
      >
        {{ clampedPercent }}%
      </div>
    </div>

    <div
      class="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50 relative"
      role="progressbar"
      :aria-valuenow="clampedPercent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="phaseLabel"
    >
      <div
        class="h-full rounded-full transition-all duration-200 ease-out relative overflow-hidden"
        :class="[
          isComplete
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : phase === 'error'
            ? 'bg-gradient-to-r from-red-600 to-rose-400'
            : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400'
        ]"
        :style="{ width: `${clampedPercent}%` }"
      >
        <div
          v-if="!isComplete && phase !== 'error'"
          class="absolute inset-0 bg-white/20 animate-pulse"
        ></div>
      </div>
    </div>

    <div class="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/60 min-h-[34px] overflow-hidden">
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
