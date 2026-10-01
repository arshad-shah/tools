import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename as fsRename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** pdfjs-dist folders the app loads at runtime from /pdfjs/. */
export const PDFJS_ASSET_DIRS = ['standard_fonts', 'cmaps', 'iccs', 'wasm'];

/**
 * Version stamp, kept in `workDir` rather than the served folder so it is
 * never copied into dist/.
 */
export const PDFJS_STAMP_FILE = 'pdfjs-version';

/** Codes Windows reports when another process holds a file in the folder. */
const LOCKED = new Set(['EBUSY', 'EPERM', 'EACCES']);

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Cheap check: the stamp matches and every top-level asset folder exists.
 * Individual files are not compared; a pdfjs-dist upgrade changes the stamp.
 */
const isCurrent = async (destDir, workDir, version) => {
  try {
    const stamped = await readFile(join(workDir, PDFJS_STAMP_FILE), 'utf8');
    if (stamped.trim() !== version) return false;
  } catch {
    return false;
  }
  for (const dir of PDFJS_ASSET_DIRS) {
    if (!(await exists(join(destDir, dir)))) return false;
  }
  return true;
};

const copyAssets = async (srcDir, targetDir) => {
  for (const dir of PDFJS_ASSET_DIRS) {
    await cp(join(srcDir, dir), join(targetDir, dir), {
      recursive: true,
      force: true,
    });
  }
};

/** Best-effort removal: a folder another process still holds is left behind. */
const tryRemove = (path) =>
  rm(path, { recursive: true, force: true }).catch(() => undefined);

const isRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return error.code === 'EPERM';
  }
};

/** Remove fresh-/old- folders left by runs that crashed (their pid is gone). */
const sweepLeftovers = async (workDir) => {
  let entries;
  try {
    entries = await readdir(workDir);
  } catch {
    return;
  }
  for (const name of entries) {
    const match = /^(?:fresh|old)-(\d+)-\d+$/.exec(name);
    if (match && !isRunning(Number(match[1]))) {
      await tryRemove(join(workDir, name));
    }
  }
};

/**
 * Keep `destDir` a copy of the pdf.js runtime assets for `version`.
 *
 * - Skips all work when the stamp in `workDir` already matches (the common
 *   case on every `pnpm dev` / `pnpm build`), so a dev server already serving
 *   the folder never sees it change.
 * - Otherwise copies into a fresh folder under `workDir` and swaps it in with
 *   two renames. If the live folder is locked (Windows EBUSY/EPERM/EACCES
 *   while another process holds a file), it overwrites in place instead.
 *   Nothing in use is ever deleted, so files that a newer pdfjs-dist dropped
 *   stay behind on that path; they are unused and go on the next clean swap.
 * - Any other swap error is rethrown, with the previous copy and stamp kept.
 * - The stamp is written last, so an interrupted run retries next time.
 *
 * @returns {Promise<'copied' | 'skipped'>}
 */
export async function syncPdfjsAssets({
  srcDir,
  destDir,
  workDir,
  version,
  rename = fsRename,
}) {
  if (await isCurrent(destDir, workDir, version)) return 'skipped';

  await mkdir(workDir, { recursive: true });
  await mkdir(dirname(destDir), { recursive: true });
  await sweepLeftovers(workDir);

  const id = `${process.pid}-${Date.now()}`;
  const fresh = join(workDir, `fresh-${id}`);
  const old = join(workDir, `old-${id}`);
  try {
    await copyAssets(srcDir, fresh);
    try {
      if (await exists(destDir)) await rename(destDir, old);
      try {
        await rename(fresh, destDir);
      } catch (error) {
        // Put the previous copy back before deciding what to do next.
        if (await exists(old)) {
          await rename(old, destDir).catch(() => undefined);
        }
        throw error;
      }
    } catch (error) {
      if (!LOCKED.has(error?.code)) throw error;
      await mkdir(destDir, { recursive: true });
      await copyAssets(srcDir, destDir);
    }
    await writeFile(join(workDir, PDFJS_STAMP_FILE), version);
  } finally {
    await tryRemove(fresh);
    await tryRemove(old);
  }
  return 'copied';
}
