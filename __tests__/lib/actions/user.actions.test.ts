import { getAllUsersForNewsEmail } from '@/lib/actions/user.actions'
import { connectToDatabase } from '@/database/mongoose'

jest.mock('@/database/mongoose')

describe('User Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAllUsersForNewsEmail', () => {
    it('should return all users with email and name', async () => {
      const mockUsers = [
        {
          _id: 'id1',
          id: 'user1',
          email: 'user1@example.com',
          name: 'User One',
          country: 'US',
        },
        {
          _id: 'id2',
          id: 'user2',
          email: 'user2@example.com',
          name: 'User Two',
          country: 'UK',
        },
      ]

      const mockToArray = jest.fn().mockResolvedValue(mockUsers)
      const mockFind = jest.fn().mockReturnValue({ toArray: mockToArray })
      const mockCollection = jest.fn().mockReturnValue({ find: mockFind })

      const mockDb = { collection: mockCollection }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const result = await getAllUsersForNewsEmail()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'user1',
        email: 'user1@example.com',
        name: 'User One',
      })
      expect(result[1]).toEqual({
        id: 'user2',
        email: 'user2@example.com',
        name: 'User Two',
      })
    })

    it('should filter out users without email', async () => {
      const mockUsers = [
        {
          _id: 'id1',
          id: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
        {
          _id: 'id2',
          id: 'user2',
          email: null,
          name: 'User Two',
        },
      ]

      const mockToArray = jest.fn().mockResolvedValue(mockUsers)
      const mockFind = jest.fn().mockReturnValue({ toArray: mockToArray })
      const mockCollection = jest.fn().mockReturnValue({ find: mockFind })

      const mockDb = { collection: mockCollection }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const result = await getAllUsersForNewsEmail()

      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('user1@example.com')
    })

    it('should filter out users without name', async () => {
      const mockUsers = [
        {
          _id: 'id1',
          id: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
        {
          _id: 'id2',
          id: 'user2',
          email: 'user2@example.com',
          name: null,
        },
      ]

      const mockToArray = jest.fn().mockResolvedValue(mockUsers)
      const mockFind = jest.fn().mockReturnValue({ toArray: mockToArray })
      const mockCollection = jest.fn().mockReturnValue({ find: mockFind })

      const mockDb = { collection: mockCollection }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const result = await getAllUsersForNewsEmail()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('User One')
    })

    it('should use _id if id is not present', async () => {
      const mockUsers = [
        {
          _id: { toString: () => 'objectid123' },
          email: 'user@example.com',
          name: 'User',
        },
      ]

      const mockToArray = jest.fn().mockResolvedValue(mockUsers)
      const mockFind = jest.fn().mockReturnValue({ toArray: mockToArray })
      const mockCollection = jest.fn().mockReturnValue({ find: mockFind })

      const mockDb = { collection: mockCollection }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const result = await getAllUsersForNewsEmail()

      expect(result[0].id).toBe('objectid123')
    })

    it('should return empty array on database error', async () => {
      ;(connectToDatabase as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const result = await getAllUsersForNewsEmail()

      expect(result).toEqual([])
    })

    it('should throw error if database connection is not available', async () => {
      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: null },
      })

      const result = await getAllUsersForNewsEmail()

      expect(result).toEqual([])
    })

    it('should query user collection with correct filters', async () => {
      const mockToArray = jest.fn().mockResolvedValue([])
      const mockFind = jest.fn().mockReturnValue({ toArray: mockToArray })
      const mockCollection = jest.fn().mockReturnValue({ find: mockFind })

      const mockDb = { collection: mockCollection }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      await getAllUsersForNewsEmail()

      expect(mockCollection).toHaveBeenCalledWith('user')
      expect(mockFind).toHaveBeenCalledWith(
        { email: { $exists: true, $ne: null } },
        { projection: { _id: 1, id: 1, email: 1, name: 1, country: 1 } }
      )
    })
  })
})