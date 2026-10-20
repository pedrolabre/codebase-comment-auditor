# codebase-comment-auditor

Single Page Application (SPA) client-side desenvolvida em Vue 3, Vite e Tailwind CSS para extrair e auditar comentários de código-fonte a partir de repositórios do GitHub, arquivos compactados ou diffs de commits, utilizando Concrete Syntax Tree (Tree-sitter WASM) em tempo real, sem backend e sem uso de inteligência artificial.

---

## Estrutura do Projeto

```text
codebase-comment-auditor/
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── public/
│   ├── grammars/
│   │   ├── tree-sitter-bash.wasm
│   │   ├── tree-sitter-css.wasm
│   │   ├── tree-sitter-html.wasm
│   │   ├── tree-sitter-javascript.wasm
│   │   ├── tree-sitter-python.wasm
│   │   └── tree-sitter-typescript.wasm
│   └── tree-sitter.wasm
├── README.md
├── src/
│   ├── App.vue
│   ├── components/
│   │   ├── AuditProgressBar.vue
│   │   ├── DiffInput.vue
│   │   ├── MetricsSummary.vue
│   │   ├── ModeSelector.vue
│   │   ├── Navbar.vue
│   │   ├── RepositoryInput.vue
│   │   └── SkippedFilesModal.vue
│   ├── composables/
│   │   ├── useAuditState.js
│   │   └── useGitHubLoader.js
│   ├── main.js
│   ├── parsing/
│   │   ├── commentExtractor.js
│   │   ├── commentNormalizer.js
│   │   ├── diffCommentExtractor.js
│   │   ├── grammars.js
│   │   ├── languageDetector.js
│   │   └── parserManager.js
│   ├── services/
│   │   ├── diffParserService.js
│   │   ├── githubService.js
│   │   └── zipService.js
│   ├── style.css
│   └── utils/
│       ├── fileIgnoreRules.js
│       └── tagDetector.js
├── tailwind.config.js
├── tests/
│   └── unit/
│       ├── commentExtractor.test.js
│       ├── commentNormalizer.test.js
│       ├── diffCommentExtractor.test.js
│       ├── diffParserService.test.js
│       ├── fileIgnoreRules.test.js
│       ├── githubService.test.js
│       ├── MetricsSummary.test.js
│       ├── parserManager.test.js
│       ├── RepositoryInput.test.js
│       ├── SkippedFilesModal.test.js
│       ├── useAuditState.test.js
│       ├── useGitHubLoader.test.js
│       └── zipService.test.js
└── vite.config.js
```
