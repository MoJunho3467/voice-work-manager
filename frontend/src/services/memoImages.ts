import { Directory, File, Paths } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";

export const MAX_MEMO_IMAGES = 5;
export const MEMO_IMAGE_FOLDER = "memo-images";

const imageDirectory = () => new Directory(Paths.document, MEMO_IMAGE_FOLDER);

export function ensureMemoImageDirectory() {
  const directory = imageDirectory();
  if (!directory.exists)
    directory.create({ intermediates: true, idempotent: true });
  return directory;
}

const safeExtension = (asset: ImagePickerAsset) => {
  const fromName = asset.fileName?.match(/\.[a-zA-Z0-9]+$/)?.[0]?.toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (asset.mimeType === "image/png") return ".png";
  if (asset.mimeType === "image/webp") return ".webp";
  if (asset.mimeType === "image/heic" || asset.mimeType === "image/heif")
    return ".heic";
  return ".jpg";
};

export async function persistMemoImage(
  asset: ImagePickerAsset,
  memoId: string,
) {
  const directory = ensureMemoImageDirectory();
  const fileName = `${memoId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${safeExtension(asset)}`;
  const destination = new File(directory, fileName);
  await new File(asset.uri).copy(destination);
  return { fileName, relativePath: `${MEMO_IMAGE_FOLDER}/${fileName}` };
}

export function memoImageUri(relativePath: string) {
  const fileName = relativePath.split("/").pop() ?? relativePath;
  return new File(ensureMemoImageDirectory(), fileName).uri;
}

export function deleteMemoImageFile(relativePath: string) {
  const file = new File(memoImageUri(relativePath));
  if (file.exists) file.delete();
}

export function clearMemoImageFiles() {
  const directory = imageDirectory();
  if (directory.exists) directory.delete();
  ensureMemoImageDirectory();
}

export function memoImageFile(relativePath: string) {
  return new File(memoImageUri(relativePath));
}
