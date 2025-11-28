export function getRouteParam(
  params: Record<string, string | string[] | undefined> | null,
  key: string
): string | null {
  if (!params) return null;

  const value = params[key];

  if (!value) return null;

  return Array.isArray(value) ? value[0] : value;
}
