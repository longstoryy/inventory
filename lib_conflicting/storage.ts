import { v2 as cloudinary } from 'cloudinary'
import { cloudinaryConfig, storageConfig } from './config'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Configure Cloudinary if credentials are available
if (cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
    cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
    })
}

export interface UploadResult {
    url: string
    filename: string
    size: number
    mimeType: string
}

/**
 * Upload file to Cloudinary (production) or local storage (development)
 */
export async function uploadFile(
    file: File,
    folder: string = 'agrochem'
): Promise<UploadResult> {
    // Validate file size
    if (file.size > storageConfig.maxFileSize) {
        throw new Error(`File size exceeds maximum of ${storageConfig.maxFileSize / (1024 * 1024)}MB`)
    }

    // Use Cloudinary if configured
    if (cloudinaryConfig.cloudName) {
        return uploadToCloudinary(file, folder)
    }

    // Fallback to local storage
    return uploadToLocal(file, folder)
}

/**
 * Upload to Cloudinary
 */
async function uploadToCloudinary(file: File, folder: string): Promise<UploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer())

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
            },
            (error, result) => {
                if (error) {
                    reject(error)
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        filename: result.public_id,
                        size: result.bytes,
                        mimeType: file.type,
                    })
                }
            }
        )

        uploadStream.end(buffer)
    })
}

/**
 * Upload to local filesystem (development fallback)
 */
async function uploadToLocal(file: File, folder: string): Promise<UploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const uploadDir = join(process.cwd(), storageConfig.uploadDir, folder)

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true })

    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    return {
        url: `/uploads/${folder}/${filename}`,
        filename,
        size: file.size,
        mimeType: file.type,
    }
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => file.type.startsWith(type))
}

/**
 * Common file type validators
 */
export const fileTypeValidators = {
    images: (file: File) => validateFileType(file, ['image/']),
    documents: (file: File) => validateFileType(file, ['application/pdf', 'image/']),
}
