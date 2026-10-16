import { getCanonicalLanguage } from './languageDetector.js';

const PYTHON_DOCSTRING_REGEX = /^(?:[rRuUbB]{0,2})("""|''')/;

function isJsBlockComment(node) {
  return Boolean(node && typeof node.text === 'string' && node.text.startsWith('/*'));
}

function isJsDocstring(node) {
  return Boolean(node && typeof node.text === 'string' && node.text.startsWith('/**'));
}

function isPythonDocstring(node) {
  if (!node || node.type !== 'expression_statement') {
    return false;
  }
  const firstChild = node.firstChild;
  if (!firstChild || firstChild.type !== 'string') {
    return false;
  }
  if (typeof node.text !== 'string') {
    return false;
  }
  return PYTHON_DOCSTRING_REGEX.test(node.text.trim());
}

export const GRAMMAR_CONFIG = {
  javascript: {
    wasm: '/grammars/tree-sitter-javascript.wasm',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    commentNodeTypes: ['comment'],
    isCommentNode: (node) => Boolean(node && node.type === 'comment'),
    isBlockComment: isJsBlockComment,
    isDocstring: isJsDocstring,
    getCommentType: (node) => {
      if (isJsDocstring(node)) {
        return 'docstring';
      }
      if (isJsBlockComment(node)) {
        return 'block';
      }
      return 'line';
    }
  },
  typescript: {
    wasm: '/grammars/tree-sitter-typescript.wasm',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    commentNodeTypes: ['comment'],
    isCommentNode: (node) => Boolean(node && node.type === 'comment'),
    isBlockComment: isJsBlockComment,
    isDocstring: isJsDocstring,
    getCommentType: (node) => {
      if (isJsDocstring(node)) {
        return 'docstring';
      }
      if (isJsBlockComment(node)) {
        return 'block';
      }
      return 'line';
    }
  },
  python: {
    wasm: '/grammars/tree-sitter-python.wasm',
    extensions: ['.py', '.pyw'],
    commentNodeTypes: ['comment', 'expression_statement'],
    isCommentNode: (node) => Boolean(node && (node.type === 'comment' || isPythonDocstring(node))),
    isBlockComment: () => false,
    isDocstring: isPythonDocstring,
    getCommentType: (node) => {
      if (isPythonDocstring(node)) {
        return 'docstring';
      }
      return 'line';
    }
  },
  css: {
    wasm: '/grammars/tree-sitter-css.wasm',
    extensions: ['.css', '.scss', '.less'],
    commentNodeTypes: ['comment'],
    isCommentNode: (node) => Boolean(node && node.type === 'comment'),
    isBlockComment: () => true,
    isDocstring: () => false,
    getCommentType: () => 'block'
  },
  html: {
    wasm: '/grammars/tree-sitter-html.wasm',
    extensions: ['.html', '.htm', '.vue', '.svelte'],
    commentNodeTypes: ['comment'],
    isCommentNode: (node) => Boolean(node && node.type === 'comment'),
    isBlockComment: () => true,
    isDocstring: () => false,
    getCommentType: () => 'block'
  },
  bash: {
    wasm: '/grammars/tree-sitter-bash.wasm',
    extensions: ['.sh', '.bash', '.zsh'],
    commentNodeTypes: ['comment'],
    isCommentNode: (node) => Boolean(node && node.type === 'comment'),
    isBlockComment: () => false,
    isDocstring: () => false,
    getCommentType: () => 'line'
  }
};

export function getGrammarConfig(language) {
  const canonical = getCanonicalLanguage(language);
  if (!canonical) {
    return null;
  }
  return GRAMMAR_CONFIG[canonical] || null;
}

export function isSupportedGrammar(language) {
  return getGrammarConfig(language) !== null;
}
