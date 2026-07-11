export const MAX_ATTEMPTS = 6;
export const MAX_ANSWER_LENGTH = 64;
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
export const TODAY_PUZZLE_PATH = `/content/puzzles/${year}-${month}-${day}.json`;
