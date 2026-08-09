import { MongoClient, ServerApiVersion } from 'mongodb'

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
}

// Global singleton — persists across hot reloads in dev AND across invocations
// in serverless (module cache is reused within the same container).
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function resolveUri(): string {
  const rawUri = process.env.MONGODB_URI

  if (!rawUri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
  }

  const uri = rawUri.replace(/["']/g, '').trim()

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      `Invalid MONGODB_URI format. URI must start with "mongodb://" or "mongodb+srv://"`
    )
  }

  return uri
}

function createClient(): Promise<MongoClient> {
  const client = new MongoClient(resolveUri(), options)
  return client.connect()
}

// Validation and connection are deferred until the client is actually needed,
// so importing this module (e.g. transitively via app/layout.tsx) never
// crashes the whole app just because MONGODB_URI is missing or invalid.
function getClientPromise(): Promise<MongoClient> {
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = createClient()
  }
  return globalThis._mongoClientPromise
}

export async function getDb(dbName = 'zihad_portfolio') {
  const client = await getClientPromise()
  return client.db(dbName)
}
