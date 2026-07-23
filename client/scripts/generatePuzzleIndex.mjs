import {
  getPuzzleDirectory,
  writePuzzleMetadataFiles,
} from './puzzleConventions.mjs';
import { getPuzzleMetadata } from './puzzleMetadata.mjs';

const puzzleDirectory = getPuzzleDirectory();
const { puzzleIndex, puzzlePanels } = getPuzzleMetadata(puzzleDirectory);

writePuzzleMetadataFiles(puzzleDirectory, { puzzleIndex, puzzlePanels });

console.log(
  `Generated puzzle index and panel manifest with ${puzzleIndex.length} puzzles.`,
);
