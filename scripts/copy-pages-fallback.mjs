import { cp, copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dataSourceDir = 'data';
const dataDistDir = path.join('dist', 'data');
const diariesSourceDir = path.join(dataSourceDir, 'diaries');
const indexDistPath = path.join(dataDistDir, 'index.json');

const fileExists = async (targetPath) => {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
};

const collectJsonFiles = async (dir) => {
  if (!(await fileExists(dir))) return [];
  const items = await readdir(dir, { withFileTypes: true });
  const results = await Promise.all(
    items.map(async (item) => {
      const targetPath = path.join(dir, item.name);
      if (item.isDirectory()) return collectJsonFiles(targetPath);
      return item.isFile() && item.name.endsWith('.json') ? [targetPath] : [];
    }),
  );
  return results.flat();
};

const buildDiaryIndex = async () => {
  const files = await collectJsonFiles(diariesSourceDir);
  const entries = [];
  for (const file of files) {
    try {
      entries.push(JSON.parse(await readFile(file, 'utf8')));
    } catch (error) {
      console.warn(`Skipped invalid diary JSON: ${file}`, error);
    }
  }
  entries.sort((a, b) => {
    const left = new Date(a.createdAt || a.date).getTime();
    const right = new Date(b.createdAt || b.date).getTime();
    return right - left;
  });
  return {
    generatedAt: new Date().toISOString(),
    entries,
  };
};

await copyFile('dist/index.html', 'dist/404.html');

if (await fileExists(dataSourceDir)) {
  await cp(dataSourceDir, dataDistDir, { recursive: true });
} else {
  await mkdir(dataDistDir, { recursive: true });
}

await writeFile(indexDistPath, `${JSON.stringify(await buildDiaryIndex(), null, 2)}\n`);
