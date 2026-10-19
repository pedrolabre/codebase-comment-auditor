import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  isZipFile,
  stripZipRootFolder,
  extractZipFiles
} from '../../src/services/zipService.js';

describe('zipService', () => {
  describe('isZipFile', () => {
    it('detects .zip extension in string filenames', () => {
      expect(isZipFile('project.zip')).toBe(true);
      expect(isZipFile('ARCHIVE.ZIP')).toBe(true);
      expect(isZipFile('/path/to/my-repo.zip')).toBe(true);
      expect(isZipFile('project.tar.gz')).toBe(false);
      expect(isZipFile('code.js')).toBe(false);
    });

    it('detects .zip from file-like objects with name or MIME type', () => {
      expect(isZipFile({ name: 'codebase.zip', size: 1024 })).toBe(true);
      expect(isZipFile({ name: 'archive.ZIP', type: 'application/octet-stream' })).toBe(true);
      expect(isZipFile({ name: 'blob', type: 'application/zip' })).toBe(true);
      expect(isZipFile({ name: 'blob', type: 'application/x-zip-compressed' })).toBe(true);
      expect(isZipFile({ name: 'image.png', type: 'image/png' })).toBe(false);
    });

    it('returns false for null, undefined or empty values', () => {
      expect(isZipFile(null)).toBe(false);
      expect(isZipFile(undefined)).toBe(false);
      expect(isZipFile('')).toBe(false);
      expect(isZipFile({})).toBe(false);
    });
  });

  describe('stripZipRootFolder', () => {
    it('removes the first directory segment from relative paths', () => {
      expect(stripZipRootFolder('repo-master/README.md')).toBe('README.md');
      expect(stripZipRootFolder('octocat-repo-7fd1a60/src/index.js')).toBe('src/index.js');
      expect(stripZipRootFolder('root-folder/deep/nested/file.ts')).toBe('deep/nested/file.ts');
    });

    it('normalizes Windows backslashes and leading slashes', () => {
      expect(stripZipRootFolder('repo-master\\src\\App.vue')).toBe('src/App.vue');
      expect(stripZipRootFolder('/repo-master/src/App.vue')).toBe('src/App.vue');
    });

    it('returns the same path if there is no directory separator', () => {
      expect(stripZipRootFolder('README.md')).toBe('README.md');
    });

    it('returns empty string if the path is only the root directory', () => {
      expect(stripZipRootFolder('repo-master/')).toBe('');
    });

    it('handles non-string inputs safely', () => {
      expect(stripZipRootFolder(null)).toBe('');
      expect(stripZipRootFolder(undefined)).toBe('');
    });
  });

  describe('extractZipFiles', () => {
    it('extracts files in memory and strips GitHub automatic root folder', async () => {
      const zip = new JSZip();
      const rootFolder = 'octocat-Hello-World-7fd1a60/';

      zip.file(`${rootFolder}README.md`, '# Hello World\nRepository description.');
      zip.file(`${rootFolder}src/index.js`, 'console.log("hello"); // greeting');
      zip.file(`${rootFolder}src/utils/math.js`, 'export const add = (a, b) => a + b;');
      zip.folder(`${rootFolder}empty-directory/`);

      const zipUint8 = await zip.generateAsync({ type: 'uint8array' });
      const extracted = await extractZipFiles(zipUint8);

      expect(extracted).toHaveLength(3);

      const paths = extracted.map((f) => f.path).sort();
      expect(paths).toEqual([
        'README.md',
        'src/index.js',
        'src/utils/math.js'
      ]);

      const readme = extracted.find((f) => f.path === 'README.md');
      expect(readme.content).toBe('# Hello World\nRepository description.');
      expect(readme.size).toBeGreaterThan(0);

      const indexJs = extracted.find((f) => f.path === 'src/index.js');
      expect(indexJs.content).toBe('console.log("hello"); // greeting');
    });

    it('extracts files without common root without modifying paths in auto mode', async () => {
      const zip = new JSZip();
      zip.file('package.json', '{"name": "test"}');
      zip.file('src/main.js', 'console.log(1);');

      const zipUint8 = await zip.generateAsync({ type: 'uint8array' });
      const extracted = await extractZipFiles(zipUint8);

      expect(extracted).toHaveLength(2);
      expect(extracted.map((f) => f.path).sort()).toEqual(['package.json', 'src/main.js']);
    });

    it('supports stripRoot: true option to force stripping top directory', async () => {
      const zip = new JSZip();
      zip.file('custom-root/file1.txt', 'content 1');
      zip.file('custom-root/file2.txt', 'content 2');

      const zipUint8 = await zip.generateAsync({ type: 'uint8array' });
      const extracted = await extractZipFiles(zipUint8, { stripRoot: true });

      expect(extracted.map((f) => f.path).sort()).toEqual(['file1.txt', 'file2.txt']);
    });

    it('supports stripRoot: false option to preserve full paths', async () => {
      const zip = new JSZip();
      zip.file('my-folder/file1.txt', 'content');

      const zipUint8 = await zip.generateAsync({ type: 'uint8array' });
      const extracted = await extractZipFiles(zipUint8, { stripRoot: false });

      expect(extracted[0].path).toBe('my-folder/file1.txt');
    });

    it('supports Blob and ArrayBuffer input sources', async () => {
      const zip = new JSZip();
      zip.file('test.txt', 'sample content');

      const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const fromArrayBuffer = await extractZipFiles(arrayBuffer);
      expect(fromArrayBuffer).toHaveLength(1);
      expect(fromArrayBuffer[0].content).toBe('sample content');

      const blob = new Blob([arrayBuffer], { type: 'application/zip' });
      const fromBlob = await extractZipFiles(blob);
      expect(fromBlob).toHaveLength(1);
      expect(fromBlob[0].content).toBe('sample content');
    });

    it('throws descriptive error on corrupted or invalid zip data', async () => {
      const corruptData = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x90]);

      await expect(extractZipFiles(corruptData)).rejects.toThrow(
        /Arquivo ZIP corrompido ou formato inválido/
      );
    });

    it('throws error when zipSource is missing or null', async () => {
      await expect(extractZipFiles(null)).rejects.toThrow(
        'Fonte de dados compactada (.zip) inválida ou não fornecida'
      );
      await expect(extractZipFiles(undefined)).rejects.toThrow(
        'Fonte de dados compactada (.zip) inválida ou não fornecida'
      );
    });
  });
});
