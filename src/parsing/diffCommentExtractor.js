import { parseDiff } from '../services/diffParserService.js';
import { detectLanguage, isLanguageSupported } from './languageDetector.js';
import { extractRawComments } from './commentExtractor.js';
import { normalizeCommentNodes } from './commentNormalizer.js';

export function isCommentInAddedLines(comment, addedLines) {
  if (!comment || !addedLines || !(addedLines instanceof Set) || addedLines.size === 0) {
    return false;
  }

  const start = Number.isInteger(comment.startLine) ? comment.startLine : 1;
  const end = Number.isInteger(comment.endLine) ? comment.endLine : start;

  for (let line = start; line <= end; line++) {
    if (addedLines.has(line)) {
      return true;
    }
  }

  return false;
}

export async function extractCommentsFromParsedDiff(parsedFiles) {
  if (!parsedFiles) {
    return [];
  }

  const files = Array.isArray(parsedFiles) ? parsedFiles : [parsedFiles];
  if (files.length === 0) {
    return [];
  }

  const results = [];

  for (const file of files) {
    if (!file || typeof file !== 'object') {
      continue;
    }

    if (file.status === 'deleted') {
      continue;
    }

    if (!file.reconstructedContent || typeof file.reconstructedContent !== 'string' || !file.reconstructedContent.trim()) {
      continue;
    }

    if (!file.addedLines || !(file.addedLines instanceof Set) || file.addedLines.size === 0) {
      continue;
    }

    const filepath = file.path || file.newPath || file.oldPath || '';
    if (!filepath) {
      continue;
    }

    const language = detectLanguage(filepath);
    if (!language || !isLanguageSupported(language)) {
      continue;
    }

    let rawComments = [];
    try {
      rawComments = await extractRawComments(file.reconstructedContent, language, filepath);
    } catch {
      continue;
    }

    if (!Array.isArray(rawComments) || rawComments.length === 0) {
      continue;
    }

    const addedRawComments = rawComments.filter((comment) =>
      isCommentInAddedLines(comment, file.addedLines)
    );

    if (addedRawComments.length === 0) {
      continue;
    }

    const normalized = normalizeCommentNodes(addedRawComments, file.reconstructedContent, {
      file: filepath,
      language,
      isAdded: true
    });

    results.push(...normalized);
  }

  return results;
}

export async function extractDiffComments(diffText) {
  if (!diffText || typeof diffText !== 'string' || !diffText.trim()) {
    return [];
  }

  const parsedFiles = parseDiff(diffText);
  return extractCommentsFromParsedDiff(parsedFiles);
}

export default {
  isCommentInAddedLines,
  extractCommentsFromParsedDiff,
  extractDiffComments
};
