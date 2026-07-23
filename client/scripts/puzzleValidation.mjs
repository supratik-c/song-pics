const supportedYouTubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
]);

export function parsePuzzleJson(source, sourcePath) {
  let value;

  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`Puzzle contains invalid JSON: ${sourcePath}`, {
      cause: error,
    });
  }

  return validatePuzzleJson(value, sourcePath);
}

export function validatePuzzleJson(value, sourcePath = 'puzzle.json') {
  if (!isRecord(value)) {
    throw invalidPuzzle(sourcePath, 'must contain a JSON object');
  }

  assertNonEmptyString(value.songClue, 'songClue', sourcePath);
  assertNonEmptyString(value.songTitle, 'songTitle', sourcePath);
  assertNonEmptyString(value.artist, 'artist', sourcePath);

  if (
    !Array.isArray(value.acceptedAnswers) ||
    value.acceptedAnswers.length === 0
  ) {
    throw invalidPuzzle(
      sourcePath,
      'acceptedAnswers must be a non-empty array',
    );
  }

  value.acceptedAnswers.forEach((answer, index) => {
    assertNonEmptyString(
      answer,
      `acceptedAnswers[${index}]`,
      sourcePath,
    );
  });

  if (value.youtubeURL !== undefined) {
    assertNonEmptyString(value.youtubeURL, 'youtubeURL', sourcePath);

    if (!isSupportedYouTubeUrl(value.youtubeURL)) {
      throw invalidPuzzle(
        sourcePath,
        'youtubeURL must identify a video on youtube.com, www.youtube.com, or youtu.be',
      );
    }
  }

  if (value.panels !== undefined) {
    validateExplicitPanels(value.panels, sourcePath);
  }

  validateAcceptedAnswers(value, sourcePath);

  return value;
}

export function normalizePuzzleAnswer(answer, artist) {
  const normalizedInput = normalizeText(answer);
  const normalizedArtist = normalizeText(artist);
  const answerWords = normalizedInput ? normalizedInput.split(' ') : [];
  const artistWords = normalizedArtist ? normalizedArtist.split(' ') : [];
  let artistRemoved = false;

  for (
    let subsetLength = artistWords.length;
    subsetLength >= 1;
    subsetLength -= 1
  ) {
    for (
      let artistStart = 0;
      artistStart <= artistWords.length - subsetLength;
      artistStart += 1
    ) {
      const artistSubset = artistWords.slice(
        artistStart,
        artistStart + subsetLength,
      );
      let answerStart = 0;

      while (answerStart <= answerWords.length - artistSubset.length) {
        const matches = artistSubset.every(
          (word, index) => answerWords[answerStart + index] === word,
        );

        if (!matches) {
          answerStart += 1;
          continue;
        }

        answerWords.splice(answerStart, artistSubset.length);
        artistRemoved = true;

        if (answerStart > 0 && answerWords[answerStart - 1] === 'by') {
          answerWords.splice(answerStart - 1, 1);
          answerStart -= 1;
        }
      }
    }
  }

  return {
    answer: answerWords.join(' ').trim(),
    artistRemoved,
  };
}

export function isSupportedYouTubeUrl(value) {
  try {
    const url = new URL(value);

    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      !supportedYouTubeHosts.has(url.hostname)
    ) {
      return false;
    }

    return getYouTubeVideoId(url) !== null;
  } catch {
    return false;
  }
}

function validateExplicitPanels(value, sourcePath) {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidPuzzle(sourcePath, 'panels must be a non-empty array');
  }

  value.forEach((panel, index) => {
    if (!isRecord(panel)) {
      throw invalidPuzzle(
        sourcePath,
        `panels[${index}] must be an object`,
      );
    }

    assertNonEmptyString(panel.src, `panels[${index}].src`, sourcePath);
  });
}

function validateAcceptedAnswers(puzzle, sourcePath) {
  const normalizedCanonical = normalizePuzzleAnswer(
    puzzle.songTitle,
    puzzle.artist,
  ).answer;
  const normalizedAnswers = new Map();

  puzzle.acceptedAnswers.forEach((answer, index) => {
    const normalized = normalizePuzzleAnswer(answer, puzzle.artist).answer;

    if (!normalized) {
      throw invalidPuzzle(
        sourcePath,
        `acceptedAnswers[${index}] is empty after normalization`,
      );
    }

    const duplicateIndex = normalizedAnswers.get(normalized);

    if (duplicateIndex !== undefined) {
      throw invalidPuzzle(
        sourcePath,
        `acceptedAnswers[${index}] duplicates acceptedAnswers[${duplicateIndex}] after normalization`,
      );
    }

    normalizedAnswers.set(normalized, index);
  });

  if (!normalizedAnswers.has(normalizedCanonical)) {
    throw invalidPuzzle(
      sourcePath,
      'acceptedAnswers must include the canonical songTitle after normalization',
    );
  }
}

function getYouTubeVideoId(url) {
  if (url.hostname === 'youtu.be') {
    const pathParts = url.pathname.split('/').filter(Boolean);

    return pathParts.length === 1 && isValidVideoId(pathParts[0])
      ? pathParts[0]
      : null;
  }

  const queryVideoId = url.searchParams.get('v');

  if (queryVideoId && isValidVideoId(queryVideoId)) {
    return queryVideoId;
  }

  if (url.pathname.startsWith('/embed/')) {
    const pathParts = url.pathname.split('/').filter(Boolean);

    return pathParts.length === 2 &&
      pathParts[0] === 'embed' &&
      isValidVideoId(pathParts[1])
      ? pathParts[1]
      : null;
  }

  return null;
}

function isValidVideoId(value) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function assertNonEmptyString(value, field, sourcePath) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidPuzzle(sourcePath, `${field} must be a non-empty string`);
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidPuzzle(sourcePath, reason) {
  return new Error(`Invalid puzzle ${sourcePath}: ${reason}.`);
}
