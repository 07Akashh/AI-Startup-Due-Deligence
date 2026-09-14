import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinarySignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
  publicId?: string;
  uploadPreset?: string;
}

/**
 * Generate signed upload parameters for direct client-to-Cloudinary streaming uploads.
 * This bypasses Vercel's 4.5MB serverless payload limit.
 */
export async function getCloudinaryUploadSignature(
  folder: string = 'uploads',
  filename?: string
): Promise<CloudinarySignatureResult> {
  const timestamp = Math.round(Date.now() / 1000);
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const publicId = filename
    ? `${uuidv4()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    : uuidv4();

  const paramsToSign: Record<string, string | number> = {
    folder: cleanFolder,
    public_id: publicId,
    timestamp,
  };

  if (env.CLOUDINARY_UPLOAD_PRESET) {
    paramsToSign.upload_preset = env.CLOUDINARY_UPLOAD_PRESET;
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET
  );

  const uploadUrl = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`;

  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: cleanFolder,
    publicId,
    uploadUrl,
    uploadPreset: env.CLOUDINARY_UPLOAD_PRESET,
  };
}

/**
 * Backward compatibility helper for presigned upload URLs.
 */
export async function getPresignedUploadUrl(
  originalFilename: string,
  _mimeType: string,
  folder: string = 'uploads'
): Promise<{ uploadUrl: string; key: string; downloadUrl: string; signatureData?: CloudinarySignatureResult }> {
  const signData = await getCloudinaryUploadSignature(folder, originalFilename);
  return {
    uploadUrl: signData.uploadUrl,
    key: `${signData.folder}/${signData.publicId}`,
    downloadUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/raw/upload/${signData.folder}/${signData.publicId}`,
    signatureData: signData,
  };
}

/**
 * Upload a Stream or Buffer to Cloudinary using Node.js streaming upload_stream.
 * Ensures chunked streaming without loading entire huge files in serverless memory.
 */
export function uploadStreamToStorage(
  streamOrBuffer: Readable | Buffer,
  originalFilename: string,
  _mimeType?: string,
  folder: string = 'uploads'
): Promise<{ url: string; key: string; filename: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const ext = originalFilename.split('.').pop() || 'bin';
    const publicId = `${uuidv4()}.${ext}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cleanFolder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error: any, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary stream upload failed'));
        }
        resolve({
          url: result.secure_url,
          key: result.public_id,
          publicId: result.public_id,
          filename: originalFilename,
        });
      }
    );

    if (Buffer.isBuffer(streamOrBuffer)) {
      const readable = new Readable();
      readable._read = () => {};
      readable.push(streamOrBuffer);
      readable.push(null);
      readable.pipe(uploadStream);
    } else {
      streamOrBuffer.pipe(uploadStream);
    }
  });
}

/**
 * Backward-compatible helper for uploading buffer to storage.
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<{ url: string; key: string; filename: string }> {
  return uploadStreamToStorage(buffer, originalFilename, mimeType, folder);
}

/**
 * Retrieve file Buffer from Cloudinary URL or publicId.
 */
export async function downloadFromStorage(urlOrKey: string): Promise<Buffer> {
  let fetchUrl = urlOrKey;

  // If not a full URL, resolve Cloudinary asset URL
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    fetchUrl = cloudinary.url(urlOrKey, { resource_type: 'raw', secure: true });
  }

  const response = await axios.get(fetchUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return Buffer.from(response.data);
}

/**
 * Delete an asset from Cloudinary.
 */
export async function deleteFromStorage(publicIdOrUrl: string): Promise<void> {
  let publicId = publicIdOrUrl;
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    // Extract public ID from Cloudinary URL if full URL is passed
    try {
      const url = new URL(publicIdOrUrl);
      const parts = url.pathname.split('/');
      const uploadIdx = parts.findIndex((p) => p === 'upload');
      if (uploadIdx !== -1 && uploadIdx + 1 < parts.length) {
        // Skip transformation/version if present (e.g. v123456789)
        const subParts = parts.slice(uploadIdx + 1);
        if (subParts[0]?.startsWith('v') && /^\d+$/.test(subParts[0].slice(1))) {
          subParts.shift();
        }
        publicId = subParts.join('/').replace(/\.[^/.]+$/, '');
      }
    } catch {
      publicId = publicIdOrUrl;
    }
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch {
    // Retry with auto/image if raw fails
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  }
}

/**
 * Compute SHA256 hash of buffers.
 */
export function computeContentHash(buffers: Buffer[]): string {
  const hash = crypto.createHash('sha256');
  for (const buf of buffers) {
    hash.update(buf);
  }
  return hash.digest('hex');
}
