import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'alag'
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '')
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

export const isR2Configured = () =>
  Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT && R2_PUBLIC_URL)

let cachedClient: S3Client | null = null

const getClient = (): S3Client => {
  if (cachedClient) return cachedClient

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })

  return cachedClient
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const buildObjectKey = (userId: number, mimeType: string): string => {
  const extension = EXTENSION_BY_MIME[mimeType] || 'jpg'
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`
  return `posts/${userId}/${uniqueName}`
}

export const buildPublicUrl = (key: string): string => `${R2_PUBLIC_URL}/${key}`


export const uploadImageToR2 = async (
  buffer: Buffer,
  mimeType: string,
  key: string,
): Promise<string> => {
  if (!isR2Configured()) {
    throw new Error('R2_NOT_CONFIGURED')
  }

  const client = getClient()

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  return buildPublicUrl(key)
}


export const deleteImageFromR2 = async (imageUrl: string): Promise<void> => {
  try {
    if (!isR2Configured()) return
    if (!imageUrl || !imageUrl.startsWith(R2_PUBLIC_URL)) return

    const key = imageUrl.slice(R2_PUBLIC_URL.length + 1)
    if (!key) return

    const client = getClient()
    await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }))
  } catch (error) {
    console.error('[r2] Failed to delete image (non-blocking):', error)
  }
}