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
  Check
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
    return `${total} ${itemWord}`;
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
  <div class="bg-slate-900 border border-slate-800 rounded-none p-3 space-y-2.5">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-800 pb-2.5">
      <div class="relative flex-1 max-w-lg">
        <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
          <Search class="w-3.5 h-3.5" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          data-testid="filter-search-input"
          placeholder="Buscar texto, arquivo, tag, linguagem ou linha..."
          class="w-full pl-8 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition font-mono"
        />
        <button
          v-if="searchQuery"
          type="button"
          data-testid="filter-search-clear"
          class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition"
          aria-label="Limpar termo de busca"
          @click="handleSearchClear"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex items-center justify-between md:justify-end gap-2 text-xs">
        <span
          data-testid="filter-count-badge"
          class="font-mono px-2.5 py-1 rounded-none border text-[11px] transition-colors"
          :class="[
            hasActiveFilters
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : 'bg-slate-950 text-slate-400 border-slate-800'
          ]"
        >
          {{ filterCountLabel }}
        </span>

        <button
          v-if="hasActiveFilters"
          type="button"
          data-testid="filter-reset-btn"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-mono font-medium text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition"
          @click="handleResetAll"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
        <span class="inline-flex items-center gap-1 font-mono font-semibold text-slate-400 shrink-0 text-[11px]">
          <ShieldCheck class="w-3 h-3 text-slate-400" />
          Allowlist:
        </span>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid="toggle-hide-copyright"
            :aria-pressed="hideCopyright"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              hideCopyright
                ? 'bg-slate-800 text-slate-100 border-slate-600 font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideCopyright')"
          >
            <Check v-if="hideCopyright" class="w-2.5 h-2.5 text-slate-300 shrink-0" />
            <span>Ocultar Copyright</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-linters"
            :aria-pressed="hideLinters"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              hideLinters
                ? 'bg-slate-800 text-slate-100 border-slate-600 font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideLinters')"
          >
            <Check v-if="hideLinters" class="w-2.5 h-2.5 text-slate-300 shrink-0" />
            <span>Ocultar Linters</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-docstrings"
            :aria-pressed="hideDocstrings"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              hideDocstrings
                ? 'bg-slate-800 text-slate-100 border-slate-600 font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideDocstrings')"
          >
            <Check v-if="hideDocstrings" class="w-2.5 h-2.5 text-slate-300 shrink-0" />
            <span>Ocultar Docstrings</span>
          </button>

          <button
            type="button"
            data-testid="toggle-hide-tool-generated"
            :aria-pressed="hideToolGenerated"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              hideToolGenerated
                ? 'bg-slate-800 text-slate-100 border-slate-600 font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleAllowlistRule('hideToolGenerated')"
          >
            <Check v-if="hideToolGenerated" class="w-2.5 h-2.5 text-slate-300 shrink-0" />
            <span>Ocultar Gerados</span>
          </button>
        </div>
      </div>

      <div
        v-if="availableLanguages.length > 0"
        class="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs pt-1 border-t border-slate-800"
      >
        <span class="inline-flex items-center gap-1 font-mono font-semibold text-slate-400 shrink-0 text-[11px]">
          <Code2 class="w-3 h-3 text-slate-400" />
          Linguagens:
        </span>

        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="lang in availableLanguages"
            :key="lang"
            type="button"
            :data-testid="`chip-lang-${lang}`"
            :aria-pressed="isLanguageActive(lang)"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              isLanguageActive(lang)
                ? 'bg-slate-800 text-slate-100 border-slate-600 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleLanguage(lang)"
          >
            <span>{{ lang }}</span>
            <span
              class="px-1 py-0.2 rounded-none text-[9px]"
              :class="isLanguageActive(lang) ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500'"
            >
              {{ languageCounts[lang] }}
            </span>
          </button>
        </div>
      </div>

      <div
        v-if="availableTags.length > 0"
        class="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs pt-1 border-t border-slate-800"
      >
        <span class="inline-flex items-center gap-1 font-mono font-semibold text-slate-400 shrink-0 text-[11px]">
          <TagIcon class="w-3 h-3 text-amber-400" />
          Tags & Links:
        </span>

        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="tag in availableTags"
            :key="tag"
            type="button"
            :data-testid="`chip-tag-${tag}`"
            :aria-pressed="isTagActive(tag)"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono border transition"
            :class="[
              isTagActive(tag)
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
            ]"
            @click="activeFilter.toggleTag(tag)"
          >
            <Link v-if="tag === 'URL'" class="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <TagIcon v-else class="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span>{{ tag }}</span>
            <span
              class="px-1 py-0.2 rounded-none text-[9px]"
              :class="isTagActive(tag) ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-500'"
            >
              {{ tagCounts[tag] }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
