import { resolvePublicPath } from './publicPath.ts';
import {
  fetchStaticJson,
  isNonEmptyString,
  isRecord,
} from './validation.ts';

export type HowToPlaySection = {
  heading: string;
  body: string;
};

export type HowToPlayPanel = {
  src: string;
  alt: string;
};

export type HowToPlayManifest = {
  title: string;
  introduction: string;
  sections: HowToPlaySection[];
  demo: {
    clue: string;
    panels: HowToPlayPanel[];
    answer: string;
    artist: string;
  };
};

const HOW_TO_PLAY_DIRECTORY = '/content/how-to-play';
const HOW_TO_PLAY_MANIFEST_PATH =
  `${HOW_TO_PLAY_DIRECTORY}/manifest.json`;
const imageFileNamePattern =
  /^[^/\\]+\.(?:avif|gif|jpe?g|png|webp)$/i;

let manifestPromise: Promise<HowToPlayManifest> | null = null;

export function loadHowToPlayManifest(): Promise<HowToPlayManifest> {
  if (manifestPromise) {
    return manifestPromise;
  }

  manifestPromise = fetchStaticJson(
    resolvePublicPath(HOW_TO_PLAY_MANIFEST_PATH),
    'How to Play content',
    isHowToPlayManifest,
  ).catch((error: unknown) => {
    manifestPromise = null;
    throw error;
  });

  return manifestPromise;
}

export function resolveHowToPlayImagePath(
  fileName: string,
): string {
  return resolvePublicPath(
    `${HOW_TO_PLAY_DIRECTORY}/${fileName}`,
  );
}

export function isHowToPlayManifest(
  value: unknown,
): value is HowToPlayManifest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.introduction) &&
    Array.isArray(value.sections) &&
    value.sections.length > 0 &&
    value.sections.every(isHowToPlaySection) &&
    isRecord(value.demo) &&
    isNonEmptyString(value.demo.clue) &&
    Array.isArray(value.demo.panels) &&
    value.demo.panels.length > 0 &&
    value.demo.panels.every(isHowToPlayPanel) &&
    isNonEmptyString(value.demo.answer) &&
    isNonEmptyString(value.demo.artist)
  );
}

function isHowToPlaySection(
  value: unknown,
): value is HowToPlaySection {
  return (
    isRecord(value) &&
    isNonEmptyString(value.heading) &&
    isNonEmptyString(value.body)
  );
}

function isHowToPlayPanel(
  value: unknown,
): value is HowToPlayPanel {
  return (
    isRecord(value) &&
    typeof value.src === 'string' &&
    imageFileNamePattern.test(value.src) &&
    isNonEmptyString(value.alt)
  );
}
