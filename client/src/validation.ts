export type TypeGuard<Value> = (value: unknown) => value is Value;

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isOptionalNonEmptyString(
  value: unknown,
): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

export async function fetchStaticJson<Value>(
  url: string | URL,
  description: string,
  guard: TypeGuard<Value>,
): Promise<Value> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Could not load ${description}: ${response.status} ${response.statusText}`,
    );
  }

  const value: unknown = await response.json();

  if (!guard(value)) {
    throw new Error(`${capitalize(description)} contains invalid data.`);
  }

  return value;
}

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : `${value[0].toUpperCase()}${value.slice(1)}`;
}
