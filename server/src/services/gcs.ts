import { Storage } from '@google-cloud/storage';
import { FileInfo } from '../types/index.js';
import sharp from 'sharp';
import { PassThrough } from 'stream';

const storage = new Storage();

const BUCKETS = {
  threeMf: process.env.GCS_3MF_BUCKET || '',
  images: process.env.GCS_IMAGE_BUCKET || '',
  output: process.env.GCS_OUTPUT_BUCKET || '',
};

const IMAGE_FOLDER = process.env.GCS_IMAGE_FOLDER || '';
const storageCache = new Map<string, { storage: Storage; timestamp: number }>();
const STORGE_CACHE_TTL = 30 * 60_000;

function getStorage(accessToken: string): Storage {
  const cached = storageCache.get(accessToken);
  if (cached && Date.now() - cached.timestamp < STORGE_CACHE_TTL) {
    return cached.storage;
  }
  const instance = new Storage({
    authClient: {
      getAccessToken: async () => ({ token: accessToken }),
      getRequestHeaders: async () => ({ Authorization: `Bearer ${accessToken}` }),
    } as any
  });
  storageCache.set(accessToken, { storage: instance, timestamp: Date.now() });
  return instance;
}

export async function listThreeMfFiles(accessToken: string): Promise<FileInfo[]> {
  const storage = getStorage(accessToken);
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

export async function listImages(accessToken: string): Promise<FileInfo[]> {
  const storage = getStorage(accessToken);
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

export function getThreeMfStream(accessToken: string, fileName: string) {
  const storage = getStorage(accessToken);
  return storage.bucket(BUCKETS.threeMf).file(fileName).createReadStream();
}

export function getImageStream(accessToken: string, fileName: string) {
  const storage = getStorage(accessToken);
  return storage.bucket(BUCKETS.images).file(fileName).createReadStream();
}

export async function copyImageToOutput(
  accessToken: string,
  sourceName: string,
  destFolder: string,
  destFileName: string
): Promise<void> {
  const storage = getStorage(accessToken);
  const sourceBucket = storage.bucket(BUCKETS.images);
  const destBucket = storage.bucket(BUCKETS.output);

  const sourceFile = sourceBucket.file(sourceName);
  const destFile = destBucket.file(`${destFolder}/${destFileName}`);

  await sourceFile.copy(destFile);
}

export async function deleteImage(accessToken: string, fileName: string): Promise<void> {
  const storage = getStorage(accessToken);
  await storage.bucket(BUCKETS.images).file(fileName).delete();
}

export async function copyThreeMfToOutput(
  accessToken: string,
  sourceName: string,
  destFolder: string
): Promise<void> {
  const storage = getStorage(accessToken);
  const sourceBucket = storage.bucket(BUCKETS.threeMf);
  const destBucket = storage.bucket(BUCKETS.output);

  const sourceFile = sourceBucket.file(sourceName);
  const destFile = destBucket.file(`${destFolder}/${sourceName}`);

  await sourceFile.copy(destFile);
}

export async function deleteThreeMf(accessToken: string, fileName: string): Promise<void> {
  const storage = getStorage(accessToken);
  await storage.bucket(BUCKETS.threeMf).file(fileName).delete();
}

export async function deleteOutputFolder(accessToken: string, folderName: string): Promise<void> {
  const storage = getStorage(accessToken);
  const bucket = storage.bucket(BUCKETS.output);
  const [files] = await bucket.getFiles({ prefix: `${folderName}/`});

  if (files.length > 0) {
    await Promise.all(files.map(file => file.delete()));
  }
}

export async function renameThreeMf(accessToken: string, oldName: string, newName: string): Promise<void> {
  const storage = getStorage(accessToken);
  const bucket = storage.bucket(BUCKETS.threeMf);

  await bucket.file(oldName).copy(bucket.file(newName));
  await bucket.file(oldName).delete();
}

export async function listOutputFolders(accessToken: string): Promise<string[]> {
  const storage = getStorage(accessToken);
  const [, , apiResponse] = await storage.bucket(BUCKETS.output).getFiles({ delimiter: '/' });
  const prefixes: string[] = (apiResponse as any)?.prefixes || [];
  return prefixes.map(p => p.replace(/\/$/, ''));
}

export function getImageThumbnailStream(accessToken: string, fileName: string, width = 400) {
  const storage = getStorage(accessToken);
  const readStream = storage.bucket(BUCKETS.images).file(fileName).createReadStream();
  const transform = sharp().resize(width).jpeg({ quality: 70 });
  return readStream.pipe(transform);
}
