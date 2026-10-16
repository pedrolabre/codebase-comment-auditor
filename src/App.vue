<script setup>
import { ref } from 'vue'
import { FolderGit2, GitCompare, Sparkles, Terminal } from 'lucide-vue-next'
import Navbar from './components/Navbar.vue'
import ModeSelector from './components/ModeSelector.vue'

const activeMode = ref('repo')
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
    <Navbar />

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      <div class="text-center max-w-2xl mx-auto space-y-3">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Auditoria Sintática de Comentários
        </h1>
        <p class="text-slate-400 text-sm sm:text-base leading-relaxed">
          Identifique anotações esquecidas, desabafos, TODOs e resquícios de IA diretamente na Concrete Syntax Tree (Tree-sitter WASM), sem enviar nenhum byte para a nuvem.
        </p>
      </div>

      <div class="flex justify-center">
        <ModeSelector v-model="activeMode" />
      </div>

      <section class="w-full">
        <transition mode="out-in" enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-1">
          <div
            v-if="activeMode === 'repo'"
            key="repo"
            class="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl"
          >
            <div class="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FolderGit2 class="w-6 h-6" />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-white">Repository Scan</h2>
              <p class="text-sm text-slate-400 max-w-md mx-auto">
                Audite a base de código inteira a partir de repositórios públicos do GitHub ou arquivos compactados em .zip.
              </p>
            </div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono text-slate-400 bg-slate-800/80 border border-slate-700">
              <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
              Ingestão e parsing de repositório em preparação
            </div>
          </div>

          <div
            v-else
            key="diff"
            class="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl"
          >
            <div class="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <GitCompare class="w-6 h-6" />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-white">Diff Scan</h2>
              <p class="text-sm text-slate-400 max-w-md mx-auto">
                Cole a saída de <code class="text-cyan-400 font-mono">git diff</code> e inspecione apenas os comentários adicionados antes de efetuar o commit.
              </p>
            </div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono text-slate-400 bg-slate-800/80 border border-slate-700">
              <Terminal class="w-3.5 h-3.5 text-cyan-400" />
              Parser de git diff unificado em preparação
            </div>
          </div>
        </transition>
      </section>
    </main>

    <footer class="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
      <p>codebase-comment-auditor • Análise sintática 100% determinística via Concrete Syntax Tree WebAssembly no navegador</p>
    </footer>
  </div>
</template>
