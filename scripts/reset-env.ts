/**
 * scripts/reset-env.ts
 *
 * Master cleanup script — wipes all test data from MongoDB and Cloudinary
 * before a production deployment.
 *
 * SAFETY LOCK: Aborts immediately if NODE_ENV === 'production'.
 *
 * Usage:
 *   npm run clean:env
 */

import { MongoClient, ServerApiVersion } from 'mongodb'
import { v2 as cloudinary } from 'cloudinary'

// ---------------------------------------------------------------------------
// SAFETY LOCK — must be the very first runtime check
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  console.error('\n[reset-env] ABORTED: This script must not run in production.\n')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------
const REQUIRED_ENV = [
  'MONGODB_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[reset-env] Missing required environment variable: ${key}`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// MongoDB — collections to wipe (content only; Settings and admin preserved)
// ---------------------------------------------------------------------------
const WIPE_COLLECTIONS = ['portfolio', 'feed', 'contacts'] as const

// ---------------------------------------------------------------------------
// Cloudinary — top-level folder roots to delete recursively
// ---------------------------------------------------------------------------
const CLOUDINARY_FOLDER_ROOTS = [
  'portfolio/profile',
  'portfolio/projects',
  'portfolio/testimonials',
  'portfolio/feed/posts',
  'portfolio/feed/media',
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string) {
  console.log(`[reset-env] ${msg}`)
}

function warn(msg: string) {
  console.warn(`[reset-env] WARN: ${msg}`)
}

// ---------------------------------------------------------------------------
// MongoDB cleanup
// ---------------------------------------------------------------------------
async function cleanMongo(): Promise<void> {
  const rawUri = (process.env.MONGODB_URI as string).replace(/["']/g, '').trim()
  const client = new MongoClient(rawUri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 30_000,
  })

  try {
    await client.connect()
    const db = client.db('zihad_portfolio')

    log('Connected to MongoDB.')

    for (const name of WIPE_COLLECTIONS) {
      try {
        const result = await db.collection(name).deleteMany({})
        log(`  [mongo] ${name}: deleted ${result.deletedCount} document(s)`)
      } catch (err) {
        warn(`  [mongo] Failed to wipe collection "${name}": ${(err as Error).message}`)
      }
    }

    log('MongoDB cleanup complete.')
  } finally {
    await client.close()
  }
}

// ---------------------------------------------------------------------------
// Cloudinary cleanup
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
})

/**
 * Deletes all resources inside a Cloudinary folder, then deletes the
 * (now-empty) folder itself. Handles pagination via `next_cursor`.
 */
async function deleteCloudinaryFolder(folder: string): Promise<void> {
  let deleted = 0
  let nextCursor: string | undefined

  do {
    // Search for all resources in the folder (images + videos + raw)
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${folder}/`,
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    })

    const publicIds: string[] = (result.resources ?? []).map(
      (r: { public_id: string }) => r.public_id,
    )

    if (publicIds.length > 0) {
      // delete_resources accepts up to 100 IDs per call
      const chunks: string[][] = []
      for (let i = 0; i < publicIds.length; i += 100) {
        chunks.push(publicIds.slice(i, i + 100))
      }
      for (const chunk of chunks) {
        await cloudinary.api.delete_resources(chunk)
        deleted += chunk.length
      }
    }

    nextCursor = result.next_cursor as string | undefined
  } while (nextCursor)

  // Delete the now-empty folder (best-effort; Cloudinary returns 404 if already gone)
  try {
    await cloudinary.api.delete_folder(folder)
  } catch {
    // Folder may not exist or may still have sub-folders — not fatal
  }

  log(`  [cloudinary] ${folder}: deleted ${deleted} asset(s)`)
}

async function cleanCloudinary(): Promise<void> {
  log('Starting Cloudinary cleanup...')

  for (const folder of CLOUDINARY_FOLDER_ROOTS) {
    try {
      await deleteCloudinaryFolder(folder)
    } catch (err) {
      warn(`  [cloudinary] Failed to clean folder "${folder}": ${(err as Error).message}`)
    }
  }

  log('Cloudinary cleanup complete.')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('\n==============================')
  console.log(' reset-env  — TEST DATA WIPE')
  console.log('==============================\n')

  log(`NODE_ENV : ${process.env.NODE_ENV ?? '(not set)'}`)
  log(`DB       : zihad_portfolio`)
  log(`Collections wiped : ${WIPE_COLLECTIONS.join(', ')}`)
  log(`Collections kept  : settings, admin, users\n`)

  await cleanMongo()
  console.log()
  await cleanCloudinary()

  console.log('\n[reset-env] All done. Environment is clean for production.\n')
}

main().catch((err) => {
  console.error('[reset-env] Fatal error:', err)
  process.exit(1)
})
