import mongoose from 'mongoose'
import { connectToDatabase } from '@/database/mongoose'

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
  },
}))

describe('Database Connection', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    // Clear the cache
    global.mongooseCache = { conn: null, promise: null }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should throw error if MONGODB_URI is not set', async () => {
    delete process.env.MONGODB_URI

    await expect(connectToDatabase()).rejects.toThrow(
      'MONGODB_URI must be set within .env'
    )
  })

  it('should connect to database successfully', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const mockMongoose = { connection: { db: {} } }
    ;(mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose)

    const result = await connectToDatabase()

    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test-db',
      { bufferCommands: false }
    )
    expect(result).toBe(mockMongoose)
  })

  it('should return cached connection if already connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const mockMongoose = { connection: { db: {} } }
    
    global.mongooseCache.conn = mockMongoose as any

    const result = await connectToDatabase()

    expect(mongoose.connect).not.toHaveBeenCalled()
    expect(result).toBe(mockMongoose)
  })

  it('should use cached promise if connection is in progress', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const mockMongoose = { connection: { db: {} } }
    const mockPromise = Promise.resolve(mockMongoose)
    
    global.mongooseCache.promise = mockPromise as any

    const result = await connectToDatabase()

    expect(mongoose.connect).not.toHaveBeenCalled()
    expect(result).toBe(mockMongoose)
  })

  it('should handle connection errors and clear promise cache', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const error = new Error('Connection failed')
    ;(mongoose.connect as jest.Mock).mockRejectedValue(error)

    await expect(connectToDatabase()).rejects.toThrow('Connection failed')
    expect(global.mongooseCache.promise).toBeNull()
  })

  it('should create new connection with bufferCommands disabled', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const mockMongoose = { connection: { db: {} } }
    ;(mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose)

    await connectToDatabase()

    expect(mongoose.connect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ bufferCommands: false })
    )
  })

  it('should handle multiple simultaneous connection attempts', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'
    const mockMongoose = { connection: { db: {} } }
    ;(mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose)

    const [result1, result2, result3] = await Promise.all([
      connectToDatabase(),
      connectToDatabase(),
      connectToDatabase(),
    ])

    expect(mongoose.connect).toHaveBeenCalledTimes(1)
    expect(result1).toBe(mockMongoose)
    expect(result2).toBe(mockMongoose)
    expect(result3).toBe(mockMongoose)
  })
})