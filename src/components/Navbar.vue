<script setup>
import { FileCode2, Github } from 'lucide-vue-next'
</script>

<template>
  <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 bg-slate-800 border border-slate-700 rounded-none text-slate-300 flex items-center justify-center">
          <FileCode2 class="w-4 h-4" />
        </div>
        <span class="font-mono font-semibold text-sm text-slate-100 tracking-tight">
          codebase-comment-auditor
        </span>
      </div>

      <div class="flex items-center gap-3">
        <a
          href="https://github.com/pedrolabre/codebase-comment-auditor"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          title="Ver código no GitHub"
        >
          <Github class="w-3.5 h-3.5" />
          <span>GitHub</span>
        </a>
      </div>
    </div>
  </header>
</template>
