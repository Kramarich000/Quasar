import path from 'path';
import fs from 'fs-extra';

async function cleanLocales(localesDir, allowedFiles = ['en.pak', 'ru.pak']) {
  if (!(await fs.pathExists(localesDir))) return;

  const files = await fs.readdir(localesDir);
  await Promise.all(
    files.map((filename) => {
      if (!allowedFiles.includes(filename)) {
        return fs.remove(path.join(localesDir, filename));
      }
      return Promise.resolve();
    }),
  );
}

export async function afterPack(context) {
  const localesPath = path.join(context.appOutDir, 'locales');
  await cleanLocales(localesPath);
}
