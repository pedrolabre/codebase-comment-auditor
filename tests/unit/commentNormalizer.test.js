import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_TAGS,
  detectTags,
  hasTags,
  extractUrls,
  hasUrls
} from '../../src/utils/tagDetector.js';
import {
  stripCommentDelimiters,
  createCommentId,
  getCommentCategory,
  extractCommentContext,
  extractCommentContextFromLines,
  normalizeCommentNode,
  normalizeCommentNodes
} from '../../src/parsing/commentNormalizer.js';
import { extractRawComments } from '../../src/parsing/commentExtractor.js';

describe('Tag Detector & URL Extractor', () => {
  it('detects standard development tags and variants with colons or at-signs', () => {
    expect(SUPPORTED_TAGS).toEqual(['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'TEMP']);

    expect(detectTags('// TODO: fix bug https://github.com/issue/1')).toEqual(['TODO']);
    expect(hasTags('// TODO: fix bug https://github.com/issue/1')).toBe(true);

    expect(detectTags('// FIXME: solve memory leak')).toEqual(['FIXME']);
    expect(detectTags('// HACK: bypass css flex issue')).toEqual(['HACK']);
    expect(detectTags('// XXX: security risk')).toEqual(['XXX']);
    expect(detectTags('// BUG: off-by-one error')).toEqual(['BUG']);
    expect(detectTags('// NOTE: this is important')).toEqual(['NOTE']);
    expect(detectTags('// TEMP: mock response for testing')).toEqual(['TEMP']);

    expect(detectTags('// @todo refactor authentication module')).toEqual(['TODO']);
    expect(detectTags('// todo: clean up state')).toEqual(['TODO']);
    expect(detectTags('// fixme: edge case')).toEqual(['FIXME']);
    expect(detectTags('// note: check permissions')).toEqual(['NOTE']);
    expect(detectTags('// TODO(alice): handle timeout')).toEqual(['TODO']);
  });

  it('avoids false positives on natural language words in lowercase', () => {
    expect(detectTags('// Please note that this function fixes a bug in parser')).toEqual([]);
    expect(hasTags('// Please note that this function fixes a bug in parser')).toBe(false);
    expect(detectTags('// We should bug the team about this')).toEqual([]);
  });

  it('deduplicates multiple tags and handles empty inputs', () => {
    expect(detectTags('// BUG in rendering engine and TODO for later')).toEqual(['BUG', 'TODO']);
    expect(detectTags('// TODO: first TODO and second TODO')).toEqual(['TODO']);
    expect(detectTags('')).toEqual([]);
    expect(detectTags(null)).toEqual([]);
    expect(detectTags('   ')).toEqual([]);
  });

  it('extracts valid web URLs with punctuation sanitization', () => {
    const comment = '// TODO: fix bug https://github.com/issue/1';
    expect(extractUrls(comment)).toEqual(['https://github.com/issue/1']);
    expect(hasUrls(comment)).toBe(true);

    expect(extractUrls('// See documentation at https://example.com/docs.')).toEqual([
      'https://example.com/docs'
    ]);
    expect(extractUrls('// Reference: (https://example.com/spec)')).toEqual(['https://example.com/spec']);
    expect(extractUrls('// Endpoints: http://localhost:8080/v1, http://localhost:8080/v2;')).toEqual([
      'http://localhost:8080/v1',
      'http://localhost:8080/v2'
    ]);
    expect(
      extractUrls('// Link with query: https://example.com/search?q=test&lang=en#results')
    ).toEqual(['https://example.com/search?q=test&lang=en#results']);
    expect(extractUrls('// Duplicate https://site.org and https://site.org')).toEqual([
      'https://site.org'
    ]);
    expect(extractUrls('// No URLs here')).toEqual([]);
    expect(hasUrls('// No URLs here')).toBe(false);
    expect(extractUrls('')).toEqual([]);
    expect(extractUrls(null)).toEqual([]);
  });
});

describe('Comment Normalizer Helpers', () => {
  it('strips comment delimiters cleanly across languages', () => {
    expect(stripCommentDelimiters('// Line comment')).toBe('Line comment');
    expect(stripCommentDelimiters('/// <reference types="vite/client" />')).toBe(
      '<reference types="vite/client" />'
    );
    expect(stripCommentDelimiters('# Python comment')).toBe('Python comment');
    expect(stripCommentDelimiters('#!/usr/bin/env bash')).toBe('/usr/bin/env bash');
    expect(stripCommentDelimiters('/* Block comment */', 'block')).toBe('Block comment');
    expect(stripCommentDelimiters('<!-- HTML comment header -->', 'block')).toBe('HTML comment header');

    const jsDocSample = [
      '/**',
      ' * Description line 1',
      ' * Description line 2',
      ' * @param {string} x',
      ' */'
    ].join('\n');
    expect(stripCommentDelimiters(jsDocSample, 'docstring', 'javascript')).toBe(
      'Description line 1\nDescription line 2\n@param {string} x'
    );

    expect(
      stripCommentDelimiters('"""Module docstring for test module."""', 'docstring', 'python')
    ).toBe('Module docstring for test module.');
    expect(
      stripCommentDelimiters("'''Single triple quote docstring'''", 'docstring', 'python')
    ).toBe('Single triple quote docstring');
    expect(
      stripCommentDelimiters('r"""Raw docstring test"""', 'docstring', 'python')
    ).toBe('Raw docstring test');

    expect(stripCommentDelimiters('')).toBe('');
    expect(stripCommentDelimiters(null)).toBe('');
  });

  it('creates deterministic comment IDs and maps categories', () => {
    expect(createCommentId('src/App.vue', 10, 5)).toBe('src/App.vue:10:5');
    expect(createCommentId('', 1, 1)).toBe(':1:1');
    expect(createCommentId(null, null, null)).toBe(':0:0');

    expect(getCommentCategory('docstring')).toBe('documentation');
    expect(getCommentCategory('line')).toBe('development');
    expect(getCommentCategory('block')).toBe('development');
  });

  it('slices surrounding code context up to 2 lines before and after', () => {
    const code = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'].join('\n');

    const first = extractCommentContext(code, 1, 1);
    expect(first.before).toEqual([]);
    expect(first.target).toEqual(['line 1']);
    expect(first.after).toEqual(['line 2', 'line 3']);

    const second = extractCommentContext(code, 2, 2);
    expect(second.before).toEqual(['line 1']);
    expect(second.target).toEqual(['line 2']);
    expect(second.after).toEqual(['line 3', 'line 4']);

    const middle = extractCommentContext(code, 3, 4);
    expect(middle.before).toEqual(['line 1', 'line 2']);
    expect(middle.target).toEqual(['line 3', 'line 4']);
    expect(middle.after).toEqual(['line 5']);

    const last = extractCommentContext(code, 5, 5);
    expect(last.before).toEqual(['line 3', 'line 4']);
    expect(last.target).toEqual(['line 5']);
    expect(last.after).toEqual([]);

    const empty = extractCommentContext('', 1, 1);
    expect(empty.before).toEqual([]);
    expect(empty.target).toEqual([]);
    expect(empty.after).toEqual([]);

    const fromLines = extractCommentContextFromLines(['a', 'b', 'c'], 2, 2);
    expect(fromLines.before).toEqual(['a']);
    expect(fromLines.target).toEqual(['b']);
    expect(fromLines.after).toEqual(['c']);
  });
});

describe('Canonical CommentNode Normalization', () => {
  it('normalizes comment according to the mandatory specification scenario', () => {
    const sourceCode = [
      'import config from "./config.js";',
      '// TODO: fix bug https://github.com/issue/1',
      'export function run() {',
      '  return config.url;',
      '}'
    ].join('\n');

    const rawComment = {
      text: '// TODO: fix bug https://github.com/issue/1',
      type: 'line',
      language: 'javascript',
      file: 'src/runner.js',
      startLine: 2,
      endLine: 2,
      startColumn: 1,
      endColumn: 44,
      startIndex: 34,
      endIndex: 77
    };

    const normalized = normalizeCommentNode(rawComment, sourceCode);

    expect(normalized.id).toBe('src/runner.js:2:1');
    expect(normalized.file).toBe('src/runner.js');
    expect(normalized.language).toBe('javascript');
    expect(normalized.type).toBe('line');
    expect(normalized.category).toBe('development');
    expect(normalized.startLine).toBe(2);
    expect(normalized.endLine).toBe(2);
    expect(normalized.startColumn).toBe(1);
    expect(normalized.endColumn).toBe(44);
    expect(normalized.text).toBe('// TODO: fix bug https://github.com/issue/1');
    expect(normalized.content).toBe('TODO: fix bug https://github.com/issue/1');
    expect(normalized.tags).toEqual(['TODO']);
    expect(normalized.hasUrl).toBe(true);
    expect(normalized.urls).toEqual(['https://github.com/issue/1']);
    expect(normalized.isAdded).toBe(false);

    expect(normalized.context.before).toEqual(['import config from "./config.js";']);
    expect(normalized.context.target).toEqual(['// TODO: fix bug https://github.com/issue/1']);
    expect(normalized.context.after).toEqual(['export function run() {', '  return config.url;']);
  });

  it('normalizes batches of comments with mixed types and docstrings', async () => {
    const pythonCode = [
      '# Script header',
      '"""Module docstring describing this tool."""',
      'def execute():',
      '    # FIXME: check status https://service.local/health',
      '    pass'
    ].join('\n');

    const rawList = await extractRawComments(pythonCode, 'python', 'script.py');
    expect(rawList).toHaveLength(3);

    const normalizedList = normalizeCommentNodes(rawList, pythonCode);
    expect(normalizedList).toHaveLength(3);

    expect(normalizedList[0].type).toBe('line');
    expect(normalizedList[0].category).toBe('development');
    expect(normalizedList[0].content).toBe('Script header');
    expect(normalizedList[0].tags).toEqual([]);
    expect(normalizedList[0].hasUrl).toBe(false);

    expect(normalizedList[1].type).toBe('docstring');
    expect(normalizedList[1].category).toBe('documentation');
    expect(normalizedList[1].content).toBe('Module docstring describing this tool.');
    expect(normalizedList[1].tags).toEqual([]);

    expect(normalizedList[2].type).toBe('line');
    expect(normalizedList[2].category).toBe('development');
    expect(normalizedList[2].tags).toEqual(['FIXME']);
    expect(normalizedList[2].hasUrl).toBe(true);
    expect(normalizedList[2].urls).toEqual(['https://service.local/health']);
    expect(normalizedList[2].context.before).toHaveLength(2);
    expect(normalizedList[2].context.after).toHaveLength(1);

    expect(normalizeCommentNodes([])).toEqual([]);
    expect(normalizeCommentNodes(null)).toEqual([]);
  });
});
