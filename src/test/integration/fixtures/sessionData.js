/**
 * Test session data fixtures for integration testing
 */

const SESSION_TTL = 600; // 10 minutes in seconds

/**
 * Generate a valid session object
 */
function createValidSession(overrides = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);
  
  return {
    id: "test-session-123",
    userId: "test-user-456",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    metadata: {
      userAgent: "Mozilla/5.0 (Test Browser)",
      ipAddress: "127.0.0.1"
    },
    ...overrides
  };
}

/**
 * Generate an expired session object
 */
function createExpiredSession(overrides = {}) {
  const now = new Date();
  const createdAt = new Date(now.getTime() - (SESSION_TTL + 60) * 1000); // Expired 1 minute ago
  const expiresAt = new Date(now.getTime() - 60 * 1000); // Expired 1 minute ago
  
  return {
    id: "expired-session-789",
    userId: "test-user-456",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    metadata: {
      userAgent: "Mozilla/5.0 (Test Browser)",
      ipAddress: "127.0.0.1"
    },
    ...overrides
  };
}

/**
 * Generate session data with various scenarios
 */
const TEST_SESSIONS = {
  valid: {
    code: "ABCD2345",
    data: createValidSession()
  },
  expired: {
    code: "EXPIRED1",
    data: createExpiredSession()
  },
  longLived: {
    code: "LONGLIVE",
    data: createValidSession({
      id: "long-lived-session",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    })
  },
  minimal: {
    code: "MINIMAL1",
    data: {
      id: "minimal-session",
      expiresAt: new Date(Date.now() + SESSION_TTL * 1000).toISOString()
    }
  }
};

/**
 * Invalid session codes for testing error scenarios
 */
const INVALID_SESSION_CODES = [
  "INVALID1", // Non-existent session
  "BADCODE2", // Non-existent session
  "NOTFOUND"  // Non-existent session
];

/**
 * Malformed session data for testing error handling
 */
const MALFORMED_SESSION_DATA = {
  notJson: "this-is-not-json-data",
  emptyObject: {},
  missingExpiresAt: {
    id: "missing-expires-session"
  },
  invalidExpiresAt: {
    id: "invalid-expires-session",
    expiresAt: "not-a-date"
  }
};

/**
 * Valid Base32 session code format patterns
 */
const VALID_SESSION_CODE_PATTERNS = [
  "ABCD2345", // 8 characters
  "EFGH6789", // 8 characters
  "ABCDEFGH", // 8 characters (all letters)
  "12345678"  // 8 characters (all numbers)
];

/**
 * Invalid session code format patterns
 */
const INVALID_SESSION_CODE_PATTERNS = [
  "ABC123",     // Too short
  "ABCD23456",  // Too long
  "ABCD-234",   // Contains hyphen
  "abcd2345",   // Lowercase (Base32 should be uppercase)
  "ABCD234O",   // Contains 'O' (not valid in Base32)
  "ABCD234I",   // Contains 'I' (not valid in Base32)
  "",           // Empty string
  " ABCD234",   // Leading space
  "ABCD234 "    // Trailing space
];

module.exports = {
  createValidSession,
  createExpiredSession,
  TEST_SESSIONS,
  INVALID_SESSION_CODES,
  MALFORMED_SESSION_DATA,
  VALID_SESSION_CODE_PATTERNS,
  INVALID_SESSION_CODE_PATTERNS,
  SESSION_TTL
}; 
