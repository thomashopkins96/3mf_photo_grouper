import { Storage } from '@google-cloud/storage';
import { FileInfo } from '../types/index.js';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';

const storage = new Storage();

const BUCKETS = {
  threeMf: process.env.GCS_3MF_BUCKET || '',
  images: process.env.GCS_IMAGE_BUCKET || '',
  output: process.env.GCS_OUTPUT_BUCKET || '',
};

const IMAGE_FOLDER = process.env.GCS_IMAGE_FOLDER || '';

export async function listThreeMfFiles(): Promise<FileInfo[]> {
  const bucket = storage.bucket(BUCKETS.threeMf);
  const [files] = await bucket.getFiles();

  return files
    .filter(file => file.name.endsWith('.3mf') && !file.name.startsWith('uploaded_to_cults/'))
    .map(file => ({
      name: file.name,
      size: Number(file.metadata.size) || 0,
      updated: file.metadata.updated || '',
    }));
}

export async function listImages(): Promise<FileInfo[]> {
  const bucket = storage.bucket(BUCKETS.images);
  const [files] = await bucket.getFiles({ prefix: IMAGE_FOLDER });

  return files
    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))
    .map(file => ({
      name: file.name,
      size: Number(file.metadata.size) || 0,
      updated: file.metadata.updated || '',
    }));
}

export async function getThreeMfSignedUrl(fileName: string): Promise<string> {
  const [url] = await storage.bucket(BUCKETS.threeMf).file(fileName).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url
}

export async function getImageSignedUrl(fileName: string): Promise<string> {
  const [url] = await storage.bucket(BUCKETS.images).file(fileName).getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  });
  return url;
}

export async function copyImageToOutput(
  sourceName: string,
  destFolder: string,
  destFileName: string
): Promise<void> {
  const sourceBucket = storage.bucket(BUCKETS.images);
  const destBucket = storage.bucket(BUCKETS.output);

  const sourceFile = sourceBucket.file(sourceName);
  const destFile = destBucket.file(`${destFolder}/${destFileName}`);

  await sourceFile.copy(destFile);
}

export async function deleteImage(fileName: string): Promise<void> {
  const thumbnailName = `thumbnails/${fileName}`;
  await Promise.all([
    storage.bucket(BUCKETS.images).file(fileName).delete(),
    storage.bucket(BUCKETS.images).file(thumbnailName).delete().catch(() => {}),
  ]);
}

export async function copyThreeMfToOutput(
  sourceName: string,
  destFolder: string
): Promise<void> {
  const sourceBucket = storage.bucket(BUCKETS.threeMf);
  const destBucket = storage.bucket(BUCKETS.output);

  const sourceFile = sourceBucket.file(sourceName);
  const destFile = destBucket.file(`${destFolder}/${sourceName}`);

  await sourceFile.copy(destFile);
}

export async function deleteThreeMf(fileName: string): Promise<void> {
  await storage.bucket(BUCKETS.threeMf).file(fileName).delete();
}

export async function deleteOutputFolder(folderName: string): Promise<void> {
  const bucket = storage.bucket(BUCKETS.output);
  const [files] = await bucket.getFiles({ prefix: `${folderName}/`});

  if (files.length > 0) {
    await Promise.all(files.map(file => file.delete()));
  }
}

export async function renameThreeMf(oldName: string, newName: string): Promise<void> {
  const bucket = storage.bucket(BUCKETS.threeMf);

  await bucket.file(oldName).copy(bucket.file(newName));
  await bucket.file(oldName).delete();
}

export async function listOutputFolders(): Promise<string[]> {
  const [, , apiResponse] = await storage.bucket(BUCKETS.output).getFiles({ delimiter: '/' });
  const prefixes: string[] = (apiResponse as any)?.prefixes || [];
  return prefixes.map(p => p.replace(/\/$/, ''));
}

async function generateThumbnail(sourceFileName: string, thumbnailName: string, width: number): Promise<void> {
  const readStream = storage.bucket(BUCKETS.images).file(sourceFileName).createReadStream();
  const transform = sharp().resize(width).jpeg({ quality: 70 });
  const writeStream = storage.bucket(BUCKETS.images).file(thumbnailName).createWriteStream({
    metadata: { contentType: 'image/jpeg' },
  });

  await pipeline(readStream, transform, writeStream);
}

export async function getOrCreateThumbnailSignedUrl(fileName: string, width = 400): Promise<string> {
  const thumbnailName = `thumbnails/${fileName}`;
  const thumbnailFile = storage.bucket(BUCKETS.images).file(thumbnailName);

  const [exists] = await thumbnailFile.exists();
  if (!exists) {
    await generateThumbnail(fileName, thumbnailName, width);
  }

  const [url] = await thumbnailFile.getSignedUrl({
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000,
  });
  return url;
}
