<script setup>
import { FileCode2, ShieldCheck, Github } from 'lucide-vue-next'
</script>

<template>
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-500 flex items-center justify-center">
          <FileCode2 class="w-5 h-5" />
        </div>
        <div class="flex items-center gap-2.5">
          <span class="font-mono font-semibold text-lg text-slate-100 tracking-tight">
            codebase-comment-auditor
          </span>
          <span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck class="w-3.5 h-3.5" />
            Local-First & Zero AI
          </span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <span class="sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck class="w-3 h-3" />
          Zero AI
        </span>
        <a
          href="https://github.com/pedrolabre/codebase-comment-auditor"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
          title="Ver código no GitHub"
        >
          <Github class="w-4 h-4" />
          <span class="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </div>
  </header>
</template>
