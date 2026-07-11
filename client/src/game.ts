import { MAX_ANSWER_LENGTH } from './constants';

export function normalizeAnswer(answer: string): string {
  if (answer.length > MAX_ANSWER_LENGTH) {
    throw new RangeError('Answer is too long.');
  }

  const normalizedAnswer = answer
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (normalizedAnswer.length === 0) {
    throw new Error('Answer is empty.');
  }

  return normalizedAnswer;
}

export function isAcceptedAnswer(guess: string, acceptedAnswers: string[]): boolean {
  const normalizedGuess = normalizeAnswer(guess);
  return acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalizedGuess);
}