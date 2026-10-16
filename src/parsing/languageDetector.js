export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'css',
  'html',
  'bash'
];

export const EXTENSION_LANGUAGE_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.pyw': 'python',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.vue': 'html',
  '.svelte': 'html',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash'
};

export const EXACT_FILENAME_MAP = {
  '.bashrc': 'bash',
  '.bash_profile': 'bash',
  '.bash_login': 'bash',
  '.bash_logout': 'bash',
  '.zshrc': 'bash',
  '.zprofile': 'bash',
  '.zshenv': 'bash',
  '.zlogin': 'bash'
};

export const LANGUAGE_ALIASES = {
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  python: 'python',
  py: 'python',
  pyw: 'python',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  htm: 'html',
  vue: 'html',
  svelte: 'html',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash'
};

export function getCanonicalLanguage(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }
  const clean = identifier.trim().toLowerCase();
  return LANGUAGE_ALIASES[clean] || (SUPPORTED_LANGUAGES.includes(clean) ? clean : null);
}

export function detectLanguageFromExtension(extension) {
  if (!extension || typeof extension !== 'string') {
    return null;
  }
  const trimmed = extension.trim().toLowerCase();
  const normalized = trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
  return EXTENSION_LANGUAGE_MAP[normalized] || null;
}

export function detectLanguageFromPath(filepath) {
  if (!filepath || typeof filepath !== 'string') {
    return null;
  }
  const normalizedPath = filepath.replace(/\\/g, '/').trim();
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  const filename = lastSlashIndex >= 0 ? normalizedPath.slice(lastSlashIndex + 1) : normalizedPath;
  const lowerFilename = filename.toLowerCase();

  if (EXACT_FILENAME_MAP[lowerFilename]) {
    return EXACT_FILENAME_MAP[lowerFilename];
  }

  const lastDotIndex = lowerFilename.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === lowerFilename.length - 1) {
    return null;
  }

  const extension = lowerFilename.slice(lastDotIndex);
  return EXTENSION_LANGUAGE_MAP[extension] || null;
}

export function detectLanguage(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const directCanonical = getCanonicalLanguage(trimmed);
  if (directCanonical) {
    return directCanonical;
  }

  const fromExtension = detectLanguageFromExtension(trimmed);
  if (fromExtension) {
    return fromExtension;
  }

  return detectLanguageFromPath(trimmed);
}

export function isLanguageSupported(input) {
  return detectLanguage(input) !== null;
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

export function getSupportedExtensions() {
  return Object.keys(EXTENSION_LANGUAGE_MAP);
}
