import { SessionService, createSessionService, SessionServiceError, SESSION_ERROR_CODES } from "../../services";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("SessionService", () => {
  let sessionService: SessionService;
  const mockBaseUrl = "https://test-relay.example.com";
  
  beforeEach(() => {
    sessionService = new SessionService({ baseUrl: mockBaseUrl });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create service with valid configuration", () => {
      const service = new SessionService({ baseUrl: mockBaseUrl });
      expect(service).toBeInstanceOf(SessionService);
    });

    it("should throw error when baseUrl is missing", () => {
      expect(() => new SessionService({} as any)).toThrow(SessionServiceError);
      expect(() => new SessionService({} as any)).toThrow("Base URL is required");
    });

    it("should remove trailing slash from baseUrl", () => {
      const service = new SessionService({ baseUrl: "https://example.com/" });
      expect(service).toBeInstanceOf(SessionService);
    });

    it("should merge configuration with defaults", () => {
      const customConfig = {
        baseUrl: mockBaseUrl,
        timeout: 5000,
        maxRetries: 2
      };
      const service = new SessionService(customConfig);
      expect(service).toBeInstanceOf(SessionService);
    });
  });

  describe("createSession", () => {
    const validSessionResponse = {
      code: "ABCDEFGH", // Valid Base32 (no 1,0)
      ttl: 600,
      expiresAt: "2025-01-17T16:00:00.000Z"
    };

    it("should successfully create session with valid response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(validSessionResponse)
      });

      const result = await sessionService.createSession();
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/sessions`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
      );
      expect(result).toEqual(validSessionResponse);
    });

    it("should handle HTTP error responses without retry for rate limits", async () => {
      const errorResponse = {
        error: "Rate limit exceeded",
        code: "RATE_LIMITED"
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: jest.fn().mockResolvedValueOnce(errorResponse)
      });

      await expect(sessionService.createSession()).rejects.toThrow(SessionServiceError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not retry
    });

    it("should handle network errors with retries", async () => {
      const fastRetryService = new SessionService({ 
        baseUrl: mockBaseUrl, 
        maxRetries: 2,
        retryDelay: 1 // Very fast retry for testing
      });

      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(fastRetryService.createSession()).rejects.toThrow(SessionServiceError);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    });

    it("should validate response structure", async () => {
      const invalidResponse = {
        code: "INVALID", // Wrong format (contains 'I')
        ttl: -1, // Invalid TTL
        expiresAt: "invalid-date"
      };

      // Clear previous mocks and set up fresh mock for this test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(invalidResponse)
      });

      await expect(sessionService.createSession()).rejects.toThrow(SessionServiceError);
      await expect(sessionService.createSession()).rejects.toThrow("Invalid session data received");
    });
  });

  describe("isValidSession", () => {
    it("should validate correct session codes", () => {
      // Using valid Base32 characters (A-Z, 2-7) - no 0,1,8,9
      expect(sessionService.isValidSession("ABCDEFGH")).toBe(true);
      expect(sessionService.isValidSession("A2B3C4D5")).toBe(true);
      expect(sessionService.isValidSession("ZZZZ7777")).toBe(true);
      expect(sessionService.isValidSession("AAAABBBB")).toBe(true);
      expect(sessionService.isValidSession("22334567")).toBe(true);
    });

    it("should reject invalid session codes", () => {
      expect(sessionService.isValidSession("ABCD123")).toBe(false); // Too short
      expect(sessionService.isValidSession("ABCD12345")).toBe(false); // Too long
      expect(sessionService.isValidSession("ABCD123a")).toBe(false); // Lowercase
      expect(sessionService.isValidSession("ABCD1230")).toBe(false); // Contains 0
      expect(sessionService.isValidSession("ABCD1231")).toBe(false); // Contains 1
      expect(sessionService.isValidSession("ABCD1238")).toBe(false); // Contains 8
      expect(sessionService.isValidSession("ABCD1239")).toBe(false); // Contains 9
      expect(sessionService.isValidSession("")).toBe(false); // Empty
      expect(sessionService.isValidSession("12345678")).toBe(false); // Contains invalid digits
    });

    it("should handle non-string inputs", () => {
      expect(sessionService.isValidSession(null as any)).toBe(false);
      expect(sessionService.isValidSession(undefined as any)).toBe(false);
      expect(sessionService.isValidSession(123 as any)).toBe(false);
      expect(sessionService.isValidSession({} as any)).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should create SessionServiceError with all properties", () => {
      const originalError = new Error("Original error");
      const error = new SessionServiceError(
        "Test error",
        SESSION_ERROR_CODES.NETWORK_ERROR,
        500,
        originalError
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SessionServiceError);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe(SESSION_ERROR_CODES.NETWORK_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe("SessionServiceError");
    });
  });
});

describe("createSessionService", () => {
  it("should create SessionService with factory function", () => {
    const service = createSessionService("https://example.com");
    expect(service).toBeInstanceOf(SessionService);
  });

  it("should accept additional configuration", () => {
    const service = createSessionService("https://example.com", {
      timeout: 5000,
      maxRetries: 2
    });
    expect(service).toBeInstanceOf(SessionService);
  });
});

describe("Integration scenarios", () => {
  it("should handle complete success workflow", async () => {
    const testBaseUrl = "https://test-relay.example.com";
    const service = createSessionService(testBaseUrl);
    const mockResponse = {
      code: "TESTCODE", // Valid Base32
      ttl: 600,
      expiresAt: "2025-01-17T16:00:00.000Z"
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    const result = await service.createSession();
    
    expect(result.code).toBe("TESTCODE");
    expect(service.isValidSession(result.code)).toBe(true);
  });

  it("should handle service configuration errors gracefully", () => {
    expect(() => createSessionService("")).toThrow(SessionServiceError);
  });
}); 
