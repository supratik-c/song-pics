export const GAME_RULES = {
  maxAttempts: 5,
  maxAnswerLength: 64,
  artistRevealCost: 2,
} as const;

export type GameRules = {
  maxAttempts: number;
  maxAnswerLength: number;
  artistRevealCost: number;
};
