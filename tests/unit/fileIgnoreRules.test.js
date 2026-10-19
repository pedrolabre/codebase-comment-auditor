import { describe, it, expect } from 'vitest';
import {
  isIgnoredDirectory,
  isMinifiedFile,
  isBinaryOrExcluded,
  isFileSizeExceeded,
  evaluateFileEligibility,
  DEFAULT_MAX_FILE_SIZE,
  IGNORED_DIRECTORIES,
  BINARY_EXTENSIONS,
  LOCK_FILES
} from '../../src/utils/fileIgnoreRules.js';

describe('fileIgnoreRules', () => {
  describe('Constants definition', () => {
    it('defines frozen lists of directories, binary extensions and lockfiles', () => {
      expect(Array.isArray(IGNORED_DIRECTORIES)).toBe(true);
      expect(IGNORED_DIRECTORIES).toContain('node_modules');
      expect(IGNORED_DIRECTORIES).toContain('dist');
      expect(IGNORED_DIRECTORIES).toContain('.git');

      expect(Array.isArray(BINARY_EXTENSIONS)).toBe(true);
      expect(BINARY_EXTENSIONS).toContain('.png');
      expect(BINARY_EXTENSIONS).toContain('.wasm');

      expect(Array.isArray(LOCK_FILES)).toBe(true);
      expect(LOCK_FILES).toContain('package-lock.json');
      expect(LOCK_FILES).toContain('yarn.lock');

      expect(DEFAULT_MAX_FILE_SIZE).toBe(1024 * 1024);
    });
  });

  describe('isIgnoredDirectory', () => {
    it('returns true for common dependency, build and VCS folders', () => {
      expect(isIgnoredDirectory('node_modules/vue/package.json')).toBe(true);
      expect(isIgnoredDirectory('vendor/autoload.php')).toBe(true);
      expect(isIgnoredDirectory('dist/index.html')).toBe(true);
      expect(isIgnoredDirectory('build/static/app.js')).toBe(true);
      expect(isIgnoredDirectory('out/output.txt')).toBe(true);
      expect(isIgnoredDirectory('.next/server/main.js')).toBe(true);
      expect(isIgnoredDirectory('.nuxt/nitro.config.ts')).toBe(true);
      expect(isIgnoredDirectory('.git/config')).toBe(true);
      expect(isIgnoredDirectory('.github/workflows/ci.yml')).toBe(true);
      expect(isIgnoredDirectory('coverage/lcov.info')).toBe(true);
      expect(isIgnoredDirectory('src/nested/node_modules/dep/index.js')).toBe(true);
    });

    it('normalizes Windows backslashes', () => {
      expect(isIgnoredDirectory('src\\dist\\output.js')).toBe(true);
      expect(isIgnoredDirectory('node_modules\\lodash\\index.js')).toBe(true);
    });

    it('identifies pure directory paths', () => {
      expect(isIgnoredDirectory('node_modules')).toBe(true);
      expect(isIgnoredDirectory('dist/')).toBe(true);
      expect(isIgnoredDirectory('.git')).toBe(true);
    });

    it('returns false for normal source directories and files that happen to share substrings', () => {
      expect(isIgnoredDirectory('src/components/Button.vue')).toBe(false);
      expect(isIgnoredDirectory('src/services/distributionService.js')).toBe(false);
      expect(isIgnoredDirectory('my-dist-file.js')).toBe(false);
      expect(isIgnoredDirectory('scripts/audit_node_modules.py')).toBe(false);
      expect(isIgnoredDirectory('src/views/HomeView.vue')).toBe(false);
    });

    it('returns false for empty or non-string inputs', () => {
      expect(isIgnoredDirectory('')).toBe(false);
      expect(isIgnoredDirectory(null)).toBe(false);
      expect(isIgnoredDirectory(undefined)).toBe(false);
      expect(isIgnoredDirectory(123)).toBe(false);
    });
  });

  describe('isMinifiedFile', () => {
    it('detects minified and bundled script or stylesheet files', () => {
      expect(isMinifiedFile('bundle.min.js')).toBe(true);
      expect(isMinifiedFile('src/assets/styles.min.css')).toBe(true);
      expect(isMinifiedFile('app.bundle.js')).toBe(true);
      expect(isMinifiedFile('0.chunk.js')).toBe(true);
      expect(isMinifiedFile('index-CeaEEnYj.js')).toBe(true);
    });

    it('returns false for non-minified source files', () => {
      expect(isMinifiedFile('bundle.js')).toBe(false);
      expect(isMinifiedFile('styles.css')).toBe(false);
      expect(isMinifiedFile('minimal.js')).toBe(false);
      expect(isMinifiedFile('src/chunker.js')).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(isMinifiedFile('')).toBe(false);
      expect(isMinifiedFile(null)).toBe(false);
      expect(isMinifiedFile(undefined)).toBe(false);
    });
  });

  describe('isBinaryOrExcluded', () => {
    it('identifies images, media, compiled and font binaries', () => {
      expect(isBinaryOrExcluded('assets/logo.png')).toBe(true);
      expect(isBinaryOrExcluded('public/avatar.jpg')).toBe(true);
      expect(isBinaryOrExcluded('public/icon.svg')).toBe(true);
      expect(isBinaryOrExcluded('public/font.woff2')).toBe(true);
      expect(isBinaryOrExcluded('public/tree-sitter.wasm')).toBe(true);
      expect(isBinaryOrExcluded('docs/manual.pdf')).toBe(true);
      expect(isBinaryOrExcluded('bin/runner.exe')).toBe(true);
      expect(isBinaryOrExcluded('lib/native.so')).toBe(true);
      expect(isBinaryOrExcluded('__pycache__/script.pyc')).toBe(true);
    });

    it('identifies lockfiles as excluded', () => {
      expect(isBinaryOrExcluded('package-lock.json')).toBe(true);
      expect(isBinaryOrExcluded('yarn.lock')).toBe(true);
      expect(isBinaryOrExcluded('pnpm-lock.yaml')).toBe(true);
      expect(isBinaryOrExcluded('cargo.lock')).toBe(true);
    });

    it('identifies minified files as excluded', () => {
      expect(isBinaryOrExcluded('vendor/jquery.min.js')).toBe(true);
      expect(isBinaryOrExcluded('dist/app.bundle.js')).toBe(true);
    });

    it('returns false for regular source code files', () => {
      expect(isBinaryOrExcluded('src/main.js')).toBe(false);
      expect(isBinaryOrExcluded('src/types.ts')).toBe(false);
      expect(isBinaryOrExcluded('scripts/deploy.py')).toBe(false);
      expect(isBinaryOrExcluded('styles/theme.css')).toBe(false);
      expect(isBinaryOrExcluded('components/Header.vue')).toBe(false);
      expect(isBinaryOrExcluded('setup.sh')).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(isBinaryOrExcluded('')).toBe(false);
      expect(isBinaryOrExcluded(null)).toBe(false);
      expect(isBinaryOrExcluded(undefined)).toBe(false);
    });
  });

  describe('isFileSizeExceeded', () => {
    it('returns true when file size strictly exceeds the threshold', () => {
      expect(isFileSizeExceeded(DEFAULT_MAX_FILE_SIZE + 1)).toBe(true);
      expect(isFileSizeExceeded(2 * 1024 * 1024)).toBe(true);
      expect(isFileSizeExceeded(1500, 1000)).toBe(true);
    });

    it('returns false when file size is within the allowed limit', () => {
      expect(isFileSizeExceeded(DEFAULT_MAX_FILE_SIZE)).toBe(false);
      expect(isFileSizeExceeded(5000)).toBe(false);
      expect(isFileSizeExceeded(0)).toBe(false);
    });

    it('returns false for invalid, negative or non-numeric sizes', () => {
      expect(isFileSizeExceeded(-100)).toBe(false);
      expect(isFileSizeExceeded(NaN)).toBe(false);
      expect(isFileSizeExceeded(null)).toBe(false);
      expect(isFileSizeExceeded(undefined)).toBe(false);
    });
  });

  describe('evaluateFileEligibility', () => {
    it('evaluates valid source files as eligible with canonical language detected', () => {
      const jsResult = evaluateFileEligibility({ path: 'src/app.js', size: 1024 });
      expect(jsResult).toEqual({
        eligible: true,
        reason: null,
        language: 'javascript'
      });

      const pyResult = evaluateFileEligibility('scripts/migrate.py');
      expect(pyResult).toEqual({
        eligible: true,
        reason: null,
        language: 'python'
      });

      const vueResult = evaluateFileEligibility({ path: 'src/components/Card.vue', size: 500 });
      expect(vueResult).toEqual({
        eligible: true,
        reason: null,
        language: 'html'
      });
    });

    it('discards files from ignored directories with ignored-directory reason', () => {
      const result = evaluateFileEligibility({
        path: 'node_modules/axios/index.js',
        size: 2048
      });
      expect(result).toEqual({
        eligible: false,
        reason: 'ignored-directory',
        language: null
      });
    });

    it('discards files exceeding size limit with file-size-exceeded reason', () => {
      const result = evaluateFileEligibility({
        path: 'src/largeData.js',
        size: 2 * 1024 * 1024
      });
      expect(result).toEqual({
        eligible: false,
        reason: 'file-size-exceeded',
        language: null
      });
    });

    it('discards minified files with minified-file reason', () => {
      const result = evaluateFileEligibility({
        path: 'src/assets/lib.min.js',
        size: 5000
      });
      expect(result).toEqual({
        eligible: false,
        reason: 'minified-file',
        language: null
      });
    });

    it('discards binary and lockfiles with binary-file reason', () => {
      const binResult = evaluateFileEligibility({
        path: 'assets/image.png',
        size: 1000
      });
      expect(binResult).toEqual({
        eligible: false,
        reason: 'binary-file',
        language: null
      });

      const lockResult = evaluateFileEligibility('package-lock.json');
      expect(lockResult).toEqual({
        eligible: false,
        reason: 'binary-file',
        language: null
      });
    });

    it('discards unsupported languages with unsupported-language reason', () => {
      const rustResult = evaluateFileEligibility({
        path: 'src/main.rs',
        size: 1200
      });
      expect(rustResult).toEqual({
        eligible: false,
        reason: 'unsupported-language',
        language: null
      });

      const mdResult = evaluateFileEligibility('README.md');
      expect(mdResult).toEqual({
        eligible: false,
        reason: 'unsupported-language',
        language: null
      });
    });

    it('handles invalid or empty file entries gracefully', () => {
      expect(evaluateFileEligibility(null)).toEqual({
        eligible: false,
        reason: 'invalid-file',
        language: null
      });

      expect(evaluateFileEligibility('')).toEqual({
        eligible: false,
        reason: 'invalid-file',
        language: null
      });

      expect(evaluateFileEligibility({ path: '' })).toEqual({
        eligible: false,
        reason: 'invalid-file',
        language: null
      });
    });
  });
});
