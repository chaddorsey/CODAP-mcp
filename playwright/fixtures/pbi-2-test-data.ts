/**
 * Test Data and Fixtures for PBI 2 E2E Tests
 * Provides test data, mock responses, and utilities for testing the pairing banner
 */

export interface SessionData {
  sessionId: string;
  ttl: number;
  createdAt: string;
  expiresAt: string;
}

export interface RelayEndpoints {
  createSession: string;
  getSession: string;
  renewSession: string;
}

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  // Session code format validation
  SESSION_CODE_PATTERN: /^[A-Z0-9]{8}$/,
  
  // Timing constants
  TIMER_UPDATE_INTERVAL: 1000, // 1 second
  SESSION_TTL_MINUTES: 30,
  
  // Viewport sizes for responsive testing
  VIEWPORTS: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
    large: { width: 1920, height: 1080 }
  },
  
  // Accessibility requirements
  WCAG_AA: {
    minContrastRatio: 4.5,
    minTouchTargetSize: 44 // pixels
  },
  
  // Performance thresholds
  PERFORMANCE: {
    maxLoadTime: 5000, // 5 seconds
    maxRenderTime: 2000 // 2 seconds
  }
} as const;

/**
 * Mock session data for testing
 */
export const MOCK_SESSION_DATA: SessionData = {
  sessionId: "ABC123XY",
  ttl: 1800, // 30 minutes in seconds
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
};

/**
 * Expected prompt text patterns for validation
 */
export const EXPECTED_PROMPT_CONTENT = {
  mustContain: [
    "MCP server",
    "session code",
    "relay.codap-mcp.com",
    "CODAP",
    "data analysis"
  ],
  
  shouldNotContain: [
    "undefined",
    "null",
    "[object Object]",
    "Error",
    "Failed"
  ]
} as const;

/**
 * Test selectors and data attributes
 */
export const TEST_SELECTORS = {
  // Main components
  appContainer: '[data-testid="app-container"]',
  pairingBanner: '[data-testid="pairing-banner"]',
  
  // Session information
  sessionCode: '[data-testid="session-code"]',
  countdownTimer: '[data-testid="countdown-timer"]',
  
  // Action buttons
  copyCodeButton: '[data-testid="copy-code-button"]',
  copyPromptButton: '[data-testid="copy-prompt-button"]',
  
  // Feedback and status
  copyFeedback: '[data-testid="copy-feedback"]',
  errorMessage: '[data-testid="error-message"]',
  loadingIndicator: '[data-testid="loading-indicator"]',
  
  // Accessibility
  liveRegion: "[aria-live]",
  focusableElements: 'button, [tabindex="0"]'
} as const;

/**
 * Expected ARIA attributes for accessibility testing
 */
export const EXPECTED_ARIA_ATTRIBUTES = {
  banner: {
    role: "region",
    "aria-label": "MCP Session Pairing Banner"
  },
  
  sessionCode: {
    "aria-label": /session code/i
  },
  
  timer: {
    "aria-live": "polite",
    "aria-label": /time remaining/i
  },
  
  copyButtons: {
    "aria-describedby": /.+/
  },
  
  feedback: {
    role: "status",
    "aria-live": "polite"
  }
} as const;

/**
 * Test utilities for common operations
 */
export class TestDataHelpers {
  /**
   * Generate a valid session code for testing
   */
  static generateSessionCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create mock session data with custom TTL
   */
  static createMockSession(ttlMinutes = 30): SessionData {
    const ttlSeconds = ttlMinutes * 60;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    
    return {
      sessionId: this.generateSessionCode(),
      ttl: ttlSeconds,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Format time remaining for display (MM:SS)
   */
  static formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  /**
   * Validate session code format
   */
  static isValidSessionCode(code: string): boolean {
    return TEST_CONFIG.SESSION_CODE_PATTERN.test(code);
  }

  /**
   * Calculate expected timer states for testing
   */
  static getTimerStates(ttlSeconds: number) {
    const totalMinutes = Math.floor(ttlSeconds / 60);
    
    return {
      initial: this.formatTimeRemaining(ttlSeconds),
      halfway: this.formatTimeRemaining(Math.floor(ttlSeconds / 2)),
      warning: this.formatTimeRemaining(300), // 5 minutes warning
      critical: this.formatTimeRemaining(60), // 1 minute critical
      expired: "0:00"
    };
  }
}

/**
 * Mock API responses for testing
 */
export const MOCK_API_RESPONSES = {
  createSession: {
    success: {
      sessionId: "ABC123XY",
      ttl: 1800,
      relayUrl: "wss://relay.codap-mcp.com/session/ABC123XY"
    },
    
    error: {
      error: "Failed to create session",
      code: "SESSION_CREATE_FAILED"
    }
  },
  
  getSession: {
    success: {
      sessionId: "ABC123XY",
      ttl: 1800,
      status: "active",
      connectedClients: 0
    },
    
    notFound: {
      error: "Session not found",
      code: "SESSION_NOT_FOUND"
    }
  }
} as const;

/**
 * Error scenarios for testing
 */
export const ERROR_SCENARIOS = {
  networkFailure: {
    description: "Network connection failure",
    mockResponse: { error: "Network error", code: "NETWORK_ERROR" }
  },
  
  serverError: {
    description: "Server internal error",
    mockResponse: { error: "Internal server error", code: "SERVER_ERROR" }
  },
  
  sessionExpired: {
    description: "Session has expired",
    mockResponse: { error: "Session expired", code: "SESSION_EXPIRED" }
  },
  
  invalidResponse: {
    description: "Invalid API response format",
    mockResponse: "Invalid JSON response"
  }
} as const; 
