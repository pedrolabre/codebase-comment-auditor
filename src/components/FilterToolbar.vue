<script setup>
import { computed } from 'vue';
import {
  Search,
  X,
  RotateCcw,
  ShieldCheck,
  Code2,
  Tag as TagIcon,
  Link,
  Check,
  SlidersHorizontal
} from 'lucide-vue-next';
import { useCommentFilter } from '../composables/useCommentFilter.js';

const props = defineProps({
  filter: {
    type: Object,
    default: null
  }
});

const activeFilter = props.filter || useCommentFilter();

const searchQuery = activeFilter.searchQuery;
const selectedLanguages = activeFilter.selectedLanguages;
const selectedTags = activeFilter.selectedTags;
const hideCopyright = activeFilter.hideCopyright;
const hideLinters = activeFilter.hideLinters;
const hideDocstrings = activeFilter.hideDocstrings;
const hideToolGenerated = activeFilter.hideToolGenerated;

const totalCount = activeFilter.totalCount;
const filteredCount = activeFilter.filteredCount;
const availableLanguages = activeFilter.availableLanguages;
const languageCounts = activeFilter.languageCounts;
const availableTags = activeFilter.availableTags;
const tagCounts = activeFilter.tagCounts;
const hasActiveFilters = activeFilter.hasActiveFilters;

const filterCountLabel = computed(() => {
  const total = totalCount.value;
  const filtered = filteredCount.value;
  const itemWord = total === 1 ? 'comentário' : 'comentários';

  if (!hasActiveFilters.value) {
    return `${total} ${itemWord} detectados`;
  }
  return `Exibindo ${filtered} de ${total} ${itemWord}`;
});

function handleSearchClear() {
  searchQuery.value = '';
}

function handleResetAll() {
  activeFilter.resetFilters();
}

function isLanguageActive(lang) {
  return selectedLanguages.value.some((l) => l.toLowerCase() === lang.toLowerCase());
}

function isTagActive(tag) {
  return selectedTags.value.some((t) => t.toUpperCase() === tag.toUpperCase());
}

defineExpose({
  activeFilter,
  searchQuery,
  selectedLanguages,
  selectedTags,
  hideCopyright,
  hideLinters,
  hideDocstrings,
  hideToolGenerated,
  totalCount,
  filteredCount,
  availableLanguages,
  availableTags,
  hasActiveFilters,
  handleSearchClear,
  handleResetAll,
  isLanguageActive,
  isTagActive
});
</script>

<template>
  <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
      <div class="relative flex-1 max-w-xl">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search class="w-4 h-4" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          data-testid="filter-search-input"
          placeholder="Buscar por texto, arquivo, tag, linguagem ou linha..."
          class="w-full pl-10 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition font-mono"
        />
        <button
          v-if="searchQuery"
          type="button"
          data-testid="filter-search-clear"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
          aria-label="Limpar termo de busca"
          @click="handleSearchClear"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center justify-between md:justify-end gap-3 text-xs">
        <span
          data-testid="filter-count-badge"
          class="font-mono px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs transition-colors"
          :class="[
            hasActiveFilters
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              : 'bg-slate-950/60 text-slate-400 border-slate-800'
          ]"
        >
          {{ filterCountLabel }}
        </span>

        <button
          v-if="hasActiveFilters"
          type="button"
          data-testid="filter-reset-btn"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-rose-300 bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/80 hover:border-rose-500/30 transition shadow-sm"
          @click="handleResetAll"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Limpar Filtros</span>
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
        <span class="inline-flex items-center gap-1.5 font-semibold text-slate-400 shrink-0">
          <ShieldCheck class="w-3.5 h-3.5 text-cyan-400" />
          Allowlist:
        </span>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="toggle-hide-copyright"
            :aria-pressed="hideCopyright"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition"
            :class="[
              hideCopyright
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideCopyright')"
          >
            <Check v-if="hideCopyright" class="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Ocultar Copyright</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-linters"
            :aria-pressed="hideLinters"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition"
            :class="[
              hideLinters
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideLinters')"
          >
            <Check v-if="hideLinters" class="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Ocultar Linters</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-docstrings"
            :aria-pressed="hideDocstrings"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition"
            :class="[
              hideDocstrings
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideDocstrings')"
          >
            <Check v-if="hideDocstrings" class="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Ocultar Docstrings</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-tool-generated"
            :aria-pressed="hideToolGenerated"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition"
            :class="[
              hideToolGenerated
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideToolGenerated')"
          >
            <Check v-if="hideToolGenerated" class="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Ocultar Gerados</span>
          </button>
        </div>
      </div>

      <div
        v-if="availableLanguages.length > 0"
        class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs pt-1 border-t border-slate-800/50"
      >
        <span class="inline-flex items-center gap-1.5 font-semibold text-slate-400 shrink-0">
          <Code2 class="w-3.5 h-3.5 text-emerald-400" />
          Linguagens:
        </span>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="lang in availableLanguages"
            :key="lang"
            type="button"
            :data-testid="`chip-lang-${lang}`"
            :aria-pressed="isLanguageActive(lang)"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition"
            :class="[
              isLanguageActive(lang)
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-sm shadow-emerald-500/10 font-bold'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleLanguage(lang)"
          >
            <span>{{ lang }}</span>
            <span
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="isLanguageActive(lang) ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'"
            >
              {{ languageCounts[lang] }}
            </span>
          </button>
        </div>
      </div>

      <div
        v-if="availableTags.length > 0"
        class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs pt-1 border-t border-slate-800/50"
      >
        <span class="inline-flex items-center gap-1.5 font-semibold text-slate-400 shrink-0">
          <TagIcon class="w-3.5 h-3.5 text-amber-400" />
          Tags & Links:
        </span>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="tag in availableTags"
            :key="tag"
            type="button"
            :data-testid="`chip-tag-${tag}`"
            :aria-pressed="isTagActive(tag)"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition"
            :class="[
              isTagActive(tag)
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-sm shadow-amber-500/10 font-bold'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            ]"
            @click="activeFilter.toggleTag(tag)"
          >
            <Link v-if="tag === 'URL'" class="w-3 h-3 text-amber-400 shrink-0" />
            <TagIcon v-else class="w-3 h-3 text-amber-400 shrink-0" />
            <span>{{ tag }}</span>
            <span
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="isTagActive(tag) ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-400'"
            >
              {{ tagCounts[tag] }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
