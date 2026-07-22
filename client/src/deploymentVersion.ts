const BUILD_VERSION_FILE_NAME = 'build-version.json';
const DEPLOYMENT_QUERY_PARAMETER = '_deployment';

interface BuildVersionManifest {
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

  const response = await fetch(versionUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Could not load build version: ${response.status} ${response.statusText}`,
    );
  }

  const value: unknown = await response.json();

  if (!isBuildVersionManifest(value)) {
    throw new Error('Build version contains invalid data.');
  }

  return value.buildId;
}

function isBuildVersionManifest(
  value: unknown,
): value is BuildVersionManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'buildId' in value &&
    typeof value.buildId === 'string' &&
    value.buildId.trim().length > 0
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
