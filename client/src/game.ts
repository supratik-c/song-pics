export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isAcceptedAnswer(guess: string, acceptedAnswers: string[]): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  return acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizedGuess);
}