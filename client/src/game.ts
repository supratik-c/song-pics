import { MAX_ANSWER_LENGTH } from './constants.ts';

export type NormalizedAnswer = {
  answer: string;
  artistRemoved: boolean;
};

export function normalizeAnswer(
  answer: string,
  artist: string,
): NormalizedAnswer {
  if (answer.length > MAX_ANSWER_LENGTH) {
    throw new RangeError('Answer is too long.');
  }

  const normalizedInput = normalizeText(answer);
  const normalizedArtist = normalizeText(artist);

  const answerWords =
    normalizedInput.length > 0
      ? normalizedInput.split(' ')
      : [];

  const artistWords =
    normalizedArtist.length > 0
      ? normalizedArtist.split(' ')
      : [];

  let artistRemoved = false;

  /*
   * Try longer artist subsets before shorter ones.
   *
   * For "Franz Ferdinand", this checks:
   *   "franz ferdinand"
   *   "franz"
   *   "ferdinand"
   */
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

      while (
        answerStart <= answerWords.length - artistSubset.length
      ) {
        const matches = artistSubset.every(
          (word, index) =>
            answerWords[answerStart + index] === word,
        );

        if (!matches) {
          answerStart += 1;
          continue;
        }

        answerWords.splice(answerStart, artistSubset.length);
        artistRemoved = true;

        // Remove "by" immediately before the artist.
        if (
          answerStart > 0 &&
          answerWords[answerStart - 1] === 'by'
        ) {
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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function isAcceptedAnswer(
  guess: string,
  acceptedAnswers: string[],
  artist: string,
): boolean {
  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeAnswer(acceptedAnswer, artist).answer === guess,
  );
}