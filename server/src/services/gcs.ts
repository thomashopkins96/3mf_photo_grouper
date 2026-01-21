import { Storage } from '@google-cloud/storage';
import { FileInfo } from '../types/index.js';

const storage = new Storage();

const BUCKETS = {
  threeMf: process.env.GCS_3MF_BUCKET || '',
  images: process.env.GCS_IMAGE_BUCKET || '',
  output: process.env.GCS_OUTPUT_BUCKET || '',
};

const IMAGE_FOLDER = process.env.GCS_IMAGE_FOLDER || '';

function getStorage(accessToken: string): Storage {
  return new Storage({
    authClient: {
      getAccessToken: async () => ({ token: accessToken }),
      getRequestHeaders: async () => ({ Authorization: `Bearer ${accessToken}` }),
    } as any,
  });
}

export async function listThreeMfFiles(accessToken: string): Promise<FileInfo[]> {
  const storage = getStorage(accessToken);
  const bucket = storage.bucket(BUCKETS.threeMf);
  const [files] = await bucket.getFiles();

  return files
    .filter(file => file.name.endsWith('.3mf'))
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
