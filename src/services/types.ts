/**
 * Type definitions for session service and related components
 */

export interface SessionData {
  /** 8-character session code for user sharing */
  code: string;
  /** Time to live in seconds */
  ttl: number;
  /** ISO8601 timestamp when session expires */
  expiresAt: string;
}

export interface SessionStatus {
  /** Current session state */
  isActive: boolean;
  /** Remaining time in seconds */
  remainingTime: number;
  /** Last activity timestamp */
  lastActivity?: number;
}

export interface SessionCreationResponse {
  success: boolean;
  data?: SessionData;
  error?: string;
}

export interface SessionServiceConfig {
  /** Base URL for relay API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

export class SessionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'SessionServiceError';
  }
}

// Error codes for different failure scenarios
export const SESSION_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_SESSION: 'INVALID_SESSION',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
} as const;

export type SessionErrorCode = typeof SESSION_ERROR_CODES[keyof typeof SESSION_ERROR_CODES];

export interface SessionServiceInterface {
  createSession(): Promise<SessionData>;
  isValidSession(code: string): boolean;
}

// Default configuration values
export const DEFAULT_SESSION_CONFIG = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000 // 1 second
} as const; 