import JSZip from 'jszip';

export function isZipFile(fileOrName) {
  if (!fileOrName) {
    return false;
  }

  if (typeof fileOrName === 'string') {
    return fileOrName.trim().toLowerCase().endsWith('.zip');
  }

  if (typeof fileOrName === 'object') {
    if (typeof fileOrName.name === 'string' && fileOrName.name.toLowerCase().endsWith('.zip')) {
      return true;
    }
    if (typeof fileOrName.type === 'string') {
      const type = fileOrName.type.toLowerCase();
      return (
        type === 'application/zip' ||
        type === 'application/x-zip-compressed' ||
        type === 'application/x-zip'
      );
    }
  }

  return false;
}

export function stripZipRootFolder(path) {
  if (typeof path !== 'string') {
    return '';
  }

  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const slashIndex = normalized.indexOf('/');

  if (slashIndex === -1) {
    return normalized;
  }

  return normalized.slice(slashIndex + 1);
}

function findCommonRootPrefix(fileNames) {
  if (!fileNames || fileNames.length === 0) {
    return null;
  }

  const first = fileNames[0];
  const firstSlashIndex = first.indexOf('/');
  if (firstSlashIndex === -1) {
    return null;
  }

  const candidatePrefix = first.slice(0, firstSlashIndex + 1);
  const allShare = fileNames.every((name) => name.startsWith(candidatePrefix));

  return allShare ? candidatePrefix : null;
}

export async function extractZipFiles(zipSource, options = {}) {
  const { stripRoot = 'auto' } = options;

  if (!zipSource) {
    throw new Error('Fonte de dados compactada (.zip) inválida ou não fornecida');
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(zipSource);
  } catch (error) {
    throw new Error(`Arquivo ZIP corrompido ou formato inválido: ${error.message}`);
  }

  const fileEntries = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && !relativePath.endsWith('/')) {
      fileEntries.push(zipEntry);
    }
  });

  const fileNames = fileEntries.map((entry) => entry.name.replace(/\\/g, '/'));
  let commonPrefix = null;

  if (stripRoot === 'auto') {
    commonPrefix = findCommonRootPrefix(fileNames);
  }

  const extracted = [];

  for (const entry of fileEntries) {
    const rawPath = entry.name.replace(/\\/g, '/');
    let finalPath = rawPath;

    if (stripRoot === true) {
      finalPath = stripZipRootFolder(rawPath);
    } else if (stripRoot === 'auto' && commonPrefix) {
      finalPath = rawPath.slice(commonPrefix.length);
    }

    if (!finalPath) {
      continue;
    }

    const content = await entry.async('string');
    const size = typeof entry._data?.uncompressedSize === 'number'
      ? entry._data.uncompressedSize
      : content.length;

    extracted.push({
      path: finalPath,
      content,
      size
    });
  }

  return extracted;
}
