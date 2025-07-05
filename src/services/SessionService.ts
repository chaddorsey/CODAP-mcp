import {
  SessionData,
  SessionServiceConfig,
  SessionServiceError,
  SessionServiceInterface,
  ApiErrorResponse,
  SESSION_ERROR_CODES,
  DEFAULT_SESSION_CONFIG
} from "./types";

/**
 * Service class for communicating with the relay API endpoints
 * Handles session creation, status checking, and error management
 */
export class SessionService implements SessionServiceInterface {
  private readonly config: Required<SessionServiceConfig>;

  /**
   * Creates a new SessionService instance
   * @param config - Service configuration options
   */
  constructor(config: SessionServiceConfig) {
    // Validate configuration
    if (!config.baseUrl) {
      throw new SessionServiceError(
        "Base URL is required for SessionService",
        SESSION_ERROR_CODES.CONFIGURATION_ERROR
      );
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...config
    };

    // Ensure baseUrl doesn't end with slash for consistent URL building
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, "");
  }

  /**
   * Creates a new session by calling POST /api/sessions
   * @param capabilities - Array of capabilities to register for the session (e.g., ["CODAP", "SAGEMODELER"])
   * @returns Promise resolving to session data
   * @throws SessionServiceError on failure
   */
  async createSession(capabilities: string[] = ["CODAP"]): Promise<SessionData> {
    const url = `${this.config.baseUrl}/api/sessions`;
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sso-bypass": "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye"
          },
          body: JSON.stringify({ capabilities })
        });

        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          const error = new SessionServiceError(
            `Session creation failed: ${errorData.error}`,
            this.mapHttpStatusToErrorCode(response.status),
            response.status
          );
          
          // Don't retry for certain error types
          if ([SESSION_ERROR_CODES.RATE_LIMITED, SESSION_ERROR_CODES.CONFIGURATION_ERROR].includes(error.code as any)) {
            throw error;
          }
          
          throw error;
        }

        const sessionData: SessionData = await response.json();
        
        // Validate response structure
        if (!this.isValidSessionData(sessionData)) {
          throw new SessionServiceError(
            "Invalid session data received from server",
            SESSION_ERROR_CODES.INVALID_RESPONSE
          );
        }

        return sessionData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        
        // If this is a SessionServiceError for non-retryable errors, throw immediately
        if (error instanceof SessionServiceError && 
            [SESSION_ERROR_CODES.RATE_LIMITED, SESSION_ERROR_CODES.CONFIGURATION_ERROR, SESSION_ERROR_CODES.INVALID_RESPONSE].includes(error.code as any)) {
          throw error;
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries exhausted
    throw new SessionServiceError(
      `Failed to create session after ${this.config.maxRetries} attempts`,
      SESSION_ERROR_CODES.NETWORK_ERROR,
      undefined,
      lastError
    );
  }

  /**
   * Validates a session code format
   * @param code - Session code to validate
   * @returns True if code format is valid
   */
  isValidSession(code: string): boolean {
    return typeof code === "string" && /^[A-Z2-7]{8}$/.test(code);
  }

  /**
   * Makes an HTTP request with timeout handling
   */
  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new SessionServiceError(
          "Request timeout",
          SESSION_ERROR_CODES.TIMEOUT
        );
      }
      throw new SessionServiceError(
        "Network request failed",
        SESSION_ERROR_CODES.NETWORK_ERROR,
        undefined,
        error instanceof Error ? error : undefined
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parses error response from API
   */
  private async parseErrorResponse(response: Response): Promise<ApiErrorResponse> {
    try {
      const errorData = await response.json();
      return errorData as ApiErrorResponse;
    } catch {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        code: response.status.toString()
      };
    }
  }

  /**
   * Maps HTTP status codes to internal error codes
   */
  private mapHttpStatusToErrorCode(status: number): string {
    switch (status) {
      case 429:
        return SESSION_ERROR_CODES.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
      case 504:
        return SESSION_ERROR_CODES.SERVICE_UNAVAILABLE;
      case 400:
      case 404:
        return SESSION_ERROR_CODES.INVALID_SESSION;
      default:
        return SESSION_ERROR_CODES.NETWORK_ERROR;
    }
  }

  /**
   * Validates session data structure
   */
  private isValidSessionData(data: any): data is SessionData {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof data.code === "string" &&
      this.isValidSession(data.code) &&
      typeof data.ttl === "number" &&
      data.ttl > 0 &&
      typeof data.expiresAt === "string"
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a configured SessionService instance
 * @param baseUrl - Relay API base URL
 * @param config - Additional configuration options
 * @returns Configured SessionService instance
 */
export function createSessionService(
  baseUrl: string, 
  config: Partial<SessionServiceConfig> = {}
): SessionService {
  return new SessionService({
    baseUrl,
    ...config
  });
} 
