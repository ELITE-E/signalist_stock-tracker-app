import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
} from '@/lib/actions/auth.actions'
import { auth } from '@/lib/better-auth/auth'
import { inngest } from '@/lib/inngest/client'

jest.mock('@/lib/better-auth/auth')
jest.mock('@/lib/inngest/client')
jest.mock('next/headers')

describe('Auth Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('signUpWithEmail', () => {
    const signUpData: SignUpFormData = {
      email: 'test@example.com',
      password: 'securePassword123',
      fullName: 'Test User',
      country: 'US',
      investmentGoals: 'Long-term growth',
      riskTolerance: 'Moderate',
      preferredIndustry: 'Technology',
    }

    it('should sign up user and send event successfully', async () => {
      const mockResponse = {
        user: { id: 'user123', email: 'test@example.com' },
      }

      ;(auth.api.signUpEmail as jest.Mock).mockResolvedValue(mockResponse)
      ;(inngest.send as jest.Mock).mockResolvedValue({})

      const result = await signUpWithEmail(signUpData)

      expect(auth.api.signUpEmail).toHaveBeenCalledWith({
        body: {
          email: signUpData.email,
          password: signUpData.password,
          name: signUpData.fullName,
        },
      })

      expect(inngest.send).toHaveBeenCalledWith({
        name: 'app/user.created',
        data: {
          email: signUpData.email,
          name: signUpData.fullName,
          country: signUpData.country,
          investmentGoals: signUpData.investmentGoals,
          riskTolerance: signUpData.riskTolerance,
          preferredIndustry: signUpData.preferredIndustry,
        },
      })

      expect(result).toEqual({ success: true, data: mockResponse })
    })

    it('should handle sign up failure', async () => {
      ;(auth.api.signUpEmail as jest.Mock).mockRejectedValue(
        new Error('Sign up failed')
      )

      const result = await signUpWithEmail(signUpData)

      expect(result).toEqual({ success: false, error: 'Sign up failed' })
    })

    it('should not send inngest event if sign up fails', async () => {
      ;(auth.api.signUpEmail as jest.Mock).mockRejectedValue(
        new Error('Sign up failed')
      )

      await signUpWithEmail(signUpData)

      expect(inngest.send).not.toHaveBeenCalled()
    })

    it('should handle various error types gracefully', async () => {
      ;(auth.api.signUpEmail as jest.Mock).mockRejectedValue('String error')

      const result = await signUpWithEmail(signUpData)

      expect(result).toEqual({ success: false, error: 'Sign up failed' })
    })
  })

  describe('signInWithEmail', () => {
    const signInData: SignInFormData = {
      email: 'test@example.com',
      password: 'securePassword123',
    }

    it('should sign in user successfully', async () => {
      const mockResponse = {
        user: { id: 'user123', email: 'test@example.com' },
      }

      ;(auth.api.signInEmail as jest.Mock).mockResolvedValue(mockResponse)

      const result = await signInWithEmail(signInData)

      expect(auth.api.signInEmail).toHaveBeenCalledWith({
        body: {
          email: signInData.email,
          password: signInData.password,
        },
      })

      expect(result).toEqual({ success: true, data: mockResponse })
    })

    it('should handle sign in failure', async () => {
      ;(auth.api.signInEmail as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      )

      const result = await signInWithEmail(signInData)

      expect(result).toEqual({ success: false, error: 'Sign in failed' })
    })

    it('should handle various error types gracefully', async () => {
      ;(auth.api.signInEmail as jest.Mock).mockRejectedValue({
        message: 'Auth error',
      })

      const result = await signInWithEmail(signInData)

      expect(result).toEqual({ success: false, error: 'Sign in failed' })
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      ;(auth.api.signOut as jest.Mock).mockResolvedValue({})

      const result = await signOut()

      expect(auth.api.signOut).toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should handle sign out failure', async () => {
      ;(auth.api.signOut as jest.Mock).mockRejectedValue(
        new Error('Sign out failed')
      )

      const result = await signOut()

      expect(result).toEqual({ success: false, error: 'Sign out failed' })
    })

    it('should call signOut with headers', async () => {
      ;(auth.api.signOut as jest.Mock).mockResolvedValue({})

      await signOut()

      expect(auth.api.signOut).toHaveBeenCalledWith({
        headers: expect.anything(),
      })
    })
  })
})