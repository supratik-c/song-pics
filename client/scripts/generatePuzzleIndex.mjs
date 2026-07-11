import {
  getPuzzleDirectory,
  writePuzzleMetadataFiles,
} from './puzzleConventions.mjs';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

const puzzleDirectory = getPuzzleDirectory();
const { puzzleIds, puzzlePanels } = getPuzzleMetadata(puzzleDirectory);

writePuzzleMetadataFiles(puzzleDirectory, { puzzleIds, puzzlePanels });

console.log(
  `Generated puzzle index and panel manifest with ${puzzleIds.length} puzzles.`,
);