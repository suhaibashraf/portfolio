/** Resolve local paths beneath the deployment prefix; leave external URLs alone. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (base && (path === base || path.startsWith(`${base}/`))) return path;
  return `${base}${path}`;
}
