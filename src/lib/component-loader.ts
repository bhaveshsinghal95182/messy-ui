import fs from 'fs';
import path from 'path';
import { ComponentFile, ComponentFileRef } from '@/config/types';

/**
 * Type guard to check if componentCode is ComponentFileRef[]
 */
export function isComponentFileRefArray(
  code: string | ComponentFile[] | ComponentFileRef[]
): code is ComponentFileRef[] {
  if (typeof code === 'string') return false;
  if (code.length === 0) return false;
  // ComponentFileRef has sourcePath, ComponentFile has code
  return 'sourcePath' in code[0] && !('code' in code[0]);
}

/**
 * Loads component source files at build time using fs.readFileSync.
 * Only works in Server Components / at build time.
 *
 * @param registryPath - Absolute path to the component's registry folder
 * @param files - Array of file references to load
 * @returns Array of ComponentFile objects with loaded code
 */
export function loadComponentFiles(
  registryPath: string,
  files: ComponentFileRef[]
): ComponentFile[] {
  return files.map((file) => ({
    filename: file.filename,
    targetPath: file.targetPath,
    code: fs.readFileSync(path.join(registryPath, file.sourcePath), 'utf-8'),
  }));
}

/**
 * Helper to get the registry path for a component
 */
export function getRegistryPath(componentName: string): string {
  return path.join(process.cwd(), 'registry', 'new-york', componentName);
}

/**
 * Resolves componentCode to loaded ComponentFile[] if needed.
 * Call this in Server Components before passing to client components.
 */
export function resolveComponentCode(
  componentSlug: string,
  code: string | ComponentFile[] | ComponentFileRef[]
): string | ComponentFile[] {
  if (typeof code === 'string') return code;
  if (isComponentFileRefArray(code)) {
    return loadComponentFiles(getRegistryPath(componentSlug), code);
  }
  return code;
}
