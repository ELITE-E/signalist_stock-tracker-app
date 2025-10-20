// Learn more: https://github.com/testing-library/jest-dom
require("@testing-library/jest-dom")

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}))

// Mock Next.js cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Set up environment variables for tests
process.env.NEXT_PUBLIC_FINNHUB_API_KEY = 'test-api-key'
process.env.FINNHUB_API_KEY = 'test-api-key'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'