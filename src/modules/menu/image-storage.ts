import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const DISHES_DIR = path.resolve("uploads", "dishes");

export async function saveDishImage(buffer: Buffer, ext: string) {
  await mkdir(DISHES_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(DISHES_DIR, filename), buffer);
  return `/uploads/dishes/${filename}`;
}

export async function deleteDishImage(imageUrl: string) {
  const filename = path.basename(imageUrl); // on garde seulement le nom → impossible de sortir du dossier
  await unlink(path.join(DISHES_DIR, filename)).catch(() => {});
}