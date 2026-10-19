import { describe, it, expect, vi } from 'vitest';
import {
  parseGitHubUrl,
  buildZipballUrl,
  downloadRepoZip
} from '../../src/services/githubService.js';

describe('githubService', () => {
  describe('parseGitHubUrl', () => {
    it('parses standard HTTPS GitHub repository URLs', () => {
      const result = parseGitHubUrl('https://github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        ref: null
      });
    });

    it('handles URLs with trailing slashes and .git extensions', () => {
      const result = parseGitHubUrl('https://github.com/vuejs/core.git/');
      expect(result).toEqual({
        owner: 'vuejs',
        repo: 'core',
        ref: null
      });
    });

    it('handles HTTP and domain-only URLs without protocol', () => {
      const httpResult = parseGitHubUrl('http://github.com/tailwindlabs/tailwindcss');
      expect(httpResult).toEqual({
        owner: 'tailwindlabs',
        repo: 'tailwindcss',
        ref: null
      });

      const domainResult = parseGitHubUrl('github.com/vitejs/vite');
      expect(domainResult).toEqual({
        owner: 'vitejs',
        repo: 'vite',
        ref: null
      });
    });

    it('parses SSH clone format git@github.com:owner/repo.git', () => {
      const result = parseGitHubUrl('git@github.com:torvalds/linux.git');
      expect(result).toEqual({
        owner: 'torvalds',
        repo: 'linux',
        ref: null
      });
    });

    it('extracts branch and ref from /tree/ paths', () => {
      const simpleBranch = parseGitHubUrl('https://github.com/owner/repo/tree/main');
      expect(simpleBranch).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'main'
      });

      const nestedBranch = parseGitHubUrl('https://github.com/owner/repo/tree/feature/sub-branch');
      expect(nestedBranch).toEqual({
        owner: 'owner',
        repo: 'repo',
        ref: 'feature/sub-branch'
      });
    });

    it('parses shorthand owner/repo notation', () => {
      const result = parseGitHubUrl('torvalds/linux');
      expect(result).toEqual({
        owner: 'torvalds',
        repo: 'linux',
        ref: null
      });
    });

    it('parses shorthand with @ref notation', () => {
      const result = parseGitHubUrl('facebook/react@v18.2.0');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        ref: 'v18.2.0'
      });
    });

    it('parses shorthand with #ref notation', () => {
      const result = parseGitHubUrl('vuejs/core#develop');
      expect(result).toEqual({
        owner: 'vuejs',
        repo: 'core',
        ref: 'develop'
      });
    });

    it('throws error for non-GitHub domains', () => {
      expect(() => parseGitHubUrl('https://gitlab.com/owner/repo')).toThrow(
        'URL ou identificador de repositório do GitHub inválido'
      );
      expect(() => parseGitHubUrl('https://bitbucket.org/owner/repo')).toThrow(
        'URL ou identificador de repositório do GitHub inválido'
      );
    });

    it('throws error for invalid, empty or null inputs', () => {
      expect(() => parseGitHubUrl('')).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl('   ')).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl(null)).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl(undefined)).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl('only-one-part')).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl('invalid/repo/extra/parts/without/tree')).toThrow('URL ou identificador de repositório do GitHub inválido');
      expect(() => parseGitHubUrl('inv@lid!/repo')).toThrow('URL ou identificador de repositório do GitHub inválido');
    });
  });

  describe('buildZipballUrl', () => {
    it('builds standard repository zipball endpoint URL without ref', () => {
      const url = buildZipballUrl('facebook', 'react');
      expect(url).toBe('https://api.github.com/repos/facebook/react/zipball');
    });

    it('appends ref when provided', () => {
      const url = buildZipballUrl('vuejs', 'core', 'main');
      expect(url).toBe('https://api.github.com/repos/vuejs/core/zipball/main');
    });

    it('encodes special characters in ref segments', () => {
      const url = buildZipballUrl('owner', 'repo', 'feature/login page');
      expect(url).toBe('https://api.github.com/repos/owner/repo/zipball/feature/login%20page');
    });

    it('strips .git suffix from repo if present', () => {
      const url = buildZipballUrl('owner', 'repo.git');
      expect(url).toBe('https://api.github.com/repos/owner/repo/zipball');
    });

    it('throws error when owner or repo are invalid', () => {
      expect(() => buildZipballUrl('', 'repo')).toThrow('Proprietário do repositório inválido');
      expect(() => buildZipballUrl('owner', '')).toThrow('Nome do repositório inválido');
      expect(() => buildZipballUrl(null, 'repo')).toThrow('Proprietário do repositório inválido');
    });
  });

  describe('downloadRepoZip', () => {
    it('executes download successfully and returns a Blob', async () => {
      const mockBlob = new Blob(['fake-zip-data'], { type: 'application/zip' });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob
      });

      const result = await downloadRepoZip('octocat', 'Hello-World', { fetchFn: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://api.github.com/repos/octocat/Hello-World/zipball');
      expect(calledOptions.headers.Accept).toBe('application/vnd.github+json');
      expect(calledOptions.headers.Authorization).toBeUndefined();
      expect(result).toBe(mockBlob);
    });

    it('attaches Authorization header when token is supplied', async () => {
      const mockBlob = new Blob(['content']);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob
      });

      await downloadRepoZip('octocat', 'Hello-World', {
        token: 'ghp_secretToken123',
        ref: 'v1.0.0',
        fetchFn: mockFetch
      });

      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('https://api.github.com/repos/octocat/Hello-World/zipball/v1.0.0');
      expect(calledOptions.headers.Authorization).toBe('Bearer ghp_secretToken123');
    });

    it('throws descriptive error on 404 status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        downloadRepoZip('nonexistent', 'repo', { fetchFn: mockFetch })
      ).rejects.toThrow('Repositório ou branch não encontrado no GitHub (404)');
    });

    it('throws rate limit error on 403 or 429 status', async () => {
      const mockFetch403 = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Rate Limit Exceeded'
      });

      await expect(
        downloadRepoZip('owner', 'repo', { fetchFn: mockFetch403 })
      ).rejects.toThrow('Limite de requisições da API do GitHub atingido (403/429)');

      const mockFetch429 = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(
        downloadRepoZip('owner', 'repo', { fetchFn: mockFetch429 })
      ).rejects.toThrow('Limite de requisições da API do GitHub atingido (403/429)');
    });

    it('throws invalid token error on 401 status', async () => {
      const mockFetch401 = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(
        downloadRepoZip('owner', 'repo', { token: 'invalid_token', fetchFn: mockFetch401 })
      ).rejects.toThrow('Token de autenticação do GitHub inválido ou expirado (401)');
    });

    it('throws generic error on server failure', async () => {
      const mockFetch500 = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        downloadRepoZip('owner', 'repo', { fetchFn: mockFetch500 })
      ).rejects.toThrow('Falha ao baixar repositório do GitHub (HTTP 500: Internal Server Error)');
    });

    it('rethrows network error when fetch fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      await expect(
        downloadRepoZip('owner', 'repo', { fetchFn: mockFetch })
      ).rejects.toThrow('Erro de rede ao conectar com a API do GitHub: Network offline');
    });

    it('throws when fetchFn is not a valid function', async () => {
      await expect(
        downloadRepoZip('owner', 'repo', { fetchFn: 'not-a-fn' })
      ).rejects.toThrow('Função de requisição HTTP (fetch) indisponível');
    });
  });
});
