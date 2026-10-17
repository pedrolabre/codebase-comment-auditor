import assert from 'node:assert/strict';
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

async function testTagDetector() {
  assert.deepEqual(SUPPORTED_TAGS, ['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'TEMP']);

  assert.deepEqual(detectTags('// TODO: fix bug https://github.com/issue/1'), ['TODO']);
  assert.equal(hasTags('// TODO: fix bug https://github.com/issue/1'), true);

  assert.deepEqual(detectTags('// FIXME: solve memory leak'), ['FIXME']);
  assert.deepEqual(detectTags('// HACK: bypass css flex issue'), ['HACK']);
  assert.deepEqual(detectTags('// XXX: security risk'), ['XXX']);
  assert.deepEqual(detectTags('// BUG: off-by-one error'), ['BUG']);
  assert.deepEqual(detectTags('// NOTE: this is important'), ['NOTE']);
  assert.deepEqual(detectTags('// TEMP: mock response for testing'), ['TEMP']);

  assert.deepEqual(detectTags('// @todo refactor authentication module'), ['TODO']);
  assert.deepEqual(detectTags('// todo: clean up state'), ['TODO']);
  assert.deepEqual(detectTags('// fixme: edge case'), ['FIXME']);
  assert.deepEqual(detectTags('// note: check permissions'), ['NOTE']);
  assert.deepEqual(detectTags('// TODO(alice): handle timeout'), ['TODO']);

  assert.deepEqual(detectTags('// Please note that this function fixes a bug in parser'), []);
  assert.equal(hasTags('// Please note that this function fixes a bug in parser'), false);
  assert.deepEqual(detectTags('// We should bug the team about this'), []);

  assert.deepEqual(detectTags('// BUG in rendering engine and TODO for later'), ['BUG', 'TODO']);
  assert.deepEqual(detectTags('// TODO: first TODO and second TODO'), ['TODO']);

  assert.deepEqual(detectTags(''), []);
  assert.deepEqual(detectTags(null), []);
  assert.deepEqual(detectTags('   '), []);
}

async function testUrlExtractor() {
  const comment = '// TODO: fix bug https://github.com/issue/1';
  assert.deepEqual(extractUrls(comment), ['https://github.com/issue/1']);
  assert.equal(hasUrls(comment), true);

  assert.deepEqual(extractUrls('// See documentation at https://example.com/docs.'), ['https://example.com/docs']);
  assert.deepEqual(extractUrls('// Reference: (https://example.com/spec)'), ['https://example.com/spec']);
  assert.deepEqual(extractUrls('// Endpoints: http://localhost:8080/v1, http://localhost:8080/v2;'), [
    'http://localhost:8080/v1',
    'http://localhost:8080/v2'
  ]);
  assert.deepEqual(extractUrls('// Link with query: https://example.com/search?q=test&lang=en#results'), [
    'https://example.com/search?q=test&lang=en#results'
  ]);
  assert.deepEqual(extractUrls('// Duplicate https://site.org and https://site.org'), ['https://site.org']);

  assert.deepEqual(extractUrls('// No URLs here'), []);
  assert.equal(hasUrls('// No URLs here'), false);
  assert.deepEqual(extractUrls(''), []);
  assert.deepEqual(extractUrls(null), []);
}

async function testDelimiterStripping() {
  assert.equal(stripCommentDelimiters('// Line comment'), 'Line comment');
  assert.equal(stripCommentDelimiters('/// <reference types="vite/client" />'), '<reference types="vite/client" />');
  assert.equal(stripCommentDelimiters('# Python comment'), 'Python comment');
  assert.equal(stripCommentDelimiters('#!/usr/bin/env bash'), '/usr/bin/env bash');
  assert.equal(stripCommentDelimiters('/* Block comment */', 'block'), 'Block comment');
  assert.equal(stripCommentDelimiters('<!-- HTML comment header -->', 'block'), 'HTML comment header');

  const jsDocSample = [
    '/**',
    ' * Description line 1',
    ' * Description line 2',
    ' * @param {string} x',
    ' */'
  ].join('\n');
  assert.equal(
    stripCommentDelimiters(jsDocSample, 'docstring', 'javascript'),
    'Description line 1\nDescription line 2\n@param {string} x'
  );

  assert.equal(
    stripCommentDelimiters('"""Module docstring for test module."""', 'docstring', 'python'),
    'Module docstring for test module.'
  );
  assert.equal(
    stripCommentDelimiters("'''Single triple quote docstring'''", 'docstring', 'python'),
    'Single triple quote docstring'
  );
  assert.equal(
    stripCommentDelimiters('r"""Raw docstring test"""', 'docstring', 'python'),
    'Raw docstring test'
  );

  assert.equal(stripCommentDelimiters(''), '');
  assert.equal(stripCommentDelimiters(null), '');
}

async function testCommentIdAndCategory() {
  assert.equal(createCommentId('src/App.vue', 10, 5), 'src/App.vue:10:5');
  assert.equal(createCommentId('', 1, 1), ':1:1');
  assert.equal(createCommentId(null, null, null), ':0:0');

  assert.equal(getCommentCategory('docstring'), 'documentation');
  assert.equal(getCommentCategory('line'), 'development');
  assert.equal(getCommentCategory('block'), 'development');
}

async function testContextExtraction() {
  const code = [
    'line 1',
    'line 2',
    'line 3',
    'line 4',
    'line 5'
  ].join('\n');

  const firstLineContext = extractCommentContext(code, 1, 1);
  assert.deepEqual(firstLineContext.before, []);
  assert.deepEqual(firstLineContext.target, ['line 1']);
  assert.deepEqual(firstLineContext.after, ['line 2', 'line 3']);

  const secondLineContext = extractCommentContext(code, 2, 2);
  assert.deepEqual(secondLineContext.before, ['line 1']);
  assert.deepEqual(secondLineContext.target, ['line 2']);
  assert.deepEqual(secondLineContext.after, ['line 3', 'line 4']);

  const middleMultiLineContext = extractCommentContext(code, 3, 4);
  assert.deepEqual(middleMultiLineContext.before, ['line 1', 'line 2']);
  assert.deepEqual(middleMultiLineContext.target, ['line 3', 'line 4']);
  assert.deepEqual(middleMultiLineContext.after, ['line 5']);

  const lastLineContext = extractCommentContext(code, 5, 5);
  assert.deepEqual(lastLineContext.before, ['line 3', 'line 4']);
  assert.deepEqual(lastLineContext.target, ['line 5']);
  assert.deepEqual(lastLineContext.after, []);

  const emptyContext = extractCommentContext('', 1, 1);
  assert.deepEqual(emptyContext.before, []);
  assert.deepEqual(emptyContext.target, []);
  assert.deepEqual(emptyContext.after, []);

  const linesArray = ['a', 'b', 'c'];
  const fromLines = extractCommentContextFromLines(linesArray, 2, 2);
  assert.deepEqual(fromLines.before, ['a']);
  assert.deepEqual(fromLines.target, ['b']);
  assert.deepEqual(fromLines.after, ['c']);
}

async function testMandatoryPromptNormalization() {
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

  assert.equal(normalized.id, 'src/runner.js:2:1');
  assert.equal(normalized.file, 'src/runner.js');
  assert.equal(normalized.language, 'javascript');
  assert.equal(normalized.type, 'line');
  assert.equal(normalized.category, 'development');
  assert.equal(normalized.startLine, 2);
  assert.equal(normalized.endLine, 2);
  assert.equal(normalized.startColumn, 1);
  assert.equal(normalized.endColumn, 44);
  assert.equal(normalized.text, '// TODO: fix bug https://github.com/issue/1');
  assert.equal(normalized.content, 'TODO: fix bug https://github.com/issue/1');
  assert.deepEqual(normalized.tags, ['TODO']);
  assert.equal(normalized.hasUrl, true);
  assert.deepEqual(normalized.urls, ['https://github.com/issue/1']);
  assert.equal(normalized.isAdded, false);

  assert.deepEqual(normalized.context.before, ['import config from "./config.js";']);
  assert.deepEqual(normalized.context.target, ['// TODO: fix bug https://github.com/issue/1']);
  assert.deepEqual(normalized.context.after, ['export function run() {', '  return config.url;']);
}

async function testBatchNormalizationAndDocstrings() {
  const pythonCode = [
    '# Script header',
    '"""Module docstring describing this tool."""',
    'def execute():',
    '    # FIXME: check status https://service.local/health',
    '    pass'
  ].join('\n');

  const rawList = await extractRawComments(pythonCode, 'python', 'script.py');
  assert.equal(rawList.length, 3);

  const normalizedList = normalizeCommentNodes(rawList, pythonCode);
  assert.equal(normalizedList.length, 3);

  assert.equal(normalizedList[0].type, 'line');
  assert.equal(normalizedList[0].category, 'development');
  assert.equal(normalizedList[0].content, 'Script header');
  assert.deepEqual(normalizedList[0].tags, []);
  assert.equal(normalizedList[0].hasUrl, false);

  assert.equal(normalizedList[1].type, 'docstring');
  assert.equal(normalizedList[1].category, 'documentation');
  assert.equal(normalizedList[1].content, 'Module docstring describing this tool.');
  assert.deepEqual(normalizedList[1].tags, []);

  assert.equal(normalizedList[2].type, 'line');
  assert.equal(normalizedList[2].category, 'development');
  assert.deepEqual(normalizedList[2].tags, ['FIXME']);
  assert.equal(normalizedList[2].hasUrl, true);
  assert.deepEqual(normalizedList[2].urls, ['https://service.local/health']);
  assert.equal(normalizedList[2].context.before.length, 2);
  assert.equal(normalizedList[2].context.after.length, 1);

  assert.deepEqual(normalizeCommentNodes([]), []);
  assert.deepEqual(normalizeCommentNodes(null), []);
}

async function runAllTests() {
  await testTagDetector();
  await testUrlExtractor();
  await testDelimiterStripping();
  await testCommentIdAndCategory();
  await testContextExtraction();
  await testMandatoryPromptNormalization();
  await testBatchNormalizationAndDocstrings();
  console.log('All commentNormalizer and tagDetector unit tests passed successfully.');
}

runAllTests();
