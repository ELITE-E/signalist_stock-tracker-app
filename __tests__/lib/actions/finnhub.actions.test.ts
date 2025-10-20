import {
  getNews,
  searchStocks,
  getStocksDetails,
  fetchJSON,
} from '@/lib/actions/finnhub.actions'

// Mock fetch globally
global.fetch = jest.fn()

describe('Finnhub Actions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      FINNHUB_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FINNHUB_API_KEY: 'test-public-api-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('fetchJSON', () => {
    it('should fetch and parse JSON successfully', async () => {
      const mockData = { test: 'data' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      })

      const result = await fetchJSON('https://api.example.com/data')

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        { cache: 'no-store' }
      )
    })

    it('should use cache with revalidation when specified', async () => {
      const mockData = { test: 'data' }
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData),
      })

      await fetchJSON('https://api.example.com/data', 3600)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        { cache: 'force-cache', next: { revalidate: 3600 } }
      )
    })

    it('should throw error on failed fetch', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not Found'),
      })

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      await expect(
        fetchJSON('https://api.example.com/data')
      ).rejects.toThrow('Network error')
    })
  })

  describe('getNews', () => {
    it('should fetch general news when no symbols provided', async () => {
      const mockNewsData = [
        {
          id: 1,
          headline: 'Test Headline',
          summary: 'Test Summary',
          url: 'https://example.com',
          datetime: 1640000000,
          source: 'Test Source',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockNewsData),
      })

      const result = await getNews()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should fetch company news for provided symbols', async () => {
      const mockCompanyNews = [
        {
          id: 1,
          headline: 'Apple News',
          summary: 'Apple test summary',
          url: 'https://example.com/apple',
          datetime: 1640000000,
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCompanyNews),
      })

      const result = await getNews(['AAPL'])

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should limit results to 6 articles', async () => {
      const mockNewsData = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        headline: `Headline ${i}`,
        summary: `Summary ${i}`,
        url: `https://example.com/${i}`,
        datetime: 1640000000 + i,
      }))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockNewsData),
      })

      const result = await getNews()

      expect(result.length).toBeLessThanOrEqual(6)
    })

    it('should throw error when API key is missing', async () => {
      delete process.env.FINNHUB_API_KEY
      delete process.env.NEXT_PUBLIC_FINNHUB_API_KEY

      await expect(getNews()).rejects.toThrow(
        'FINNHUB API key is not configured'
      )
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('API Error')
      )

      await expect(getNews()).rejects.toThrow('Failed to fetch news')
    })

    it('should filter out invalid articles', async () => {
      const mockNewsData = [
        {
          id: 1,
          headline: 'Valid Article',
          summary: 'Valid Summary',
          url: 'https://example.com/valid',
          datetime: 1640000000,
        },
        {
          id: 2,
          headline: '', // Invalid - empty headline
          summary: 'Invalid Summary',
          url: 'https://example.com/invalid',
          datetime: 1640000000,
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockNewsData),
      })

      const result = await getNews()

      expect(result.length).toBeLessThan(mockNewsData.length)
    })
  })

  describe('searchStocks', () => {
    it('should return popular stocks when query is empty', async () => {
      const mockProfile = {
        name: 'Apple Inc.',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      })

      const result = await searchStocks('')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should search stocks with query', async () => {
      const mockSearchResult = {
        count: 1,
        result: [
          {
            symbol: 'AAPL',
            description: 'Apple Inc.',
            displaySymbol: 'AAPL',
            type: 'Common Stock',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResult),
      })

      const result = await searchStocks('Apple')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].symbol).toBe('AAPL')
      expect(result[0].isInWatchlist).toBe(false)
    })

    it('should limit results to 15 stocks', async () => {
      const mockSearchResult = {
        count: 50,
        result: Array.from({ length: 50 }, (_, i) => ({
          symbol: `STOCK${i}`,
          description: `Stock ${i}`,
          displaySymbol: `STOCK${i}`,
          type: 'Common Stock',
        })),
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResult),
      })

      const result = await searchStocks('test')

      expect(result.length).toBeLessThanOrEqual(15)
    })

    it('should convert symbols to uppercase', async () => {
      const mockSearchResult = {
        count: 1,
        result: [
          {
            symbol: 'aapl',
            description: 'Apple Inc.',
            displaySymbol: 'AAPL',
            type: 'Common Stock',
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResult),
      })

      const result = await searchStocks('apple')

      expect(result[0].symbol).toBe('AAPL')
    })

    it('should return empty array on API error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await searchStocks('test')

      expect(result).toEqual([])
    })

    it('should handle missing API key gracefully', async () => {
      delete process.env.FINNHUB_API_KEY
      delete process.env.NEXT_PUBLIC_FINNHUB_API_KEY

      const result = await searchStocks('test')

      expect(result).toEqual([])
    })
  })

  describe('getStocksDetails', () => {
    it('should fetch and format stock details', async () => {
      const mockQuote = { c: 150.25, dp: 2.5 }
      const mockProfile = {
        name: 'Apple Inc.',
        marketCapitalization: 2500000,
      }
      const mockFinancials = {
        metric: { peNormalizedAnnual: 25.3 },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockQuote),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFinancials),
        })

      const result = await getStocksDetails('AAPL')

      expect(result).toBeDefined()
      expect(result.symbol).toBe('AAPL')
      expect(result.company).toBe('Apple Inc.')
      expect(result.currentPrice).toBe(150.25)
      expect(result.changePercent).toBe(2.5)
    })

    it('should convert symbol to uppercase', async () => {
      const mockQuote = { c: 150.25, dp: 2.5 }
      const mockProfile = {
        name: 'Apple Inc.',
        marketCapitalization: 2500000,
      }
      const mockFinancials = {
        metric: { peNormalizedAnnual: 25.3 },
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockQuote),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFinancials),
        })

      const result = await getStocksDetails('aapl')

      expect(result.symbol).toBe('AAPL')
    })

    it('should handle missing PE ratio', async () => {
      const mockQuote = { c: 150.25, dp: 2.5 }
      const mockProfile = {
        name: 'Apple Inc.',
        marketCapitalization: 2500000,
      }
      const mockFinancials = { metric: {} }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockQuote),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFinancials),
        })

      const result = await getStocksDetails('AAPL')

      expect(result.peRatio).toBe('—')
    })

    it('should throw error for invalid stock data', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })

      await expect(getStocksDetails('INVALID')).rejects.toThrow(
        'Failed to fetch stock details'
      )
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('API Error')
      )

      await expect(getStocksDetails('AAPL')).rejects.toThrow(
        'Failed to fetch stock details'
      )
    })
  })
})