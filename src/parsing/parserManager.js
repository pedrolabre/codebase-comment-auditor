import Parser from 'web-tree-sitter';

const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'css',
  'html',
  'bash'
];

const LANGUAGE_ALIASES = {
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'typescript',
  python: 'python',
  py: 'python',
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

export class ParserManager {
  constructor() {
    this.parser = null;
    this.languages = new Map();
    this.loadingPromises = new Map();
    this.initPromise = null;
  }

  normalizeLanguage(language) {
    if (!language || typeof language !== 'string') {
      return null;
    }
    const clean = language.trim().toLowerCase();
    return LANGUAGE_ALIASES[clean] || (SUPPORTED_LANGUAGES.includes(clean) ? clean : null);
  }

  getSupportedLanguages() {
    return [...SUPPORTED_LANGUAGES];
  }

  isLanguageSupported(language) {
    return this.normalizeLanguage(language) !== null;
  }

  hasLanguage(language) {
    const canonical = this.normalizeLanguage(language);
    return canonical !== null && this.languages.has(canonical);
  }

  getGrammarPath(language) {
    if (typeof window === 'undefined') {
      const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
      return `${cwd}/public/grammars/tree-sitter-${language}.wasm`;
    }
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
    const prefix = base.endsWith('/') ? base : `${base}/`;
    return `${prefix}grammars/tree-sitter-${language}.wasm`;
  }

  async initParser() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const isNode = typeof window === 'undefined';
      await Parser.init({
        locateFile(scriptName, scriptDirectory) {
          if (isNode) {
            return scriptDirectory + scriptName;
          }
          const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
          const prefix = base.endsWith('/') ? base : `${base}/`;
          return `${prefix}${scriptName}`;
        }
      });
      this.parser = new Parser();
    })();

    return this.initPromise;
  }

  async loadLanguage(language) {
    await this.initParser();

    const canonical = this.normalizeLanguage(language);
    if (!canonical) {
      throw new Error(`Unsupported language: "${language}". Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}`);
    }

    if (this.languages.has(canonical)) {
      return this.languages.get(canonical);
    }

    if (this.loadingPromises.has(canonical)) {
      return this.loadingPromises.get(canonical);
    }

    const loadPromise = (async () => {
      try {
        const wasmPath = this.getGrammarPath(canonical);
        const loadedLanguage = await Parser.Language.load(wasmPath);
        this.languages.set(canonical, loadedLanguage);
        return loadedLanguage;
      } finally {
        this.loadingPromises.delete(canonical);
      }
    })();

    this.loadingPromises.set(canonical, loadPromise);
    return loadPromise;
  }

  async parseCode(code, language) {
    await this.initParser();

    const languageInstance = await this.loadLanguage(language);
    this.parser.setLanguage(languageInstance);

    const safeCode = typeof code === 'string' ? code : '';
    return this.parser.parse(safeCode);
  }

  reset() {
    if (this.parser) {
      this.parser.delete();
      this.parser = new Parser();
    }
    this.languages.clear();
    this.loadingPromises.clear();
  }
}

export const parserManager = new ParserManager();
export default parserManager;
