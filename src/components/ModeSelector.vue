<script setup>
import { FolderGit2, GitCompare } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (value) => ['repo', 'diff'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

function setMode(mode) {
  emit('update:modelValue', mode)
}
</script>

<template>
  <div class="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full">
    <button
      type="button"
      @click="setMode('repo')"
      class="flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all select-none"
      :class="[
        props.modelValue === 'repo'
          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      ]"
    >
      <FolderGit2 class="w-4 h-4 flex-shrink-0" />
      <span class="tracking-wide">Repository Scan</span>
    </button>

    <button
      type="button"
      @click="setMode('diff')"
      class="flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all select-none"
      :class="[
        props.modelValue === 'diff'
          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      ]"
    >
      <GitCompare class="w-4 h-4 flex-shrink-0" />
      <span class="tracking-wide">Diff Scan</span>
    </button>
  </div>
</template>
