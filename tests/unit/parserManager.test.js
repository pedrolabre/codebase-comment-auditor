import { describe, it, expect, beforeEach } from 'vitest';
import { parserManager, ParserManager } from '../../src/parsing/parserManager.js';

describe('ParserManager', () => {
  let customManager;

  beforeEach(() => {
    customManager = new ParserManager();
  });

  it('starts uninitialized without loaded languages', () => {
    expect(customManager.parser).toBeNull();
    expect(customManager.hasLanguage('javascript')).toBe(false);
  });

  it('initializes web-tree-sitter parser runtime successfully', async () => {
    await customManager.initParser();
    expect(customManager.parser).not.toBeNull();
  });

  it('parses JavaScript source code and populates language cache', async () => {
    const tree = await customManager.parseCode('const x = 10; // comment', 'javascript');
    expect(tree).toBeDefined();
    expect(tree.rootNode.type).toBe('program');
    expect(tree.rootNode.childCount).toBe(2);
    expect(tree.rootNode.children[0].type).toBe('lexical_declaration');
    expect(tree.rootNode.children[1].type).toBe('comment');
    expect(customManager.hasLanguage('javascript')).toBe(true);
  });

  it('parses TypeScript, Python, CSS, HTML and Bash', async () => {
    const tsTree = await customManager.parseCode('const greeting: string = "hello";', 'typescript');
    expect(tsTree.rootNode.type).toBe('program');

    const pyTree = await customManager.parseCode('def calculate(total):\n    return total * 2', 'python');
    expect(pyTree.rootNode.type).toBe('module');

    const cssTree = await customManager.parseCode('body { margin: 0; padding: 0; }', 'css');
    expect(cssTree.rootNode.type).toBe('stylesheet');

    const htmlTree = await customManager.parseCode('<main id="app"><p>Auditor</p></main>', 'html');
    expect(htmlTree.rootNode.type).toBe('document');

    const bashTree = await customManager.parseCode('git status --short', 'bash');
    expect(bashTree.rootNode.type).toBe('program');
  });

  it('normalizes language aliases correctly', async () => {
    const jsTree = await customManager.parseCode('let y = 20;', 'js');
    expect(jsTree.rootNode.type).toBe('program');

    const tsTree = await customManager.parseCode('type ID = string;', 'ts');
    expect(tsTree.rootNode.type).toBe('program');

    const pyTree = await customManager.parseCode('import sys', 'py');
    expect(pyTree.rootNode.type).toBe('module');

    const bashTree = await customManager.parseCode('echo "done"', 'sh');
    expect(bashTree.rootNode.type).toBe('program');
  });

  it('handles empty code input gracefully', async () => {
    const emptyTree = await customManager.parseCode('', 'javascript');
    expect(emptyTree.rootNode.type).toBe('program');
    expect(emptyTree.rootNode.childCount).toBe(0);
  });

  it('throws descriptive error on unsupported language', async () => {
    await expect(customManager.parseCode('fn main() {}', 'unsupported_lang')).rejects.toThrow(
      /Unsupported language/
    );
  });

  it('provides list and predicates of supported languages', () => {
    expect(customManager.getSupportedLanguages()).toEqual([
      'javascript',
      'typescript',
      'python',
      'css',
      'html',
      'bash'
    ]);
    expect(customManager.isLanguageSupported('javascript')).toBe(true);
    expect(customManager.isLanguageSupported('python')).toBe(true);
    expect(customManager.isLanguageSupported('rust')).toBe(false);
  });

  it('works with exported singleton parserManager instance', async () => {
    const tree = await parserManager.parseCode('const x = 10; // comment', 'javascript');
    expect(tree).toBeDefined();
    expect(tree.rootNode.type).toBe('program');
    expect(tree.rootNode.childCount).toBe(2);
    expect(tree.rootNode.children[0].type).toBe('lexical_declaration');
    expect(tree.rootNode.children[1].type).toBe('comment');
  });
});
