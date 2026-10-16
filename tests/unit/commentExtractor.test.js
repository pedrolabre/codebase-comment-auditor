import assert from 'node:assert/strict';
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

async function testLanguageDetector() {
  assert.equal(detectLanguageFromExtension('.js'), 'javascript');
  assert.equal(detectLanguageFromExtension('js'), 'javascript');
  assert.equal(detectLanguageFromExtension('.jsx'), 'javascript');
  assert.equal(detectLanguageFromExtension('.ts'), 'typescript');
  assert.equal(detectLanguageFromExtension('.tsx'), 'typescript');
  assert.equal(detectLanguageFromExtension('.py'), 'python');
  assert.equal(detectLanguageFromExtension('.css'), 'css');
  assert.equal(detectLanguageFromExtension('.html'), 'html');
  assert.equal(detectLanguageFromExtension('.vue'), 'html');
  assert.equal(detectLanguageFromExtension('.svelte'), 'html');
  assert.equal(detectLanguageFromExtension('.sh'), 'bash');
  assert.equal(detectLanguageFromExtension('.rs'), null);
  assert.equal(detectLanguageFromExtension(''), null);
  assert.equal(detectLanguageFromExtension(null), null);

  assert.equal(detectLanguageFromPath('src/main.js'), 'javascript');
  assert.equal(detectLanguageFromPath('src/components/Header.vue'), 'html');
  assert.equal(detectLanguageFromPath('scripts/deploy.sh'), 'bash');
  assert.equal(detectLanguageFromPath('home/.bashrc'), 'bash');
  assert.equal(detectLanguageFromPath('home/.zshrc'), 'bash');
  assert.equal(detectLanguageFromPath('C:\\Users\\code\\app.py'), 'python');
  assert.equal(detectLanguageFromPath('unknown.tar.gz'), null);
  assert.equal(detectLanguageFromPath(''), null);
  assert.equal(detectLanguageFromPath(null), null);

  assert.equal(getCanonicalLanguage('js'), 'javascript');
  assert.equal(getCanonicalLanguage('jsx'), 'javascript');
  assert.equal(getCanonicalLanguage('ts'), 'typescript');
  assert.equal(getCanonicalLanguage('py'), 'python');
  assert.equal(getCanonicalLanguage('shell'), 'bash');
  assert.equal(getCanonicalLanguage('unknown'), null);

  assert.equal(detectLanguage('index.js'), 'javascript');
  assert.equal(detectLanguage('.tsx'), 'typescript');
  assert.equal(detectLanguage('python'), 'python');
  assert.equal(detectLanguage('.bashrc'), 'bash');
  assert.equal(detectLanguage('unsupported.go'), null);

  assert.equal(isLanguageSupported('javascript'), true);
  assert.equal(isLanguageSupported('.py'), true);
  assert.equal(isLanguageSupported('src/App.vue'), true);
  assert.equal(isLanguageSupported('rust'), false);
  assert.equal(isLanguageSupported('.cpp'), false);

  assert.deepEqual(getSupportedLanguages(), [
    'javascript',
    'typescript',
    'python',
    'css',
    'html',
    'bash'
  ]);
  assert.ok(getSupportedExtensions().includes('.js'));
  assert.ok(getSupportedExtensions().includes('.vue'));
}

async function testGrammars() {
  const jsConfig = getGrammarConfig('javascript');
  assert.ok(jsConfig);
  assert.equal(jsConfig.commentNodeTypes.includes('comment'), true);

  const pyConfig = getGrammarConfig('python');
  assert.ok(pyConfig);
  assert.equal(pyConfig.commentNodeTypes.includes('expression_statement'), true);

  assert.equal(isSupportedGrammar('javascript'), true);
  assert.equal(isSupportedGrammar('css'), true);
  assert.equal(isSupportedGrammar('unknown'), false);
}

async function testJavaScriptExtraction() {
  const code = [
    '// Line comment 1',
    'const endpoint = "https://example.com/api"; // Inline comment',
    'const pattern = /\\/\\*/;',
    '/* Block comment */',
    '/**',
    ' * JSDoc description',
    ' */',
    'const tpl = `// not a comment ${endpoint}`;'
  ].join('\n');

  const comments = await extractRawComments(code, 'javascript', 'src/service.js');
  assert.equal(comments.length, 4);

  assert.equal(comments[0].text, '// Line comment 1');
  assert.equal(comments[0].type, 'line');
  assert.equal(comments[0].startLine, 1);
  assert.equal(comments[0].endLine, 1);
  assert.equal(comments[0].file, 'src/service.js');

  assert.equal(comments[1].text, '// Inline comment');
  assert.equal(comments[1].type, 'line');
  assert.equal(comments[1].startLine, 2);
  assert.equal(comments[1].endLine, 2);

  assert.equal(comments[2].text, '/* Block comment */');
  assert.equal(comments[2].type, 'block');
  assert.equal(comments[2].startLine, 4);
  assert.equal(comments[2].endLine, 4);

  assert.ok(comments[3].text.startsWith('/**'));
  assert.equal(comments[3].type, 'docstring');
  assert.equal(comments[3].startLine, 5);
  assert.equal(comments[3].endLine, 7);

  const cleanUrlsOnly = 'const a = "https://domain.com/v1"; const b = "http://test.org";';
  const noComments = await extractRawComments(cleanUrlsOnly, 'javascript');
  assert.equal(noComments.length, 0);

  const cleanRegexOnly = 'const regex = /\\/\\*.*\\*\\//g;';
  const noRegexComments = await extractRawComments(cleanRegexOnly, 'javascript');
  assert.equal(noRegexComments.length, 0);
}

async function testTypeScriptExtraction() {
  const code = [
    '/// <reference types="vite/client" />',
    'interface Config {',
    '  // Port configuration',
    '  port: number;',
    '}',
    '/** Documentation for startServer */',
    'function startServer(cfg: Config) {',
    '  /* setup */',
    '  return cfg.port;',
    '}'
  ].join('\n');

  const comments = await extractRawComments(code, 'typescript', 'src/server.ts');
  assert.equal(comments.length, 4);
  assert.equal(comments[0].type, 'line');
  assert.equal(comments[1].text, '// Port configuration');
  assert.equal(comments[1].type, 'line');
  assert.equal(comments[2].type, 'docstring');
  assert.equal(comments[3].type, 'block');
}

async function testPythonExtraction() {
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
  assert.equal(comments.length, 6);

  assert.equal(comments[0].text, '# Python file header');
  assert.equal(comments[0].type, 'line');
  assert.equal(comments[0].startLine, 1);

  assert.equal(comments[1].text, '"""Module docstring for test module."""');
  assert.equal(comments[1].type, 'docstring');
  assert.equal(comments[1].startLine, 2);

  assert.equal(comments[2].text, '"""Function docstring for calculate."""');
  assert.equal(comments[2].type, 'docstring');
  assert.equal(comments[2].startLine, 4);

  assert.equal(comments[3].text, '# inline comment with url');
  assert.equal(comments[3].type, 'line');
  assert.equal(comments[3].startLine, 6);

  assert.equal(comments[4].text, 'r"""Raw docstring test"""');
  assert.equal(comments[4].type, 'docstring');
  assert.equal(comments[4].startLine, 8);

  assert.equal(comments[5].text, "'''Single triple quote docstring'''");
  assert.equal(comments[5].type, 'docstring');
  assert.equal(comments[5].startLine, 9);
}

async function testCssExtraction() {
  const code = [
    '/* Global stylesheet */',
    'body {',
    '  color: red; /* inline comment */',
    '  content: "/* not a comment */";',
    '  background: url("https://example.com/bg.png");',
    '}'
  ].join('\n');

  const comments = await extractRawComments(code, 'css', 'styles.css');
  assert.equal(comments.length, 2);
  assert.equal(comments[0].text, '/* Global stylesheet */');
  assert.equal(comments[0].type, 'block');
  assert.equal(comments[1].text, '/* inline comment */');
  assert.equal(comments[1].type, 'block');
}

async function testHtmlExtraction() {
  const code = [
    '<!DOCTYPE html>',
    '<!-- HTML comment header -->',
    '<html>',
    '  <body>',
    '    <a href="https://example.com" title="example">Link</a>',
    '    <!-- Another comment -->',
    '  </body>',
    '</html>'
  ].join('\n');

  const comments = await extractRawComments(code, 'html', 'index.html');
  assert.equal(comments.length, 2);
  assert.equal(comments[0].text, '<!-- HTML comment header -->');
  assert.equal(comments[0].type, 'block');
  assert.equal(comments[1].text, '<!-- Another comment -->');
  assert.equal(comments[1].type, 'block');
}

async function testBashExtraction() {
  const code = [
    '#!/usr/bin/env bash',
    '# Bash automation script',
    'API_URL="https://example.com/api/v1"',
    'echo "connecting to $API_URL" # inline comment',
    'grep -E "pattern#notcomment" file.txt'
  ].join('\n');

  const comments = await extractRawComments(code, 'bash', 'deploy.sh');
  assert.equal(comments.length, 3);
  assert.equal(comments[0].text, '#!/usr/bin/env bash');
  assert.equal(comments[0].type, 'line');
  assert.equal(comments[1].text, '# Bash automation script');
  assert.equal(comments[1].type, 'line');
  assert.equal(comments[2].text, '# inline comment');
  assert.equal(comments[2].type, 'line');
}

async function testEdgeCases() {
  const emptyComments = await extractRawComments('', 'javascript');
  assert.deepEqual(emptyComments, []);

  const nullComments = await extractRawComments(null, 'javascript');
  assert.deepEqual(nullComments, []);

  const fileResolutionComments = await extractRawComments('// path resolved', null, 'src/App.vue');
  assert.equal(fileResolutionComments.length, 0);

  const jsFileResolution = await extractRawComments('// js resolved', null, 'script.js');
  assert.equal(jsFileResolution.length, 1);
  assert.equal(jsFileResolution[0].text, '// js resolved');

  let unsupportedThrown = false;
  try {
    await extractRawComments('code', 'rust');
  } catch (error) {
    unsupportedThrown = true;
    assert.match(error.message, /Unsupported or unknown language/);
  }
  assert.equal(unsupportedThrown, true);

  const tree = await parserManager.parseCode('// from tree', 'javascript');
  const treeComments = extractRawCommentsFromTree(tree, 'javascript', 'tree.js');
  assert.equal(treeComments.length, 1);
  assert.equal(treeComments[0].text, '// from tree');
  assert.equal(treeComments[0].file, 'tree.js');
}

async function runAllTests() {
  await testLanguageDetector();
  await testGrammars();
  await testJavaScriptExtraction();
  await testTypeScriptExtraction();
  await testPythonExtraction();
  await testCssExtraction();
  await testHtmlExtraction();
  await testBashExtraction();
  await testEdgeCases();
  console.log('All commentExtractor and languageDetector unit tests passed successfully.');
}

runAllTests();
