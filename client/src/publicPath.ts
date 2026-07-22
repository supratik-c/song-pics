const absoluteUrlPattern = /^(?:[a-z]+:)?\/\//i;

export function resolvePublicPath(path: string): string {
  if (absoluteUrlPattern.test(path)) {
    return path;
  }

  const resolvedPath =
    `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

  return appendBuildId(resolvedPath);
}

function appendBuildId(path: string): string {
  const hashIndex = path.indexOf('#');
  const pathWithoutHash = hashIndex === -1
    ? path
    : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  const separator = pathWithoutHash.includes('?') ? '&' : '?';

  const buildId = encodeURIComponent(import.meta.env.VITE_BUILD_ID);

  return `${pathWithoutHash}${separator}v=${buildId}${hash}`;
}
