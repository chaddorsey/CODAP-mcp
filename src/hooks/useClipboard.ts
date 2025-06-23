import { useState, useCallback } from "react";

/**
 * Clipboard operation result
 */
export interface ClipboardResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Clipboard hook state
 */
export interface ClipboardState {
  /** Whether a clipboard operation is currently in progress */
  isLoading: boolean;
  /** Last operation result */
  lastResult: ClipboardResult | null;
  /** Whether clipboard is supported in this environment */
  isSupported: boolean;
}

/**
 * Clipboard hook return value
 */
export interface UseClipboardReturn {
  /** Current clipboard state */
  state: ClipboardState;
  /** Copy text to clipboard */
  copyToClipboard: (text: string) => Promise<ClipboardResult>;
  /** Clear the last result */
  clearResult: () => void;
}

/**
 * Checks if we're running in an iframe (where Clipboard API may be blocked)
 */
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (_) {
    // If we can't access window.top due to cross-origin, we're likely in an iframe
    return true;
  }
}

/**
 * Checks if the Clipboard API is available and likely to work
 */
function isClipboardApiSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.writeText === "function" &&
    !isInIframe() // Avoid Clipboard API in iframes due to permissions policy
  );
}

/**
 * Checks if the legacy execCommand is available
 */
function isExecCommandSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.execCommand === "function"
  );
}

/**
 * Copy text using the modern Clipboard API
 */
async function copyWithClipboardApi(text: string): Promise<ClipboardResult> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Clipboard API failed";
    return { success: false, error: errorMessage };
  }
}

/**
 * Copy text using the legacy execCommand fallback
 */
function copyWithExecCommand(text: string): ClipboardResult {
  try {
    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    textarea.setAttribute("aria-hidden", "true");
    textarea.setAttribute("tabindex", "-1");
    
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand("copy");
    
    // Clean up
    document.body.removeChild(textarea);
    
    if (successful) {
      return { success: true };
    } else {
      return { success: false, error: "execCommand copy failed" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "execCommand copy failed";
    return { success: false, error: errorMessage };
  }
}

/**
 * Custom hook for clipboard operations with fallback support
 * @returns Clipboard state and operations
 */
export function useClipboard(): UseClipboardReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ClipboardResult | null>(null);

  // Determine clipboard support
  const isSupported = isClipboardApiSupported() || isExecCommandSupported();

  /**
   * Copy text to clipboard using available methods
   */
  const copyToClipboard = useCallback(async (text: string): Promise<ClipboardResult> => {
    if (!text || text.trim() === "") {
      const emptyTextResult = { success: false, error: "No text provided to copy" };
      setLastResult(emptyTextResult);
      return emptyTextResult;
    }

    if (!isSupported) {
      const unsupportedResult = { success: false, error: "Clipboard operations not supported in this browser" };
      setLastResult(unsupportedResult);
      return unsupportedResult;
    }

    setIsLoading(true);
    let result: ClipboardResult;

    try {
      // In iframe context, prefer execCommand to avoid permissions policy issues
      if (isInIframe() && isExecCommandSupported()) {
        result = copyWithExecCommand(text);
      }
      // Try modern Clipboard API for non-iframe contexts
      else if (isClipboardApiSupported()) {
        result = await copyWithClipboardApi(text);
      }
      // Fall back to execCommand if available
      else if (isExecCommandSupported()) {
        result = copyWithExecCommand(text);
      }
      // No supported methods available
      else {
        result = { success: false, error: "No clipboard methods available" };
      }
    } catch (error) {
      // If primary method fails, try execCommand as fallback
      if (isExecCommandSupported()) {
        result = copyWithExecCommand(text);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Clipboard operation failed";
        result = { success: false, error: errorMessage };
      }
    } finally {
      setIsLoading(false);
    }

    setLastResult(result);
    return result;
  }, [isSupported]);

  /**
   * Clear the last operation result
   */
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    state: {
      isLoading,
      lastResult,
      isSupported
    },
    copyToClipboard,
    clearResult
  };
} 
