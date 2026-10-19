const GITHUB_API_BASE_URL = 'https://api.github.com';
const OWNER_REGEX = /^[a-zA-Z0-9_-]+$/;
const REPO_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function parseGitHubUrl(input) {
  if (typeof input !== 'string') {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  const raw = input.trim();
  if (!raw) {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  let cleaned = raw;
  let detectedRef = null;

  if (cleaned.startsWith('git@github.com:')) {
    cleaned = cleaned.replace(/^git@github\.com:/, 'https://github.com/');
  }

  if (!/^https?:\/\//i.test(cleaned) && !cleaned.toLowerCase().startsWith('github.com/')) {
    let repoPart = cleaned;
    if (repoPart.includes('@')) {
      const parts = repoPart.split('@');
      repoPart = parts[0];
      detectedRef = parts.slice(1).join('@').trim() || null;
    } else if (repoPart.includes('#')) {
      const parts = repoPart.split('#');
      repoPart = parts[0];
      detectedRef = parts.slice(1).join('#').trim() || null;
    }

    const segments = repoPart.split('/').filter(Boolean);
    if (segments.length !== 2) {
      throw new Error('URL ou identificador de repositório do GitHub inválido');
    }

    const owner = segments[0].trim();
    const repo = segments[1].trim().replace(/\.git$/i, '');

    if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo)) {
      throw new Error('URL ou identificador de repositório do GitHub inválido');
    }

    return {
      owner,
      repo,
      ref: detectedRef
    };
  }

  let urlString = cleaned;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo)) {
    throw new Error('URL ou identificador de repositório do GitHub inválido');
  }

  if (segments.length >= 4 && (segments[2] === 'tree' || segments[2] === 'commits' || segments[2] === 'releases')) {
    detectedRef = decodeURIComponent(segments.slice(3).join('/'));
  }

  return {
    owner,
    repo,
    ref: detectedRef
  };
}

export function buildZipballUrl(owner, repo, ref = null) {
  if (!owner || typeof owner !== 'string' || !OWNER_REGEX.test(owner.trim())) {
    throw new Error('Proprietário do repositório inválido');
  }

  if (!repo || typeof repo !== 'string' || !REPO_REGEX.test(repo.trim())) {
    throw new Error('Nome do repositório inválido');
  }

  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim().replace(/\.git$/i, '');

  if (ref && typeof ref === 'string' && ref.trim()) {
    const cleanRef = ref.trim().split('/').map(encodeURIComponent).join('/');
    return `${GITHUB_API_BASE_URL}/repos/${cleanOwner}/${cleanRepo}/zipball/${cleanRef}`;
  }

  return `${GITHUB_API_BASE_URL}/repos/${cleanOwner}/${cleanRepo}/zipball`;
}

export async function downloadRepoZip(owner, repo, options = {}) {
  const {
    token = '',
    ref = null,
    signal = null,
    fetchFn = globalThis.fetch
  } = options;

  if (typeof fetchFn !== 'function') {
    throw new Error('Função de requisição HTTP (fetch) indisponível');
  }

  const url = buildZipballUrl(owner, repo, ref);
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (token && typeof token === 'string' && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const fetchOptions = {
    method: 'GET',
    headers
  };

  if (signal) {
    fetchOptions.signal = signal;
  }

  let response;
  try {
    response = await fetchFn(url, fetchOptions);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new Error(`Erro de rede ao conectar com a API do GitHub: ${error.message}`);
  }

  if (response.status === 404) {
    throw new Error('Repositório ou branch não encontrado no GitHub (404). Verifique se o caminho está correto e se o repositório é público.');
  }

  if (response.status === 403 || response.status === 429) {
    throw new Error('Limite de requisições da API do GitHub atingido (403/429). Utilize um Personal Access Token (PAT) ou tente novamente mais tarde.');
  }

  if (response.status === 401) {
    throw new Error('Token de autenticação do GitHub inválido ou expirado (401).');
  }

  if (!response.ok) {
    throw new Error(`Falha ao baixar repositório do GitHub (HTTP ${response.status}: ${response.statusText || 'Erro desconhecido'}).`);
  }

  return await response.blob();
}
