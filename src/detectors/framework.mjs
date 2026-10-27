import fs from 'node:fs';
import path from 'node:path';

/**
 * Detect the target project's web framework.
 *
 * @param {string} projectRoot - Absolute or relative path to project directory
 * @returns {{ name: string, isNext: boolean, isVite: boolean, isAstro: boolean, isNuxt: boolean }}
 */
export function detectFramework(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`No package.json found at ${projectRoot}. Run this command in your project root.`);
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to parse package.json at ${pkgPath}: ${err.message}`);
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  const isNext = Boolean(allDeps.next);
  const isVite = Boolean(allDeps.vite);
  const isAstro = Boolean(allDeps.astro);
  const isNuxt = Boolean(allDeps.nuxt);

  let name = 'generic';
  if (isNext) name = 'nextjs';
  else if (isVite) name = 'vite';
  else if (isAstro) name = 'astro';
  else if (isNuxt) name = 'nuxt';

  return {
    name,
    isNext,
    isVite,
    isAstro,
    isNuxt,
  };
}
