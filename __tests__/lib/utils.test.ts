import {
  cn,
  formatTimeAgo,
  delay,
  formatMarketCapValue,
  getDateRange,
  getTodayDateRange,
  calculateNewsDistribution,
  validateArticle,
  getTodayString,
  formatArticle,
  formatChangePercent,
  getChangeColorClass,
  formatPrice,
  getAlertText,
  getFormattedTodayDate,
} from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'truthy', false && 'falsy')
      expect(result).toContain('base')
      expect(result).toContain('truthy')
      expect(result).not.toContain('falsy')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle tailwind merge conflicts', () => {
      const result = cn('px-2', 'px-4')
      expect(result).toBe('px-4')
    })
  })

  describe('formatTimeAgo', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should format time in minutes for recent timestamps', () => {
      const timestamp = Math.floor(new Date('2025-01-01T11:30:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('30 minutes ago')
    })

    it('should format single minute correctly', () => {
      const timestamp = Math.floor(new Date('2025-01-01T11:59:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('1 minute ago')
    })

    it('should format time in hours for older timestamps', () => {
      const timestamp = Math.floor(new Date('2025-01-01T09:00:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('3 hours ago')
    })

    it('should format single hour correctly', () => {
      const timestamp = Math.floor(new Date('2025-01-01T11:00:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('1 hour ago')
    })

    it('should format time in days for very old timestamps', () => {
      const timestamp = Math.floor(new Date('2024-12-30T12:00:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('2 days ago')
    })

    it('should format single day correctly', () => {
      const timestamp = Math.floor(new Date('2024-12-31T11:00:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('1 day ago')
    })

    it('should handle timestamps exactly 24 hours ago', () => {
      const timestamp = Math.floor(new Date('2024-12-31T12:00:00Z').getTime() / 1000)
      expect(formatTimeAgo(timestamp)).toBe('1 day ago')
    })
  })

  describe('delay', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should delay execution by specified milliseconds', async () => {
      const promise = delay(1000)
      jest.advanceTimersByTime(1000)
      await expect(promise).resolves.toBeUndefined()
    })

    it('should handle zero delay', async () => {
      const promise = delay(0)
      jest.advanceTimersByTime(0)
      await expect(promise).resolves.toBeUndefined()
    })

    it('should handle very large delays', async () => {
      const promise = delay(100000)
      jest.advanceTimersByTime(100000)
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('formatMarketCapValue', () => {
    it('should format trillion values correctly', () => {
      expect(formatMarketCapValue(3.1e12)).toBe('$3.10T')
      expect(formatMarketCapValue(1.5e12)).toBe('$1.50T')
    })

    it('should format billion values correctly', () => {
      expect(formatMarketCapValue(900e9)).toBe('$900.00B')
      expect(formatMarketCapValue(1.5e9)).toBe('$1.50B')
    })

    it('should format million values correctly', () => {
      expect(formatMarketCapValue(25e6)).toBe('$25.00M')
      expect(formatMarketCapValue(500e6)).toBe('$500.00M')
    })

    it('should format values below million correctly', () => {
      expect(formatMarketCapValue(999999.99)).toBe('$999999.99')
      expect(formatMarketCapValue(100000)).toBe('$100000.00')
    })

    it('should handle zero and negative values', () => {
      expect(formatMarketCapValue(0)).toBe('N/A')
      expect(formatMarketCapValue(-100)).toBe('N/A')
    })

    it('should handle invalid inputs', () => {
      expect(formatMarketCapValue(NaN)).toBe('N/A')
      expect(formatMarketCapValue(Infinity)).toBe('N/A')
      expect(formatMarketCapValue(-Infinity)).toBe('N/A')
    })

    it('should handle edge case at boundary values', () => {
      expect(formatMarketCapValue(1e12)).toBe('$1.00T')
      expect(formatMarketCapValue(1e9)).toBe('$1.00B')
      expect(formatMarketCapValue(1e6)).toBe('$1.00M')
    })
  })

  describe('getDateRange', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return correct date range for 5 days', () => {
      const range = getDateRange(5)
      expect(range.to).toBe('2025-01-15')
      expect(range.from).toBe('2025-01-10')
    })

    it('should return correct date range for 1 day', () => {
      const range = getDateRange(1)
      expect(range.to).toBe('2025-01-15')
      expect(range.from).toBe('2025-01-14')
    })

    it('should return correct date range for 30 days', () => {
      const range = getDateRange(30)
      expect(range.to).toBe('2025-01-15')
      expect(range.from).toBe('2024-12-16')
    })

    it('should handle zero days', () => {
      const range = getDateRange(0)
      expect(range.to).toBe('2025-01-15')
      expect(range.from).toBe('2025-01-15')
    })
  })

  describe('getTodayDateRange', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return today for both from and to', () => {
      const range = getTodayDateRange()
      expect(range.to).toBe('2025-01-15')
      expect(range.from).toBe('2025-01-15')
    })
  })

  describe('calculateNewsDistribution', () => {
    it('should return 3 items per symbol for less than 3 symbols', () => {
      expect(calculateNewsDistribution(1)).toEqual({ itemsPerSymbol: 3, targetNewsCount: 6 })
      expect(calculateNewsDistribution(2)).toEqual({ itemsPerSymbol: 3, targetNewsCount: 6 })
    })

    it('should return 2 items per symbol for exactly 3 symbols', () => {
      expect(calculateNewsDistribution(3)).toEqual({ itemsPerSymbol: 2, targetNewsCount: 6 })
    })

    it('should return 1 item per symbol for more than 3 symbols', () => {
      expect(calculateNewsDistribution(4)).toEqual({ itemsPerSymbol: 1, targetNewsCount: 6 })
      expect(calculateNewsDistribution(10)).toEqual({ itemsPerSymbol: 1, targetNewsCount: 6 })
    })

    it('should handle zero symbols', () => {
      expect(calculateNewsDistribution(0)).toEqual({ itemsPerSymbol: 3, targetNewsCount: 6 })
    })

    it('should handle large number of symbols', () => {
      expect(calculateNewsDistribution(100)).toEqual({ itemsPerSymbol: 1, targetNewsCount: 6 })
    })
  })

  describe('validateArticle', () => {
    it('should return true for valid article with all required fields', () => {
      const article: RawNewsArticle = {
        id: 1,
        headline: 'Test Headline',
        summary: 'Test Summary',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      expect(validateArticle(article)).toBe(true)
    })

    it('should return false for article missing headline', () => {
      const article: RawNewsArticle = {
        id: 1,
        summary: 'Test Summary',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      expect(validateArticle(article)).toBeFalsy()
    })

    it('should return false for article missing summary', () => {
      const article: RawNewsArticle = {
        id: 1,
        headline: 'Test Headline',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      expect(validateArticle(article)).toBeFalsy()
    })

    it('should return false for article missing url', () => {
      const article: RawNewsArticle = {
        id: 1,
        headline: 'Test Headline',
        summary: 'Test Summary',
        datetime: 1640000000,
      }
      expect(validateArticle(article)).toBeFalsy()
    })

    it('should return false for article missing datetime', () => {
      const article: RawNewsArticle = {
        id: 1,
        headline: 'Test Headline',
        summary: 'Test Summary',
        url: 'https://example.com',
      }
      expect(validateArticle(article)).toBeFalsy()
    })

    it('should return false for empty strings', () => {
      const article: RawNewsArticle = {
        id: 1,
        headline: '',
        summary: 'Test Summary',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      expect(validateArticle(article)).toBeFalsy()
    })
  })

  describe('getTodayString', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return today date in YYYY-MM-DD format', () => {
      expect(getTodayString()).toBe('2025-01-15')
    })
  })

  describe('formatArticle', () => {
    const rawArticle: RawNewsArticle = {
      id: 123,
      headline: 'Test Headline',
      summary: 'This is a test summary that is quite long and needs to be truncated to fit within the specified character limits for display purposes',
      url: 'https://example.com/article',
      datetime: 1640000000,
      source: 'Test Source',
      image: 'https://example.com/image.jpg',
      category: 'technology',
      related: 'AAPL',
    }

    it('should format company news article correctly', () => {
      const formatted = formatArticle(rawArticle, true, 'AAPL', 0)
      expect(formatted.headline).toBe('Test Headline')
      expect(formatted.summary.length).toBeLessThanOrEqual(203) // 200 + '...'
      expect(formatted.summary).toContain('...')
      expect(formatted.category).toBe('company')
      expect(formatted.related).toBe('AAPL')
      expect(formatted.source).toBe('Test Source')
    })

    it('should format market news article correctly', () => {
      const formatted = formatArticle(rawArticle, false, undefined, 1)
      expect(formatted.headline).toBe('Test Headline')
      expect(formatted.summary.length).toBeLessThanOrEqual(153) // 150 + '...'
      expect(formatted.summary).toContain('...')
      expect(formatted.category).toBe('technology')
      expect(formatted.related).toBe('AAPL')
    })

    it('should generate unique IDs for company news', () => {
      const formatted1 = formatArticle(rawArticle, true, 'AAPL', 0)
      const formatted2 = formatArticle(rawArticle, true, 'AAPL', 0)
      expect(formatted1.id).not.toEqual(formatted2.id)
    })

    it('should use article ID with index for market news', () => {
      const formatted = formatArticle(rawArticle, false, undefined, 5)
      expect(formatted.id).toBe(128) // 123 + 5
    })

    it('should handle missing optional fields', () => {
      const minimalArticle: RawNewsArticle = {
        id: 456,
        headline: 'Minimal Article',
        summary: 'Short summary',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      const formatted = formatArticle(minimalArticle, false, undefined, 0)
      expect(formatted.source).toBe('Market News')
      expect(formatted.category).toBe('general')
      expect(formatted.related).toBe('')
      expect(formatted.image).toBe('')
    })

    it('should trim whitespace from headline and summary', () => {
      const articleWithWhitespace: RawNewsArticle = {
        id: 789,
        headline: '  Whitespace Headline  ',
        summary: '  Whitespace Summary  ',
        url: 'https://example.com',
        datetime: 1640000000,
      }
      const formatted = formatArticle(articleWithWhitespace, false, undefined, 0)
      expect(formatted.headline).toBe('Whitespace Headline')
      expect(formatted.summary).not.toMatch(/^\s+|\s+$/)
    })
  })

  describe('formatChangePercent', () => {
    it('should format positive change with plus sign', () => {
      expect(formatChangePercent(5.67)).toBe('+5.67%')
    })

    it('should format negative change without extra sign', () => {
      expect(formatChangePercent(-3.45)).toBe('-3.45%')
    })

    it('should format zero correctly', () => {
      expect(formatChangePercent(0)).toBe('')
    })

    it('should handle undefined', () => {
      expect(formatChangePercent(undefined)).toBe('')
    })

    it('should round to 2 decimal places', () => {
      expect(formatChangePercent(5.6789)).toBe('+5.68%')
      expect(formatChangePercent(-3.4567)).toBe('-3.46%')
    })

    it('should handle very small numbers', () => {
      expect(formatChangePercent(0.01)).toBe('+0.01%')
      expect(formatChangePercent(-0.01)).toBe('-0.01%')
    })

    it('should handle very large numbers', () => {
      expect(formatChangePercent(123.456)).toBe('+123.46%')
      expect(formatChangePercent(-987.654)).toBe('-987.65%')
    })
  })

  describe('getChangeColorClass', () => {
    it('should return green class for positive change', () => {
      expect(getChangeColorClass(5.0)).toBe('text-green-500')
    })

    it('should return red class for negative change', () => {
      expect(getChangeColorClass(-3.0)).toBe('text-red-500')
    })

    it('should return gray class for zero', () => {
      expect(getChangeColorClass(0)).toBe('text-gray-400')
    })

    it('should return gray class for undefined', () => {
      expect(getChangeColorClass(undefined)).toBe('text-gray-400')
    })

    it('should handle very small positive numbers', () => {
      expect(getChangeColorClass(0.01)).toBe('text-green-500')
    })

    it('should handle very small negative numbers', () => {
      expect(getChangeColorClass(-0.01)).toBe('text-red-500')
    })
  })

  describe('formatPrice', () => {
    it('should format price with dollar sign and 2 decimals', () => {
      expect(formatPrice(100.5)).toBe('$100.50')
    })

    it('should format large prices with commas', () => {
      expect(formatPrice(1234567.89)).toBe('$1,234,567.89')
    })

    it('should format small prices correctly', () => {
      expect(formatPrice(0.99)).toBe('$0.99')
    })

    it('should always show 2 decimal places', () => {
      expect(formatPrice(100)).toBe('$100.00')
    })

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('$0.00')
    })

    it('should handle negative prices', () => {
      expect(formatPrice(-50.25)).toBe('-$50.25')
    })

    it('should handle very large numbers', () => {
      expect(formatPrice(999999999.99)).toBe('$999,999,999.99')
    })

    it('should round properly for more than 2 decimals', () => {
      expect(formatPrice(123.456)).toBe('$123.46')
      expect(formatPrice(123.454)).toBe('$123.45')
    })
  })

  describe('getAlertText', () => {
    it('should format upper alert correctly', () => {
      const alert: Alert = {
        id: '1',
        symbol: 'AAPL',
        company: 'Apple Inc.',
        alertName: 'Price Alert',
        currentPrice: 150,
        alertType: 'upper',
        threshold: 160,
      }
      expect(getAlertText(alert)).toBe('Price > $160.00')
    })

    it('should format lower alert correctly', () => {
      const alert: Alert = {
        id: '2',
        symbol: 'GOOGL',
        company: 'Alphabet Inc.',
        alertName: 'Price Alert',
        currentPrice: 140,
        alertType: 'lower',
        threshold: 130,
      }
      expect(getAlertText(alert)).toBe('Price < $130.00')
    })

    it('should handle decimal thresholds', () => {
      const alert: Alert = {
        id: '3',
        symbol: 'TSLA',
        company: 'Tesla Inc.',
        alertName: 'Price Alert',
        currentPrice: 250.75,
        alertType: 'upper',
        threshold: 255.5,
      }
      expect(getAlertText(alert)).toBe('Price > $255.50')
    })
  })

  describe('getFormattedTodayDate', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return formatted date string', () => {
      const formatted = getFormattedTodayDate()
      expect(formatted).toMatch(/Wednesday|Thursday|Friday|Saturday|Sunday|Monday|Tuesday/)
      expect(formatted).toContain('2025')
      expect(formatted).toContain('January')
    })
  })
})