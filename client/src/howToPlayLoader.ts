import { resolvePublicPath } from './publicPath.ts';
import {
  type HowToPlayManifest,
  type HowToPlayPanel,
  type HowToPlaySection,
} from './types.ts';

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

  manifestPromise = fetchManifest().catch((error: unknown) => {
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

async function fetchManifest(): Promise<HowToPlayManifest> {
  const response = await fetch(
    resolvePublicPath(HOW_TO_PLAY_MANIFEST_PATH),
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(
      `Could not load How to Play content: ${response.status} ${response.statusText}`,
    );
  }

  const value: unknown = await response.json();

  if (!isHowToPlayManifest(value)) {
    throw new Error('How to Play manifest contains invalid data.');
  }

  return value;
}

function isHowToPlayManifest(
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}
