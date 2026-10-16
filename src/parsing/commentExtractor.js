import { parserManager } from './parserManager.js';
import { detectLanguage } from './languageDetector.js';
import { getGrammarConfig } from './grammars.js';

export function extractRawCommentsFromTree(tree, languageOrExtension, filepath = '') {
  const language = detectLanguage(languageOrExtension) || (filepath ? detectLanguage(filepath) : null);
  if (!language) {
    throw new Error(`Unsupported or unknown language for input: "${languageOrExtension || filepath || ''}"`);
  }

  const config = getGrammarConfig(language);
  if (!config) {
    throw new Error(`Grammar configuration not found for language: "${language}"`);
  }

  const rootNode = tree && tree.rootNode ? tree.rootNode : tree;
  if (!rootNode) {
    return [];
  }

  const comments = [];

  function traverse(node) {
    if (!node) {
      return;
    }

    if (config.isCommentNode(node)) {
      comments.push({
        text: node.text,
        type: config.getCommentType(node),
        language,
        file: filepath || '',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column + 1,
        endColumn: node.endPosition.column + 1,
        startIndex: node.startIndex,
        endIndex: node.endIndex
      });
      return;
    }

    const count = node.childCount;
    for (let i = 0; i < count; i++) {
      const child = node.child(i);
      if (child) {
        traverse(child);
      }
    }
  }

  traverse(rootNode);
  return comments;
}

export async function extractRawComments(code, languageOrExtension, filepath = '') {
  const language = detectLanguage(languageOrExtension) || (filepath ? detectLanguage(filepath) : null);
  if (!language) {
    throw new Error(`Unsupported or unknown language for input: "${languageOrExtension || filepath || ''}"`);
  }

  const safeCode = typeof code === 'string' ? code : '';
  const tree = await parserManager.parseCode(safeCode, language);

  return extractRawCommentsFromTree(tree, language, filepath);
}

export default extractRawComments;
