const HUNK_HEADER_REGEX = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(?: (.*))?$/;

export function cleanDiffPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return '';
  }

  let path = rawPath.trim();

  if (
    (path.startsWith('"') && path.endsWith('"')) ||
    (path.startsWith("'") && path.endsWith("'"))
  ) {
    path = path.slice(1, -1);
  }

  const tabIndex = path.indexOf('\t');
  if (tabIndex !== -1) {
    path = path.slice(0, tabIndex).trim();
  }

  if (path === '/dev/null') {
    return null;
  }

  if (path.startsWith('a/') || path.startsWith('b/')) {
    path = path.slice(2);
  }

  return path;
}

export function parseHunkHeader(headerLine) {
  if (!headerLine || typeof headerLine !== 'string') {
    return null;
  }

  const match = headerLine.match(HUNK_HEADER_REGEX);
  if (!match) {
    return null;
  }

  const oldStart = parseInt(match[1], 10);
  const oldLines = match[2] !== undefined ? parseInt(match[2], 10) : 1;
  const newStart = parseInt(match[3], 10);
  const newLines = match[4] !== undefined ? parseInt(match[4], 10) : 1;
  const heading = match[5] ? match[5].trim() : '';

  return {
    oldStart,
    oldLines,
    newStart,
    newLines,
    heading
  };
}

function extractPathsFromDiffGit(line) {
  const cleaned = line.replace(/^diff --git\s+/, '').trim();

  const quotedMatch = cleaned.match(/^"([^"]+)"\s+"([^"]+)"$/);
  if (quotedMatch) {
    return {
      oldPath: cleanDiffPath(quotedMatch[1]),
      newPath: cleanDiffPath(quotedMatch[2])
    };
  }

  const bIndex = cleaned.lastIndexOf(' b/');
  if (bIndex !== -1) {
    const rawOld = cleaned.slice(0, bIndex).trim();
    const rawNew = cleaned.slice(bIndex + 1).trim();
    return {
      oldPath: cleanDiffPath(rawOld),
      newPath: cleanDiffPath(rawNew)
    };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return {
      oldPath: cleanDiffPath(parts[0]),
      newPath: cleanDiffPath(parts[1])
    };
  }

  return {
    oldPath: cleanDiffPath(cleaned),
    newPath: cleanDiffPath(cleaned)
  };
}

function splitIntoFileBlocks(diffText) {
  if (!diffText || typeof diffText !== 'string') {
    return [];
  }

  const lines = diffText.split(/\r?\n/);
  const blocks = [];
  let currentBlockLines = [];
  const hasGitHeader = lines.some((line) => line.startsWith('diff --git '));

  if (hasGitHeader) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('diff --git ')) {
        if (currentBlockLines.length > 0) {
          blocks.push(currentBlockLines);
        }
        currentBlockLines = [line];
      } else if (currentBlockLines.length > 0) {
        currentBlockLines.push(line);
      }
    }
    if (currentBlockLines.length > 0) {
      blocks.push(currentBlockLines);
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('--- ') && i + 1 < lines.length && lines[i + 1].startsWith('+++ ')) {
        if (currentBlockLines.length > 0) {
          blocks.push(currentBlockLines);
        }
        currentBlockLines = [line];
      } else if (currentBlockLines.length > 0) {
        currentBlockLines.push(line);
      }
    }
    if (currentBlockLines.length > 0) {
      blocks.push(currentBlockLines);
    }
  }

  return blocks;
}

function parseFileBlock(blockLines) {
  let oldPath = null;
  let newPath = null;
  let status = 'modified';
  const hunks = [];
  let currentHunk = null;

  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];

    if (line.startsWith('diff --git ')) {
      const paths = extractPathsFromDiffGit(line);
      oldPath = paths.oldPath;
      newPath = paths.newPath;
    } else if (line.startsWith('new file mode ')) {
      status = 'added';
    } else if (line.startsWith('deleted file mode ')) {
      status = 'deleted';
    } else if (
      line.startsWith('similarity index ') ||
      line.startsWith('rename from ') ||
      line.startsWith('rename to ')
    ) {
      status = 'renamed';
      if (line.startsWith('rename from ')) {
        oldPath = cleanDiffPath(line.slice(12));
      } else if (line.startsWith('rename to ')) {
        newPath = cleanDiffPath(line.slice(10));
      }
    } else if (line.startsWith('--- ')) {
      const parsedOld = cleanDiffPath(line.slice(4));
      if (parsedOld !== null) {
        oldPath = parsedOld;
      } else {
        oldPath = null;
        status = 'added';
      }
    } else if (line.startsWith('+++ ')) {
      const parsedNew = cleanDiffPath(line.slice(4));
      if (parsedNew !== null) {
        newPath = parsedNew;
      } else {
        newPath = null;
        status = 'deleted';
      }
    } else if (HUNK_HEADER_REGEX.test(line)) {
      const parsedHeader = parseHunkHeader(line);
      currentHunk = {
        header: line,
        oldStart: parsedHeader.oldStart,
        oldLines: parsedHeader.oldLines,
        newStart: parsedHeader.newStart,
        newLines: parsedHeader.newLines,
        heading: parsedHeader.heading,
        lines: []
      };
      hunks.push(currentHunk);
    } else if (currentHunk) {
      if (
        line.startsWith('+') ||
        line.startsWith('-') ||
        line.startsWith(' ') ||
        line.startsWith('\\') ||
        line === ''
      ) {
        currentHunk.lines.push(line);
      }
    }
  }

  let path = '';
  if (status === 'deleted') {
    path = oldPath || newPath || '';
  } else {
    path = newPath || oldPath || '';
  }

  const addedLines = new Set();
  let addedLinesCount = 0;
  let deletedLinesCount = 0;
  const outputLines = [];

  for (const hunk of hunks) {
    let currentNewLine = hunk.newStart;

    if (hunk.newStart > 0) {
      while (outputLines.length < hunk.newStart - 1) {
        outputLines.push('');
      }
    }

    for (const rawLine of hunk.lines) {
      if (rawLine.startsWith('+')) {
        const content = rawLine.slice(1);
        outputLines.push(content);
        addedLines.add(currentNewLine);
        addedLinesCount++;
        currentNewLine++;
      } else if (rawLine.startsWith('-')) {
        deletedLinesCount++;
      } else if (rawLine.startsWith(' ')) {
        const content = rawLine.slice(1);
        outputLines.push(content);
        currentNewLine++;
      } else if (rawLine === '') {
        outputLines.push('');
        currentNewLine++;
      }
    }
  }

  const reconstructedContent =
    status === 'deleted'
      ? ''
      : outputLines.length > 0
        ? outputLines.join('\n')
        : '';

  return {
    path,
    oldPath,
    newPath,
    status,
    addedLines,
    addedLinesCount,
    deletedLinesCount,
    reconstructedContent,
    hunks
  };
}

export function parseDiff(diffText) {
  if (!diffText || typeof diffText !== 'string' || !diffText.trim()) {
    return [];
  }

  const blocks = splitIntoFileBlocks(diffText);
  return blocks.map((block) => parseFileBlock(block));
}

export function extractDiffFiles(diffText) {
  const files = parseDiff(diffText);
  return files.map((file) => ({
    path: file.path,
    oldPath: file.oldPath,
    newPath: file.newPath,
    status: file.status,
    additions: file.addedLinesCount,
    deletions: file.deletedLinesCount
  }));
}

export function isDiffEmpty(diffText) {
  if (!diffText || typeof diffText !== 'string' || !diffText.trim()) {
    return true;
  }

  const files = parseDiff(diffText);
  return files.length === 0;
}

export function getDiffStats(diffText) {
  const files = parseDiff(diffText);
  let additions = 0;
  let deletions = 0;

  for (const file of files) {
    additions += file.addedLinesCount;
    deletions += file.deletedLinesCount;
  }

  return {
    filesChanged: files.length,
    additions,
    deletions
  };
}
