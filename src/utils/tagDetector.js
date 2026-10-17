export const SUPPORTED_TAGS = ['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'TEMP'];

const UPPERCASE_TAG_REGEX = new RegExp(`\\b(${SUPPORTED_TAGS.join('|')})\\b`, 'g');
const COLON_TAG_REGEX = new RegExp(`\\b(${SUPPORTED_TAGS.join('|')})(?:\\([^)]*\\))?\\s*:`, 'gi');
const AT_TAG_REGEX = new RegExp(`(?:^|[^a-zA-Z0-9_])@(${SUPPORTED_TAGS.join('|')})\\b`, 'gi');
const RAW_URL_REGEX = /https?:\/\/[^\s"'<>`]+/gi;
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)\]}]+$/;

export function detectTags(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const matches = [];

  for (const match of text.matchAll(UPPERCASE_TAG_REGEX)) {
    matches.push({ tag: match[1].toUpperCase(), index: match.index });
  }

  for (const match of text.matchAll(COLON_TAG_REGEX)) {
    matches.push({ tag: match[1].toUpperCase(), index: match.index });
  }

  for (const match of text.matchAll(AT_TAG_REGEX)) {
    matches.push({ tag: match[1].toUpperCase(), index: match.index });
  }

  matches.sort((a, b) => a.index - b.index);

  const seen = new Set();
  const tags = [];
  for (const item of matches) {
    if (!seen.has(item.tag)) {
      seen.add(item.tag);
      tags.push(item.tag);
    }
  }

  return tags;
}

export function hasTags(text) {
  return detectTags(text).length > 0;
}

export function extractUrls(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }

  const rawMatches = text.match(RAW_URL_REGEX);
  if (!rawMatches) {
    return [];
  }

  const seen = new Set();
  const urls = [];

  for (const raw of rawMatches) {
    const cleaned = raw.replace(TRAILING_PUNCTUATION_REGEX, '');
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      urls.push(cleaned);
    }
  }

  return urls;
}

export function hasUrls(text) {
  return extractUrls(text).length > 0;
}

export default {
  SUPPORTED_TAGS,
  detectTags,
  hasTags,
  extractUrls,
  hasUrls
};
