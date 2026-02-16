import { z } from 'zod'

// Environment variable schema for type-safe config
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Authentication
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // File Storage
    UPLOAD_DIR: z.string().default('./uploads'),
    MAX_FILE_SIZE: z.string().default('10485760'),

    // App
    NEXT_PUBLIC_APP_NAME: z.string().default('AgroChem Inventory'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Parse and validate environment variables
function getConfig() {
    const parsed = envSchema.safeParse(process.env)

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
        throw new Error('Invalid environment variables')
    }

    return parsed.data
}

export const config = getConfig()

// Export individual configs for convenience
export const dbConfig = {
    url: config.DATABASE_URL,
}

export const authConfig = {
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
}

export const cloudinaryConfig = {
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    apiSecret: config.CLOUDINARY_API_SECRET,
}

export const storageConfig = {
    uploadDir: config.UPLOAD_DIR,
    maxFileSize: parseInt(config.MAX_FILE_SIZE, 10),
}

export const appConfig = {
    name: config.NEXT_PUBLIC_APP_NAME,
    env: config.NODE_ENV,
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production',
}
