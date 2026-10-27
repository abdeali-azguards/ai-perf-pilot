import fs from 'node:fs';
import path from 'node:path';

/**
 * Detect the target project's package manager based on lockfiles.
 *
 * @param {string} projectRoot - Absolute or relative path to project directory
 * @returns {'pnpm' | 'yarn' | 'bun' | 'npm'}
 */
export function detectPackageManager(projectRoot) {
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectRoot, 'bun.lockb')) || fs.existsSync(path.join(projectRoot, 'bun.lock'))) {
    return 'bun';
  }
  return 'npm';
}
