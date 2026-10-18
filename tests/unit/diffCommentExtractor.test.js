import { describe, it, expect } from 'vitest';
import {
  isCommentInAddedLines,
  extractCommentsFromParsedDiff,
  extractDiffComments
} from '../../src/parsing/diffCommentExtractor.js';
import { parseDiff } from '../../src/services/diffParserService.js';

describe('isCommentInAddedLines', () => {
  it('identifies single line comment when line is in addedLines', () => {
    const comment = { startLine: 10, endLine: 10 };
    const addedLines = new Set([10]);
    expect(isCommentInAddedLines(comment, addedLines)).toBe(true);
  });

  it('rejects single line comment when line is not in addedLines', () => {
    const comment = { startLine: 10, endLine: 10 };
    const addedLines = new Set([9, 11]);
    expect(isCommentInAddedLines(comment, addedLines)).toBe(false);
  });

  it('identifies multiline comment when any line in range touches addedLines', () => {
    const comment = { startLine: 15, endLine: 20 };
    expect(isCommentInAddedLines(comment, new Set([15]))).toBe(true);
    expect(isCommentInAddedLines(comment, new Set([18]))).toBe(true);
    expect(isCommentInAddedLines(comment, new Set([20]))).toBe(true);
  });

  it('rejects multiline comment when addedLines are strictly outside range', () => {
    const comment = { startLine: 15, endLine: 20 };
    expect(isCommentInAddedLines(comment, new Set([14, 21]))).toBe(false);
  });

  it('handles edge cases gracefully with falsy or non-Set addedLines', () => {
    expect(isCommentInAddedLines(null, new Set([1]))).toBe(false);
    expect(isCommentInAddedLines({ startLine: 1, endLine: 1 }, null)).toBe(false);
    expect(isCommentInAddedLines({ startLine: 1, endLine: 1 }, new Set())).toBe(false);
    expect(isCommentInAddedLines({ startLine: 1, endLine: 1 }, [1])).toBe(false);
  });
});

describe('extractDiffComments - Single File Scenarios', () => {
  it('filters out legacy comments and returns strictly newly added comments', async () => {
    const diffText = [
      'diff --git a/src/app.js b/src/app.js',
      'index 1111111..2222222 100644',
      '--- a/src/app.js',
      '+++ b/src/app.js',
      '@@ -1,6 +1,8 @@',
      ' // legacy comment before change',
      ' const a = 1;',
      '+// new added comment',
      '+const b = 2;',
      ' const c = 3;',
      ' // legacy comment after change',
      ' const d = 4;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);

    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('// new added comment');
    expect(comments[0].startLine).toBe(3);
    expect(comments[0].endLine).toBe(3);
    expect(comments[0].isAdded).toBe(true);
    expect(comments[0].file).toBe('src/app.js');
    expect(comments[0].context.before).toEqual([
      '// legacy comment before change',
      'const a = 1;'
    ]);
    expect(comments[0].context.target).toEqual(['// new added comment']);
    expect(comments[0].context.after).toEqual([
      'const b = 2;',
      'const c = 3;'
    ]);
  });

  it('extracts multiple comments from newly created files', async () => {
    const diffText = [
      'diff --git a/src/utils/math.js b/src/utils/math.js',
      'new file mode 100644',
      'index 0000000..3333333',
      '--- /dev/null',
      '+++ b/src/utils/math.js',
      '@@ -0,0 +1,7 @@',
      '+/**',
      '+ * Sums two numbers',
      '+ */',
      '+export function sum(a, b) {',
      '+  // return the sum directly',
      '+  return a + b;',
      '+}'
    ].join('\n');

    const comments = await extractDiffComments(diffText);

    expect(comments).toHaveLength(2);

    expect(comments[0].type).toBe('docstring');
    expect(comments[0].startLine).toBe(1);
    expect(comments[0].endLine).toBe(3);
    expect(comments[0].isAdded).toBe(true);
    expect(comments[0].content).toBe('Sums two numbers');

    expect(comments[1].type).toBe('line');
    expect(comments[1].startLine).toBe(5);
    expect(comments[1].endLine).toBe(5);
    expect(comments[1].isAdded).toBe(true);
    expect(comments[1].content).toBe('return the sum directly');
  });

  it('detects multiline block comments partially modified in added lines', async () => {
    const diffText = [
      'diff --git a/src/config.js b/src/config.js',
      'index 1111111..2222222 100644',
      '--- a/src/config.js',
      '+++ b/src/config.js',
      '@@ -1,5 +1,5 @@',
      ' /*',
      '  * Configuration options',
      '- * old description',
      '+ * updated description',
      '  */',
      ' export const timeout = 5000;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);

    expect(comments).toHaveLength(1);
    expect(comments[0].type).toBe('block');
    expect(comments[0].startLine).toBe(1);
    expect(comments[0].endLine).toBe(4);
    expect(comments[0].isAdded).toBe(true);
    expect(comments[0].content).toContain('updated description');
  });

  it('does not produce false positives when neighbor lines are changed without touching comments', async () => {
    const diffText = [
      'diff --git a/src/service.js b/src/service.js',
      'index 1111111..2222222 100644',
      '--- a/src/service.js',
      '+++ b/src/service.js',
      '@@ -1,5 +1,5 @@',
      ' // legacy comment line',
      '-const initial = 10;',
      '+const initial = 20;',
      ' const next = 30;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);
    expect(comments).toHaveLength(0);
  });
});

describe('extractDiffComments - Multi-language and Multi-file Scenarios', () => {
  it('extracts comments from JavaScript, Python and CSS in the same diff', async () => {
    const diffText = [
      'diff --git a/src/index.js b/src/index.js',
      '--- a/src/index.js',
      '+++ b/src/index.js',
      '@@ -1,2 +1,3 @@',
      ' const x = 1;',
      '+// TODO: evaluate js change',
      ' const y = 2;',
      'diff --git a/backend/main.py b/backend/main.py',
      '--- a/backend/main.py',
      '+++ b/backend/main.py',
      '@@ -1,3 +1,4 @@',
      ' def run():',
      '+    # FIXME: check python worker',
      '     return True',
      'diff --git a/src/theme.css b/src/theme.css',
      '--- a/src/theme.css',
      '+++ b/src/theme.css',
      '@@ -1,2 +1,3 @@',
      ' .button {',
      '+  /* HACK: override margin for mobile */',
      '   display: block;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);

    expect(comments).toHaveLength(3);

    expect(comments[0].file).toBe('src/index.js');
    expect(comments[0].language).toBe('javascript');
    expect(comments[0].tags).toEqual(['TODO']);
    expect(comments[0].isAdded).toBe(true);

    expect(comments[1].file).toBe('backend/main.py');
    expect(comments[1].language).toBe('python');
    expect(comments[1].tags).toEqual(['FIXME']);
    expect(comments[1].isAdded).toBe(true);

    expect(comments[2].file).toBe('src/theme.css');
    expect(comments[2].language).toBe('css');
    expect(comments[2].tags).toEqual(['HACK']);
    expect(comments[2].isAdded).toBe(true);
  });

  it('extracts Python multiline docstring added in diff', async () => {
    const diffText = [
      'diff --git a/core/calc.py b/core/calc.py',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/core/calc.py',
      '@@ -0,0 +1,5 @@',
      '+def calculate():',
      '+    """Compute balance metrics.',
      '+    Returns float value.',
      '+    """',
      '+    return 0.0'
    ].join('\n');

    const comments = await extractDiffComments(diffText);

    expect(comments).toHaveLength(1);
    expect(comments[0].language).toBe('python');
    expect(comments[0].type).toBe('docstring');
    expect(comments[0].startLine).toBe(2);
    expect(comments[0].endLine).toBe(4);
    expect(comments[0].isAdded).toBe(true);
    expect(comments[0].content).toContain('Compute balance metrics.');
  });
});

describe('extractDiffComments - Edge Cases & Robustness', () => {
  it('returns empty array when diff text is empty or invalid', async () => {
    expect(await extractDiffComments('')).toEqual([]);
    expect(await extractDiffComments('   ')).toEqual([]);
    expect(await extractDiffComments(null)).toEqual([]);
    expect(await extractDiffComments(undefined)).toEqual([]);
  });

  it('returns empty array when diff has only deletions and no added lines', async () => {
    const diffText = [
      'diff --git a/src/app.js b/src/app.js',
      '--- a/src/app.js',
      '+++ b/src/app.js',
      '@@ -1,4 +1,2 @@',
      ' const a = 1;',
      '-// deleted comment',
      '-const b = 2;',
      ' const c = 3;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);
    expect(comments).toEqual([]);
  });

  it('discards deleted files without throwing exceptions', async () => {
    const diffText = [
      'diff --git a/src/obsolete.js b/src/obsolete.js',
      'deleted file mode 100644',
      '--- a/src/obsolete.js',
      '+++ /dev/null',
      '@@ -1,3 +0,0 @@',
      '-// goodbye old file',
      '-const x = 1;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);
    expect(comments).toEqual([]);
  });

  it('silently ignores unsupported file types without throwing', async () => {
    const diffText = [
      'diff --git a/Cargo.lock b/Cargo.lock',
      '--- a/Cargo.lock',
      '+++ b/Cargo.lock',
      '@@ -1,2 +1,3 @@',
      ' # unsupported format comment',
      '+version = 4',
      ' package = []',
      'diff --git a/src/supported.js b/src/supported.js',
      '--- a/src/supported.js',
      '+++ b/src/supported.js',
      '@@ -1,2 +1,3 @@',
      ' const ok = true;',
      '+// real comment in supported js',
      ' const done = true;'
    ].join('\n');

    const comments = await extractDiffComments(diffText);
    expect(comments).toHaveLength(1);
    expect(comments[0].file).toBe('src/supported.js');
    expect(comments[0].content).toBe('real comment in supported js');
  });

  it('supports direct execution via extractCommentsFromParsedDiff', async () => {
    const diffText = [
      'diff --git a/src/main.ts b/src/main.ts',
      '--- a/src/main.ts',
      '+++ b/src/main.ts',
      '@@ -1,2 +1,3 @@',
      ' const id = 1;',
      '+// https://github.com/issue/42 - NOTE: reference url',
      ' const name = "test";'
    ].join('\n');

    const parsed = parseDiff(diffText);
    const comments = await extractCommentsFromParsedDiff(parsed);

    expect(comments).toHaveLength(1);
    expect(comments[0].file).toBe('src/main.ts');
    expect(comments[0].language).toBe('typescript');
    expect(comments[0].hasUrl).toBe(true);
    expect(comments[0].urls).toContain('https://github.com/issue/42');
    expect(comments[0].tags).toContain('NOTE');
  });

  it('handles empty or non-array inputs in extractCommentsFromParsedDiff', async () => {
    expect(await extractCommentsFromParsedDiff(null)).toEqual([]);
    expect(await extractCommentsFromParsedDiff([])).toEqual([]);
    expect(await extractCommentsFromParsedDiff([{}])).toEqual([]);
  });
});
