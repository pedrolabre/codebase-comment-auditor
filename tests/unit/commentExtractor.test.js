import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  detectLanguageFromExtension,
  detectLanguageFromPath,
  getCanonicalLanguage,
  isLanguageSupported,
  getSupportedLanguages,
  getSupportedExtensions
} from '../../src/parsing/languageDetector.js';
import { getGrammarConfig, isSupportedGrammar } from '../../src/parsing/grammars.js';
import { extractRawComments, extractRawCommentsFromTree } from '../../src/parsing/commentExtractor.js';
import { parserManager } from '../../src/parsing/parserManager.js';

describe('Language Detector & Grammars', () => {
  it('detects language from extensions correctly', () => {
    expect(detectLanguageFromExtension('.js')).toBe('javascript');
    expect(detectLanguageFromExtension('js')).toBe('javascript');
    expect(detectLanguageFromExtension('.jsx')).toBe('javascript');
    expect(detectLanguageFromExtension('.ts')).toBe('typescript');
    expect(detectLanguageFromExtension('.tsx')).toBe('typescript');
    expect(detectLanguageFromExtension('.py')).toBe('python');
    expect(detectLanguageFromExtension('.css')).toBe('css');
    expect(detectLanguageFromExtension('.html')).toBe('html');
    expect(detectLanguageFromExtension('.vue')).toBe('html');
    expect(detectLanguageFromExtension('.svelte')).toBe('html');
    expect(detectLanguageFromExtension('.sh')).toBe('bash');
    expect(detectLanguageFromExtension('.rs')).toBeNull();
    expect(detectLanguageFromExtension('')).toBeNull();
    expect(detectLanguageFromExtension(null)).toBeNull();
  });

  it('detects language from relative and absolute file paths', () => {
    expect(detectLanguageFromPath('src/main.js')).toBe('javascript');
    expect(detectLanguageFromPath('src/components/Header.vue')).toBe('html');
    expect(detectLanguageFromPath('scripts/deploy.sh')).toBe('bash');
    expect(detectLanguageFromPath('home/.bashrc')).toBe('bash');
    expect(detectLanguageFromPath('home/.zshrc')).toBe('bash');
    expect(detectLanguageFromPath('C:\\Users\\code\\app.py')).toBe('python');
    expect(detectLanguageFromPath('archive.tar.gz')).toBeNull();
  });

  it('normalizes canonical language names and aliases', () => {
    expect(getCanonicalLanguage('js')).toBe('javascript');
    expect(getCanonicalLanguage('ts')).toBe('typescript');
    expect(getCanonicalLanguage('py')).toBe('python');
    expect(getCanonicalLanguage('shell')).toBe('bash');
    expect(getCanonicalLanguage('unknown')).toBeNull();
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('.bashrc')).toBe('bash');
  });

  it('provides supported languages and extension catalogs', () => {
    expect(isLanguageSupported('javascript')).toBe(true);
    expect(isLanguageSupported('.py')).toBe(true);
    expect(isLanguageSupported('rust')).toBe(false);
    expect(getSupportedLanguages()).toEqual(['javascript', 'typescript', 'python', 'css', 'html', 'bash']);
    expect(getSupportedExtensions()).toContain('.js');
    expect(getSupportedExtensions()).toContain('.vue');
    expect(isSupportedGrammar('javascript')).toBe(true);
    expect(isSupportedGrammar('unknown')).toBe(false);
    expect(getGrammarConfig('javascript').commentNodeTypes).toContain('comment');
    expect(getGrammarConfig('python').commentNodeTypes).toContain('expression_statement');
  });
});

describe('JavaScript & TypeScript Extraction', () => {
  it('extracts line, inline, block, reference and JSDoc comments', async () => {
    const code = [
      '/// <reference types="vite/client" />',
      'const endpoint = "https://example.com/api"; // Inline comment',
      '/* Block comment */',
      '/**',
      ' * JSDoc description',
      ' */',
      'const total = 42;'
    ].join('\n');

    const comments = await extractRawComments(code, 'javascript', 'src/service.js');
    expect(comments).toHaveLength(4);

    expect(comments[0].text).toBe('/// <reference types="vite/client" />');
    expect(comments[0].type).toBe('line');
    expect(comments[0].startLine).toBe(1);

    expect(comments[1].text).toBe('// Inline comment');
    expect(comments[1].type).toBe('line');
    expect(comments[1].startLine).toBe(2);

    expect(comments[2].text).toBe('/* Block comment */');
    expect(comments[2].type).toBe('block');
    expect(comments[2].startLine).toBe(3);

    expect(comments[3].text.startsWith('/**')).toBe(true);
    expect(comments[3].type).toBe('docstring');
    expect(comments[3].startLine).toBe(4);
    expect(comments[3].endLine).toBe(6);
  });

  it('ignores template literals and strings containing comment delimiters', async () => {
    const code = [
      'const msg = `// not a comment ${1 + 1} /* also not */`;',
      'const url = "https://example.com/path//not/comment";',
      'const regex = /\\/\\* not a comment \\*\\//g;'
    ].join('\n');

    const comments = await extractRawComments(code, 'typescript', 'src/safe.ts');
    expect(comments).toHaveLength(0);
  });
});

describe('Python Extraction & Docstrings', () => {
  it('extracts hash comments, module/function docstrings and raw docstrings', async () => {
    const code = [
      '# Python file header',
      '"""Module docstring for test module."""',
      'def calculate(total):',
      '    """Function docstring for calculate."""',
      '    query = """SELECT * FROM table WHERE active = 1"""',
      '    url = "https://api.domain.com/data" # inline comment with url',
      '    return total * 2',
      'r"""Raw docstring test"""',
      "'''Single triple quote docstring'''"
    ].join('\n');

    const comments = await extractRawComments(code, 'python', 'analytics.py');
    expect(comments).toHaveLength(6);

    expect(comments[0].text).toBe('# Python file header');
    expect(comments[0].type).toBe('line');
    expect(comments[0].startLine).toBe(1);

    expect(comments[1].text).toBe('"""Module docstring for test module."""');
    expect(comments[1].type).toBe('docstring');
    expect(comments[1].startLine).toBe(2);

    expect(comments[2].text).toBe('"""Function docstring for calculate."""');
    expect(comments[2].type).toBe('docstring');
    expect(comments[2].startLine).toBe(4);

    expect(comments[3].text).toBe('# inline comment with url');
    expect(comments[3].type).toBe('line');
    expect(comments[3].startLine).toBe(6);

    expect(comments[4].text).toBe('r"""Raw docstring test"""');
    expect(comments[4].type).toBe('docstring');
    expect(comments[4].startLine).toBe(8);

    expect(comments[5].text).toBe("'''Single triple quote docstring'''");
    expect(comments[5].type).toBe('docstring');
    expect(comments[5].startLine).toBe(9);
  });
});

describe('CSS, HTML and Bash Extraction', () => {
  it('extracts comments from CSS stylesheets and ignores url strings', async () => {
    const css = [
      '/* Global stylesheet */',
      'body {',
      '  color: red; /* inline comment */',
      '  content: "/* not a comment */";',
      '  background: url("https://example.com/bg.png");',
      '}'
    ].join('\n');

    const comments = await extractRawComments(css, 'css', 'styles.css');
    expect(comments).toHaveLength(2);
    expect(comments[0].text).toBe('/* Global stylesheet */');
    expect(comments[0].type).toBe('block');
    expect(comments[1].text).toBe('/* inline comment */');
    expect(comments[1].type).toBe('block');
  });

  it('extracts HTML comments correctly', async () => {
    const html = [
      '<!DOCTYPE html>',
      '<!-- HTML comment header -->',
      '<html>',
      '  <body><!-- Inner body comment --></body>',
      '</html>'
    ].join('\n');

    const comments = await extractRawComments(html, 'html', 'index.html');
    expect(comments).toHaveLength(2);
    expect(comments[0].text).toBe('<!-- HTML comment header -->');
    expect(comments[0].type).toBe('block');
    expect(comments[1].text).toBe('<!-- Inner body comment -->');
  });

  it('extracts Bash comments, shebang and inline comments', async () => {
    const bash = [
      '#!/usr/bin/env bash',
      '# Automation script',
      'API="https://domain.com" # inline note',
      'grep -E "pattern#notcomment" file.txt'
    ].join('\n');

    const comments = await extractRawComments(bash, 'bash', 'deploy.sh');
    expect(comments).toHaveLength(3);
    expect(comments[0].text).toBe('#!/usr/bin/env bash');
    expect(comments[1].text).toBe('# Automation script');
    expect(comments[2].text).toBe('# inline note');
  });
});

describe('Edge Cases & Regression', () => {
  it('returns empty array for empty, null or comment-free code', async () => {
    expect(await extractRawComments('', 'javascript')).toEqual([]);
    expect(await extractRawComments(null, 'javascript')).toEqual([]);
    expect(await extractRawComments('const a = 1;\nconst b = 2;\n', 'javascript')).toEqual([]);
  });

  it('extracts comments touching the very first and last lines without breaks', async () => {
    const code = '// first line\nconst a = 1;\n// last line';
    const comments = await extractRawComments(code, 'javascript');
    expect(comments).toHaveLength(2);
    expect(comments[0].startLine).toBe(1);
    expect(comments[0].text).toBe('// first line');
    expect(comments[1].startLine).toBe(3);
    expect(comments[1].text).toBe('// last line');
  });

  it('measures multiline block comments with accurate line coordinates', async () => {
    const code = 'const x = 1;\n/*\n * Line 2\n * Line 3\n */\nconst y = 2;';
    const comments = await extractRawComments(code, 'javascript');
    expect(comments).toHaveLength(1);
    expect(comments[0].type).toBe('block');
    expect(comments[0].startLine).toBe(2);
    expect(comments[0].endLine).toBe(5);
  });

  it('resolves language automatically from file path', async () => {
    const comments = await extractRawComments('// js from path', null, 'script.js');
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('// js from path');
  });

  it('throws descriptive error on unsupported language', async () => {
    await expect(extractRawComments('code', 'rust')).rejects.toThrow(
      /Unsupported or unknown language/
    );
  });

  it('extracts comments synchronously from a pre-parsed CST tree', async () => {
    const tree = await parserManager.parseCode('// from tree comment', 'javascript');
    const comments = extractRawCommentsFromTree(tree, 'javascript', 'tree.js');
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('// from tree comment');
    expect(comments[0].file).toBe('tree.js');
  });
});
