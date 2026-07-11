const absoluteUrlPattern = /^(?:[a-z]+:)?\/\//i;

export function resolvePublicPath(path: string): string {
  if (absoluteUrlPattern.test(path)) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}