import assert from 'node:assert/strict';
import { parserManager, ParserManager } from '../../src/parsing/parserManager.js';

async function runTests() {
  const customManager = new ParserManager();
  assert.equal(customManager.parser, null);
  assert.equal(customManager.hasLanguage('javascript'), false);

  await customManager.initParser();
  assert.notEqual(customManager.parser, null);

  const jsTree = await customManager.parseCode('const x = 10; // comment', 'javascript');
  assert.ok(jsTree);
  assert.equal(jsTree.rootNode.type, 'program');
  assert.equal(jsTree.rootNode.childCount, 2);
  assert.equal(jsTree.rootNode.children[0].type, 'lexical_declaration');
  assert.equal(jsTree.rootNode.children[1].type, 'comment');
  assert.equal(customManager.hasLanguage('javascript'), true);

  const tsTree = await customManager.parseCode('const greeting: string = "hello";', 'typescript');
  assert.equal(tsTree.rootNode.type, 'program');

  const pyTree = await customManager.parseCode('def calculate(total):\n    return total * 2', 'python');
  assert.equal(pyTree.rootNode.type, 'module');

  const cssTree = await customManager.parseCode('body { margin: 0; padding: 0; }', 'css');
  assert.equal(cssTree.rootNode.type, 'stylesheet');

  const htmlTree = await customManager.parseCode('<main id="app"><p>Auditor</p></main>', 'html');
  assert.equal(htmlTree.rootNode.type, 'document');

  const bashTree = await customManager.parseCode('git status --short', 'bash');
  assert.equal(bashTree.rootNode.type, 'program');

  const aliasJsTree = await customManager.parseCode('let y = 20;', 'js');
  assert.equal(aliasJsTree.rootNode.type, 'program');

  const aliasTsTree = await customManager.parseCode('type ID = string;', 'ts');
  assert.equal(aliasTsTree.rootNode.type, 'program');

  const aliasPyTree = await customManager.parseCode('import sys', 'py');
  assert.equal(aliasPyTree.rootNode.type, 'module');

  const aliasShTree = await customManager.parseCode('echo "done"', 'sh');
  assert.equal(aliasShTree.rootNode.type, 'program');

  const emptyTree = await customManager.parseCode('', 'javascript');
  assert.equal(emptyTree.rootNode.type, 'program');
  assert.equal(emptyTree.rootNode.childCount, 0);

  let unsupportedThrown = false;
  try {
    await customManager.parseCode('fn main() {}', 'unsupported_lang');
  } catch (error) {
    unsupportedThrown = true;
    assert.match(error.message, /Unsupported language/);
  }
  assert.equal(unsupportedThrown, true);

  const supported = customManager.getSupportedLanguages();
  assert.deepEqual(supported, ['javascript', 'typescript', 'python', 'css', 'html', 'bash']);
  assert.equal(customManager.isLanguageSupported('javascript'), true);
  assert.equal(customManager.isLanguageSupported('python'), true);
  assert.equal(customManager.isLanguageSupported('rust'), false);

  const singletonTree = await parserManager.parseCode('const x = 10; // comment', 'javascript');
  assert.ok(singletonTree);
  assert.equal(singletonTree.rootNode.type, 'program');
  assert.equal(singletonTree.rootNode.childCount, 2);
  assert.equal(singletonTree.rootNode.children[0].type, 'lexical_declaration');
  assert.equal(singletonTree.rootNode.children[1].type, 'comment');

  console.log('All parserManager unit tests passed successfully.');
}

runTests();
