import AWS from 'aws-sdk';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const s3 = new AWS.S3({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
  ...(env.AWS_ENDPOINT && { endpoint: env.AWS_ENDPOINT }),
  s3ForcePathStyle: !!env.AWS_ENDPOINT, // Required for R2
  signatureVersion: 'v4',
});

export async function uploadFileToStorage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<{ url: string; key: string; filename: string }> {
  const ext = originalFilename.split('.').pop() || 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3
    .upload({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  const url = await getSignedUrl(key);

  return { url, key, filename: originalFilename };
}

export async function getSignedUrl(
  key: string,
  expiresSeconds: number = 3600
): Promise<string> {
  return s3.getSignedUrlPromise('getObject', {
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    Expires: expiresSeconds,
  });
}

export async function downloadFromStorage(key: string): Promise<Buffer> {
  const result = await s3
    .getObject({ Bucket: env.AWS_BUCKET_NAME, Key: key })
    .promise();

  return result.Body as Buffer;
}

export async function deleteFromStorage(key: string): Promise<void> {
  await s3
    .deleteObject({ Bucket: env.AWS_BUCKET_NAME, Key: key })
    .promise();
}

export function computeContentHash(buffers: Buffer[]): string {
  const hash = crypto.createHash('sha256');
  for (const buf of buffers) {
    hash.update(buf);
  }
  return hash.digest('hex');
}
