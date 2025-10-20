import { 
  getWatchlistSymbolsByEmail,
  addToWatchlist,
  removeFromWatchlist,
  getUserWatchlist,
  getWatchlistWithData
} from '@/lib/actions/watchlist.actions'
import { connectToDatabase } from '@/database/mongoose'
import { Watchlist } from '@/database/models/watchlist.model'
import { auth } from '@/lib/better-auth/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getStocksDetails } from '@/lib/actions/finnhub.actions'

// Mock all dependencies
jest.mock('@/database/mongoose')
jest.mock('@/database/models/watchlist.model')
jest.mock('@/lib/better-auth/auth')
jest.mock('next/navigation')
jest.mock('next/cache')
jest.mock('next/headers')
jest.mock('@/lib/actions/finnhub.actions')

describe('Watchlist Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getWatchlistSymbolsByEmail', () => {
    it('should return empty array if email is not provided', async () => {
      const result = await getWatchlistSymbolsByEmail('')
      expect(result).toEqual([])
    })

    it('should return empty array if user not found', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
      }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const result = await getWatchlistSymbolsByEmail('test@example.com')
      expect(result).toEqual([])
    })

    it('should return symbols for valid user', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            id: 'user123',
            email: 'test@example.com',
          }),
        }),
      }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const mockFind = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { symbol: 'AAPL' },
          { symbol: 'GOOGL' },
          { symbol: 'MSFT' },
        ]),
      })

      ;(Watchlist.find as jest.Mock) = mockFind

      const result = await getWatchlistSymbolsByEmail('test@example.com')
      expect(result).toEqual(['AAPL', 'GOOGL', 'MSFT'])
    })

    it('should handle database errors gracefully', async () => {
      ;(connectToDatabase as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await getWatchlistSymbolsByEmail('test@example.com')
      expect(result).toEqual([])
    })

    it('should handle user with _id instead of id', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            _id: 'user456',
            email: 'test@example.com',
          }),
        }),
      }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const mockFind = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ symbol: 'TSLA' }]),
      })

      ;(Watchlist.find as jest.Mock) = mockFind

      const result = await getWatchlistSymbolsByEmail('test@example.com')
      expect(result).toEqual(['TSLA'])
    })

    it('should return empty array if no watchlist items found', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            id: 'user123',
            email: 'test@example.com',
          }),
        }),
      }

      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        connection: { db: mockDb },
      })

      const mockFind = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      })

      ;(Watchlist.find as jest.Mock) = mockFind

      const result = await getWatchlistSymbolsByEmail('test@example.com')
      expect(result).toEqual([])
    })
  })

  describe('addToWatchlist', () => {
    const mockSession = {
      user: { id: 'user123', email: 'test@example.com' },
    }

    beforeEach(() => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    })

    it('should redirect if user is not authenticated', async () => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(null)

      await addToWatchlist('AAPL', 'Apple Inc.')

      expect(redirect).toHaveBeenCalledWith('/sign-in')
    })

    it('should return error if stock already exists in watchlist', async () => {
      ;(Watchlist.findOne as jest.Mock).mockResolvedValue({
        userId: 'user123',
        symbol: 'AAPL',
        company: 'Apple Inc.',
      })

      const result = await addToWatchlist('AAPL', 'Apple Inc.')

      expect(result).toEqual({
        success: false,
        error: 'Stock already in watchlist',
      })
    })

    it('should add stock to watchlist successfully', async () => {
      ;(Watchlist.findOne as jest.Mock).mockResolvedValue(null)

      const mockSave = jest.fn().mockResolvedValue({})
      const mockWatchlistItem = { save: mockSave }

      // Mock the Watchlist constructor
      ;(Watchlist as any).mockImplementation(() => mockWatchlistItem)

      const result = await addToWatchlist('AAPL', 'Apple Inc.')

      expect(mockSave).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/watchlist')
      expect(result).toEqual({
        success: true,
        message: 'Stock added to watchlist',
      })
    })

    it('should convert symbol to uppercase', async () => {
      ;(Watchlist.findOne as jest.Mock).mockResolvedValue(null)

      const mockSave = jest.fn().mockResolvedValue({})
      const mockWatchlistItem = { save: mockSave }
      ;(Watchlist as any).mockImplementation(() => mockWatchlistItem)

      await addToWatchlist('aapl', 'Apple Inc.')

      expect(Watchlist.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        symbol: 'AAPL',
      })
    })

    it('should trim company name', async () => {
      ;(Watchlist.findOne as jest.Mock).mockResolvedValue(null)

      const mockSave = jest.fn().mockResolvedValue({})
      ;(Watchlist as any).mockImplementation((data: any) => {
        expect(data.company).toBe('Apple Inc.')
        return { save: mockSave }
      })

      await addToWatchlist('AAPL', '  Apple Inc.  ')
    })

    it('should throw error on database failure', async () => {
      ;(Watchlist.findOne as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      await expect(addToWatchlist('AAPL', 'Apple Inc.')).rejects.toThrow(
        'Failed to add stock to watchlist'
      )
    })
  })

  describe('removeFromWatchlist', () => {
    const mockSession = {
      user: { id: 'user123', email: 'test@example.com' },
    }

    beforeEach(() => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    })

    it('should redirect if user is not authenticated', async () => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(null)

      await removeFromWatchlist('AAPL', 'Apple Inc.')

      expect(redirect).toHaveBeenCalledWith('/sign-in')
    })

    it('should remove stock from watchlist successfully', async () => {
      ;(Watchlist.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 })

      const result = await removeFromWatchlist('AAPL', 'Apple Inc.')

      expect(Watchlist.deleteOne).toHaveBeenCalledWith({
        userId: 'user123',
        symbol: 'AAPL',
      })
      expect(revalidatePath).toHaveBeenCalledWith('/watchlist')
      expect(result).toEqual({
        success: true,
        message: 'Stock removed from watchlist',
      })
    })

    it('should convert symbol to uppercase when removing', async () => {
      ;(Watchlist.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 })

      await removeFromWatchlist('aapl', 'Apple Inc.')

      expect(Watchlist.deleteOne).toHaveBeenCalledWith({
        userId: 'user123',
        symbol: 'AAPL',
      })
    })

    it('should throw error on database failure', async () => {
      ;(Watchlist.deleteOne as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      await expect(removeFromWatchlist('AAPL', 'Apple Inc.')).rejects.toThrow(
        'Failed to remove from the watchlist'
      )
    })
  })

  describe('getUserWatchlist', () => {
    const mockSession = {
      user: { id: 'user123', email: 'test@example.com' },
    }

    beforeEach(() => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    })

    it('should redirect if user is not authenticated', async () => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(null)

      await getUserWatchlist()

      expect(redirect).toHaveBeenCalledWith('/sign-in')
    })

    it('should return user watchlist sorted by addedAt', async () => {
      const mockWatchlist = [
        {
          userId: 'user123',
          symbol: 'AAPL',
          company: 'Apple Inc.',
          addedAt: new Date('2025-01-15'),
        },
        {
          userId: 'user123',
          symbol: 'GOOGL',
          company: 'Alphabet Inc.',
          addedAt: new Date('2025-01-14'),
        },
      ]

      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWatchlist),
      })

      ;(Watchlist.find as jest.Mock).mockReturnValue({
        sort: mockSort,
      })

      const result = await getUserWatchlist()

      expect(Watchlist.find).toHaveBeenCalledWith({ userId: 'user123' })
      expect(mockSort).toHaveBeenCalledWith({ addedAt: -1 })
      expect(result).toBeDefined()
    })

    it('should throw error on database failure', async () => {
      ;(Watchlist.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(getUserWatchlist()).rejects.toThrow(
        'Failed to fetch watchlist'
      )
    })
  })

  describe('getWatchlistWithData', () => {
    const mockSession = {
      user: { id: 'user123', email: 'test@example.com' },
    }

    beforeEach(() => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(mockSession)
    })

    it('should redirect if user is not authenticated', async () => {
      ;(auth.api.getSession as jest.Mock).mockResolvedValue(null)

      await getWatchlistWithData()

      expect(redirect).toHaveBeenCalledWith('/sign-in')
    })

    it('should return empty array if watchlist is empty', async () => {
      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      })

      ;(Watchlist.find as jest.Mock).mockReturnValue({
        sort: mockSort,
      })

      const result = await getWatchlistWithData()

      expect(result).toEqual([])
    })

    it('should enrich watchlist with stock data', async () => {
      const mockWatchlist = [
        {
          userId: 'user123',
          symbol: 'AAPL',
          company: 'Apple Inc.',
          addedAt: new Date('2025-01-15'),
        },
      ]

      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWatchlist),
      })

      ;(Watchlist.find as jest.Mock).mockReturnValue({
        sort: mockSort,
      })

      const mockStockData = {
        company: 'Apple Inc.',
        symbol: 'AAPL',
        currentPrice: 150.25,
        priceFormatted: '$150.25',
        changeFormatted: '+2.5%',
        changePercent: 2.5,
        marketCapFormatted: '$2.5T',
        peRatio: '25.3',
      }

      ;(getStocksDetails as jest.Mock).mockResolvedValue(mockStockData)

      const result = await getWatchlistWithData()

      expect(getStocksDetails).toHaveBeenCalledWith('AAPL')
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle failed stock data fetch gracefully', async () => {
      const mockWatchlist = [
        {
          userId: 'user123',
          symbol: 'INVALID',
          company: 'Invalid Stock',
          addedAt: new Date('2025-01-15'),
        },
      ]

      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWatchlist),
      })

      ;(Watchlist.find as jest.Mock).mockReturnValue({
        sort: mockSort,
      })

      ;(getStocksDetails as jest.Mock).mockResolvedValue(null)

      const result = await getWatchlistWithData()

      expect(result).toBeDefined()
    })

    it('should fetch data for multiple stocks', async () => {
      const mockWatchlist = [
        {
          userId: 'user123',
          symbol: 'AAPL',
          company: 'Apple Inc.',
          addedAt: new Date('2025-01-15'),
        },
        {
          userId: 'user123',
          symbol: 'GOOGL',
          company: 'Alphabet Inc.',
          addedAt: new Date('2025-01-14'),
        },
      ]

      const mockSort = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockWatchlist),
      })

      ;(Watchlist.find as jest.Mock).mockReturnValue({
        sort: mockSort,
      })

      ;(getStocksDetails as jest.Mock)
        .mockResolvedValueOnce({
          company: 'Apple Inc.',
          symbol: 'AAPL',
          currentPrice: 150.25,
          priceFormatted: '$150.25',
          changeFormatted: '+2.5%',
          changePercent: 2.5,
          marketCapFormatted: '$2.5T',
          peRatio: '25.3',
        })
        .mockResolvedValueOnce({
          company: 'Alphabet Inc.',
          symbol: 'GOOGL',
          currentPrice: 140.75,
          priceFormatted: '$140.75',
          changeFormatted: '-1.2%',
          changePercent: -1.2,
          marketCapFormatted: '$1.8T',
          peRatio: '22.1',
        })

      const result = await getWatchlistWithData()

      expect(getStocksDetails).toHaveBeenCalledTimes(2)
      expect(result).toBeDefined()
      expect(result.length).toBe(2)
    })

    it('should throw error on database failure', async () => {
      ;(Watchlist.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(getWatchlistWithData()).rejects.toThrow(
        'Failed to fetch watchlist'
      )
    })
  })
})