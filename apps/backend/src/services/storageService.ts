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
  const nameWithoutExt = filename ? filename.replace(/\.[^/.]+$/, '') : '';
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = sanitized ? `${uuidv4()}_${sanitized}` : uuidv4();

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
 * Generate a long-lived authenticated download URL for any Cloudinary asset.
 * Resolves 401 Unauthorized errors caused by Cloudinary strict delivery settings.
 */
export function getAuthenticatedDownloadUrl(
  publicIdOrUrl: string,
  resourceType: 'raw' | 'image' | 'auto' = 'image',
  format?: string
): string {
  if (!publicIdOrUrl) return '';

  const cleanKey = publicIdOrUrl
    .replace(/^https?:\/\/[^/]+\/[^/]+\/(?:raw|image|video|auto)\/upload\/(?:v\d+\/)?/, '')
    .split('?')[0];

  const candKey = cleanKey.replace(/\.pdf\.pdf$/i, '').replace(/\.pdf$/i, '');
  const fmt = format || (publicIdOrUrl.toLowerCase().includes('.pdf') ? 'pdf' : '');

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
    return (
      cloudinary.utils.private_download_url(candKey, fmt, {
        resource_type: resourceType,
        type: 'upload',
        expires_at: expiresAt,
      }) || publicIdOrUrl
    );
  } catch {
    return publicIdOrUrl;
  }
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
  const key = `${signData.folder}/${signData.publicId}`;
  return {
    uploadUrl: signData.uploadUrl,
    key,
    downloadUrl: getAuthenticatedDownloadUrl(key, 'image', 'pdf'),
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
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = sanitized ? `${uuidv4()}_${sanitized}` : uuidv4();

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: cleanFolder,
        public_id: publicId,
        resource_type: 'auto',
      },
      (error?: Error | { message?: string }, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary stream upload failed'));
        }
        const authDownloadUrl = getAuthenticatedDownloadUrl(
          result.public_id,
          result.resource_type as 'image' | 'raw' | 'auto',
          result.format
        );
        resolve({
          url: authDownloadUrl || result.secure_url,
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
 * Resiliently handles raw vs image vs auto resource types and private signed downloads in Cloudinary.
 */
export async function downloadFromStorage(urlOrKey: string): Promise<Buffer> {
  if (!urlOrKey) {
    throw new Error('No storage URL or key provided');
  }

  // 1. Extract clean public ID candidates
  const cleanKey = urlOrKey
    .replace(/^https?:\/\/[^/]+\/[^/]+\/(?:raw|image|video|auto)\/upload\/(?:v\d+\/)?/, '')
    .split('?')[0];

  const candidateKeys = Array.from(
    new Set([
      cleanKey,
      cleanKey.replace(/\.pdf\.pdf$/i, '.pdf'),
      cleanKey.replace(/\.pdf$/i, ''),
      cleanKey.replace(/\.[^/.]+$/, ''),
    ])
  ).filter(Boolean);

  const rTypes = ['image', 'raw', 'auto'] as const;
  const formats = ['pdf', ''];

  // 2. Try authenticated private download URLs (works even with restricted asset access)
  for (const candKey of candidateKeys) {
    for (const rType of rTypes) {
      for (const fmt of formats) {
        try {
          const expiresAt = Math.floor(Date.now() / 1000) + 3600;
          const privUrl = cloudinary.utils.private_download_url(candKey, fmt || '', {
            resource_type: rType,
            type: 'upload',
            expires_at: expiresAt,
          });

          if (privUrl) {
            const response = await axios.get(privUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
            });
            if (response.data && response.data.byteLength > 0) {
              return Buffer.from(response.data);
            }
          }
        } catch {
          // try next candidate
        }
      }
    }
  }

  // 3. Direct URL fallback (if it was an external or public HTTP/HTTPS URL)
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    try {
      const response = await axios.get(urlOrKey, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch {
      if (urlOrKey.includes('cloudinary.com')) {
        const altUrl = urlOrKey.includes('/raw/upload/')
          ? urlOrKey.replace('/raw/upload/', '/image/upload/')
          : urlOrKey.replace('/image/upload/', '/raw/upload/');
        try {
          const altRes = await axios.get(altUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          return Buffer.from(altRes.data);
        } catch {
          // continue
        }
      }
    }
  }

  // 4. Standard unsigned Cloudinary URLs fallback
  for (const candKey of candidateKeys) {
    for (const rType of rTypes) {
      try {
        const fetchUrl = cloudinary.url(candKey, { resource_type: rType, secure: true });
        const response = await axios.get(fetchUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });
        if (response.data && response.data.byteLength > 0) {
          return Buffer.from(response.data);
        }
      } catch {
        // continue
      }
    }
  }

  throw new Error(`Failed to download asset from storage for URL/Key: ${urlOrKey}`);
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
