import { renderHook, act } from '@testing-library/react';
import { useClipboard } from '../../hooks/useClipboard';

// Mock navigator.clipboard
const mockWriteText = jest.fn();
const mockClipboard = {
  writeText: mockWriteText
};

// Mock document.execCommand
const mockExecCommand = jest.fn();

describe('useClipboard hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator and document mocks
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });
    
    Object.defineProperty(document, 'execCommand', {
      value: mockExecCommand,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // Clean up mocks
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('initializes with correct default state when clipboard is supported', () => {
      const { result } = renderHook(() => useClipboard());
      
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.lastResult).toBeNull();
      expect(result.current.state.isSupported).toBe(true);
    });
  });

  describe('clipboard API operations', () => {
    it('successfully copies text using clipboard API', async () => {
      mockWriteText.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useClipboard());
      
      let copyResult;
      await act(async () => {
        copyResult = await result.current.copyToClipboard('test text');
      });
      
      expect(mockWriteText).toHaveBeenCalledWith('test text');
      expect(copyResult).toEqual({ success: true });
      expect(result.current.state.lastResult).toEqual({ success: true });
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles empty text input', async () => {
      const { result } = renderHook(() => useClipboard());
      
      let copyResult;
      await act(async () => {
        copyResult = await result.current.copyToClipboard('');
      });
      
      expect(copyResult).toEqual({ 
        success: false, 
        error: 'No text provided to copy' 
      });
      expect(mockWriteText).not.toHaveBeenCalled();
    });
  });
}); 