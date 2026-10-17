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
│   │   ├── ModeSelector.vue
│   │   └── Navbar.vue
│   ├── main.js
│   ├── parsing/
│   │   ├── commentExtractor.js
│   │   ├── commentNormalizer.js
│   │   ├── grammars.js
│   │   ├── languageDetector.js
│   │   └── parserManager.js
│   ├── style.css
│   └── utils/
│       └── tagDetector.js
├── tailwind.config.js
├── tests/
│   └── unit/
│       ├── commentExtractor.test.js
│       ├── commentNormalizer.test.js
│       └── parserManager.test.js
└── vite.config.js
```
