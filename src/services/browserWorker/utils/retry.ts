/**
 * Retry utility with exponential backoff
 * Used by Response Handler for reliable delivery
 */

/**
 * Calculate exponential backoff delay
 * @param attempt Attempt number (0-based)
 * @param baseDelay Base delay in milliseconds (default: 1000)
 * @param maxDelay Maximum delay in milliseconds (default: 30000)
 * @param backoffMultiplier Exponential multiplier (default: 2)
 * @param jitter Whether to add random jitter (default: true)
 * @returns Delay in milliseconds
 */
export function exponentialBackoff(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 30000,
  backoffMultiplier = 2,
  jitter = true
): number {
  // Calculate exponential delay
  let delay = baseDelay * Math.pow(backoffMultiplier, attempt);
  
  // Cap at maximum delay
  delay = Math.min(delay, maxDelay);
  
  // Add random jitter to prevent thundering herd
  if (jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(0, Math.round(delay));
}

/**
 * Retry an async operation with exponential backoff
 * @param operation The async function to retry
 * @param maxAttempts Maximum number of attempts
 * @param baseDelay Base delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 * @param shouldRetry Function to determine if error is retryable
 * @returns Promise that resolves with operation result or rejects with final error
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000,
  maxDelay = 30000,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      
      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Don't wait after the last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }
      
      // Calculate delay for next attempt
      const delay = exponentialBackoff(attempt, baseDelay, maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if an error is retryable (network or temporary server errors)
 * @param error The error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (message.includes("network") || 
      message.includes("timeout") || 
      message.includes("connection") ||
      message.includes("fetch")) {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (message.includes("429") || // Rate limit
      message.includes("500") || // Internal server error
      message.includes("502") || // Bad gateway
      message.includes("503") || // Service unavailable
      message.includes("504")) { // Gateway timeout
    return true;
  }
  
  return false;
} 
