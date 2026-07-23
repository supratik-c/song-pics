import {
  fetchStaticJson,
  isNonEmptyString,
  isRecord,
} from './validation.ts';

const BUILD_VERSION_FILE_NAME = 'build-version.json';
const DEPLOYMENT_QUERY_PARAMETER = '_deployment';

export interface BuildVersionManifest {
  buildId: string;
}

export async function ensureCurrentDeployment(): Promise<boolean> {
  if (import.meta.env.DEV) {
    return true;
  }

  try {
    const latestBuildId = await loadLatestBuildId();

    if (latestBuildId === import.meta.env.VITE_BUILD_ID) {
      removeDeploymentQueryParameter();
      return true;
    }

    const currentUrl = new URL(window.location.href);

    if (
      currentUrl.searchParams.get(DEPLOYMENT_QUERY_PARAMETER) ===
      latestBuildId
    ) {
      console.warn(
        'A newer deployment was detected, but a refresh was already attempted.',
      );
      return true;
    }

    currentUrl.searchParams.set(
      DEPLOYMENT_QUERY_PARAMETER,
      latestBuildId,
    );
    window.location.replace(currentUrl.href);
    return false;
  } catch (error) {
    console.warn(
      'The latest deployment version could not be checked.',
      error,
    );
    return true;
  }
}

async function loadLatestBuildId(): Promise<string> {
  const versionUrl = new URL(
    `${import.meta.env.BASE_URL}${BUILD_VERSION_FILE_NAME}`,
    window.location.href,
  );
  versionUrl.searchParams.set('check', Date.now().toString());

  const manifest = await fetchStaticJson(
    versionUrl,
    'build version',
    isBuildVersionManifest,
  );

  return manifest.buildId;
}

export function isBuildVersionManifest(
  value: unknown,
): value is BuildVersionManifest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.buildId)
  );
}

function removeDeploymentQueryParameter(): void {
  const currentUrl = new URL(window.location.href);

  if (!currentUrl.searchParams.has(DEPLOYMENT_QUERY_PARAMETER)) {
    return;
  }

  currentUrl.searchParams.delete(DEPLOYMENT_QUERY_PARAMETER);
  window.history.replaceState(window.history.state, '', currentUrl.href);
}
