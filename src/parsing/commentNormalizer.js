import { detectTags, extractUrls } from '../utils/tagDetector.js';

function stripPythonDocstring(text) {
  const match = text.match(/^(?:[rRuUbB]{0,2})("""|''')([\s\S]*?)\1$/);
  if (match) {
    return match[2].trim();
  }
  return text.trim();
}

function stripJsDoc(text) {
  let inner = text.trim();
  if (inner.startsWith('/**')) {
    inner = inner.slice(3);
  } else if (inner.startsWith('/*')) {
    inner = inner.slice(2);
  }
  if (inner.endsWith('*/')) {
    inner = inner.slice(0, -2);
  }

  const lines = inner.split(/\r?\n/).map((line) => line.replace(/^\s*\*\s?/, ''));
  return lines.join('\n').trim();
}

function stripHtmlComment(text) {
  let inner = text.trim();
  if (inner.startsWith('<!--')) {
    inner = inner.slice(4);
  }
  if (inner.endsWith('-->')) {
    inner = inner.slice(0, -3);
  }
  return inner.trim();
}

function stripBlockComment(text) {
  let inner = text.trim();
  if (inner.startsWith('/*')) {
    inner = inner.slice(2);
  }
  if (inner.endsWith('*/')) {
    inner = inner.slice(0, -2);
  }
  const lines = inner.split(/\r?\n/).map((line) => line.replace(/^\s*\*\s?/, ''));
  return lines.join('\n').trim();
}

function stripLineComment(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('///')) {
    return trimmed.slice(3).trim();
  }
  if (trimmed.startsWith('//')) {
    return trimmed.slice(2).trim();
  }
  if (trimmed.startsWith('#!')) {
    return trimmed.slice(2).trim();
  }
  if (trimmed.startsWith('#')) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
}

export function stripCommentDelimiters(text, type = 'line', language = '') {
  if (typeof text !== 'string') {
    return '';
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  if (type === 'docstring') {
    if (language === 'python' || trimmed.startsWith('"""') || trimmed.startsWith("'''") || /^[rRuUbB]{1,2}("""|''')/.test(trimmed)) {
      return stripPythonDocstring(trimmed);
    }
    return stripJsDoc(trimmed);
  }

  if (type === 'block') {
    if (trimmed.startsWith('<!--')) {
      return stripHtmlComment(trimmed);
    }
    return stripBlockComment(trimmed);
  }

  if (trimmed.startsWith('<!--')) {
    return stripHtmlComment(trimmed);
  }
  if (trimmed.startsWith('/*')) {
    return stripBlockComment(trimmed);
  }
  return stripLineComment(trimmed);
}

export function createCommentId(file, startLine, startColumn) {
  const safeFile = typeof file === 'string' ? file : '';
  const safeLine = typeof startLine === 'number' ? startLine : 0;
  const safeCol = typeof startColumn === 'number' ? startColumn : 0;
  return `${safeFile}:${safeLine}:${safeCol}`;
}

export function getCommentCategory(type) {
  return type === 'docstring' ? 'documentation' : 'development';
}

export function extractCommentContextFromLines(lines, startLine, endLine) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return {
      before: [],
      target: [],
      after: []
    };
  }

  const totalLines = lines.length;
  const safeStartLine = Math.max(1, typeof startLine === 'number' ? startLine : 1);
  const safeEndLine = Math.max(safeStartLine, typeof endLine === 'number' ? endLine : safeStartLine);

  const beforeStart = Math.max(0, safeStartLine - 1 - 2);
  const beforeEnd = Math.max(0, safeStartLine - 1);
  const before = lines.slice(beforeStart, beforeEnd);

  const targetStart = Math.min(totalLines, Math.max(0, safeStartLine - 1));
  const targetEnd = Math.min(totalLines, safeEndLine);
  const target = lines.slice(targetStart, targetEnd);

  const afterStart = Math.min(totalLines, safeEndLine);
  const afterEnd = Math.min(totalLines, safeEndLine + 2);
  const after = lines.slice(afterStart, afterEnd);

  return {
    before,
    target,
    after
  };
}

export function extractCommentContext(sourceCode, startLine, endLine) {
  if (typeof sourceCode !== 'string' || !sourceCode.length) {
    return {
      before: [],
      target: [],
      after: []
    };
  }

  const lines = sourceCode.split(/\r?\n/);
  return extractCommentContextFromLines(lines, startLine, endLine);
}

export function normalizeCommentNode(rawComment, sourceCode = '', options = {}) {
  if (!rawComment || typeof rawComment !== 'object') {
    throw new Error('Invalid raw comment object provided to normalizeCommentNode');
  }

  const file = rawComment.file || options.file || options.filepath || '';
  const language = rawComment.language || options.language || '';
  const type = rawComment.type || 'line';
  const category = rawComment.category || getCommentCategory(type);
  const startLine = Number.isInteger(rawComment.startLine) ? rawComment.startLine : 1;
  const endLine = Number.isInteger(rawComment.endLine) ? rawComment.endLine : startLine;
  const startColumn = Number.isInteger(rawComment.startColumn) ? rawComment.startColumn : 1;
  const endColumn = Number.isInteger(rawComment.endColumn) ? rawComment.endColumn : startColumn;
  const text = typeof rawComment.text === 'string' ? rawComment.text : '';

  const id = createCommentId(file, startLine, startColumn);
  const content = stripCommentDelimiters(text, type, language);
  const tags = detectTags(content);
  const urls = extractUrls(text);
  const hasUrl = urls.length > 0;
  const isAdded = Boolean(rawComment.isAdded || options.isAdded || false);

  let context;
  if (options.lines && Array.isArray(options.lines)) {
    context = extractCommentContextFromLines(options.lines, startLine, endLine);
  } else if (typeof sourceCode === 'string' && sourceCode.length > 0) {
    context = extractCommentContext(sourceCode, startLine, endLine);
  } else {
    context = {
      before: [],
      target: text ? text.split(/\r?\n/) : [],
      after: []
    };
  }

  return {
    id,
    file,
    language,
    type,
    category,
    startLine,
    endLine,
    startColumn,
    endColumn,
    text,
    content,
    tags,
    hasUrl,
    urls,
    isAdded,
    context
  };
}

export function normalizeCommentNodes(rawComments, sourceCode = '', options = {}) {
  if (!Array.isArray(rawComments) || rawComments.length === 0) {
    return [];
  }

  const lines = typeof sourceCode === 'string' && sourceCode.length > 0
    ? sourceCode.split(/\r?\n/)
    : null;

  const normalizerOptions = lines ? { ...options, lines } : options;

  return rawComments.map((rawComment) => normalizeCommentNode(rawComment, sourceCode, normalizerOptions));
}

export default {
  stripCommentDelimiters,
  createCommentId,
  getCommentCategory,
  extractCommentContextFromLines,
  extractCommentContext,
  normalizeCommentNode,
  normalizeCommentNodes
};
