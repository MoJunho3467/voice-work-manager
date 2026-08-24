import { File, Paths } from "expo-file-system";
import JSZip from "jszip";
import { exportData, importData } from "./database";
import {
  clearMemoImageFiles,
  ensureMemoImageDirectory,
  memoImageFile,
} from "./memoImages";

type BackupData = Awaited<ReturnType<typeof exportData>>;

export async function createBackupZip() {
  const data = await exportData();
  const zip = new JSZip();
  zip.file("backup.json", JSON.stringify(data, null, 2));

  for (const image of data.memoImages) {
    const file = memoImageFile(image.relativePath);
    if (file.exists) zip.file(`images/${image.fileName}`, await file.bytes());
  }

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  const output = new File(
    Paths.cache,
    `voice-work-backup-${new Date().toISOString().slice(0, 10)}.zip`,
  );
  output.create({ overwrite: true });
  output.write(bytes);
  return output;
}

export async function readBackupZip(uri: string) {
  const zip = await JSZip.loadAsync(await new File(uri).bytes());
  const jsonEntry = zip.file("backup.json");
  if (!jsonEntry) throw new Error("backup.json이 없는 백업 파일입니다.");
  const data = JSON.parse(await jsonEntry.async("string")) as BackupData;
  return { zip, data };
}

export async function restoreBackupZip(uri: string, mode: "merge" | "replace") {
  const { zip, data } = await readBackupZip(uri);
  if (mode === "replace") clearMemoImageFiles();
  const directory = ensureMemoImageDirectory();

  for (const image of data.memoImages ?? []) {
    const entry = zip.file(`images/${image.fileName}`);
    if (!entry)
      throw new Error(`백업에서 사진을 찾을 수 없습니다: ${image.fileName}`);
    const destination = new File(directory, image.fileName);
    destination.create({ overwrite: true, intermediates: true });
    destination.write(await entry.async("uint8array"));
  }

  await importData(data, mode);
  return data;
}
