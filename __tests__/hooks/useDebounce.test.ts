import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce function calls', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current()
      result.current()
      result.current()
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel previous timeout when called again', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current()
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      result.current()
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should work with zero delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 0))

    act(() => {
      result.current()
    })

    act(() => {
      jest.advanceTimersByTime(0)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should update when delay changes', () => {
    const callback = jest.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebounce(callback, delay),
      { initialProps: { delay: 500 } }
    )

    act(() => {
      result.current()
    })

    rerender({ delay: 1000 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple rapid calls correctly', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current()
      }
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle callback changes', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    
    const { result, rerender } = renderHook(
      ({ cb }) => useDebounce(cb, 500),
      { initialProps: { cb: callback1 } }
    )

    act(() => {
      result.current()
    })

    rerender({ cb: callback2 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledTimes(1)
  })

  it('should cleanup timeout on unmount', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current()
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled()
  })
})