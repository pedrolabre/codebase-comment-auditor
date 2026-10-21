<script setup>
import { computed } from 'vue';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

const props = defineProps({
  context: {
    type: Object,
    default: () => ({ before: [], target: [], after: [] })
  },
  startLine: {
    type: Number,
    default: 1
  },
  language: {
    type: String,
    default: 'javascript'
  }
});

const LANGUAGE_MAP = {
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  python: 'python',
  py: 'python',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  vue: 'xml',
  svelte: 'xml',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  json: 'json',
  jsonc: 'json'
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveLanguage(lang) {
  const normalized = String(lang || '').trim().toLowerCase();
  const mapped = LANGUAGE_MAP[normalized] || normalized;
  if (mapped && hljs.getLanguage(mapped)) {
    return mapped;
  }
  return 'plaintext';
}

function highlightText(text, lang) {
  if (text === null || text === undefined || text === '') {
    return '&nbsp;';
  }
  const targetLang = resolveLanguage(lang);
  try {
    if (targetLang !== 'plaintext' && hljs.getLanguage(targetLang)) {
      return hljs.highlight(text, { language: targetLang, ignoreIllegals: true }).value;
    }
    return escapeHtml(text);
  } catch {
    return escapeHtml(text);
  }
}

const computedLines = computed(() => {
  const before = Array.isArray(props.context?.before) ? props.context.before : [];
  const target = Array.isArray(props.context?.target) ? props.context.target : [];
  const after = Array.isArray(props.context?.after) ? props.context.after : [];

  const start = Number(props.startLine) > 0 ? Number(props.startLine) : 1;
  const beforeStart = Math.max(1, start - before.length);

  const lines = [];

  before.forEach((text, index) => {
    lines.push({
      lineNumber: beforeStart + index,
      text,
      isTarget: false,
      html: highlightText(text, props.language)
    });
  });

  target.forEach((text, index) => {
    lines.push({
      lineNumber: start + index,
      text,
      isTarget: true,
      html: highlightText(text, props.language)
    });
  });

  const afterStart = start + target.length;
  after.forEach((text, index) => {
    lines.push({
      lineNumber: afterStart + index,
      text,
      isTarget: false,
      html: highlightText(text, props.language)
    });
  });

  return lines;
});

defineExpose({
  computedLines,
  highlightText,
  resolveLanguage,
  escapeHtml
});
</script>

<template>
  <div class="code-context-viewer w-full bg-slate-950 border border-slate-800 rounded-none overflow-hidden text-xs font-mono">
    <div
      v-if="computedLines.length === 0"
      class="p-2 text-slate-500 italic text-center"
    >
      Nenhum contexto de código disponível
    </div>

    <div
      v-else
      class="divide-y divide-slate-900 overflow-x-auto"
    >
      <div
        v-for="line in computedLines"
        :key="line.lineNumber"
        class="flex items-stretch transition-colors font-mono leading-normal"
        :class="line.isTarget ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-200' : 'text-slate-300 hover:bg-slate-900/40'"
      >
        <span
          class="w-10 shrink-0 py-0.5 pr-2.5 text-right select-none border-r border-slate-800 text-[10px]"
          :class="line.isTarget ? 'text-amber-400 font-bold bg-amber-500/10' : 'text-slate-600 bg-slate-950'"
        >
          {{ line.lineNumber }}
        </span>

        <span
          class="flex-1 py-0.5 pl-2.5 pr-3 whitespace-pre overflow-x-auto selection:bg-slate-700 selection:text-white"
          v-html="line.html"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-context-viewer :deep(pre),
.code-context-viewer :deep(code) {
  font-family: inherit;
}
</style>
