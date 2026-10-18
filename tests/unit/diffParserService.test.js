import { describe, it, expect } from 'vitest';
import {
  parseDiff,
  extractDiffFiles,
  isDiffEmpty,
  getDiffStats,
  cleanDiffPath,
  parseHunkHeader
} from '../../src/services/diffParserService.js';

describe('diffParserService', () => {
  describe('cleanDiffPath', () => {
    it('strips a/ and b/ prefixes correctly', () => {
      expect(cleanDiffPath('a/src/App.vue')).toBe('src/App.vue');
      expect(cleanDiffPath('b/src/components/Navbar.vue')).toBe('src/components/Navbar.vue');
      expect(cleanDiffPath('src/main.js')).toBe('src/main.js');
    });

    it('returns null for /dev/null', () => {
      expect(cleanDiffPath('/dev/null')).toBeNull();
    });

    it('handles quoted paths and whitespace', () => {
      expect(cleanDiffPath('"a/deep/path with spaces/file.js"')).toBe('deep/path with spaces/file.js');
      expect(cleanDiffPath("'b/single/quoted/file.ts'")).toBe('single/quoted/file.ts');
    });

    it('handles tab-separated timestamps in patch files', () => {
      expect(cleanDiffPath('a/src/index.js\t2026-10-17 12:00:00 +0000')).toBe('src/index.js');
    });

    it('handles empty and invalid inputs', () => {
      expect(cleanDiffPath('')).toBe('');
      expect(cleanDiffPath(null)).toBe('');
      expect(cleanDiffPath(undefined)).toBe('');
    });
  });

  describe('parseHunkHeader', () => {
    it('parses standard hunk header with both ranges and lengths', () => {
      const parsed = parseHunkHeader('@@ -10,6 +10,8 @@');
      expect(parsed).toEqual({
        oldStart: 10,
        oldLines: 6,
        newStart: 10,
        newLines: 8,
        heading: ''
      });
    });

    it('parses single line hunk headers where length is omitted', () => {
      const parsed = parseHunkHeader('@@ -1 +1 @@');
      expect(parsed).toEqual({
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        heading: ''
      });
    });

    it('parses hunk header for new file creation', () => {
      const parsed = parseHunkHeader('@@ -0,0 +1,5 @@');
      expect(parsed).toEqual({
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 5,
        heading: ''
      });
    });

    it('parses hunk header with trailing section heading', () => {
      const parsed = parseHunkHeader('@@ -25,4 +25,7 @@ function calculateMetrics(input) {');
      expect(parsed).toEqual({
        oldStart: 25,
        oldLines: 4,
        newStart: 25,
        newLines: 7,
        heading: 'function calculateMetrics(input) {'
      });
    });

    it('returns null for invalid header lines', () => {
      expect(parseHunkHeader('--- a/file.js')).toBeNull();
      expect(parseHunkHeader('not a hunk header')).toBeNull();
      expect(parseHunkHeader('')).toBeNull();
    });
  });

  describe('isDiffEmpty', () => {
    it('identifies empty or invalid diff texts', () => {
      expect(isDiffEmpty('')).toBe(true);
      expect(isDiffEmpty('   \n  \t  ')).toBe(true);
      expect(isDiffEmpty(null)).toBe(true);
      expect(isDiffEmpty(undefined)).toBe(true);
      expect(isDiffEmpty('random non-diff text')).toBe(true);
    });

    it('returns false when valid git diff is supplied', () => {
      const diff = `diff --git a/test.js b/test.js
index 123..456 100644
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 return a + b;`;
      expect(isDiffEmpty(diff)).toBe(false);
    });
  });

  describe('parseDiff with single modified file', () => {
    const singleFileDiff = `diff --git a/src/calculator.js b/src/calculator.js
index 1111111..2222222 100644
--- a/src/calculator.js
+++ b/src/calculator.js
@@ -1,5 +1,7 @@
 export function add(a, b) {
-  return a + b;
+  // Added validation
+  if (a == null) return 0;
   return a + b;
 }`;

    it('parses file paths and modification status', () => {
      const files = parseDiff(singleFileDiff);
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.path).toBe('src/calculator.js');
      expect(file.oldPath).toBe('src/calculator.js');
      expect(file.newPath).toBe('src/calculator.js');
      expect(file.status).toBe('modified');
    });

    it('identifies added line numbers strictly and excludes context and deleted lines', () => {
      const files = parseDiff(singleFileDiff);
      const file = files[0];

      expect(file.addedLines).toBeInstanceOf(Set);
      expect(file.addedLines.size).toBe(2);
      expect(file.addedLines.has(2)).toBe(true);
      expect(file.addedLines.has(3)).toBe(true);
      expect(file.addedLines.has(1)).toBe(false);
      expect(file.addedLines.has(4)).toBe(false);
      expect(file.addedLines.has(5)).toBe(false);

      expect(file.addedLinesCount).toBe(2);
      expect(file.deletedLinesCount).toBe(1);
    });

    it('reconstructs resulting file content accurately', () => {
      const files = parseDiff(singleFileDiff);
      const file = files[0];
      const lines = file.reconstructedContent.split('\n');

      expect(lines[0]).toBe('export function add(a, b) {');
      expect(lines[1]).toBe('  // Added validation');
      expect(lines[2]).toBe('  if (a == null) return 0;');
      expect(lines[3]).toBe('  return a + b;');
      expect(lines[4]).toBe('}');
    });
  });

  describe('parseDiff with multiple hunks and padding', () => {
    const multiHunkDiff = `diff --git a/src/utils.js b/src/utils.js
index aaaaaaa..bbbbbbb 100644
--- a/src/utils.js
+++ b/src/utils.js
@@ -2,3 +2,4 @@
 export const PI = 3.14;
+// First added comment
 export const E = 2.71;
@@ -8,3 +9,4 @@
 export function square(x) {
   return x * x;
 }
+// Second added comment`;

    it('correctly maps coordinates across spaced hunks', () => {
      const files = parseDiff(multiHunkDiff);
      const file = files[0];

      expect(file.hunks).toHaveLength(2);
      expect(file.addedLines.has(3)).toBe(true);
      expect(file.addedLines.has(12)).toBe(true);
      expect(file.addedLines.size).toBe(2);

      const lines = file.reconstructedContent.split('\n');
      expect(lines[2]).toBe('// First added comment');
      expect(lines[11]).toBe('// Second added comment');
      expect(lines[0]).toBe('');
      expect(lines[1]).toBe('export const PI = 3.14;');
      expect(lines[3]).toBe('export const E = 2.71;');
    });
  });

  describe('parseDiff with newly created file', () => {
    const newFileDiff = `diff --git a/src/newFeature.js b/src/newFeature.js
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/newFeature.js
@@ -0,0 +1,3 @@
+// Brand new feature
+export const enabled = true;
+export default enabled;`;

    it('identifies added status and handles /dev/null oldPath', () => {
      const files = parseDiff(newFileDiff);
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.status).toBe('added');
      expect(file.oldPath).toBeNull();
      expect(file.newPath).toBe('src/newFeature.js');
      expect(file.path).toBe('src/newFeature.js');
      expect(file.addedLinesCount).toBe(3);
      expect(file.deletedLinesCount).toBe(0);
      expect(file.addedLines.has(1)).toBe(true);
      expect(file.addedLines.has(2)).toBe(true);
      expect(file.addedLines.has(3)).toBe(true);
      expect(file.reconstructedContent).toBe(
        '// Brand new feature\nexport const enabled = true;\nexport default enabled;'
      );
    });
  });

  describe('parseDiff with deleted file', () => {
    const deletedFileDiff = `diff --git a/src/deprecated.js b/src/deprecated.js
deleted file mode 100644
index 4444444..0000000
--- a/src/deprecated.js
+++ /dev/null
@@ -1,3 +0,0 @@
-// To be removed
-export const deprecated = true;
-export default deprecated;`;

    it('identifies deleted status and leaves reconstructedContent empty', () => {
      const files = parseDiff(deletedFileDiff);
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.status).toBe('deleted');
      expect(file.oldPath).toBe('src/deprecated.js');
      expect(file.newPath).toBeNull();
      expect(file.path).toBe('src/deprecated.js');
      expect(file.addedLinesCount).toBe(0);
      expect(file.deletedLinesCount).toBe(3);
      expect(file.addedLines.size).toBe(0);
      expect(file.reconstructedContent).toBe('');
    });
  });

  describe('parseDiff with renamed file', () => {
    const renameWithChangesDiff = `diff --git a/src/oldName.js b/src/newName.js
similarity index 80%
rename from src/oldName.js
rename to src/newName.js
index 5555555..6666666 100644
--- a/src/oldName.js
+++ b/src/newName.js
@@ -1,3 +1,4 @@
 export const name = 'item';
+// Renamed module comment
 export const version = 2;
 export default name;`;

    it('identifies renamed status and maps to newPath', () => {
      const files = parseDiff(renameWithChangesDiff);
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.status).toBe('renamed');
      expect(file.oldPath).toBe('src/oldName.js');
      expect(file.newPath).toBe('src/newName.js');
      expect(file.path).toBe('src/newName.js');
      expect(file.addedLines.has(2)).toBe(true);
      expect(file.addedLines.size).toBe(1);
    });

    it('handles pure rename without hunks', () => {
      const pureRenameDiff = `diff --git a/src/icon.svg b/src/logo.svg
similarity index 100%
rename from src/icon.svg
rename to src/logo.svg`;

      const files = parseDiff(pureRenameDiff);
      expect(files).toHaveLength(1);

      const file = files[0];
      expect(file.status).toBe('renamed');
      expect(file.oldPath).toBe('src/icon.svg');
      expect(file.newPath).toBe('src/logo.svg');
      expect(file.path).toBe('src/logo.svg');
      expect(file.hunks).toHaveLength(0);
      expect(file.addedLines.size).toBe(0);
      expect(file.reconstructedContent).toBe('');
    });
  });

  describe('parseDiff with pure deletion in existing file', () => {
    const pureDeletionDiff = `diff --git a/src/clean.js b/src/clean.js
index 7777777..8888888 100644
--- a/src/clean.js
+++ b/src/clean.js
@@ -1,4 +1,2 @@
 const a = 1;
-// Delete this line
-// Delete this too
 const b = 2;`;

    it('records deletions with zero added lines', () => {
      const files = parseDiff(pureDeletionDiff);
      const file = files[0];

      expect(file.status).toBe('modified');
      expect(file.addedLines.size).toBe(0);
      expect(file.addedLinesCount).toBe(0);
      expect(file.deletedLinesCount).toBe(2);
      expect(file.reconstructedContent).toBe('const a = 1;\nconst b = 2;');
    });
  });

  describe('parseDiff with multiple files and standard patch formats', () => {
    const multiFileDiff = `diff --git a/src/first.js b/src/first.js
index 111..222 100644
--- a/src/first.js
+++ b/src/first.js
@@ -1,2 +1,3 @@
 const one = 1;
+// first added
 const two = 2;
diff --git a/src/second.py b/src/second.py
index 333..444 100644
--- a/src/second.py
+++ b/src/second.py
@@ -1,2 +1,3 @@
 x = 10
+# python comment
 y = 20`;

    it('parses multiple file blocks in a single diff', () => {
      const files = parseDiff(multiFileDiff);
      expect(files).toHaveLength(2);

      expect(files[0].path).toBe('src/first.js');
      expect(files[0].addedLines.has(2)).toBe(true);

      expect(files[1].path).toBe('src/second.py');
      expect(files[1].addedLines.has(2)).toBe(true);
    });

    it('parses patch format without diff --git header', () => {
      const patchDiff = `--- a/config.json
+++ b/config.json
@@ -1,2 +1,3 @@
 {
+  "audit": true,
   "enabled": true
 }`;

      const files = parseDiff(patchDiff);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('config.json');
      expect(files[0].addedLines.has(2)).toBe(true);
      expect(files[0].reconstructedContent).toBe('{\n  "audit": true,\n  "enabled": true\n}');
    });
  });

  describe('parseDiff edge cases', () => {
    it('handles Windows CRLF line endings transparently', () => {
      const crlfDiff =
        'diff --git a/crlf.js b/crlf.js\r\n' +
        '--- a/crlf.js\r\n' +
        '+++ b/crlf.js\r\n' +
        '@@ -1,2 +1,3 @@\r\n' +
        ' line1\r\n' +
        '+line2\r\n' +
        ' line3';

      const files = parseDiff(crlfDiff);
      expect(files).toHaveLength(1);
      expect(files[0].addedLines.has(2)).toBe(true);
      expect(files[0].reconstructedContent).toBe('line1\nline2\nline3');
    });

    it('handles No newline at end of file marker', () => {
      const noNewlineDiff = `diff --git a/inline.txt b/inline.txt
--- a/inline.txt
+++ b/inline.txt
@@ -1 +1,2 @@
 first
+second
\\ No newline at end of file`;

      const files = parseDiff(noNewlineDiff);
      expect(files).toHaveLength(1);
      expect(files[0].addedLines.has(2)).toBe(true);
      expect(files[0].reconstructedContent).toBe('first\nsecond');
    });

    it('handles empty context lines without leading spaces inside hunks', () => {
      const emptyLineDiff = `diff --git a/emptyLine.js b/emptyLine.js
--- a/emptyLine.js
+++ b/emptyLine.js
@@ -1,3 +1,4 @@
 line1

+addedLine
 line3`;

      const files = parseDiff(emptyLineDiff);
      expect(files).toHaveLength(1);
      expect(files[0].addedLines.has(3)).toBe(true);
      expect(files[0].reconstructedContent).toBe('line1\n\naddedLine\nline3');
    });
  });

  describe('extractDiffFiles and getDiffStats', () => {
    const statsDiff = `diff --git a/a.js b/a.js
--- a/a.js
+++ b/a.js
@@ -1,2 +1,4 @@
 a
+b
+c
 d
diff --git a/b.js b/b.js
--- a/b.js
+++ b/b.js
@@ -1,3 +1,2 @@
 x
-y
 z`;

    it('extracts summary of changed files with additions and deletions', () => {
      const summaries = extractDiffFiles(statsDiff);
      expect(summaries).toEqual([
        {
          path: 'a.js',
          oldPath: 'a.js',
          newPath: 'a.js',
          status: 'modified',
          additions: 2,
          deletions: 0
        },
        {
          path: 'b.js',
          oldPath: 'b.js',
          newPath: 'b.js',
          status: 'modified',
          additions: 0,
          deletions: 1
        }
      ]);
    });

    it('computes overall aggregate statistics', () => {
      const stats = getDiffStats(statsDiff);
      expect(stats).toEqual({
        filesChanged: 2,
        additions: 2,
        deletions: 1
      });
    });

    it('returns zeroes when diff is empty', () => {
      const stats = getDiffStats('');
      expect(stats).toEqual({
        filesChanged: 0,
        additions: 0,
        deletions: 0
      });
    });
  });
});
