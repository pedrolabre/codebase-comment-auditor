import { describe, it, expect, beforeEach } from 'vitest';
import { useAuditState } from '../../src/composables/useAuditState.js';

describe('useAuditState Composable', () => {
  beforeEach(() => {
    const { resetAudit, setMode } = useAuditState();
    resetAudit();
    setMode('repo');
  });

  it('inicializa com o estado padrao esperado', () => {
    const state = useAuditState();

    expect(state.activeMode.value).toBe('repo');
    expect(state.diffText.value).toBe('');
    expect(state.comments.value).toEqual([]);
    expect(state.affectedFiles.value).toEqual([]);
    expect(state.diffStats.value).toEqual({
      filesChanged: 0,
      additions: 0,
      deletions: 0
    });
    expect(state.isAuditing.value).toBe(false);
    expect(state.errorMessage.value).toBe('');
    expect(state.hasAudited.value).toBe(false);
    expect(state.totalCommentsCount.value).toBe(0);
    expect(state.hasComments.value).toBe(false);
    expect(state.hasErrors.value).toBe(false);
  });

  it('permite alternar entre os modos suportados e rejeita valores invalidos', () => {
    const state = useAuditState();

    state.setMode('diff');
    expect(state.activeMode.value).toBe('diff');

    state.setMode('repo');
    expect(state.activeMode.value).toBe('repo');

    state.setMode('invalid_mode');
    expect(state.activeMode.value).toBe('repo');
  });

  it('permite definir o texto do diff diretamente', () => {
    const state = useAuditState();

    state.setDiffText('diff --git a/test.js b/test.js');
    expect(state.diffText.value).toBe('diff --git a/test.js b/test.js');

    state.setDiffText(null);
    expect(state.diffText.value).toBe('');
  });

  it('compartilha a mesma instancia reativa singleton entre multiplas chamadas', () => {
    const stateA = useAuditState();
    const stateB = useAuditState();

    stateA.setMode('diff');
    expect(stateB.activeMode.value).toBe('diff');

    stateB.setDiffText('sample content');
    expect(stateA.diffText.value).toBe('sample content');
  });

  it('rejeita diff vazio e seta mensagem de erro', async () => {
    const state = useAuditState();

    const result = await state.auditDiff('');

    expect(result).toEqual([]);
    expect(state.comments.value).toEqual([]);
    expect(state.hasAudited.value).toBe(false);
    expect(state.isAuditing.value).toBe(false);
    expect(state.hasErrors.value).toBe(true);
    expect(state.errorMessage.value).toContain('O diff fornecido está vazio');
  });

  it('rejeita diff composto apenas por espacos em branco', async () => {
    const state = useAuditState();

    const result = await state.auditDiff('   \n  \t  \n  ');

    expect(result).toEqual([]);
    expect(state.comments.value).toEqual([]);
    expect(state.hasAudited.value).toBe(false);
    expect(state.hasErrors.value).toBe(true);
  });

  it('executa auditoria com sucesso em diff valido contendo comentarios adicionados', async () => {
    const state = useAuditState();

    const sampleDiff = `diff --git a/src/service.js b/src/service.js
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/src/service.js
@@ -0,0 +1,5 @@
+function runService() {
+  // TODO: revisar conexao de websocket https://internal.dev/ws
+  return true;
+}
`;

    const comments = await state.auditDiff(sampleDiff);

    expect(comments).toHaveLength(1);
    expect(state.comments.value).toHaveLength(1);
    expect(state.totalCommentsCount.value).toBe(1);
    expect(state.hasComments.value).toBe(true);
    expect(state.hasAudited.value).toBe(true);
    expect(state.isAuditing.value).toBe(false);
    expect(state.hasErrors.value).toBe(false);
    expect(state.errorMessage.value).toBe('');

    const comment = comments[0];
    expect(comment.file).toBe('src/service.js');
    expect(comment.isAdded).toBe(true);
    expect(comment.tags).toContain('TODO');
    expect(comment.hasUrl).toBe(true);
    expect(comment.urls).toContain('https://internal.dev/ws');

    expect(state.diffStats.value).toEqual({
      filesChanged: 1,
      additions: 4,
      deletions: 0
    });
    expect(state.affectedFiles.value).toHaveLength(1);
    expect(state.affectedFiles.value[0].path).toBe('src/service.js');
  });

  it('executa auditoria com sucesso em diff valido sem comentarios', async () => {
    const state = useAuditState();

    const codeOnlyDiff = `diff --git a/src/math.js b/src/math.js
new file mode 100644
index 0000000..2222222
--- /dev/null
+++ b/src/math.js
@@ -0,0 +1,3 @@
+export function multiply(a, b) {
+  return a * b;
+}
`;

    const comments = await state.auditDiff(codeOnlyDiff);

    expect(comments).toHaveLength(0);
    expect(state.comments.value).toEqual([]);
    expect(state.totalCommentsCount.value).toBe(0);
    expect(state.hasComments.value).toBe(false);
    expect(state.hasAudited.value).toBe(true);
    expect(state.isAuditing.value).toBe(false);
    expect(state.hasErrors.value).toBe(false);
    expect(state.diffStats.value.filesChanged).toBe(1);
    expect(state.diffStats.value.additions).toBe(3);
  });

  it('restaura o estado ao invocar resetAudit', async () => {
    const state = useAuditState();

    const sampleDiff = `diff --git a/src/app.js b/src/app.js
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/app.js
@@ -0,0 +1,3 @@
+// HACK: bypass temporario
+const enabled = true;
+`;

    await state.auditDiff(sampleDiff);
    expect(state.comments.value).toHaveLength(1);
    expect(state.hasAudited.value).toBe(true);

    state.resetAudit();

    expect(state.diffText.value).toBe('');
    expect(state.comments.value).toEqual([]);
    expect(state.affectedFiles.value).toEqual([]);
    expect(state.diffStats.value).toEqual({
      filesChanged: 0,
      additions: 0,
      deletions: 0
    });
    expect(state.isAuditing.value).toBe(false);
    expect(state.errorMessage.value).toBe('');
    expect(state.hasAudited.value).toBe(false);
    expect(state.totalCommentsCount.value).toBe(0);
    expect(state.hasComments.value).toBe(false);
    expect(state.hasErrors.value).toBe(false);
  });
});
