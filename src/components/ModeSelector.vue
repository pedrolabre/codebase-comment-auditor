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
  <div class="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-none max-w-sm w-full">
    <button
      type="button"
      @click="setMode('repo')"
      class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-none font-mono text-xs transition-colors select-none"
      :class="[
        props.modelValue === 'repo'
          ? 'bg-slate-800 text-white border border-slate-700 shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      ]"
    >
      <FolderGit2 class="w-3.5 h-3.5 flex-shrink-0" />
      <span class="tracking-wide">Repositório</span>
    </button>

    <button
      type="button"
      @click="setMode('diff')"
      class="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-none font-mono text-xs transition-colors select-none"
      :class="[
        props.modelValue === 'diff'
          ? 'bg-slate-800 text-white border border-slate-700 shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
      ]"
    >
      <GitCompare class="w-3.5 h-3.5 flex-shrink-0" />
      <span class="tracking-wide">Diff</span>
    </button>
  </div>
</template>
