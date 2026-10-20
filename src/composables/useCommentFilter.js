import { ref, computed, isRef } from 'vue';
import { useAuditState } from './useAuditState.js';

export function isCopyrightComment(comment) {
  if (!comment) return false;
  const text = `${comment.text || ''} ${comment.content || ''}`;
  return /(?:copyright|\(c\)|©|all\s+rights\s+reserved|licensed?\s+under|spdx-license-identifier|(?:mit|apache|bsd|gpl|mpl|mozilla)\s+license|\blicense\b)/i.test(text);
}

export function isLinterComment(comment) {
  if (!comment) return false;
  const text = `${comment.text || ''} ${comment.content || ''}`;
  return /(?:eslint-(?:disable|enable|env)|@ts-(?:ignore|expect-error|nocheck|check)|prettier-ignore|\bnoqa\b|stylelint-(?:disable|enable)|\bjshint\b|\btslint:disable|\bbiome-ignore|\bistanbul\s+ignore|\bc8\s+ignore)/i.test(text);
}

export function isDocstringComment(comment) {
  if (!comment) return false;
  if (comment.type === 'docstring' || comment.category === 'documentation') {
    return true;
  }
  const trimmed = (comment.text || '').trim();
  return (
    trimmed.startsWith('/**') ||
    trimmed.startsWith('"""') ||
    trimmed.startsWith("'''") ||
    /^[rRuUbB]{1,2}("""|''')/.test(trimmed)
  );
}

export function isToolGeneratedComment(comment) {
  if (!comment) return false;
  const text = `${comment.text || ''} ${comment.content || ''}`;
  return /(?:@generated\b|do\s+not\s+edit\b|auto-?generated\b|generated\s+by\b|code\s+generated\s+by\b)/i.test(text);
}

export function matchesFilters(comment, options = {}) {
  if (!comment) return false;

  const {
    searchQuery = '',
    selectedLanguages = [],
    selectedTags = [],
    onlyWithUrls = false,
    hideCopyright = false,
    hideLinters = false,
    hideDocstrings = false,
    hideToolGenerated = false
  } = options;

  if (hideCopyright && isCopyrightComment(comment)) {
    return false;
  }
  if (hideLinters && isLinterComment(comment)) {
    return false;
  }
  if (hideDocstrings && isDocstringComment(comment)) {
    return false;
  }
  if (hideToolGenerated && isToolGeneratedComment(comment)) {
    return false;
  }

  if (Array.isArray(selectedLanguages) && selectedLanguages.length > 0) {
    const lang = (comment.language || '').toLowerCase();
    const matchesLang = selectedLanguages.some((l) => l.toLowerCase() === lang);
    if (!matchesLang) {
      return false;
    }
  }

  if (onlyWithUrls && !comment.hasUrl) {
    return false;
  }

  if (Array.isArray(selectedTags) && selectedTags.length > 0) {
    const hasTagMatch = selectedTags.some((tag) => {
      if (tag === 'URL' || tag === 'URLs' || tag === 'hasUrl') {
        return Boolean(comment.hasUrl);
      }
      return Array.isArray(comment.tags) && comment.tags.map((t) => t.toUpperCase()).includes(tag.toUpperCase());
    });
    if (!hasTagMatch) {
      return false;
    }
  }

  if (typeof searchQuery === 'string' && searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    const inContent = (comment.content || '').toLowerCase().includes(query);
    const inText = (comment.text || '').toLowerCase().includes(query);
    const inFile = (comment.file || '').toLowerCase().includes(query);
    const inLanguage = (comment.language || '').toLowerCase().includes(query);
    const inTags = Array.isArray(comment.tags) && comment.tags.some((t) => t.toLowerCase().includes(query));
    const inLine = String(comment.startLine || '').includes(query);

    if (!inContent && !inText && !inFile && !inLanguage && !inTags && !inLine) {
      return false;
    }
  }

  return true;
}

export function useCommentFilter(sourceComments = null) {
  const auditState = useAuditState();

  const baseComments = computed(() => {
    if (sourceComments !== null && sourceComments !== undefined) {
      return isRef(sourceComments) ? sourceComments.value : sourceComments;
    }
    return auditState.comments.value || [];
  });

  const searchQuery = ref('');
  const selectedLanguages = ref([]);
  const selectedTags = ref([]);
  const onlyWithUrls = ref(false);
  const hideCopyright = ref(false);
  const hideLinters = ref(false);
  const hideDocstrings = ref(false);
  const hideToolGenerated = ref(false);

  const filteredComments = computed(() => {
    const options = {
      searchQuery: searchQuery.value,
      selectedLanguages: selectedLanguages.value,
      selectedTags: selectedTags.value,
      onlyWithUrls: onlyWithUrls.value,
      hideCopyright: hideCopyright.value,
      hideLinters: hideLinters.value,
      hideDocstrings: hideDocstrings.value,
      hideToolGenerated: hideToolGenerated.value
    };

    const list = Array.isArray(baseComments.value) ? baseComments.value : [];
    return list.filter((comment) => matchesFilters(comment, options));
  });

  const totalCount = computed(() => {
    const list = Array.isArray(baseComments.value) ? baseComments.value : [];
    return list.length;
  });

  const filteredCount = computed(() => filteredComments.value.length);

  const languageCounts = computed(() => {
    const counts = {};
    const list = Array.isArray(baseComments.value) ? baseComments.value : [];
    for (const comment of list) {
      const lang = comment.language || 'unknown';
      counts[lang] = (counts[lang] || 0) + 1;
    }
    return counts;
  });

  const availableLanguages = computed(() => Object.keys(languageCounts.value).sort());

  const tagCounts = computed(() => {
    const counts = {};
    let urlCount = 0;
    const list = Array.isArray(baseComments.value) ? baseComments.value : [];
    for (const comment of list) {
      if (comment.hasUrl) {
        urlCount += 1;
      }
      if (Array.isArray(comment.tags)) {
        for (const tag of comment.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
    counts['URL'] = urlCount;
    return counts;
  });

  const availableTags = computed(() => {
    const tags = Object.keys(tagCounts.value).filter((t) => t !== 'URL').sort();
    if (tagCounts.value['URL'] > 0) {
      tags.push('URL');
    }
    return tags;
  });

  const hasActiveFilters = computed(() => {
    return Boolean(
      searchQuery.value.trim().length > 0 ||
      selectedLanguages.value.length > 0 ||
      selectedTags.value.length > 0 ||
      onlyWithUrls.value ||
      hideCopyright.value ||
      hideLinters.value ||
      hideDocstrings.value ||
      hideToolGenerated.value
    );
  });

  function resetFilters() {
    searchQuery.value = '';
    selectedLanguages.value = [];
    selectedTags.value = [];
    onlyWithUrls.value = false;
    hideCopyright.value = false;
    hideLinters.value = false;
    hideDocstrings.value = false;
    hideToolGenerated.value = false;
  }

  function toggleLanguage(language) {
    if (!language) return;
    const lang = String(language).toLowerCase();
    const index = selectedLanguages.value.findIndex((l) => l.toLowerCase() === lang);
    if (index >= 0) {
      selectedLanguages.value.splice(index, 1);
    } else {
      selectedLanguages.value.push(lang);
    }
  }

  function toggleTag(tag) {
    if (!tag) return;
    const targetTag = String(tag).toUpperCase();
    const index = selectedTags.value.findIndex((t) => t.toUpperCase() === targetTag);
    if (index >= 0) {
      selectedTags.value.splice(index, 1);
    } else {
      selectedTags.value.push(targetTag);
    }
  }

  function toggleAllowlistRule(rule) {
    if (rule === 'hideCopyright') hideCopyright.value = !hideCopyright.value;
    else if (rule === 'hideLinters') hideLinters.value = !hideLinters.value;
    else if (rule === 'hideDocstrings') hideDocstrings.value = !hideDocstrings.value;
    else if (rule === 'hideToolGenerated') hideToolGenerated.value = !hideToolGenerated.value;
  }

  return {
    searchQuery,
    selectedLanguages,
    selectedTags,
    onlyWithUrls,
    hideCopyright,
    hideLinters,
    hideDocstrings,
    hideToolGenerated,
    baseComments,
    filteredComments,
    totalCount,
    filteredCount,
    languageCounts,
    availableLanguages,
    tagCounts,
    availableTags,
    hasActiveFilters,
    matchesFilters,
    resetFilters,
    toggleLanguage,
    toggleTag,
    toggleAllowlistRule
  };
}

export default useCommentFilter;
