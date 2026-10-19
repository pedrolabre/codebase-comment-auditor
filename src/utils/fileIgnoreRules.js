import { detectLanguageFromPath } from '../parsing/languageDetector.js';

export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024;

export const IGNORED_DIRECTORIES = Object.freeze([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '.nyc_output',
  '.git',
  '.github',
  '.svn',
  '.hg',
  '.turbo',
  '.cache',
  '.parcel-cache',
  'bower_components',
  'target',
  'bin',
  'obj'
]);

export const BINARY_EXTENSIONS = Object.freeze([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.svg',
  '.bmp',
  '.tiff',
  '.avif',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.avi',
  '.mov',
  '.flv',
  '.m4a',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.wasm',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.class',
  '.pyc',
  '.pyd',
  '.o',
  '.obj',
  '.bin',
  '.iso',
  '.dmg',
  '.pkg',
  '.apk'
]);

export const LOCK_FILES = Object.freeze([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'poetry.lock',
  'cargo.lock',
  'gemfile.lock',
  'composer.lock'
]);

const MINIFIED_PATTERNS = Object.freeze([
  /\.min\.[a-z0-9]+$/i,
  /\.bundle\.[a-z0-9]+$/i,
  /\.chunk\.[a-z0-9]+$/i,
  /-[a-zA-Z0-9_-]{8,}\.[a-z0-9]+$/i
]);

export function isIgnoredDirectory(filepath) {
  if (!filepath || typeof filepath !== 'string') {
    return false;
  }

  const normalized = filepath.replace(/\\/g, '/').trim();
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  if (normalized.endsWith('/') || (segments.length === 1 && IGNORED_DIRECTORIES.includes(segments[0].toLowerCase()))) {
    return segments.some((segment) =>
      IGNORED_DIRECTORIES.includes(segment.toLowerCase())
    );
  }

  return segments.slice(0, -1).some((segment) =>
    IGNORED_DIRECTORIES.includes(segment.toLowerCase())
  );
}

export function isMinifiedFile(pathOrName) {
  if (!pathOrName || typeof pathOrName !== 'string') {
    return false;
  }

  const normalized = pathOrName.replace(/\\/g, '/').trim();
  const filename = normalized.split('/').filter(Boolean).pop() || '';

  return MINIFIED_PATTERNS.some((pattern) => pattern.test(filename));
}

export function isBinaryOrExcluded(pathOrName) {
  if (!pathOrName || typeof pathOrName !== 'string') {
    return false;
  }

  const normalized = pathOrName.replace(/\\/g, '/').trim();
  const filename = (normalized.split('/').filter(Boolean).pop() || '').toLowerCase();

  if (LOCK_FILES.includes(filename)) {
    return true;
  }

  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = filename.slice(dotIndex);
    if (BINARY_EXTENSIONS.includes(ext)) {
      return true;
    }
  }

  return isMinifiedFile(pathOrName);
}

export function isFileSizeExceeded(size, maxSizeBytes = DEFAULT_MAX_FILE_SIZE) {
  if (typeof size !== 'number' || Number.isNaN(size) || size < 0) {
    return false;
  }
  return size > maxSizeBytes;
}

export function evaluateFileEligibility(fileEntry, options = {}) {
  if (!fileEntry) {
    return {
      eligible: false,
      reason: 'invalid-file',
      language: null
    };
  }

  const path = typeof fileEntry === 'string' ? fileEntry : fileEntry.path;
  const size = typeof fileEntry === 'object' && typeof fileEntry.size === 'number'
    ? fileEntry.size
    : 0;

  if (!path || typeof path !== 'string' || !path.trim()) {
    return {
      eligible: false,
      reason: 'invalid-file',
      language: null
    };
  }

  const maxSizeBytes = typeof options.maxSizeBytes === 'number'
    ? options.maxSizeBytes
    : DEFAULT_MAX_FILE_SIZE;

  if (isIgnoredDirectory(path)) {
    return {
      eligible: false,
      reason: 'ignored-directory',
      language: null
    };
  }

  if (isFileSizeExceeded(size, maxSizeBytes)) {
    return {
      eligible: false,
      reason: 'file-size-exceeded',
      language: null
    };
  }

  if (isMinifiedFile(path)) {
    return {
      eligible: false,
      reason: 'minified-file',
      language: null
    };
  }

  if (isBinaryOrExcluded(path)) {
    return {
      eligible: false,
      reason: 'binary-file',
      language: null
    };
  }

  const language = detectLanguageFromPath(path);
  if (!language) {
    return {
      eligible: false,
      reason: 'unsupported-language',
      language: null
    };
  }

  return {
    eligible: true,
    reason: null,
    language
  };
}

export default {
  DEFAULT_MAX_FILE_SIZE,
  IGNORED_DIRECTORIES,
  BINARY_EXTENSIONS,
  LOCK_FILES,
  isIgnoredDirectory,
  isMinifiedFile,
  isBinaryOrExcluded,
  isFileSizeExceeded,
  evaluateFileEligibility
};
