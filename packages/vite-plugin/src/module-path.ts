import { normalizePath } from 'vite';

/** Match Vite's module IDs even when an identity arrives with Windows separators. */
export function normalizeModulePath(filePath: string): string {
  return normalizePath(filePath.replaceAll('\\', '/'));
}
